/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {assessRedirectCandidate, shouldAutoSuggestRedirect} from "../intelligence/redirect-safety.js";

const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

// These are intentionally limited to parameter families whose primary purpose is
// attribution/tracking. Ambiguous names such as ref/source stay review-only.
export const CONSERVATIVE_PARAMETER_PATTERNS = Object.freeze([
    "utm_*",
    "fbclid",
    "gclid",
    "dclid",
    "msclkid",
    "twclid",
    "yclid",
    "gbraid",
    "wbraid",
    "mc_cid",
    "mc_eid",
    "mkt_tok",
    "vero_conv",
    "vero_id",
]);

export const REVIEW_PARAMETER_PATTERNS = Object.freeze([
    "ref",
    "referrer",
    "ref_*",
    "source",
    "src",
    "campaign",
    "campaign_id",
    "affiliate",
    "aff",
    "aff_id",
    "clickid",
    "click_id",
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

    if (!HTTP_PROTOCOLS.has(url.protocol)) {
        return {
            input,
            valid: false,
            error: "unsupported-protocol",
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
                parameterIndex: parameter.index,
                targetUrl: parameter.nestedUrl,
                confidence: "structural",
                safety,
                autoSuggest: shouldAutoSuggestRedirect(safety),
            };
        });
}

export function assessQueryParameters(
    analysis,
    removablePatterns = CONSERVATIVE_PARAMETER_PATTERNS,
    reviewPatterns = REVIEW_PARAMETER_PATTERNS
) {
    if (!analysis.valid) {
        return [];
    }

    const redirects = new Map(
        suggestSafeRedirectActions(analysis).map((suggestion) => [suggestion.parameterIndex, suggestion])
    );

    return analysis.queryParameters.map((parameter) => {
        const matchedPattern = removablePatterns.find((pattern) => matchParameterPattern(parameter.name, pattern)) || null;
        const reviewPattern = reviewPatterns.find((pattern) => matchParameterPattern(parameter.name, pattern)) || null;
        const redirect = redirects.get(parameter.index) || null;

        let classification = "ordinary";
        if (matchedPattern) {
            classification = "tracking";
        } else if (redirect?.autoSuggest) {
            classification = "redirect";
        } else if (redirect) {
            classification = "redirect-review";
        } else if (reviewPattern) {
            classification = "review";
        }

        return {
            ...parameter,
            classification,
            matchedPattern,
            reviewPattern,
            redirect,
        };
    });
}

export function suggestParameterActions(analysis, removablePatterns = CONSERVATIVE_PARAMETER_PATTERNS) {
    if (!analysis.valid) {
        return [];
    }

    const suggestions = [];
    for (const assessment of assessQueryParameters(analysis, removablePatterns)) {
        if (assessment.matchedPattern) {
            suggestions.push({
                type: "remove-query-parameter",
                parameter: assessment.name,
                matchedPattern: assessment.matchedPattern,
                confidence: "high",
                autoSuggest: true,
            });
        }

        if (assessment.redirect) {
            suggestions.push(assessment.redirect);
        }
    }
    return suggestions;
}
