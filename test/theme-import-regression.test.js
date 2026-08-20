import fs from "node:fs";

const optionsCss = fs.readFileSync(new URL("../src/options/options.css", import.meta.url), "utf8");
const commonCss = fs.readFileSync(new URL("../src/options/common.css", import.meta.url), "utf8");
const ruleInputCss = fs.readFileSync(new URL("../src/options/rule-input.css", import.meta.url), "utf8");
const modalCss = fs.readFileSync(new URL("../src/options/modal-dialog.css", import.meta.url), "utf8");
const alertPopupCss = fs.readFileSync(new URL("../src/options/alert-popup.css", import.meta.url), "utf8");
const ruleTesterCss = fs.readFileSync(new URL("../src/options/rule-tester.css", import.meta.url), "utf8");
const importCss = fs.readFileSync(new URL("../src/options/rule-import-input.css", import.meta.url), "utf8");
const importJs = fs.readFileSync(new URL("../src/options/rule-import-input.js", import.meta.url), "utf8");
const optionsJs = fs.readFileSync(new URL("../src/options/options.js", import.meta.url), "utf8");

const legacyLightOnlyPatterns = [
    /color:\s*black\b/i,
    /color:\s*grey\b/i,
    /background(?:-color)?:\s*white\b/i,
    /background(?:-color)?:\s*#fefefe\b/i,
    /#f7f7f7\b/i,
    /#e0e9f7\b/i,
    /#4b4b4b\b/i,
];

test("dark theme exposes explicit readable foreground and state variables", () => {
    expect(optionsCss).toContain("@media (prefers-color-scheme: dark)");
    expect(optionsCss).toContain("--text-color: #edf0f4");
    expect(optionsCss).toContain("--text-muted: #aab1bb");
    expect(optionsCss).toContain("--selected-background: #263a54");
    expect(optionsCss).toContain("--on-primary-color: #15181d");
    expect(optionsCss).toContain("--on-success-color: #15181d");
    expect(optionsCss).toContain("--on-danger-color: #ffffff");
    expect(commonCss).toContain("color: var(--text-color)");
    expect(commonCss).toContain("color: var(--text-muted)");
});

test("rule editor and modal no longer carry known light-only foreground/background colors", () => {
    for (const pattern of legacyLightOnlyPatterns) {
        expect(ruleInputCss).not.toMatch(pattern);
        expect(modalCss).not.toMatch(pattern);
    }
    expect(ruleInputCss).toContain("background: var(--surface-color)");
    expect(ruleInputCss).toContain("background: var(--selected-background)");
    expect(modalCss).toContain("background-color: var(--surface-color)");
    expect(modalCss).toContain("color: var(--text-color)");
    expect(commonCss).toContain("color: var(--on-primary-color)");
    expect(commonCss).toContain("color: var(--on-danger-color)");
    expect(ruleInputCss).toContain("color: var(--on-success-color)");
    expect(ruleTesterCss).toContain("background: var(--text-color)");
    expect(ruleTesterCss).toContain("color: var(--background)");
    expect(alertPopupCss).toContain("background-color: var(--danger-color)");
    expect(alertPopupCss).toContain("color: var(--on-danger-color)");
    expect(alertPopupCss).toContain("box-shadow: 0 0 5px var(--shadow-color)");
    for (const css of [commonCss, ruleInputCss, modalCss, importCss, ruleTesterCss, alertPopupCss]) {
        expect(css).not.toMatch(/color:\s*(?:white|black|#fff(?:fff)?|#000(?:000)?)\b/i);
        expect(css).not.toMatch(/background(?:-color)?:\s*(?:white|black|#fff(?:fff)?|#000(?:000)?)\b/i);
    }
});

test("import presentation keeps metadata compact without nested details", () => {
    expect(importCss).toContain(".description");
    expect(importCss).toContain(".source-link");
    expect(importCss).toContain(".rating-link");
    expect(importCss).toContain(".selection-toggle");
    expect(importCss).toContain(".import-types");
    expect(importCss).toContain(".rule-selection[hidden]");
    expect(importCss).not.toContain(".import-details");
    expect(importJs).toContain("description.title = text");
    expect(importJs).toContain("humanReadableSource");
    expect(importJs).toContain("community_review");
    expect(importJs).not.toContain("rating-positive");
    expect(importJs).not.toContain("rating-negative");
});

test("community submission remains credential-less and AMO-linter friendly", () => {
    for (const js of [importJs, optionsJs]) {
        expect(js).not.toMatch(/innerHTML\s*=/);
        expect(js).not.toMatch(/github[_-]?token|personal[_-]?access[_-]?token|authorization:/i);
    }
    expect(optionsJs).toContain("request-control-community-submission.json");
    expect(optionsJs).toContain("rule-set-submission.md");
    expect(optionsJs).toContain("share_rules_public_warning");
});
