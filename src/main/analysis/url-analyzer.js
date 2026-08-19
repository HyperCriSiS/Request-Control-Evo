/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {assessRedirectCandidate, shouldAutoSuggestRedirect} from "../intelligence/redirect-safety.js";

const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

export const CONSERVATIVE_PARAMETER_PATTERNS = Object.freeze([
    "utm_*",
    "fbclid",
    "gclid",
    "yclid",
]);

function decodeRepeatedly(value, maxRounds = 2) {
    let decoded = value;
    for (let round = 0; round < maxRounds; round++) {
        try {
            const next = decodeURIComponent(decoded);
            if (next === decoded) {
                break;
            }
            decoded = next;
        } catch {
            break;
        }
    }
    return decoded;
}

function findNestedUrl(value) {
    const candidates = [value, decodeRepeatedly(value)];
    for (const candidate of candidates) {
        try {
            const parsed = new URL(candidate);
            if (HTTP_PROTOCOLS.has(parsed.protocol)) {
                return parsed.href;
            }
        } catch {
            // A normal query value is not expected to be a URL.
        }
    }
    return null;
}

export function analyzeUrl(input) {
    let url;
    try {
        url = new URL(input);
    } catch {
        return {
            input,
            valid: false,
            error: "invalid-url",
        };
    }

    return {
        input,
        valid: true,
        href: url.href,
        protocol: url.protocol,
        username: url.username,
        passwordPresent: url.password.length > 0,
        hostname: url.hostname,
        port: url.port,
        pathname: url.pathname,
        hash: url.hash,
        queryParameters: Array.from(url.searchParams.entries(), ([name, value], index) => ({
            index,
            name,
            value,
            decodedValue: decodeRepeatedly(value),
            nestedUrl: findNestedUrl(value),
        })),
    };
}

export function analyzeUrlSamples(inputs) {
    const analyses = inputs.map(analyzeUrl);
    const valid = analyses.filter((analysis) => analysis.valid);
    const parameters = new Map();

    for (const analysis of valid) {
        const namesInUrl = new Set();
        for (const parameter of analysis.queryParameters) {
            namesInUrl.add(parameter.name);
            if (!parameters.has(parameter.name)) {
                parameters.set(parameter.name, {
                    name: parameter.name,
                    occurrences: 0,
                    urls: 0,
                    values: new Set(),
                    nestedUrls: new Set(),
                });
            }
            const stats = parameters.get(parameter.name);
            stats.occurrences += 1;
            stats.values.add(parameter.value);
            if (parameter.nestedUrl) {
                stats.nestedUrls.add(parameter.nestedUrl);
            }
        }
        for (const name of namesInUrl) {
            parameters.get(name).urls += 1;
        }
    }

    return {
        analyses,
        validCount: valid.length,
        invalidCount: analyses.length - valid.length,
        sameHostname: valid.length > 0 && valid.every((item) => item.hostname === valid[0].hostname),
        samePathname: valid.length > 0 && valid.every((item) => item.pathname === valid[0].pathname),
        parameters: Array.from(parameters.values(), (stats) => ({
            name: stats.name,
            occurrences: stats.occurrences,
            urls: stats.urls,
            presentInAll: valid.length > 0 && stats.urls === valid.length,
            distinctValues: stats.values.size,
            constant: stats.values.size === 1,
            values: Array.from(stats.values),
            nestedUrls: Array.from(stats.nestedUrls),
        })).sort((a, b) => a.name.localeCompare(b.name)),
    };
}

export function matchParameterPattern(name, pattern) {
    if (pattern.startsWith("/") && pattern.endsWith("/") && pattern.length > 2) {
        try {
            return new RegExp(pattern.slice(1, -1), "i").test(name);
        } catch {
            return false;
        }
    }

    const escaped = pattern.replace(/[|\\{}()[\]^$+?.]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${escaped}$`, "i").test(name);
}

export function suggestSafeRedirectActions(analysis) {
    if (!analysis.valid) {
        return [];
    }

    return analysis.queryParameters
        .filter((parameter) => parameter.nestedUrl)
        .map((parameter) => {
            const safety = assessRedirectCandidate(analysis.href, parameter.nestedUrl);
            return {
                type: "unwrap-query-parameter",
                parameter: parameter.name,
                targetUrl: parameter.nestedUrl,
                confidence: "structural",
                safety,
                autoSuggest: shouldAutoSuggestRedirect(safety),
            };
        });
}

export function suggestParameterActions(analysis, removablePatterns = []) {
    if (!analysis.valid) {
        return [];
    }

    const suggestions = [];
    for (const parameter of analysis.queryParameters) {
        const matchedPattern = removablePatterns.find((pattern) => matchParameterPattern(parameter.name, pattern));
        if (matchedPattern) {
            suggestions.push({
                type: "remove-query-parameter",
                parameter: parameter.name,
                matchedPattern,
                confidence: "catalog",
            });
        }

        if (parameter.nestedUrl) {
            suggestions.push({
                type: "unwrap-query-parameter",
                parameter: parameter.name,
                targetUrl: parameter.nestedUrl,
                confidence: "structural",
            });
        }
    }
    return suggestions;
}
