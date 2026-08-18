import fs from "node:fs";

const optionsHtml = fs.readFileSync(new URL("../src/options/options.html", import.meta.url), "utf8");
const optionsJs = fs.readFileSync(new URL("../src/options/options.js", import.meta.url), "utf8");
const importJs = fs.readFileSync(new URL("../src/options/rule-import-input.js", import.meta.url), "utf8");

test("imports are grouped into recommended, community and advanced custom sections", () => {
    expect(optionsHtml).toContain('id="recommended-rule-lists"');
    expect(optionsHtml).toContain('id="community-rule-lists"');
    expect(optionsHtml).toContain('id="custom-rule-lists"');
    expect(optionsHtml).not.toContain('data-i18n="common_lists"');
    expect(optionsHtml).not.toContain('data-i18n="site_specific_lists"');
});

test("animated per-row loading dots are no longer rendered", () => {
    expect(optionsHtml).not.toContain("loading-dots.js");
    expect(optionsHtml).not.toContain("<loading-dots");
});

test("community and custom sources are lazy while bundled payloads use packaged files", () => {
    expect(optionsJs).toContain('communityDetails.addEventListener("toggle"');
    expect(optionsJs).toContain('input.setAttribute("lazy", "")');
    expect(importJs).toContain("input.fetchSource = localSource");
    expect(importJs).toContain("browser.runtime.getURL(preset.path)");
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
