import fs from "node:fs";

const optionsCss = fs.readFileSync(new URL("../src/options/options.css", import.meta.url), "utf8");
const commonCss = fs.readFileSync(new URL("../src/options/common.css", import.meta.url), "utf8");
const ruleInputCss = fs.readFileSync(new URL("../src/options/rule-input.css", import.meta.url), "utf8");
const importCss = fs.readFileSync(new URL("../src/options/rule-import-input.css", import.meta.url), "utf8");
const importJs = fs.readFileSync(new URL("../src/options/rule-import-input.js", import.meta.url), "utf8");

const legacyLightOnlyPatterns = [
    /color:\s*black\b/i,
    /color:\s*grey\b/i,
    /background(?:-color)?:\s*white\b/i,
    /#f7f7f7\b/i,
    /#e0e9f7\b/i,
    /#4b4b4b\b/i,
];

test("dark theme exposes explicit readable foreground and state variables", () => {
    expect(optionsCss).toContain("@media (prefers-color-scheme: dark)");
    expect(optionsCss).toContain("--text-color: #edf0f4");
    expect(optionsCss).toContain("--text-muted: #aab1bb");
    expect(optionsCss).toContain("--selected-background: #263a54");
    expect(commonCss).toContain("color: var(--text-color)");
    expect(commonCss).toContain("color: var(--text-muted)");
});

test("rule editor no longer carries the known light-only foreground/background colors", () => {
    for (const pattern of legacyLightOnlyPatterns) {
        expect(ruleInputCss).not.toMatch(pattern);
    }
    expect(ruleInputCss).toContain("background: var(--surface-color)");
    expect(ruleInputCss).toContain("background: var(--selected-background)");
});

test("import presentation has descriptions, human source links and rating affordances", () => {
    expect(importCss).toContain(".description");
    expect(importCss).toContain(".source-link");
    expect(importCss).toContain(".rating-link");
    expect(importJs).toContain("description.title = text");
    expect(importJs).toContain("humanReadableSource");
    expect(importJs).toContain("rating-positive");
    expect(importJs).toContain("rating-negative");
});

test("community submission remains credential-less and AMO-linter friendly", () => {
    expect(importJs).not.toMatch(/innerHTML\s*=/);
    expect(importJs).not.toMatch(/github[_-]?token|personal[_-]?access[_-]?token|authorization:/i);
    expect(importJs).toContain("request-control-community-submission.json");
    expect(importJs).toContain("rule-set-submission.md");
});
