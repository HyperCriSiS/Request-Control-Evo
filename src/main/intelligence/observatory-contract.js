/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const OBSERVATORY_SCHEMA_VERSION = 1;

function normalizedHostname(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function buildObservatorySnapshot(summary, {includeHostnames = false} = {}) {
    const domains = Array.isArray(summary?.domains) ? summary.domains : [];
    const snapshot = {
        schemaVersion: OBSERVATORY_SCHEMA_VERSION,
        generatedBy: "request-control-evo",
        totals: {
            requests: Number(summary?.total) || 0,
            firstParty: Number(summary?.firstParty) || 0,
            thirdParty: Number(summary?.thirdParty) || 0,
            affected: Number(summary?.affected) || 0,
            trackingHints: Number(summary?.trackingHints) || 0,
            dropped: Number(summary?.dropped) || 0,
        },
        resourceTypes: {...(summary?.types || {})},
        domainStats: domains.map((domain) => ({
            ...(includeHostnames ? {hostname: normalizedHostname(domain.hostname)} : {}),
            total: Number(domain.total) || 0,
            firstParty: Number(domain.firstParty) || 0,
            thirdParty: Number(domain.thirdParty) || 0,
            affected: Number(domain.affected) || 0,
            trackingHint: Boolean(domain.trackingHint),
            types: {...(domain.types || {})},
        })),
    };

    return snapshot;
}

export function validateObservatorySnapshot(snapshot) {
    const errors = [];
    if (snapshot?.schemaVersion !== OBSERVATORY_SCHEMA_VERSION) {
        errors.push("unsupported-schema-version");
    }
    if (snapshot?.generatedBy !== "request-control-evo") {
        errors.push("unexpected-producer");
    }
    if (!snapshot?.totals || !Array.isArray(snapshot?.domainStats)) {
        errors.push("missing-summary-data");
    }
    if (snapshot?.domainStats?.some((domain) => Object.hasOwn(domain, "url") || Object.hasOwn(domain, "query"))) {
        errors.push("raw-navigation-data-not-allowed");
    }
    return errors;
}
