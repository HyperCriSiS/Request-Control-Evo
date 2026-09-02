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

test("installed packages keep their UUID selection when upstream adds rules", () => {
    const nextRules = [...rules, { uuid: "three", title: "New upstream rule" }];
    expect([...initialSelectedRuleUuids(nextRules, { uuids: ["one", "two"] })]).toEqual(["one", "two"]);
});

test("an explicitly empty stored selection remains empty", () => {
    expect([...initialSelectedRuleUuids(rules, { selectedUuids: [] })]).toEqual([]);
});

test("selection helpers exclude rules without stable UUIDs", () => {
    expect(selectableRuleUuids(rules)).toEqual(["one", "two"]);
    expect(selectedRules(rules, new Set(["two"]))).toEqual([{ uuid: "two", title: "Two" }]);
});

test("selection comparison is order independent", () => {
    expect(sameRuleSelection(["one", "two"], ["two", "one"])).toBe(true);
    expect(sameRuleSelection(["one"], ["two"])).toBe(false);
});

test("large packages preserve sparse installed selections when upstream grows", () => {
    const largeRules = Array.from({ length: 2000 }, (_, index) => ({
        uuid: `rule-${index}`,
        title: `Rule ${index}`,
    }));
    const installed = Array.from({ length: 200 }, (_, index) => `rule-${index * 5}`);

    const initial = initialSelectedRuleUuids(largeRules, { selectedUuids: installed });
    expect(initial.size).toBe(installed.length);
    expect([...initial]).toEqual(installed);

    const expandedRules = [
        ...largeRules,
        ...Array.from({ length: 250 }, (_, index) => ({
            uuid: `new-rule-${index}`,
            title: `New rule ${index}`,
        })),
    ];
    const afterUpdate = initialSelectedRuleUuids(expandedRules, { selectedUuids: installed });
    expect(afterUpdate.size).toBe(installed.length);
    expect([...afterUpdate]).toEqual(installed);
    expect(selectedRules(expandedRules, afterUpdate)).toHaveLength(installed.length);
});
