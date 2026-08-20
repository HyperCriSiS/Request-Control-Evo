import fs from "node:fs";

import { Linter } from "eslint";

const analyzerSource = fs.readFileSync(new URL("../src/analyzer/analyzer.js", import.meta.url), "utf8");
const analyzerHtml = fs.readFileSync(new URL("../src/analyzer/analyzer.html", import.meta.url), "utf8");

test("analyzer has no runtime dependency on the removed packaged rule corpus", () => {
    expect(analyzerSource).not.toMatch(/\brules\/[^\s"'`]+\.json\b/);
    expect(analyzerSource).not.toMatch(/\bfetch\s*\(/);
});

test("analyzer entry point parses as an ES2020 module without top-level await", () => {
    const messages = new Linter().verify(analyzerSource, [
        { languageOptions: { ecmaVersion: 2020, sourceType: "module" } },
    ]);

    expect(messages.filter(({ fatal }) => fatal)).toEqual([]);
});


test("URL Analyzer stays focused on URL analysis rather than unrelated Guardian or Referer settings", () => {
    expect(analyzerHtml).not.toContain("guardian-card");
    expect(analyzerHtml).not.toContain("referrer-mode");
    expect(analyzerSource).not.toContain('namespace: "guardian"');
    expect(analyzerSource).not.toContain("referrerProtectionMode");
    expect(analyzerHtml).toContain('id="parameters"');
});

test("URL Analyzer renders all parameters while only selectable suggestions can create rules", () => {
    expect(analyzerSource).toContain("assessQueryParameters");
    expect(analyzerSource).toContain('input:checked:not(:disabled)');
    expect(analyzerSource).toContain("suggestion.autoSuggest");
});
