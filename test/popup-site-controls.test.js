import fs from "node:fs";

const html = fs.readFileSync(new URL("../src/popup/browser-action.html", import.meta.url), "utf8");
const js = fs.readFileSync(new URL("../src/popup/browser-action.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../src/popup/browser-action.css", import.meta.url), "utf8");

test("popup exposes exact-site Request Control and selected-rule controls", () => {
    expect(html).toContain('id="toggleSite"');
    expect(html).toContain('id="toggleRuleSite"');
    expect(js).toContain('browser.storage.local.set({ disabledSiteHosts: next })');
    expect(js).toContain('browser.storage.local.set({ ruleSiteExceptions: next })');
    expect(js).toContain("toggleRuleSiteHost(stored.ruleSiteExceptions, ruleUuid, currentSiteHost)");
});

test("site suppression does not rewrite rules or managed package payloads", () => {
    const currentSiteToggle = js.slice(js.indexOf("async function toggleCurrentSite"), js.indexOf("function renderSiteControl"));
    const ruleSiteToggle = js.slice(js.indexOf("async function toggleSelectedRuleSite"), js.indexOf("async function renderSelectedRuleSiteControl"));
    expect(currentSiteToggle).not.toContain("rules:");
    expect(ruleSiteToggle).not.toContain("rules:");
    expect(ruleSiteToggle).not.toContain("imports:");
});

test("popup removes verbose Referer prose and keeps compact mobile touch targets", () => {
    expect(html).not.toContain('data-i18n="referrer_note"');
    expect(css).toContain(".site-toggle-button");
    expect(css).toContain(".rule-site-button");
    expect(css).toContain("min-height: 2.75rem");
    expect(css).toContain("touch-action: manipulation");
});
