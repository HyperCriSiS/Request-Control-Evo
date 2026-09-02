import fs from "node:fs";

const ruleListJs = fs.readFileSync(new URL("../src/options/rule-list.js", import.meta.url), "utf8");
const ruleListCss = fs.readFileSync(new URL("../src/options/rule-list.css", import.meta.url), "utf8");
const importCss = fs.readFileSync(new URL("../src/options/rule-import-input.css", import.meta.url), "utf8");

test("Rules selection uses one shared column without changing Import checkbox geometry", () => {
    expect(ruleListJs).toContain('selectAllTarget.className = "rule-select rule-select-all"');
    expect(ruleListCss).toContain("--rule-checkbox-size: 1.05rem");
    expect(ruleListCss).toContain("--rule-selection-column: 2.4rem");
    expect(ruleListCss).toContain('rule-list .rule-select > input[type="checkbox"]');
    expect(ruleListCss).toContain("grid-template-columns: var(--rule-selection-column) minmax(0, 1fr) auto");
    expect(ruleListCss).toContain("calc(var(--rule-selection-column) + 0.5rem)");
    expect(importCss).toContain('.selection-rule input[type="checkbox"]');
});

test("long rule strings wrap instead of being clipped by fixed desktop widths", () => {
    expect(ruleListCss).toContain('rule-list .rule-header .title:not([contenteditable="true"])');
    expect(ruleListCss).toContain("white-space: normal");
    expect(ruleListCss).toContain("overflow-wrap: anywhere");
    expect(ruleListCss).toContain("max-width: none");
});

test("coarse pointers enlarge the hit target without inflating the visual checkbox", () => {
    expect(ruleListCss).toContain("@media (hover: none) and (pointer: coarse)");
    expect(ruleListCss).toContain("--rule-checkbox-size: 1.15rem");
    expect(ruleListCss).toContain("--rule-selection-column: 2.75rem");
    expect(ruleListCss).toContain("min-block-size: 2.75rem");
});
