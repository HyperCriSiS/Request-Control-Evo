import fs from "node:fs";

const optionsHtml = fs.readFileSync(new URL("../src/options/options.html", import.meta.url), "utf8");
const optionsJs = fs.readFileSync(new URL("../src/options/options.js", import.meta.url), "utf8");
const importJs = fs.readFileSync(new URL("../src/options/rule-import-input.js", import.meta.url), "utf8");

test("imports are split into official, community and advanced custom channels", () => {
    expect(optionsJs).toContain('details.id = "official-rule-lists"');
    expect(optionsHtml).toContain('id="community-rule-lists"');
    expect(optionsHtml).toContain('id="custom-rule-lists"');
    expect(optionsJs).toContain('document.getElementById("recommended-rule-lists")');
    expect(optionsJs).toContain('recommended.replaceWith(details)');
});

test("official packages expose individual and bulk update states", () => {
    expect(optionsJs).toContain('badge.id = "official-update-count"');
    expect(optionsJs).toContain('updateAll.id = "official-update-all"');
    expect(optionsJs).toContain("refreshOfficialUpdateState");
    expect(optionsJs).toContain("updateAllOfficial");
    expect(importJs).toContain("get updateAvailable()");
});

test("official and community catalogs are remote while bundled presets are no longer rendered", () => {
    expect(optionsJs).toContain("/official/catalog.json");
    expect(optionsJs).toContain("/community/catalog.json");
    expect(optionsJs).toContain('communityDetails.addEventListener("toggle"');
    expect(importJs).not.toContain("setupRecommendedRulesets");
    expect(importJs).not.toContain("browser.runtime.getURL(preset.path)");
});

test("remote package integrity failures cannot become importable updates", () => {
    expect(importJs).toContain("this.digest = null");
    expect(importJs).toContain('message("integrity_failed"');
    expect(importJs).toContain("Array.isArray(parsed) ? parsed : [parsed]");
});

test("GitHub sharing lives with selected rules and requires explicit review", () => {
    expect(optionsHtml).toContain('id="shareSelectedRulesGitHub"');
    expect(optionsHtml).not.toContain('id="github-community-share"');
    expect(optionsJs).toContain("showCommunityShareDialog");
    expect(optionsJs).toContain("share_rules_public_warning");
    expect(optionsJs).toContain("share_rules_preview");
});

test("import integrity status has a real template target", () => {
    expect(optionsHtml).toContain('id="integrity"');
    expect(importJs).toContain('getElementById("integrity")');
});

test("rule packages can be expanded and selectively imported before installation", () => {
    expect(importJs).toContain('selection.id = "rule-selection"');
    expect(importJs).toContain('button.id = id');
    expect(importJs).toContain('"select-all-rules"');
    expect(importJs).toContain('"select-no-rules"');
    expect(importJs).toContain('"invert-rule-selection"');
    expect(importJs).toContain('get selectedRules()');
    expect(importJs).toContain('import_selected_count');
    expect(importJs).toContain('get rules()');
    expect(importJs).toContain('return this.selectedRules;');
});

test("partial managed imports remain partial during bulk updates", () => {
    expect(importJs).toContain('initialSelectedRuleUuids(this._rules, this._data?.imported || null)');
    expect(importJs).toContain('sameRuleSelection(this._selectedUuids, this._baselineSelectedUuids)');
    expect(optionsJs).toContain('const rulesToImport = input.rules.filter((rule) => rule.uuid)');
    expect(optionsJs).toContain('await applyManagedImport(input)');
});
