/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const ADAPTIVE_PARAMETER_STATE_VERSION = 1;

export const ADAPTIVE_PARAMETER_LIMITS = Object.freeze({
    maxRecords: 128,
    maxParameterNameLength: 128,
    maxCounter: 255,
    minObservationsForReview: 3,
    minSiteObservationsForReview: 2,
    reviewScore: 0.6,
    highEntropyMinLength: 12,
    highEntropyMinUniqueRatio: 0.45,
});

const COUNTER_FIELDS = Object.freeze([
    "observations",
    "siteObservations",
    "highEntropyObservations",
    "propagatedObservations",
    "verifiedTracking",
    "verifiedFunctional",
]);

function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
}

function clampCounter(value) {
    const number = Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 0;
    return clamp(number, 0, ADAPTIVE_PARAMETER_LIMITS.maxCounter);
}

function increment(value) {
    return clampCounter(clampCounter(value) + 1);
}

function normalizeParameterName(name) {
    if (typeof name !== "string") return null;
    const normalized = name.trim();
    if (!normalized || normalized.length > ADAPTIVE_PARAMETER_LIMITS.maxParameterNameLength) {
        return null;
    }
    return normalized;
}

function createRecord(name) {
    return {
        name,
        observations: 0,
        siteObservations: 0,
        highEntropyObservations: 0,
        propagatedObservations: 0,
        verifiedTracking: 0,
        verifiedFunctional: 0,
    };
}

function sanitizeRecord(record) {
    const name = normalizeParameterName(record?.name);
    if (!name) return null;

    const sanitized = createRecord(name);
    for (const field of COUNTER_FIELDS) {
        sanitized[field] = clampCounter(record[field]);
    }
    sanitized.siteObservations = Math.min(sanitized.siteObservations, sanitized.observations);
    sanitized.highEntropyObservations = Math.min(sanitized.highEntropyObservations, sanitized.observations);
    sanitized.propagatedObservations = Math.min(sanitized.propagatedObservations, sanitized.observations);
    return sanitized;
}

export function valueLooksIdentifierLike(value) {
    if (value === null || value === undefined) return false;
    const text = String(value);
    if (text.length < ADAPTIVE_PARAMETER_LIMITS.highEntropyMinLength) return false;

    const uniqueRatio = new Set(text).size / text.length;
    if (uniqueRatio < ADAPTIVE_PARAMETER_LIMITS.highEntropyMinUniqueRatio) return false;

    let characterClasses = 0;
    if (/[a-z]/.test(text)) characterClasses += 1;
    if (/[A-Z]/.test(text)) characterClasses += 1;
    if (/\d/.test(text)) characterClasses += 1;
    if (/[^A-Za-z0-9]/.test(text)) characterClasses += 1;
    return characterClasses >= 2;
}

export function scoreAdaptiveParameter(record) {
    const sanitized = sanitizeRecord(record);
    if (!sanitized || sanitized.observations === 0) return 0;

    const occurrenceSignal = Math.min(sanitized.observations / 8, 1) * 0.15;
    const crossSiteSignal = Math.min(sanitized.siteObservations / 4, 1) * 0.25;
    const entropySignal = (sanitized.highEntropyObservations / sanitized.observations) * 0.2;
    const propagationSignal = (sanitized.propagatedObservations / sanitized.observations) * 0.15;
    const verificationSignal = Math.min(sanitized.verifiedTracking / 2, 1) * 0.35;
    const functionalPenalty = Math.min(sanitized.verifiedFunctional / 2, 1) * 0.55;

    return Number(clamp(
        occurrenceSignal + crossSiteSignal + entropySignal + propagationSignal + verificationSignal - functionalPenalty,
        0,
        1
    ).toFixed(3));
}

