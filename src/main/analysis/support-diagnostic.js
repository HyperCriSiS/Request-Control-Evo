/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { summarizeInspection } from "./inspection.js";

export const SUPPORT_DIAGNOSTIC_SCHEMA_VERSION = 1;

const SAFE_UUID = /^[A-Za-z0-9_-]{1,128}$/;
const SAFE_PACKAGE_ID = /^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/;
const SAFE_VERSION = /^(?:0|[1-9]\d*)(?:\.(?:0|[1-9]\d*)){0,3}(?:[-+][0-9A-Za-z.-]+)?$/;
const SAFE_CODE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const SAFE_DIGEST = /^[a-f0-9]{64}$/i;
const SAFE_ACTIONS = new Set(["block", "filter", "redirect", "secure", "whitelist"]);

function safeString(value, pattern) {
    return typeof value === "string" && pattern.test(value) ? value : null;
}

function safeTimestamp(value) {
    if (typeof value !== "string" || value.length > 40) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function catalogChannel(catalog) {
    if (catalog === "requestcontrol-official") return "official";
    if (catalog === "requestcontrol-community") return "community";
    return null;
}

export function summarizeRuleSource(rule) {
    if (!rule?.managed || !rule?.source) {
        return {channel: "local"};
    }

    const channel = catalogChannel(rule.source.catalog);
    if (channel) {
        return {
            channel,
            packageId: safeString(rule.source.entry, SAFE_PACKAGE_ID),
            version: safeString(rule.source.version, SAFE_VERSION),
        };
    }

    return {channel: "custom"};
}

function summarizePackageState(data) {
    const imported = data?.imported;
    if (!imported) return null;

    const channel = catalogChannel(imported.catalog) || (data.deletable ? "custom" : "unknown");
    const conflicts = Array.isArray(imported.conflicts)
        ? imported.conflicts
            .filter((conflict) => conflict && typeof conflict === "object")
            .map((conflict) => {
                const uuid = safeString(conflict.uuid, SAFE_UUID);
                if (!uuid) return null;
                return {
                    uuid,
                    reason: safeString(conflict.reason, SAFE_CODE) || "unknown-conflict",
                };
            })
            .filter(Boolean)
        : [];
    const installedDigest = safeString(imported.digest, SAFE_DIGEST);
    const availableDigest = safeString(imported.availableDigest, SAFE_DIGEST);
    const integrityStatus = safeString(imported.integrityStatus, SAFE_CODE) || (
        ["official", "community"].includes(channel) && installedDigest
            ? "verified-at-import"
            : (channel === "custom" ? "not-required" : "unknown")
    );

    return {
        channel,
        packageId: safeString(imported.entry, SAFE_PACKAGE_ID),
        version: safeString(imported.version, SAFE_VERSION),
        installedDigest,
        availableDigest,
        availableVersion: safeString(imported.availableVersion, SAFE_VERSION),
        updateAvailable: Boolean(installedDigest && availableDigest && installedDigest !== availableDigest),
        integrityStatus,
        lastCheckStatus: safeString(imported.lastCheckStatus, SAFE_CODE),
        conflicts,
    };
}

export function summarizeImportState(imports = {}) {
    return Object.values(imports || {})
        .map(summarizePackageState)
        .filter(Boolean)
        .sort((left, right) => `${left.channel}:${left.packageId || ""}`.localeCompare(`${right.channel}:${right.packageId || ""}`));
}

function packageStateForRule(rule, imports = {}) {
    if (!rule?.managed || !rule?.source) return null;

    if (rule.source.url && imports[rule.source.url]) {
        return summarizePackageState(imports[rule.source.url]);
    }

    if (rule.source.catalog && rule.source.entry) {
        for (const data of Object.values(imports || {})) {
            if (data?.imported?.catalog === rule.source.catalog && data.imported.entry === rule.source.entry) {
                return summarizePackageState(data);
            }
        }
    }
    return null;
}

export function summarizeRuleRuntimeState(rule, imports = {}) {
    const source = summarizeRuleSource(rule);
    const packageState = packageStateForRule(rule, imports);
    const conflict = packageState?.conflicts?.find((item) => item.uuid === rule?.uuid) || null;

    return {
        ...source,
        integrityStatus: packageState?.integrityStatus || null,
        updateAvailable: Boolean(packageState?.updateAvailable),
        availableVersion: packageState?.availableVersion || null,
        conflictReason: conflict?.reason || null,
        lastCheckStatus: packageState?.lastCheckStatus || null,
    };
}

function summarizeAffectedRules(session, rules = []) {
    const storedRules = new Map(
        (rules || [])
            .map((rule) => [safeString(rule?.uuid, SAFE_UUID), rule])
            .filter(([uuid]) => uuid)
    );
    const affected = new Map();

    for (const request of session?.requests || []) {
        const uuid = safeString(request?.effect?.rule?.uuid, SAFE_UUID);
        if (!uuid) continue;

        const action = SAFE_ACTIONS.has(request.effect.action) ? request.effect.action : "unknown";
        const key = `${uuid}:${action}`;
        if (!affected.has(key)) {
            affected.set(key, {
                uuid,
                action,
                count: 0,
                source: storedRules.has(uuid) ? summarizeRuleSource(storedRules.get(uuid)) : {channel: "unknown"},
            });
        }
        affected.get(key).count += 1;
    }

    return [...affected.values()].sort((left, right) => left.uuid.localeCompare(right.uuid));
}

export function buildSupportDiagnostic(session, {
    rules = [],
    imports = {},
    extensionVersion = "",
    generatedAt = new Date().toISOString(),
} = {}) {
    const summary = summarizeInspection(session);

    return {
        schemaVersion: SUPPORT_DIAGNOSTIC_SCHEMA_VERSION,
        generatedBy: "request-control-evo",
        generatedAt: safeTimestamp(generatedAt),
        extensionVersion: safeString(extensionVersion, SAFE_VERSION),
        privacy: {
            containsRawUrls: false,
            containsHostnames: false,
            containsQueryStrings: false,
            containsCustomSourceUrls: false,
        },
        inspection: {
            present: Boolean(session),
            active: Boolean(session?.active),
            totals: {
                requests: summary.total,
                firstParty: summary.firstParty,
                thirdParty: summary.thirdParty,
                trackingHints: summary.trackingHints,
                affected: summary.affected,
                dropped: summary.dropped,
            },
            resourceTypes: {...summary.types},
            affectedRules: summarizeAffectedRules(session, rules),
        },
        packages: summarizeImportState(imports),
    };
}
