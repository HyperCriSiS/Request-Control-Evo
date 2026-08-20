import fs from "node:fs";

const ui = fs.readFileSync(new URL("../src/options/rule-management-ui.js", import.meta.url), "utf8");
const list = fs.readFileSync(new URL("../src/options/rule-list.js", import.meta.url), "utf8");

test("rule quick actions are independently configurable instead of all-or-nothing", () => {
    expect(list).toContain('import "./rule-management-ui.js"');
    expect(ui).toContain('const QUICK_COMMANDS = ["test", "export", "share", "delete"]');
    expect(ui).toContain("data.quickActionToggle");
    expect(ui).toContain("rc-show-quick-test");
    expect(ui).toContain("rc-show-quick-export");
    expect(ui).toContain("rc-show-quick-share");
    expect(ui).toContain("rc-show-quick-delete");
});

test("rule edit and enable-disable controls are rendered compactly as icons", () => {
    expect(ui).toContain('.btn-edit::before { content: "✎"; }');
    expect(ui).toContain('.btn-activate::before { content: "⏻"; }');
    expect(ui).toContain('edit.setAttribute("aria-label", label)');
    expect(ui).toContain('activate.setAttribute("aria-label", label)');
});

test("groups can be created in the command bar and filtered through a dropdown", () => {
    expect(ui).toContain('select.id = "ruleGroupFilter"');
    expect(ui).toContain('add.addEventListener("click", createGroup)');
    expect(ui).toContain('option.value = `group:${name}`');
    expect(ui).toContain('input.setAttribute("list", datalist.id)');
    expect(ui).toContain('group: selectedGroup');
});
