import fs from "node:fs";

import { Linter } from "eslint";

const popupSource = fs.readFileSync(new URL("../src/popup/browser-action.js", import.meta.url), "utf8");
const popupHtml = fs.readFileSync(new URL("../src/popup/browser-action.html", import.meta.url), "utf8");
const inspectorHtml = fs.readFileSync(new URL("../src/inspector/inspector.html", import.meta.url), "utf8");
const analysisSource = fs.readFileSync(new URL("../src/inspector/url-analysis.js", import.meta.url), "utf8");


test("standalone URL Analyzer is removed from popup navigation", () => {
    expect(popupHtml).not.toContain('id="analyzeCurrent"');
    expect(popupSource).not.toContain("openAnalyzer");
    expect(popupSource).not.toContain("src/analyzer/analyzer.html");
});


test("URL analysis is contextual to the selected Inspector request", () => {
    expect(inspectorHtml).toContain('id="detail-url-analysis"');
    expect(inspectorHtml).toContain('src="url-analysis.js"');
    expect(analysisSource).toContain("MutationObserver");
    expect(analysisSource).toContain("assessQueryParameters");
    expect(analysisSource).toContain("suggestParameterActions");
    expect(analysisSource).toContain('classification !== "ordinary"');
});


test("Inspector URL analysis remains review-first and only drafts auto-suggestable actions", () => {
    expect(analysisSource).toContain('filter(({ autoSuggest }) => autoSuggest !== false)');
    expect(analysisSource).toContain("buildSuggestedFilterRule");
    expect(analysisSource).toContain('classification !== "ordinary"');
    expect(analysisSource).toContain('"redirect-review"');
});


test("Inspector URL analysis module parses as an ES2020 module", () => {
    const messages = new Linter().verify(analysisSource, [
        { languageOptions: { ecmaVersion: 2020, sourceType: "module" } },
    ]);
    expect(messages.filter(({ fatal }) => fatal)).toEqual([]);
});
