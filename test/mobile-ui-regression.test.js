import fs from "node:fs";

const optionsCss = fs.readFileSync(new URL("../src/options/options.css", import.meta.url), "utf8");
const optionsHtml = fs.readFileSync(new URL("../src/options/options.html", import.meta.url), "utf8");
const commonCss = fs.readFileSync(new URL("../src/options/common.css", import.meta.url), "utf8");
const ruleInputCss = fs.readFileSync(new URL("../src/options/rule-input.css", import.meta.url), "utf8");
const ruleListCss = fs.readFileSync(new URL("../src/options/rule-list.css", import.meta.url), "utf8");
const ruleImportCss = fs.readFileSync(new URL("../src/options/rule-import-input.css", import.meta.url), "utf8");
const ruleImportJs = fs.readFileSync(new URL("../src/options/rule-import-input.js", import.meta.url), "utf8");
const modalCss = fs.readFileSync(new URL("../src/options/modal-dialog.css", import.meta.url), "utf8");
const popupCss = fs.readFileSync(new URL("../src/popup/browser-action.css", import.meta.url), "utf8");
const inspectorCss = fs.readFileSync(new URL("../src/inspector/inspector.css", import.meta.url), "utf8");
const analyzerCss = fs.readFileSync(new URL("../src/analyzer/analyzer.css", import.meta.url), "utf8");

test("mobile rule selection remains reachable instead of being hidden", () => {
    expect(ruleInputCss).toContain(".editing .rule-select");
    expect(ruleInputCss).not.toMatch(/\n\s*\.rule-select\s*\{\s*display:\s*none\s*!important/);
    expect(ruleListCss).not.toMatch(/rule-list \.select-all \{\s*display:\s*none/);
    expect(ruleListCss).toContain("min-height: 2.75rem");
    expect(optionsHtml).toContain('<label class="rule-select">');
});

test("Android-sized touch targets are provided across interactive surfaces", () => {
    expect(commonCss).toContain("min-height: 2.75rem");
    expect(popupCss).toContain("min-height: 2.75rem");
    expect(inspectorCss).toContain("min-height: 2.75rem");
    expect(analyzerCss).toContain("min-height: 2.75rem");
    expect(ruleImportCss).toContain(".selection-toggle");
    expect(ruleImportCss).toContain("max-height: 50dvh");
    expect(ruleImportJs).toContain("selection-toolbar");
});

test("Firefox popup keeps an intrinsic desktop width without provisional viewport collapse", () => {
    expect(optionsCss).toContain("overflow-x: auto");
    expect(optionsCss).toContain("100dvh");
    expect(optionsCss).not.toContain("z-index: -1");
    expect(optionsCss).toContain("z-index: 20");
    expect(popupCss).toContain("width: 22rem");
    expect(popupCss).toContain("min-width: 22rem");
    expect(popupCss).toContain("@media (hover: none) and (pointer: coarse) and (max-width: 28rem)");
    expect(popupCss).not.toContain("min-width: min(22rem, 100vw)");
});

test("mobile dialogs use the dynamic viewport and cannot exceed screen width", () => {
    expect(modalCss).toContain("height: 100dvh");
    expect(modalCss).toContain("max-width: calc(100% - 1rem)");
    expect(modalCss).toContain("max-height: calc(100dvh - 1rem)");
});

test("Firefox Android package selection remains compact and fully manageable", () => {
    expect(optionsHtml).toContain('id="official-rule-lists"');
    expect(optionsHtml).toContain('id="official-update-all"');
    expect(optionsHtml).toContain('id="community-rule-lists"');
    expect(optionsHtml).toContain('id="custom-rule-lists"');
    expect(ruleImportCss).toContain("min-height: 2.75rem");
    expect(ruleImportCss).toContain("max-height: 50dvh");
    expect(ruleImportJs).toContain('"select-all-rules"');
    expect(ruleImportJs).toContain('"select-no-rules"');
    expect(ruleImportJs).toContain('"invert-rule-selection"');
    expect(ruleImportJs).toContain('"reset-rule-selection"');
});

test("large package toggles avoid full checkbox resynchronization on every tap", () => {
    expect(ruleImportJs).toContain("this._selectableRuleCount = selectable.length");
    expect(ruleImportJs).toContain("updateSelectionPresentation({ syncCheckboxes = true } = {})");
    expect(ruleImportJs).toContain("updateSelectionPresentation({ syncCheckboxes: false })");
    expect(ruleImportJs).toContain("if (syncCheckboxes)");
    expect(ruleImportJs).toContain("const selectedCount = this._selectedUuids.size");
    expect(ruleImportJs).toContain("this._selectedUuids.size === 0");
});

test("collapsed large packages defer checkbox DOM until the selector is opened", () => {
    expect(ruleImportJs).toContain("this._selectionListDirty = true");
    expect(ruleImportJs).toContain("if (panel.hidden)");
    expect(ruleImportJs).toContain("list.replaceChildren()");
    expect(ruleImportJs).toContain("this.updateSelectionPresentation({ syncCheckboxes: false })");
    expect(ruleImportJs).toContain("if (this._selectionListDirty)");
    expect(ruleImportJs).toContain("this._selectionListDirty = false");
});
