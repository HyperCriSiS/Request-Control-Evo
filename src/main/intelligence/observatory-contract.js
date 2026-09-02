/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const OBSERVATORY_SCHEMA_VERSION = 1;
export const OBSERVATORY_RESPONSE_SCHEMA_VERSION = 1;

export const OBSERVATORY_RECOMMENDATION_KIND = Object.freeze({
    CLASSIFICATION: "classification",
    RULE_CANDIDATE: "rule-candidate",
});

export const OBSERVATORY_RULE_OPERATION = Object.freeze({
    REMOVE_QUERY_PARAMETER: "remove-query-parameter",
    BLOCK_HOST: "block-host",
    BLOCK_HOST_TYPE: "block-host-type",
    UNWRAP_QUERY_PARAMETER: "unwrap-query-parameter",
});

const RESPONSE_PRODUCER = "wormhole-observatory";
const SAFE_IDENTIFIER = /^[a-z0-9][a-z0-9_.-]*$/i;
const FORBIDDEN_RESPONSE_KEYS = new Set([
    "action",
    "code",
    "eval",
    "executable",
    "javascript",
    "pattern",
    "redirect",
    "redirecturl",
    "regex",
    "rule",
    "script",
    "url",
]);

function normalizedHostname(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function forbiddenKeyPath(value, prefix = "") {
    if (!value || typeof value !== "object") return null;
    for (const [key, child] of Object.entries(value)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (FORBIDDEN_RESPONSE_KEYS.has(key.toLowerCase())) return path;
        const nested = forbiddenKeyPath(child, path);
        if (nested) return nested;
    }
    return null;
}

function hasOnlyKeys(value, allowed) {
    return Object.keys(value || {}).every((key) => allowed.has(key));
}

function validDomainIndex(value, domainCount) {
    return Number.isInteger(value) && value >= 0 && (!Number.isInteger(domainCount) || value < domainCount);
}

function validConfidence(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function validReasonCodes(value) {
    return Array.isArray(value) && value.every((reason) => typeof reason === "string" && SAFE_IDENTIFIER.test(reason));
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
    if (Object.hasOwn(snapshot || {}, "pageUrl") || Object.hasOwn(snapshot || {}, "requestUrl")) {
        errors.push("raw-navigation-data-not-allowed");
    }
    if (snapshot?.domainStats?.some((domain) => ["url", "query", "path"].some((key) => Object.hasOwn(domain, key)))) {
        errors.push("raw-navigation-data-not-allowed");
    }
    return [...new Set(errors)];
}

function validateClassificationRecommendation(recommendation, domainCount) {
    const errors = [];
    const allowed = new Set(["id", "kind", "domainIndex", "confidence", "reasonCodes", "category", "organization"]);
    if (!hasOnlyKeys(recommendation, allowed)) errors.push(`unexpected-recommendation-field:${recommendation.id || "unknown"}`);
    if (!validDomainIndex(recommendation.domainIndex, domainCount)) errors.push(`invalid-domain-index:${recommendation.id || "unknown"}`);
    if (!SAFE_IDENTIFIER.test(recommendation.category || "")) errors.push(`invalid-category:${recommendation.id || "unknown"}`);
    if (recommendation.organization != null && (typeof recommendation.organization !== "string" || recommendation.organization.length > 120)) {
        errors.push(`invalid-organization:${recommendation.id || "unknown"}`);
    }
    return errors;
}

function validateRuleCandidateRecommendation(recommendation, domainCount) {
    const errors = [];
    const allowed = new Set(["id", "kind", "domainIndex", "confidence", "reasonCodes", "operation", "parameter", "requestType"]);
    if (!hasOnlyKeys(recommendation, allowed)) errors.push(`unexpected-recommendation-field:${recommendation.id || "unknown"}`);
    if (!validDomainIndex(recommendation.domainIndex, domainCount)) errors.push(`invalid-domain-index:${recommendation.id || "unknown"}`);
    if (!Object.values(OBSERVATORY_RULE_OPERATION).includes(recommendation.operation)) {
        errors.push(`unsupported-operation:${recommendation.id || "unknown"}`);
    }

    const needsParameter = [
        OBSERVATORY_RULE_OPERATION.REMOVE_QUERY_PARAMETER,
        OBSERVATORY_RULE_OPERATION.UNWRAP_QUERY_PARAMETER,
    ].includes(recommendation.operation);
    if (needsParameter && !SAFE_IDENTIFIER.test(recommendation.parameter || "")) {
        errors.push(`invalid-parameter:${recommendation.id || "unknown"}`);
    }
    if (recommendation.operation === OBSERVATORY_RULE_OPERATION.BLOCK_HOST_TYPE && !SAFE_IDENTIFIER.test(recommendation.requestType || "")) {
        errors.push(`invalid-request-type:${recommendation.id || "unknown"}`);
    }
    return errors;
}

export function validateObservatoryResponse(response, {domainCount} = {}) {
    const errors = [];
    if (response?.schemaVersion !== OBSERVATORY_RESPONSE_SCHEMA_VERSION) errors.push("unsupported-response-schema-version");
    if (response?.snapshotSchemaVersion !== OBSERVATORY_SCHEMA_VERSION) errors.push("snapshot-schema-mismatch");
    if (response?.producedBy !== RESPONSE_PRODUCER) errors.push("unexpected-response-producer");
    if (!Array.isArray(response?.recommendations)) errors.push("missing-recommendations");

    const forbidden = forbiddenKeyPath(response);
    if (forbidden) errors.push(`executable-or-navigation-field-not-allowed:${forbidden}`);

    const seen = new Set();
    for (const recommendation of response?.recommendations || []) {
        if (!recommendation?.id || typeof recommendation.id !== "string" || seen.has(recommendation.id)) {
            errors.push("missing-or-duplicate-recommendation-id");
        }
        seen.add(recommendation?.id);
        if (!validConfidence(recommendation?.confidence)) errors.push(`invalid-confidence:${recommendation?.id || "unknown"}`);
        if (!validReasonCodes(recommendation?.reasonCodes)) errors.push(`invalid-reason-codes:${recommendation?.id || "unknown"}`);

        if (recommendation?.kind === OBSERVATORY_RECOMMENDATION_KIND.CLASSIFICATION) {
            errors.push(...validateClassificationRecommendation(recommendation, domainCount));
        } else if (recommendation?.kind === OBSERVATORY_RECOMMENDATION_KIND.RULE_CANDIDATE) {
            errors.push(...validateRuleCandidateRecommendation(recommendation, domainCount));
        } else {
            errors.push(`unsupported-recommendation-kind:${recommendation?.id || "unknown"}`);
        }
    }
    return [...new Set(errors)];
}

export function prepareObservatoryRecommendations(response, options = {}) {
    const errors = validateObservatoryResponse(response, options);
    if (errors.length) {
        return {valid: false, errors, recommendations: []};
    }

    return {
        valid: true,
        errors: [],
        recommendations: response.recommendations.map((recommendation) => ({
            ...recommendation,
            status: "review-required",
        })),
    };
}
