/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function matchesSource(source, expected) {
    if (!source || !expected) return false;
    return Boolean(
        (expected.id && source.id === expected.id) ||
        (expected.url && source.url === expected.url)
    );
}

function targetSourceIsUsable(source) {
    return Boolean(source?.id && source?.url && source?.catalog && source?.entry);
}

export function validateManagedPackageMigration(migration = {}) {
    const errors = [];
    if (!migration?.from?.id || !migration?.from?.url) {
        errors.push("missing-source-identity");
    }
    if (!Array.isArray(migration?.targets) || migration.targets.length === 0) {
        errors.push("missing-targets");
        return errors;
    }

    const targetIds = new Set();
    const targetUrls = new Set();
    const uuids = new Set();
    for (const target of migration.targets) {
        const source = target?.source;
        if (!targetSourceIsUsable(source)) {
            errors.push("invalid-target-source");
            continue;
        }
        if (source.id === migration?.from?.id || source.url === migration?.from?.url) {
            errors.push(`target-reuses-source:${source.id}`);
        }
        if (targetIds.has(source.id) || targetUrls.has(source.url)) {
            errors.push(`duplicate-target-source:${source.id}`);
        }
        targetIds.add(source.id);
        targetUrls.add(source.url);

        if (!Array.isArray(target.uuids) || target.uuids.length === 0) {
            errors.push(`missing-target-uuids:${source.id}`);
            continue;
        }
        for (const uuid of target.uuids) {
            if (!uuid || uuids.has(uuid)) {
                errors.push(`duplicate-or-invalid-uuid:${uuid || "unknown"}`);
            }
            uuids.add(uuid);
        }
    }
    return errors;
}

export function migrateManagedPackageState(rules = [], imports = {}, migration = {}) {
    const errors = validateManagedPackageMigration(migration);
    if (errors.length > 0) {
        return { rules, imports, changed: false, blocked: true, errors, migrated: [] };
    }

    const targetsByUuid = new Map();
    for (const target of migration.targets) {
        for (const uuid of target.uuids) {
            targetsByUuid.set(uuid, target);
        }
    }

    const candidates = rules.filter((rule) => rule?.managed && matchesSource(rule.source, migration.from));
    const unmapped = candidates.filter((rule) => !targetsByUuid.has(rule.uuid)).map((rule) => rule.uuid);
    if (unmapped.length > 0) {
        return {
            rules,
            imports,
            changed: false,
            blocked: true,
            errors: unmapped.map((uuid) => `unmapped-managed-uuid:${uuid}`),
            migrated: [],
        };
    }

    const migrated = [];
    const nextRules = rules.map((rule) => {
        if (!rule?.managed || !matchesSource(rule.source, migration.from)) return rule;
        const target = targetsByUuid.get(rule.uuid);
        if (!target) return rule;

        const copy = cloneJson(rule);
        const upstreamDigest = copy.source?.upstreamDigest;
        copy.source = cloneJson(target.source);
        if (upstreamDigest) copy.source.upstreamDigest = upstreamDigest;
        migrated.push(rule.uuid);
        return copy;
    });

    const nextImports = cloneJson(imports || {});
    const sourceKey = [migration.from.url, migration.from.id].find((key) => key && nextImports[key]);
    if (sourceKey) {
        const oldData = nextImports[sourceKey] || {};
        const oldImported = oldData.imported || {};
        const installedUuids = new Set(
            Array.isArray(oldImported.uuids) ? oldImported.uuids : candidates.map((rule) => rule.uuid)
        );
        delete nextImports[sourceKey];

        for (const target of migration.targets) {
            const selected = target.uuids.filter((uuid) => installedUuids.has(uuid));
            if (selected.length === 0) continue;
            const conflicts = Array.isArray(oldImported.conflicts)
                ? oldImported.conflicts.filter((conflict) => selected.includes(conflict?.uuid))
                : [];
            nextImports[target.source.url] = {
                ...cloneJson(oldData),
                imported: {
                    uuids: selected,
                    timestamp: oldImported.timestamp,
                    conflicts,
                    catalog: target.source.catalog,
                    entry: target.source.entry,
                    version: null,
                    availableVersion: target.source.version || null,
                    integrityStatus: "unknown",
                    migrationPending: true,
                    migratedFrom: migration.from.id,
                },
            };
        }
    }

    return {
        rules: nextRules,
        imports: nextImports,
        changed: migrated.length > 0 || Boolean(sourceKey),
        blocked: false,
        errors: [],
        migrated,
    };
}
