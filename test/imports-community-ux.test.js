import fs from "node:fs";

const optionsHtml = fs.readFileSync(new URL("../src/options/options.html", import.meta.url), "utf8");
const optionsJs = fs.readFileSync(new URL("../src/options/options.js", import.meta.url), "utf8");
const importJs = fs.readFileSync(new URL("../src/options/rule-import-input.js", import.meta.url), "utf8");
const importCss = fs.readFileSync(new URL("../src/options/rule-import-input.css", import.meta.url), "utf8");
const catalogGroupsJs = fs.readFileSync(new URL("../src/options/catalog-groups.js", import.meta.url), "utf8");
const importSourceJs = fs.readFileSync(new URL("../src/options/import-source.js", import.meta.url), "utf8");
const importsCatalogCss = fs.readFileSync(new URL("../src/options/imports-catalog.css", import.meta.url), "utf8");

test("imports are split into official, community and advanced custom channels", () => {
    expect(optionsHtml).toContain('id="official-rule-lists"');
    expect(optionsHtml).toContain('id="community-rule-lists"');
    expect(optionsHtml).toContain('id="custom-rule-lists"');
    expect(optionsHtml).not.toContain("recommended-rule-lists");
    expect(optionsJs).not.toContain("recommended-rule-lists");
});

test("official packages expose individual and bulk update states", () => {
    expect(optionsHtml).toContain('id="official-update-count"');
    expect(optionsHtml).toContain('id="official-update-all"');
    expect(optionsJs).toContain("refreshOfficialUpdateState");
    expect(optionsJs).toContain("updateAllOfficial");
    expect(optionsJs).toContain("persistRemoteCheckResults");
    expect(optionsJs).toContain("imports_official_checks_failed");
    expect(importJs).toContain("get updateAvailable()");
});

test("official and community catalogs are remote while source channels use compact tabs", () => {
    expect(optionsJs).toContain("/official/catalog.json");
    expect(optionsJs).toContain("/community/catalog.json");
    expect(optionsHtml).toContain('data-import-channel="official"');
    expect(optionsHtml).toContain('data-import-channel="community"');
    expect(optionsHtml).toContain('data-import-channel="custom"');
    expect(optionsJs).toContain("activateImportChannel");
    expect(optionsJs).not.toContain('communityDetails.addEventListener("toggle"');
    expect(optionsHtml).not.toContain('<details id="official-rule-lists"');
    expect(optionsHtml).not.toContain('<details id="community-rule-lists"');
    expect(optionsHtml).not.toContain('<details id="custom-rule-lists"');
    expect(importJs).not.toContain("setupRecommendedRulesets");
    expect(importJs).not.toContain("browser.runtime.getURL(preset.path)");
});


test("remote catalogs separate standard and advanced presentation without changing trust channels", () => {
    expect(optionsJs).toContain('`${channel}-advanced-rule-list`');
    expect(optionsJs).toContain('`${channel}-advanced-toggle`');
    expect(optionsJs).toContain("ensureCatalogPresentation");
    expect(optionsJs).toContain('entry.presentation === "advanced"');
    expect(optionsJs).toContain("toggleAdvancedPackages");
    expect(optionsJs).toContain("input.catalogMetadata = entry");
    expect(optionsJs).toContain('advancedToggle = document.createElement("button")');
});

test("remote catalog packages are ordered into behavior categories inside each presentation tier", () => {
    expect(importSourceJs).toContain('import { placeCatalogPackage } from "./catalog-groups.js"');
    expect(importSourceJs).toContain('parent?.classList.contains("imports-package-list")');
    expect(importSourceJs).toContain("placeCatalogPackage(parent, input, input.catalogEntry");
    expect(importSourceJs).toContain("MutationObserver");
    expect(catalogGroupsJs).toContain('"url-cleanup"');
    expect(catalogGroupsJs).toContain('"redirect"');
    expect(catalogGroupsJs).toContain('"request-transform"');
    expect(catalogGroupsJs).toContain('"block-allow"');
    expect(catalogGroupsJs).toContain('"privacy-special"');
    expect(catalogGroupsJs).toContain("CATALOG_CATEGORY_ORDER.indexOf");
    expect(catalogGroupsJs).toContain("placeCatalogPackage");
});

test("import controls size by role and checkbox rows use a stable alignment grid", () => {
    expect(importsCatalogCss).toContain(".imports-category-group");
    expect(importsCatalogCss).toContain(".imports-category-heading");
    expect(importsCatalogCss).toContain("min-width: max-content");
    expect(importsCatalogCss).toContain("white-space: normal");
    expect(importCss).toContain("grid-template-columns: 1.25rem minmax(0, 1fr)");
    expect(importCss).toContain("column-gap: 0.65rem");
    expect(importCss).toContain("width: 2.15rem");
    expect(importCss).toContain("width: auto");
    expect(importCss).toContain("white-space: normal");
    expect(importCss).toContain("display: none !important");
});

test("official update management includes hidden advanced packages", () => {
    expect(optionsJs).toContain('panel.querySelectorAll("rule-import-input")');
    expect(optionsJs).toContain('document.querySelectorAll("#official-rule-lists rule-import-input")');
});

test("package summaries expose behavior scope and material risk before technical details", () => {
    expect(importJs).toContain('catalogMetadata.id = "catalog-metadata"');
    expect(importJs).toContain("catalogBehaviorLabel");
    expect(importJs).toContain("catalogScopeLabel");
    expect(importJs).toContain('value.risk === "medium" || value.risk === "high"');
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

test("import rows keep community review out of per-package actions", () => {
    expect(importJs).not.toContain('rating.id = "rating"');
    expect(importJs).not.toContain('ratingLink.id = "rating-link"');
    expect(importJs).not.toContain("set communityReview");
    expect(optionsJs).not.toContain("input.communityReview");
    expect(importCss).not.toContain(".rating-link");
});

test("import integrity status has a real template target", () => {
    expect(optionsHtml).toContain('id="integrity"');
    expect(importJs).toContain('getElementById("integrity")');
});

test("rule packages use one compact inline selector grouped by native rule action", () => {
    expect(importJs).toContain('selection.id = "rule-selection"');
    expect(importJs).toContain('const ACTION_ORDER = ["filter", "redirect", "secure", "block", "whitelist"]');
    expect(importJs).toContain("groupRulesByAction(selectable)");
    expect(importJs).toContain('header.className = "selection-group-header"');
    expect(importJs).not.toContain('document.createElement("details")');
    expect(importJs).toContain('"select-all-rules"');
    expect(importJs).toContain('"select-no-rules"');
    expect(importJs).toContain('"invert-rule-selection"');
    expect(importJs).toContain('"reset-rule-selection"');
    expect(importJs).toContain('get selectedRules()');
    expect(importJs).toContain('import_selected_count');
    expect(importJs).toContain('get rules()');
    expect(importJs).toContain('return this.selectedRules;');
});

test("managed imports preserve their selected UUIDs during package updates", () => {
    expect(importJs).toContain('initialSelectedRuleUuids(this._rules, this._data?.imported || null)');
    expect(importJs).toContain('sameRuleSelection(this._selectedUuids, this._baselineSelectedUuids)');
    expect(optionsJs).toContain('const rulesToImport = input.rules.filter((rule) => rule.uuid)');
    expect(optionsJs).toContain('await applyManagedImport(input)');
});
