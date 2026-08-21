import {
    filterRuleInputs,
    getRuleBehaviorCategory,
    getRuleSourceKind,
    groupRuleInputs,
    sortRuleInputs,
} from "../src/options/rule-grouping.js";

function input(title, group, overrides = {}) {
    const rule = {
        ...(group === undefined ? {} : { group }),
        ...overrides,
    };
    return {
        title,
        description: overrides.description || "",
        tag: overrides.tag || "",
        group: rule.group || "",
        rule,
        dataset: { uiSequence: String(overrides.uiSequence ?? 0) },
    };
}

test("groupRuleInputs keeps legacy lists flat when no rule has a group", () => {
    const groups = groupRuleInputs([input("Zulu"), input("Alpha")]);

    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBeNull();
    expect(groups[0].inputs.map(({ title }) => title)).toEqual(["Alpha", "Zulu"]);
});

test("groupRuleInputs creates named groups and places ungrouped rules last", () => {
    const groups = groupRuleInputs([
        input("Unassigned"),
        input("Redirect B", "Redirect cleanup"),
        input("Privacy B", "Privacy / Tracking parameters"),
        input("Privacy A", "Privacy / Tracking parameters"),
    ]);

    expect(groups.map(({ name }) => name)).toEqual([
        "Privacy / Tracking parameters",
        "Redirect cleanup",
        "",
    ]);
    expect(groups[0].inputs.map(({ title }) => title)).toEqual(["Privacy A", "Privacy B"]);
});

test("groupRuleInputs preserves literal group labels including percent signs", () => {
    const groups = groupRuleInputs([input("Rule", "100% Privacy")]);
    expect(groups[0].name).toBe("100% Privacy");
});

test("rule source classification keeps trust channels distinct from local rules", () => {
    expect(getRuleSourceKind({})).toBe("local");
    expect(getRuleSourceKind({ source: { catalog: "requestcontrol-official" } })).toBe("official");
    expect(getRuleSourceKind({ source: { id: "requestcontrol-community/privacy" } })).toBe("community");
    expect(getRuleSourceKind({ source: { url: "https://example.test/rules.json" } })).toBe("custom");
});

test("rule filtering combines search, status and source without mutating rule order", () => {
    const inputs = [
        input("Strip tracking", "Privacy", {
            uuid: "official",
            action: "filter",
            active: true,
            tag: "utm",
            source: { catalog: "requestcontrol-official", entry: "privacy" },
        }),
        input("Local redirect", "Redirects", {
            uuid: "local",
            action: "redirect",
            active: false,
            description: "unwrap destination",
        }),
    ];

    expect(filterRuleInputs(inputs, { query: "utm", status: "active", source: "official" }))
        .toEqual([inputs[0]]);
    expect(filterRuleInputs(inputs, { query: "unwrap", status: "disabled", source: "local" }))
        .toEqual([inputs[1]]);
    expect(inputs.map((item) => item.rule.uuid)).toEqual(["official", "local"]);
});

test("source grouping uses Official, Community, Custom, Local channel order", () => {
    const groups = groupRuleInputs([
        input("Local", undefined, { uuid: "l" }),
        input("Custom", undefined, { uuid: "x", source: { url: "https://example.test/rules.json" } }),
        input("Community", undefined, { uuid: "c", source: { catalog: "requestcontrol-community" } }),
        input("Official", undefined, { uuid: "o", source: { catalog: "requestcontrol-official" } }),
    ], { groupBy: "source", sort: "title" });

    expect(groups.map(({ name }) => name)).toEqual(["official", "community", "custom", "local"]);
});

test("manual sorting uses the separate UI order map rather than execution storage order", () => {
    const first = input("First", undefined, { uuid: "first", uiSequence: 0 });
    const second = input("Second", undefined, { uuid: "second", uiSequence: 1 });
    const original = [first, second];

    const sorted = sortRuleInputs(original, {
        sort: "manual",
        manualOrder: { first: 20, second: 10 },
    });

    expect(sorted.map((item) => item.rule.uuid)).toEqual(["second", "first"]);
    expect(original.map((item) => item.rule.uuid)).toEqual(["first", "second"]);
});


test("behavior grouping mirrors the Imports behavior hierarchy for managed rules", () => {
    const groups = groupRuleInputs([
        input("Local", undefined, { uuid: "l" }),
        input("Special", undefined, { uuid: "s", source: { behavior: "special-mode" } }),
        input("Redirect", undefined, { uuid: "r", source: { behavior: "direct-link" } }),
        input("Cleanup", undefined, { uuid: "u", source: { behavior: "url-cleanup" } }),
        input("Block", undefined, { uuid: "b", source: { behavior: "request-blocking" } }),
        input("Transform", undefined, { uuid: "t", source: { behavior: "media-quality" } }),
    ], { groupBy: "behavior", sort: "title" });

    expect(groups.map(({ name }) => name)).toEqual([
        "url-cleanup",
        "redirect",
        "request-transform",
        "block-allow",
        "privacy-special",
        "local-custom",
    ]);
    expect(getRuleBehaviorCategory({ source: { behavior: "site-cleanup" } })).toBe("url-cleanup");
    expect(getRuleBehaviorCategory({})).toBe("local-custom");
});
