import { filterRuleInputs } from "../src/options/rule-grouping.js";

function input(title, group) {
    return {
        title,
        description: "",
        tag: "",
        group: group || "",
        rule: { active: true, ...(group ? { group } : {}) },
    };
}

test("group filter supports named groups and ungrouped rules", () => {
    const privacy = input("Privacy", "Privacy");
    const local = input("Local");

    expect(filterRuleInputs([privacy, local], { group: "group:Privacy" })).toEqual([privacy]);
    expect(filterRuleInputs([privacy, local], { group: "ungrouped" })).toEqual([local]);
});

test("group filter keeps reserved labels safe inside prefixed group values", () => {
    const literalAll = input("Literal", "all");
    expect(filterRuleInputs([literalAll], { group: "group:all" })).toEqual([literalAll]);
});
