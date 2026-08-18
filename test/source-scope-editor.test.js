import fs from "node:fs";
import { SourceMatcher } from "../src/main/matchers.js";

const ruleListJs = fs.readFileSync(new URL("../src/options/rule-list.js", import.meta.url), "utf8");
const sourceScopeEditorJs = fs.readFileSync(
    new URL("../src/options/source-scope-editor.js", import.meta.url),
    "utf8"
);

test("expert rule list decorates rule inputs with source-site editing", () => {
    expect(ruleListJs).toContain('from "./source-scope-editor.js"');
    expect(sourceScopeEditorJs).toContain('sourceSitesInput.id = "source-sites"');
    expect(sourceScopeEditorJs).toContain("this.rule.pattern.source = sourceSites");
    expect(sourceScopeEditorJs).toContain("delete this.rule.pattern.source");
    expect(sourceScopeEditorJs).toContain("new SourceMatcher(sourceSites)");
});

test("source-site editor validation rejects malformed match patterns", () => {
    expect(() => new SourceMatcher(["https://localhost"])).toThrow(TypeError);
});
