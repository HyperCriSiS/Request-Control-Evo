/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const ACTION_PRIORITIES = Object.freeze({
    whitelist: 400,
    block: 300,
    secure: 200,
    redirect: 100,
    filter: 100,
});

const DNR_RESOURCE_TYPES = Object.freeze([
    "main_frame",
    "sub_frame",
    "stylesheet",
    "script",
    "image",
    "font",
    "object",
    "xmlhttprequest",
    "ping",
    "csp_report",
    "media",
    "websocket",
    "webtransport",
    "webbundle",
    "other",
]);

const DNR_REQUEST_METHODS = new Set([
    "connect",
    "delete",
    "get",
    "head",
    "options",
    "patch",
    "post",
    "put",
    "other",
]);

const REDIRECT_ACTIONS = new Set(["redirect", "filter"]);

function diagnostic(code, message, level = "error", detail = {}) {
    return { code, message, level, ...detail };
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function expandHosts(pattern) {
    const hosts = Array.isArray(pattern.host) ? pattern.host : [pattern.host];
    const expanded = [];

    for (const host of hosts) {
        if (typeof host !== "string" || host.length === 0) {
            return { error: diagnostic("invalid-host", "A non-empty host pattern is required.") };
        }
        if (!host.endsWith(".*")) {
            expanded.push(host);
            continue;
        }
        if (!Array.isArray(pattern.topLevelDomains) || pattern.topLevelDomains.length === 0) {
            return {
                error: diagnostic(
                    "missing-tld-expansion",
                    "A trailing TLD wildcard requires an explicit topLevelDomains list."
                ),
            };
        }
        const prefix = host.slice(0, -1);
        for (const tld of pattern.topLevelDomains) {
            if (typeof tld !== "string" || tld.length === 0 || /[^\x00-\x7F]/.test(tld)) {
                return { error: diagnostic("unsupported-tld", "TLD expansions must be non-empty ASCII strings.") };
            }
            expanded.push(`${prefix}${tld}`);
        }
    }
    return { hosts: expanded };
}

function schemeRegex(scheme) {
    switch (scheme) {
        case "*":
            return "(?:http|https|ws|wss)";
        case "http":
        case "https":
        case "ws":
        case "wss":
        case "ftp":
            return escapeRegex(scheme);
        default:
            return null;
    }
}

function hostRegex(host) {
    if (/[^\x00-\x7F]/.test(host) || host.includes("[")) {
        return null;
    }
    if (host === "*") {
        return "[^/]+";
    }

    const wildcardSubdomain = host.startsWith("*.");
    const literal = wildcardSubdomain ? host.slice(2) : host;
    if (literal.includes("*")) {
        return null;
    }

    const hasExplicitPort = /:\d+$/.test(literal);
    const escaped = escapeRegex(literal);
    const prefix = wildcardSubdomain ? "(?:[^./:]+\\.)*" : "";
    return `${prefix}${escaped}${hasExplicitPort ? "" : "(?::\\d+)?"}`;
}

function pathRegex(path) {
    const normalized = path == null || path === "" ? "/" : path.startsWith("/") ? path : `/${path}`;
    let result = "";
    for (const char of normalized) {
        result += char === "*" ? ".*" : escapeRegex(char);
    }
    return result;
}

function compileUrlConditions(pattern) {
    if (!pattern || typeof pattern !== "object") {
        return { diagnostics: [diagnostic("missing-pattern", "A Request Control pattern is required.")] };
    }
    if (pattern.includes && pattern.includes.length > 0) {
        return {
            diagnostics: [
                diagnostic(
                    "includes-matcher-unsupported",
                    "Request Control include globs/regular expressions do not have a proven exact DNR translation yet."
                ),
            ],
        };
    }
    if (pattern.excludes && pattern.excludes.length > 0) {
        return {
            diagnostics: [
                diagnostic(
                    "excludes-matcher-unsupported",
                    "Request Control exclude globs/regular expressions do not have a proven exact DNR translation yet."
                ),
            ],
        };
    }
    if (pattern.anyTLD) {
        return {
            diagnostics: [
                diagnostic(
                    "any-tld-matcher-unsupported",
                    "The custom any-TLD matcher depends on registrable-domain parsing and is not compiled approximately."
                ),
            ],
        };
    }
    if (typeof pattern.incognito === "boolean") {
        return {
            diagnostics: [
                diagnostic(
                    "incognito-condition-unsupported",
                    "DNR has no equivalent per-rule incognito condition for persistent rules."
                ),
            ],
        };
    }

    const conditionBase = {};
    switch (pattern.origin) {
        case undefined:
        case null:
        case "":
            break;
        case "same-domain":
            conditionBase.domainType = "firstParty";
            break;
        case "third-party-domain":
            conditionBase.domainType = "thirdParty";
            break;
        case "same-origin":
        case "third-party-origin":
            return {
                diagnostics: [
                    diagnostic(
                        "origin-matcher-unsupported",
                        "DNR domainType compares registrable domains, not full origins."
                    ),
                ],
            };
        default:
            return { diagnostics: [diagnostic("unknown-origin-matcher", `Unknown origin matcher: ${pattern.origin}`)] };
    }

    if (Array.isArray(pattern.method) && pattern.method.length > 0) {
        const methods = pattern.method.map((method) => String(method).toLowerCase());
        const unsupported = methods.filter((method) => !DNR_REQUEST_METHODS.has(method));
        if (unsupported.length > 0) {
            return {
                diagnostics: [
                    diagnostic(
                        "request-method-unsupported",
                        `DNR cannot represent these request methods exactly: ${unsupported.join(", ")}.`
                    ),
                ],
            };
        }
        conditionBase.requestMethods = [...new Set(methods)];
    }

    if (pattern.allUrls) {
        return {
            diagnostics: [],
            conditions: [
                {
                    ...conditionBase,
                    regexFilter: "^(?:http|https|ws|wss|ftp|file|data):",
                    isUrlFilterCaseSensitive: true,
                },
            ],
        };
    }

    const scheme = schemeRegex(pattern.scheme);
    if (!scheme) {
        return {
            diagnostics: [
                diagnostic(
                    "scheme-unsupported",
                    `The scheme '${pattern.scheme}' is outside the compiler's proven match-pattern subset.`
                ),
            ],
        };
    }

    const hostExpansion = expandHosts(pattern);
    if (hostExpansion.error) {
        return { diagnostics: [hostExpansion.error] };
    }
    const paths = Array.isArray(pattern.path) ? pattern.path : [pattern.path == null ? "" : pattern.path];
    const conditions = [];

    for (const host of hostExpansion.hosts) {
        const compiledHost = hostRegex(host);
        if (!compiledHost) {
            return {
                diagnostics: [
                    diagnostic(
                        "host-pattern-unsupported",
                        `The host pattern '${host}' is outside the compiler's proven ASCII match-pattern subset.`
                    ),
                ],
            };
        }
        for (const path of paths) {
            if (typeof path !== "string" || /[^\x00-\x7F]/.test(path) || path.includes("#")) {
                return {
                    diagnostics: [
                        diagnostic(
                            "path-pattern-unsupported",
                            "DNR regex filters are ASCII-only and Request Control fragment match patterns never match."
                        ),
                    ],
                };
            }
            conditions.push({
                ...conditionBase,
                regexFilter: `^${scheme}:\\/\\/${compiledHost}${pathRegex(path)}$`,
                isUrlFilterCaseSensitive: true,
            });
        }
    }

    return { diagnostics: [], conditions };
}

function compileResourceTypes(types) {
    if (types == null) {
        return { resourceTypes: [...DNR_RESOURCE_TYPES], diagnostics: [] };
    }
    if (!Array.isArray(types)) {
        return { diagnostics: [diagnostic("invalid-resource-types", "Rule types must be an array when present.")] };
    }
    if (types.length === 0) {
        return { resourceTypes: [], diagnostics: [] };
    }
    const unsupported = types.filter((type) => !DNR_RESOURCE_TYPES.includes(type));
    if (unsupported.length > 0) {
        return {
            diagnostics: [
                diagnostic(
                    "resource-type-unsupported",
                    `These Firefox request types have no exact DNR resource type: ${unsupported.join(", ")}.`
                ),
            ],
        };
    }
    return { resourceTypes: [...new Set(types)], diagnostics: [] };
}

function isLiteralQueryParameter(value) {
    return typeof value === "string" && value.length > 0 && !/[?*]/.test(value) && !/^\/.*\/$/.test(value);
}

function compileAction(rule, { allowApproximate }) {
    switch (rule.action) {
        case "block":
            return { action: { type: "block" }, diagnostics: [], status: "supported" };
        case "secure":
            return { action: { type: "upgradeScheme" }, diagnostics: [], status: "supported" };
        case "whitelist":
            if (rule.log) {
                return {
                    diagnostics: [
                        diagnostic(
                            "logged-whitelist-unsupported",
                            "DNR can allow the request but cannot preserve Request Control's logged-whitelist notification semantics."
                        ),
                    ],
                    status: "unsupported",
                };
            }
            return { action: { type: "allow" }, diagnostics: [], status: "supported" };
        case "redirect": {
            if (rule.redirectDocument) {
                return {
                    diagnostics: [
                        diagnostic(
                            "redirect-document-unsupported",
                            "redirectDocument updates the tab for non-main-frame requests and cannot be represented by a DNR redirect."
                        ),
                    ],
                    status: "unsupported",
                };
            }
            if (typeof rule.redirectUrl !== "string" || rule.redirectUrl.includes("[")) {
                return {
                    diagnostics: [
                        diagnostic(
                            "redirect-dsl-unsupported",
                            "The Request Control redirect instruction/parameter DSL requires a dedicated compiler."
                        ),
                    ],
                    status: "unsupported",
                };
            }
            try {
                const url = new URL(rule.redirectUrl);
                if (!new Set(["http:", "https:", "ftp:"]).has(url.protocol)) {
                    throw new Error("unsupported protocol");
                }
                return { action: { type: "redirect", redirect: { url: url.href } }, diagnostics: [], status: "supported" };
            } catch {
                return {
                    diagnostics: [
                        diagnostic("static-redirect-unsupported", "Only static absolute HTTP(S)/FTP redirects are compiled initially."),
                    ],
                    status: "unsupported",
                };
            }
        }
        case "filter": {
            if (rule.redirectDocument) {
                return {
                    diagnostics: [
                        diagnostic("filter-redirect-document-unsupported", "Filter redirectDocument semantics require tab navigation."),
                    ],
                    status: "unsupported",
                };
            }
            if (!rule.skipRedirectionFilter) {
                return {
                    diagnostics: [
                        diagnostic(
                            "inline-url-filter-unsupported",
                            "Request Control's automatic inline/nested URL extraction is procedural and has no general DNR transform."
                        ),
                    ],
                    status: "unsupported",
                };
            }
            if (rule.trimAllParams) {
                return {
                    action: { type: "redirect", redirect: { transform: { query: "" } } },
                    diagnostics: [],
                    status: "supported",
                };
            }
            if (!rule.paramsFilter) {
                return {
                    diagnostics: [diagnostic("filter-noop", "This filter performs no URL transformation.", "info")],
                    status: "supported",
                    noop: true,
                };
            }
            if (rule.paramsFilter.invert) {
                return {
                    diagnostics: [
                        diagnostic(
                            "inverted-parameter-filter-unsupported",
                            "DNR queryTransform can remove named keys but cannot express 'remove every key except these patterns'."
                        ),
                    ],
                    status: "unsupported",
                };
            }
            const values = Array.isArray(rule.paramsFilter.values) ? rule.paramsFilter.values : [];
            const nonLiteral = values.filter((value) => !isLiteralQueryParameter(value));
            if (nonLiteral.length > 0) {
                return {
                    diagnostics: [
                        diagnostic(
                            "parameter-pattern-unsupported",
                            `DNR removeParams accepts query keys, not Request Control wildcard/regexp patterns: ${nonLiteral.join(", ")}.`
                        ),
                    ],
                    status: "unsupported",
                };
            }
            const action = {
                type: "redirect",
                redirect: { transform: { queryTransform: { removeParams: [...new Set(values)] } } },
            };
            const approximation = diagnostic(
                "parameter-case-semantics-unproven",
                "Request Control query-parameter patterns are case-insensitive; DNR removeParams does not document equivalent case-folding. The candidate is not activatable without explicit approximation opt-in.",
                "warning"
            );
            return {
                action,
                candidateAction: action,
                diagnostics: [approximation],
                status: allowApproximate ? "approximate" : "approximate",
                activatable: Boolean(allowApproximate),
            };
        }
        default:
            return {
                diagnostics: [diagnostic("action-unsupported", `Unsupported Request Control action: ${rule.action}`)],
                status: "unsupported",
            };
    }
}

function conditionFingerprint(condition) {
    const copy = { ...condition };
    return JSON.stringify(Object.fromEntries(Object.entries(copy).sort(([a], [b]) => a.localeCompare(b))));
}

export function compileRuleToDnr(rule, { startId = 1, allowApproximate = false } = {}) {
    if (!Number.isInteger(startId) || startId < 1) {
        throw new RangeError("startId must be an integer >= 1");
    }
    if (!rule || typeof rule !== "object") {
        return {
            status: "unsupported",
            rules: [],
            diagnostics: [diagnostic("invalid-rule", "A Request Control rule object is required.")],
            nextId: startId,
        };
    }
    if (rule.active === false) {
        return {
            sourceUuid: rule.uuid,
            status: "disabled",
            rules: [],
            diagnostics: [diagnostic("rule-disabled", "Disabled rules are not emitted to DNR.", "info")],
            nextId: startId,
        };
    }

    const conditionResult = compileUrlConditions(rule.pattern);
    const resourceResult = compileResourceTypes(rule.types);
    const actionResult = compileAction(rule, { allowApproximate });
    const diagnostics = [
        ...(conditionResult.diagnostics || []),
        ...(resourceResult.diagnostics || []),
        ...(actionResult.diagnostics || []),
    ];

    if (diagnostics.some(({ level }) => level === "error") || actionResult.status === "unsupported") {
        return { sourceUuid: rule.uuid, status: "unsupported", rules: [], diagnostics, nextId: startId };
    }
    if (resourceResult.resourceTypes.length === 0 || actionResult.noop) {
        return { sourceUuid: rule.uuid, status: actionResult.status, rules: [], diagnostics, nextId: startId };
    }

    const activatable = actionResult.status !== "approximate" || actionResult.activatable;
    const dnrRules = [];
    let id = startId;
    if (activatable) {
        for (const condition of conditionResult.conditions) {
            dnrRules.push({
                id: id++,
                priority: ACTION_PRIORITIES[rule.action],
                action: actionResult.action,
                condition: { ...condition, resourceTypes: resourceResult.resourceTypes },
            });
        }
    }

    return {
        sourceUuid: rule.uuid,
        status: actionResult.status,
        rules: dnrRules,
        diagnostics,
        nextId: id,
        candidateAction: actionResult.candidateAction,
    };
}

export function compileRulesToDnr(sourceRules, options = {}) {
    const results = [];
    const rules = [];
    const diagnostics = [];
    let nextId = options.startId || 1;

    for (const sourceRule of sourceRules || []) {
        const result = compileRuleToDnr(sourceRule, { ...options, startId: nextId });
        results.push(result);
        rules.push(...result.rules);
        diagnostics.push(...result.diagnostics.map((item) => ({ ...item, sourceUuid: sourceRule && sourceRule.uuid })));
        nextId = result.nextId;
    }

    const redirectConditions = new Map();
    for (let index = 0; index < results.length; index++) {
        const source = sourceRules[index];
        if (!source || !REDIRECT_ACTIONS.has(source.action)) {
            continue;
        }
        for (const rule of results[index].rules) {
            if (rule.action.type !== "redirect") {
                continue;
            }
            const key = `${rule.priority}:${conditionFingerprint(rule.condition)}`;
            if (!redirectConditions.has(key)) {
                redirectConditions.set(key, []);
            }
            redirectConditions.get(key).push({ sourceUuid: source.uuid, id: rule.id });
        }
    }

    const conflicts = [];
    for (const entries of redirectConditions.values()) {
        if (entries.length < 2) {
            continue;
        }
        conflicts.push({
            code: "redirect-composition-conflict",
            sourceUuids: entries.map(({ sourceUuid }) => sourceUuid),
            dnrRuleIds: entries.map(({ id }) => id),
            message:
                "Request Control composes redirect/filter rules at the same priority, while DNR selects at most one before-request candidate.",
        });
    }

    const unsupported = results.some(({ status }) => status === "unsupported");
    const approximate = results.some(({ status }) => status === "approximate");
    const status = conflicts.length > 0 || unsupported ? "unsupported" : approximate ? "approximate" : "supported";

    return { status, rules, results, diagnostics, conflicts, nextId };
}

export const dnrCompilerCapabilities = Object.freeze({
    actions: Object.freeze({
        block: "supported",
        secure: "supported",
        whitelist: "supported-without-log",
        redirect: "static-absolute-only",
        filter: "trim-all-supported; literal-remove-params-approximate; inline-url-unwrapping-unsupported",
    }),
    priorities: ACTION_PRIORITIES,
    resourceTypes: DNR_RESOURCE_TYPES,
});
