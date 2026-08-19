import fs from "node:fs";

const optionsHtml = fs.readFileSync(new URL("../src/options/options.html", import.meta.url), "utf8");
const optionsJs = fs.readFileSync(new URL("../src/options/options.js", import.meta.url), "utf8");
const importJs = fs.readFileSync(new URL("../src/options/rule-import-input.js", import.meta.url), "utf8");

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

test("official and community catalogs are remote while bundled presets are no longer rendered", () => {
    expect(optionsJs).toContain("/official/catalog.json");
    expect(optionsJs).toContain("/community/catalog.json");
    expect(optionsJs).toContain('communityDetails.addEventListener("toggle"');
    expect(optionsJs.indexOf('communityDetails.addEventListener("toggle"'))
        .toBeLessThan(optionsJs.indexOf("setupOfficialCatalog(importState)"));
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
