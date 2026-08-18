/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {getSource} from "./source-registry.js";

export const CURATION_KIND = Object.freeze({
    PARAMETER: "parameter",
    REDIRECT: "redirect",
    CLASSIFICATION: "classification",
});

export const CURATION_RISK = Object.freeze({
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    BLOCKED: "blocked",
});

const GENERIC_PARAMETER_PATTERN = /^[a-z0-9_.-]+$/i;
const SENSITIVE_TOKENS = /(^|[_-])(auth|code|confirm|key|login|nonce|payment|redirect|return|session|signature|state|token|verify)([_-]|$)/i;
const TRACKING_PREFIX = /^(utm_|pk_|mc_)/i;

function normalizeText(value) {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeHost(value) {
    return normalizeText(value).toLowerCase().replace(/^\.+|\.+$/g, "");
}

function normalizePath(value) {
    const path = normalizeText(value);
    if (!path) return "";
    return path.startsWith("/") ? path : `/${path}`;
}

function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort();
}

export function normalizeCurationCandidate(candidate = {}) {
    const kind = normalizeText(candidate.kind).toLowerCase();
    const normalized = {
        sourceId: normalizeText(candidate.sourceId),
        kind,
        key: normalizeText(candidate.key).toLowerCase(),
        hosts: uniqueSorted((Array.isArray(candidate.hosts) ? candidate.hosts : []).map(normalizeHost)),
        paths: uniqueSorted((Array.isArray(candidate.paths) ? candidate.paths : []).map(normalizePath)),
        notes: normalizeText(candidate.notes),
    };

    if (kind === CURATION_KIND.REDIRECT) {
        normalized.wrapperParameter = normalizeText(candidate.wrapperParameter).toLowerCase();
    }
    if (kind === CURATION_KIND.CLASSIFICATION) {
        normalized.category = normalizeText(candidate.category).toLowerCase();
        normalized.organization = normalizeText(candidate.organization);
    }

    return normalized;
}

export function validateCurationCandidate(candidate) {
    const errors = [];
    const source = getSource(candidate?.sourceId);
    if (!source) errors.push("unknown-source");
    if (!Object.values(CURATION_KIND).includes(candidate?.kind)) errors.push("unknown-kind");
    if (!candidate?.key) errors.push("missing-key");

    if (candidate?.kind === CURATION_KIND.PARAMETER && !GENERIC_PARAMETER_PATTERN.test(candidate.key || "")) {
        errors.push("invalid-parameter-name");
    }
    if (candidate?.kind === CURATION_KIND.REDIRECT && !candidate?.wrapperParameter) {
        errors.push("missing-wrapper-parameter");
    }
    if (candidate?.kind === CURATION_KIND.CLASSIFICATION && !candidate?.category) {
        errors.push("missing-category");
    }
    return errors;
}

export function fingerprintCurationCandidate(candidate) {
    const normalized = normalizeCurationCandidate(candidate);
    return JSON.stringify({
        sourceId: normalized.sourceId,
        kind: normalized.kind,
        key: normalized.key,
        hosts: normalized.hosts,
        paths: normalized.paths,
        wrapperParameter: normalized.wrapperParameter || "",
        category: normalized.category || "",
        organization: normalized.organization || "",
    });
}

export function assessCurationRisk(candidate) {
    const normalized = normalizeCurationCandidate(candidate);
    const reasons = [];

    if (validateCurationCandidate(normalized).length > 0) {
        return {risk: CURATION_RISK.BLOCKED, reasons: ["invalid-candidate"]};
    }

    const source = getSource(normalized.sourceId);
    if (["deferred", "inspiration-only"].includes(source.integration)) {
        reasons.push("source-not-directly-importable");
    }

    if (normalized.kind === CURATION_KIND.PARAMETER) {
        if (SENSITIVE_TOKENS.test(normalized.key)) reasons.push("sensitive-parameter-name");
        if (!normalized.hosts.length && !TRACKING_PREFIX.test(normalized.key)) reasons.push("global-parameter-scope");
    }

    if (normalized.kind === CURATION_KIND.REDIRECT) {
        if (!normalized.hosts.length) reasons.push("redirect-without-host-scope");
        if (SENSITIVE_TOKENS.test(normalized.wrapperParameter)) reasons.push("sensitive-wrapper-parameter");
    }

    if (normalized.kind === CURATION_KIND.CLASSIFICATION) {
        reasons.push("annotation-only");
    }

    if (reasons.includes("source-not-directly-importable") || reasons.includes("sensitive-parameter-name") || reasons.includes("sensitive-wrapper-parameter")) {
        return {risk: CURATION_RISK.HIGH, reasons};
    }
    if (reasons.includes("global-parameter-scope") || reasons.includes("redirect-without-host-scope")) {
        return {risk: CURATION_RISK.MEDIUM, reasons};
    }
    return {risk: CURATION_RISK.LOW, reasons};
}

export function curateCandidates(candidates = []) {
    const seen = new Set();
    const accepted = [];
    const rejected = [];

    for (const raw of candidates) {
        const candidate = normalizeCurationCandidate(raw);
        const validation = validateCurationCandidate(candidate);
        const fingerprint = fingerprintCurationCandidate(candidate);

        if (validation.length) {
            rejected.push({candidate, reasons: validation});
            continue;
        }
        if (seen.has(fingerprint)) {
            rejected.push({candidate, reasons: ["duplicate-candidate"]});
            continue;
        }
        seen.add(fingerprint);
        accepted.push({
            candidate,
            fingerprint,
            assessment: assessCurationRisk(candidate),
        });
    }

    return {
        accepted,
        rejected,
        counts: {
            input: candidates.length,
            accepted: accepted.length,
            rejected: rejected.length,
            lowRisk: accepted.filter((item) => item.assessment.risk === CURATION_RISK.LOW).length,
            reviewRequired: accepted.filter((item) => item.assessment.risk !== CURATION_RISK.LOW).length,
        },
    };
}
