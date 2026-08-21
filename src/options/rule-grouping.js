/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { CATALOG_CATEGORY_ORDER, catalogCategoryForEntry } from "./catalog-groups.js";

const SOURCE_ORDER = ["official", "community", "custom", "local"];
const BEHAVIOR_GROUP_FALLBACK = "local-custom";

export function getRuleSourceKind(rule) {
    const source = rule?.source;
    if (!source) {
        return "local";
    }

    const catalog = String(source.catalog || "").toLowerCase();
    const id = String(source.id || "").toLowerCase();
    if (catalog.includes("official") || id.includes("requestcontrol-official")) {
        return "official";
    }
    if (catalog.includes("community") || id.includes("requestcontrol-community")) {
        return "community";
    }
    return "custom";
}


export function getRuleBehaviorCategory(rule) {
    const behavior = rule?.source?.behavior;
    if (!behavior) {
        return BEHAVIOR_GROUP_FALLBACK;
    }
    return catalogCategoryForEntry({ behavior });
}

export function filterRuleInputs(inputs, view = {}) {
    const query = String(view.query || "").trim().toLocaleLowerCase();
    const status = view.status || "all";
    const source = view.source || "all";
    const group = view.group || "all";

    return inputs.filter((input) => {
        const rule = input.rule || {};
        if (status === "active" && rule.active !== true) {
            return false;
        }
        if (status === "disabled" && rule.active === true) {
            return false;
        }
        if (source !== "all" && getRuleSourceKind(rule) !== source) {
            return false;
        }
        const ruleGroup = String(rule.group || "").trim();
        if (group === "ungrouped" && ruleGroup) {
            return false;
        }
        if (group.startsWith("group:") && ruleGroup !== group.slice("group:".length)) {
            return false;
        }
        if (!query) {
            return true;
        }

        const sourceText = rule.source
            ? [
                rule.source.catalog,
                rule.source.id,
                rule.source.entry,
                rule.source.name,
                rule.source.behavior,
                rule.source.scope,
                rule.source.risk,
                rule.source.url,
            ].filter(Boolean).join(" ")
            : "local";
        const haystack = [
            input.title,
            input.description,
            input.tag,
            input.group,
            rule.action,
            sourceText,
        ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase();
        return haystack.includes(query);
    });
}

export function sortRuleInputs(inputs, view = {}) {
    const mode = view.sort || "title";
    const manualOrder = view.manualOrder || {};
    const sorted = [...inputs];

    if (mode === "manual") {
        return sorted.sort((a, b) => compareNumber(manualRank(a, manualOrder), manualRank(b, manualOrder)));
    }

    if (mode === "source") {
        return sorted.sort((a, b) => {
            const sourceCompare = compareSource(getRuleSourceKind(a.rule), getRuleSourceKind(b.rule));
            return sourceCompare || compareText(a.title, b.title);
        });
    }

    const direction = mode === "title-desc" ? -1 : 1;
    return sorted.sort((a, b) => direction * compareText(a.title, b.title));
}

export function groupRuleInputs(inputs, view = {}) {
    const sorted = sortRuleInputs(inputs, view);
    const groupBy = view.groupBy || "group";

    if (groupBy === "none" || sorted.length === 0) {
        return [{ name: null, inputs: sorted }];
    }

    if (groupBy === "source") {
        return groupByName(sorted, (input) => getRuleSourceKind(input.rule), compareSource);
    }

    if (groupBy === "behavior") {
        return groupByName(sorted, (input) => getRuleBehaviorCategory(input.rule), compareBehaviorGroups);
    }

    const hasNamedGroup = sorted.some((input) => Boolean(input.rule?.group));
    if (!hasNamedGroup) {
        return [{ name: null, inputs: sorted }];
    }

    return groupByName(sorted, (input) => input.rule?.group || "", compareGroupNames);
}

function groupByName(inputs, getName, compareNames) {
    const groups = new Map();
    for (const input of inputs) {
        const name = getName(input);
        if (!groups.has(name)) {
            groups.set(name, []);
        }
        groups.get(name).push(input);
    }
    return Array.from(groups, ([name, groupInputs]) => ({ name, inputs: groupInputs })).sort((a, b) =>
        compareNames(a.name, b.name)
    );
}

function manualRank(input, manualOrder) {
    const stored = Number(manualOrder[input.rule?.uuid]);
    if (Number.isFinite(stored)) {
        return stored;
    }
    const sequence = Number(input.dataset?.uiSequence);
    return Number.isFinite(sequence) ? sequence + 1000000 : Number.MAX_SAFE_INTEGER;
}

function compareSource(a, b) {
    const ai = SOURCE_ORDER.indexOf(a);
    const bi = SOURCE_ORDER.indexOf(b);
    if (ai !== bi) {
        return (ai === -1 ? SOURCE_ORDER.length : ai) - (bi === -1 ? SOURCE_ORDER.length : bi);
    }
    return compareText(a, b);
}


function compareBehaviorGroups(a, b) {
    const ai = CATALOG_CATEGORY_ORDER.indexOf(a);
    const bi = CATALOG_CATEGORY_ORDER.indexOf(b);
    if (ai !== bi) {
        return (ai === -1 ? CATALOG_CATEGORY_ORDER.length : ai) -
            (bi === -1 ? CATALOG_CATEGORY_ORDER.length : bi);
    }
    return compareText(a, b);
}

function compareGroupNames(a, b) {
    if (!a) return 1;
    if (!b) return -1;
    return compareText(a, b);
}

function compareNumber(a, b) {
    if (a === b) return 0;
    return a < b ? -1 : 1;
}

function compareText(a = "", b = "") {
    return String(a).localeCompare(String(b), undefined, { sensitivity: "base", numeric: true });
}
