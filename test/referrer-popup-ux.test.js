import fs from "node:fs";

const html = fs.readFileSync(new URL("../src/popup/browser-action.html", import.meta.url), "utf8");
const js = fs.readFileSync(new URL("../src/popup/browser-action.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../src/popup/browser-action.css", import.meta.url), "utf8");
const background = fs.readFileSync(new URL("../src/background.js", import.meta.url), "utf8");

test("popup exposes first-class referrer mode and exact-host exception controls", () => {
    expect(html).toContain('id="referrerMode"');
    expect(html).toContain('id="toggleReferrerHost"');
    expect(html).toContain('id="referrerHostScope"');
    expect(html).toContain('data-i18n="host"');
    expect(js).toContain('browser.storage.local.set({ referrerProtectionMode: mode })');
    expect(js).toContain('browser.storage.local.set({ referrerProtectionExceptions: next })');
    expect(js).toContain('currentSiteHost = normalizeSiteHost(tabs[0]?.url || "")');
});

test("background rebuilds referrer protection when mode or host exceptions change", () => {
    expect(background).toContain('"referrerProtectionExceptions"');
    expect(background).toContain('options.referrerProtectionExceptions || []');
    expect(background).toContain('!("referrerProtectionExceptions" in changes)');
});

test("localized referrer text buttons may grow while mobile controls retain touch height", () => {
    expect(css).toContain(".referrer-host-button");
    expect(css).toContain("white-space: normal");
    expect(css).toContain("max-width: 70%");
    expect(css).toContain("min-height: 2.75rem");
});
