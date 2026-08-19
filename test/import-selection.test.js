import {
    initialSelectedRuleUuids,
    sameRuleSelection,
    selectableRuleUuids,
    selectedRules,
} from "../src/options/import-selection.js";

const rules = [
    { uuid: "one", title: "One" },
    { uuid: "two", title: "Two" },
    { title: "Missing UUID" },
];

test("new package imports default to every selectable rule", () => {
    expect([...initialSelectedRuleUuids(rules)]).toEqual(["one", "two"]);
});

test("existing partial imports preserve their explicit selection across updates", () => {
    const nextRules = [...rules, { uuid: "three", title: "New upstream rule" }];
    expect([...initialSelectedRuleUuids(nextRules, { selectedUuids: ["two"] })]).toEqual(["two"]);
});

test("legacy managed imports use their imported UUIDs as the initial selection", () => {
    expect([...initialSelectedRuleUuids(rules, { uuids: ["one"] })]).toEqual(["one"]);
});

test("selection helpers exclude rules without stable UUIDs", () => {
    expect(selectableRuleUuids(rules)).toEqual(["one", "two"]);
    expect(selectedRules(rules, new Set(["two"]))).toEqual([{ uuid: "two", title: "Two" }]);
});

test("selection comparison is order independent", () => {
    expect(sameRuleSelection(["one", "two"], ["two", "one"])).toBe(true);
    expect(sameRuleSelection(["one"], ["two"])).toBe(false);
});