export function assessAdaptiveParameter(record) {
    const sanitized = sanitizeRecord(record);
    if (!sanitized) return null;

    const score = scoreAdaptiveParameter(sanitized);
    const enoughEvidence = sanitized.observations >= ADAPTIVE_PARAMETER_LIMITS.minObservationsForReview
        && sanitized.siteObservations >= ADAPTIVE_PARAMETER_LIMITS.minSiteObservationsForReview;

    return {
        ...sanitized,
        score,
        classification: enoughEvidence && score >= ADAPTIVE_PARAMETER_LIMITS.reviewScore
            ? "review"
            : "insufficient-evidence",
        autoSuggest: false,
    };
}

function initialRecords(state) {
    if (!state || state.version !== ADAPTIVE_PARAMETER_STATE_VERSION || !Array.isArray(state.records)) {
        return [];
    }
    return state.records;
}

export function createAdaptiveParameterLearner(initialState = null) {
    const records = new Map();
    const sessionSites = new Map();

    for (const rawRecord of initialRecords(initialState)) {
        const record = sanitizeRecord(rawRecord);
        if (!record || records.has(record.name)) continue;
        if (records.size >= ADAPTIVE_PARAMETER_LIMITS.maxRecords) break;
        records.set(record.name, record);
    }

    function getOrCreate(name) {
        const normalized = normalizeParameterName(name);
        if (!normalized) return null;
        if (records.has(normalized)) return records.get(normalized);
        if (records.size >= ADAPTIVE_PARAMETER_LIMITS.maxRecords) return null;

        const record = createRecord(normalized);
        records.set(normalized, record);
        return record;
    }

    function observe({name, value, siteKey = null, propagated = false} = {}) {
        const record = getOrCreate(name);
        if (!record) return null;

        record.observations = increment(record.observations);
        if (valueLooksIdentifierLike(value)) {
            record.highEntropyObservations = increment(record.highEntropyObservations);
        }
        if (propagated) {
            record.propagatedObservations = increment(record.propagatedObservations);
        }

        if (siteKey !== null && siteKey !== undefined) {
            const opaqueSiteKey = String(siteKey);
            if (!sessionSites.has(record.name)) {
                sessionSites.set(record.name, new Set());
            }
            const seen = sessionSites.get(record.name);
            if (!seen.has(opaqueSiteKey)) {
                seen.add(opaqueSiteKey);
                record.siteObservations = increment(record.siteObservations);
            }
        }

        return assessAdaptiveParameter(record);
    }

    function verify(name, verdict) {
        const record = getOrCreate(name);
        if (!record) return null;

        if (verdict === "tracking") {
            record.verifiedTracking = increment(record.verifiedTracking);
        } else if (verdict === "functional") {
            record.verifiedFunctional = increment(record.verifiedFunctional);
        } else {
            return assessAdaptiveParameter(record);
        }
        return assessAdaptiveParameter(record);
    }

    function get(name) {
        const normalized = normalizeParameterName(name);
        if (!normalized || !records.has(normalized)) return null;
        return assessAdaptiveParameter(records.get(normalized));
    }

    function list({reviewOnly = false} = {}) {
        const assessed = Array.from(records.values(), assessAdaptiveParameter)
            .filter(Boolean)
            .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
        return reviewOnly ? assessed.filter(({classification}) => classification === "review") : assessed;
    }

    function snapshot() {
        return {
            version: ADAPTIVE_PARAMETER_STATE_VERSION,
            records: Array.from(records.values(), (record) => sanitizeRecord(record))
                .filter(Boolean)
                .sort((left, right) => left.name.localeCompare(right.name)),
        };
    }

    return Object.freeze({
        observe,
        verify,
        get,
        list,
        snapshot,
    });
}

export function observeUnknownQueryParameters(learner, analysis, assessments, {propagatedNames = []} = {}) {
    if (!learner || !analysis?.valid || !Array.isArray(assessments)) return [];

    const propagated = new Set(propagatedNames);
    return assessments
        .filter(({classification}) => classification === "ordinary")
        .map((assessment) => learner.observe({
            name: assessment.name,
            value: assessment.value,
            siteKey: analysis.hostname,
            propagated: propagated.has(assessment.name),
        }))
        .filter(Boolean);
}
