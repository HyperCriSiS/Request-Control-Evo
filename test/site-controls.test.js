import {
    isRuleSiteHostSuppressed,
    isSiteHostDisabled,
    toggleRuleSiteHost,
    toggleSiteHost,
} from "../src/popup/site-controls.js";

test("popup site toggle stores exact normalized hosts without widening scope", () => {
    const enabled = toggleSiteHost(["other.example"], "https://WWW.Example.com/path");
    expect(enabled).toEqual(["other.example", "www.example.com"]);
    expect(isSiteHostDisabled(enabled, "www.example.com")).toBe(true);
    expect(isSiteHostDisabled(enabled, "shop.example.com")).toBe(false);
    expect(toggleSiteHost(enabled, "www.example.com")).toEqual(["other.example"]);
});

test("per-rule site suppression is separate from the rule payload and removes empty entries", () => {
    const original = { managedRule: ["other.example"] };
    const added = toggleRuleSiteHost(original, "managedRule", "www.example.com");
    expect(original).toEqual({ managedRule: ["other.example"] });
    expect(added).toEqual({ managedRule: ["other.example", "www.example.com"] });
    expect(isRuleSiteHostSuppressed(added, "managedRule", "www.example.com")).toBe(true);
    expect(isRuleSiteHostSuppressed(added, "managedRule", "shop.example.com")).toBe(false);

    expect(toggleRuleSiteHost({ managedRule: ["www.example.com"] }, "managedRule", "www.example.com")).toEqual({});
});
