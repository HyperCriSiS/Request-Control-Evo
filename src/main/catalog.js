/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function sortJson(value) {
    if (Array.isArray(value)) {
        return value.map(sortJson);
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.keys(value)
                .filter((key) => value[key] !== undefined)
                .sort()
                .map((key) => [key, sortJson(value[key])])
        );
    }
    return value;
}

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function unmanagedRuleData(rule) {
    const copy = cloneJson(rule);
    delete copy.managed;
    delete copy.source;
    return copy;
}

function persistedSource(source) {
    const copy = cloneJson(source);
    delete copy.aliases;
    delete copy.legacyPaths;
    return copy;
}

function sourceReferenceMatches(value, source) {
    if (!value) return false;
    if ([source.id, source.url, ...(source.aliases || [])].filter(Boolean).includes(value)) return true;
    if (!Array.isArray(source.legacyPaths) || source.legacyPaths.length === 0) return false;
    try {
        const pathname = new URL(value).pathname.replace(/^\/+/, "");
        return source.legacyPaths.some((path) => pathname.endsWith(String(path).replace(/^\/+/, "")));
    } catch {
        return false;
    }
}

async function sha256(text) {
    if (!globalThis.crypto || !globalThis.crypto.subtle) {
        throw new Error("Web Crypto API is unavailable");
    }
    const encoded = new TextEncoder().encode(text);
    const result = await globalThis.crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(result), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function canonicalStringify(value) {
    return JSON.stringify(sortJson(value));
}

export async function ruleDigest(rule) {
    return sha256(canonicalStringify(unmanagedRuleData(rule)));
}

export async function createManagedRule(rule, source) {
    const copy = cloneJson(rule);
    const upstreamDigest = await ruleDigest(copy);
    copy.managed = true;
    copy.source = {
        ...persistedSource(source),
        upstreamDigest,
    };
    return copy;
}

export async function isManagedRuleModified(rule) {
    if (!rule.managed || !rule.source || !rule.source.upstreamDigest) {
        return null;
    }
    return (await ruleDigest(rule)) !== rule.source.upstreamDigest;
}

function sourceMatches(rule, source) {
    if (!rule.source) {
        return false;
    }
    return sourceReferenceMatches(rule.source.id, source) || sourceReferenceMatches(rule.source.url, source);
}

export async function reconcileManagedRules(localRules, incomingRules, source) {
    const incomingById = new Map(incomingRules.filter(({uuid}) => uuid).map((rule) => [rule.uuid, rule]));
    const result = [];
    const changes = {
        added: [],
        updated: [],
        removed: [],
        unchanged: [],
        conflicts: [],
    };

    const handledIncoming = new Set();

    for (const localRule of localRules) {
        const incomingRule = incomingById.get(localRule.uuid);
        const belongsToSource = sourceMatches(localRule, source);

        if (!incomingRule) {
            if (!belongsToSource) {
                result.push(localRule);
                continue;
            }

            const modified = await isManagedRuleModified(localRule);
            if (modified === false) {
                changes.removed.push(localRule.uuid);
            } else {
                result.push(localRule);
                changes.conflicts.push({
                    uuid: localRule.uuid,
                    reason: modified === null ? "removed-upstream-baseline-unknown" : "removed-upstream-local-modified",
                });
            }
            continue;
        }

        handledIncoming.add(localRule.uuid);
        const incomingDigest = await ruleDigest(incomingRule);
        const localDigest = await ruleDigest(localRule);

        if (belongsToSource) {
            const modified = await isManagedRuleModified(localRule);
            if (modified === true) {
                result.push(localRule);
                changes.conflicts.push({
                    uuid: localRule.uuid,
                    reason: "local-modified",
                });
            } else if (modified === null && localDigest !== incomingDigest) {
                result.push(localRule);
                changes.conflicts.push({
                    uuid: localRule.uuid,
                    reason: "baseline-unknown",
                });
            } else if (localDigest === incomingDigest) {
                result.push(await createManagedRule(incomingRule, source));
                changes.unchanged.push(localRule.uuid);
            } else {
                result.push(await createManagedRule(incomingRule, source));
                changes.updated.push(localRule.uuid);
            }
            continue;
        }

        if (localDigest === incomingDigest) {
            result.push(await createManagedRule(incomingRule, source));
            changes.unchanged.push(localRule.uuid);
        } else {
            result.push(localRule);
            changes.conflicts.push({
                uuid: localRule.uuid,
                reason: "uuid-collision-or-legacy-local-modified",
            });
        }
    }

    for (const incomingRule of incomingRules) {
        if (!incomingRule.uuid || handledIncoming.has(incomingRule.uuid)) {
            continue;
        }
        result.push(await createManagedRule(incomingRule, source));
        changes.added.push(incomingRule.uuid);
    }

    return {
        rules: result,
        ...changes,
    };
}
