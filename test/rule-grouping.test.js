import { groupRuleInputs } from "../src/options/rule-grouping.js";

function input(title, group) {
    return {
        title,
        rule: group === undefined ? {} : { group },
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
