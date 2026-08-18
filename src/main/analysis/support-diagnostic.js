/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { summarizeInspection } from "./inspection.js";

export const SUPPORT_DIAGNOSTIC_SCHEMA_VERSION = 1;

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
            packageId: rule.source.entry || null,
            version: rule.source.version || null,
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
            .map((conflict) => ({
                uuid: typeof conflict.uuid === "string" ? conflict.uuid : null,
                reason: typeof conflict.reason === "string" ? conflict.reason : "unknown-conflict",
            }))
        : [];
    const integrityStatus = imported.integrityStatus || (
        ["official", "community"].includes(channel) && imported.digest
            ? "verified-at-import"
            : (channel === "custom" ? "not-required" : "unknown")
    );

    return {
        channel,
        packageId: imported.entry || null,
        version: imported.version || null,
        installedDigest: imported.digest || null,
        availableDigest: imported.availableDigest || null,
        availableVersion: imported.availableVersion || null,
        updateAvailable: Boolean(imported.digest && imported.availableDigest && imported.digest !== imported.availableDigest),
        integrityStatus,
        lastCheckStatus: imported.lastCheckStatus || null,
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
    const storedRules = new Map((rules || []).filter((rule) => rule?.uuid).map((rule) => [rule.uuid, rule]));
    const affected = new Map();

    for (const request of session?.requests || []) {
        const uuid = request?.effect?.rule?.uuid;
        if (!uuid) continue;

        const action = request.effect.action || "unknown";
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
        generatedAt,
        extensionVersion: extensionVersion || null,
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
