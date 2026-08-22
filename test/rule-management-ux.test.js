import fs from "node:fs";

const optionsHtml = fs.readFileSync(new URL("../src/options/options.html", import.meta.url), "utf8");
const optionsJs = fs.readFileSync(new URL("../src/options/options.js", import.meta.url), "utf8");
const optionsCss = fs.readFileSync(new URL("../src/options/options.css", import.meta.url), "utf8");
const ruleListJs = fs.readFileSync(new URL("../src/options/rule-list.js", import.meta.url), "utf8");
const ruleListCss = fs.readFileSync(new URL("../src/options/rule-list.css", import.meta.url), "utf8");
const ruleManagementUiJs = fs.readFileSync(new URL("../src/options/rule-management-ui.js", import.meta.url), "utf8");

test("large rule collections expose persistent search, filters, grouping and sorting", () => {
    expect(optionsHtml).toContain('id="ruleSearch"');
    expect(optionsHtml).toContain('id="ruleStatusFilter"');
    expect(optionsHtml).toContain('id="ruleSourceFilter"');
    expect(optionsHtml).toContain('id="ruleGroupBy"');
    expect(ruleManagementUiJs).toContain('option.value === "behavior"');
    expect(optionsHtml).toContain('id="ruleSort"');
    expect(optionsHtml).toContain('<option value="manual"');
    expect(optionsJs).toContain('const RULE_VIEW_SETTINGS_KEY = "ruleViewSettings"');
    expect(optionsJs).toContain("setupRuleViewControls");
    expect(optionsJs).toContain("applyRuleView");
});

test("per-rule Test, Export, Share and Delete actions are optional", () => {
    for (const command of ["test", "export", "share", "delete"]) {
        expect(optionsHtml).toContain(`data-rule-command="${command}"`);
    }
    expect(optionsHtml).toContain('id="showRuleQuickActions"');
    expect(optionsJs).toContain('const RULE_QUICK_ACTIONS_KEY = "ruleQuickActions"');
    expect(optionsCss).toContain("body.show-rule-quick-actions .rule-quick-actions");
    expect(optionsJs).toContain("showRuleTestDialog([input.rule])");
    expect(optionsJs).toContain("showCommunityShareDialog([input.rule])");
});

test("drag and drop persists only display order and leaves execution rule storage untouched", () => {
    expect(optionsHtml).toContain("rule-drag-handle");
    expect(ruleListJs).toContain('const handle = e.target.closest?.(".rule-drag-handle")');
    expect(ruleListJs).toContain('new CustomEvent("rule-ui-order-changed"');
    expect(optionsJs).toContain('const RULE_UI_ORDER_KEY = "ruleUiOrder"');
    const handlerStart = optionsJs.indexOf('document.addEventListener("rule-ui-order-changed"');
    const handlerEnd = optionsJs.indexOf('document.addEventListener("rule-import-deleted"', handlerStart);
    const handler = optionsJs.slice(handlerStart, handlerEnd);
    expect(handler).toContain("RULE_UI_ORDER_KEY");
    expect(handler).not.toContain('set({ rules:');
});

test("mobile selected-rule actions provide explicit close, Escape and separate action dismissal", () => {
    expect(ruleManagementUiJs).toContain("setupMobileSelectedActions()");
    expect(ruleManagementUiJs).toContain('className = "btn rc-mobile-toolbar-close"');
    expect(ruleManagementUiJs).toContain('event.key !== "Escape"');
    expect(ruleManagementUiJs).toContain('toolbar.querySelectorAll(".btn-selected-action")');
    expect(ruleManagementUiJs).toContain("event.stopPropagation()");
    expect(ruleManagementUiJs).toContain("closeMobileSelectedActions(toolbar, trigger)");
    expect(ruleManagementUiJs).toContain("trigger.focus()");
});

test("fixed rule types remain visible and distinct from user groups even when empty", () => {
    expect(ruleListJs).toContain('const FIXED_RULE_TYPES = new Set(["filter", "redirect", "secure", "block", "whitelist"])');
    expect(ruleListJs).toContain("get isFixedRuleType()");
    expect(ruleListJs).toContain("renderEmptyState(false)");
    expect(ruleListJs).toContain("renderEmptyState(true)");
    expect(ruleListJs).toContain('kind.className = "rule-type-kind"');
    expect(ruleListJs).toContain('title.classList.add("rule-type-title")');
    expect(ruleListCss).toContain("rule-list .rule-type-kind");
    expect(ruleListCss).toContain("rule-list .rule-list-empty-state");
    expect(ruleListCss).not.toContain("rule-list.view-empty {\n    display: none !important;");
});
