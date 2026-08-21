/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export function buildSuggestedFilterRule(analysis, suggestions, uuid) {
    if (!analysis || !analysis.valid || !uuid) {
        throw new Error("A valid analysis and UUID are required");
    }

    const removeParameters = [...new Set(
        suggestions
            .filter(({ type }) => type === "remove-query-parameter")
            .map(({ parameter }) => parameter)
    )];
    const unwrap = suggestions.some(({ type }) => type === "unwrap-query-parameter");

    if (removeParameters.length === 0 && !unwrap) {
        throw new Error("At least one supported suggestion is required");
    }

    const rule = {
        uuid,
        pattern: {
            scheme: analysis.protocol.replace(/:$/, ""),
            host: [analysis.hostname],
            path: [`${analysis.pathname || "/"}*`],
        },
        types: ["main_frame", "sub_frame"],
        action: "filter",
        active: false,
        title: `Suggested cleanup: ${analysis.hostname}`,
        description: "Generated locally from Inspector URL analysis. Review and test before enabling.",
        group: unwrap ? "Redirect cleanup" : "Privacy / Tracking parameters",
    };

    if (removeParameters.length > 0) {
        rule.paramsFilter = { values: removeParameters };
    }
    if (!unwrap) {
        rule.skipRedirectionFilter = true;
    }

    return rule;
}
