import {
    compileRuleSiteExceptions,
    isRuleSuppressedForRequest,
    isSiteDisabledForRequest,
    normalizeRuleSiteExceptions,
    normalizeSiteHosts,
    siteHostForRequest,
} from "../src/main/site-exceptions.js";

test("site exceptions normalize to exact lowercase hosts", () => {
    expect(normalizeSiteHosts(["Example.COM", "https://example.com/path", "sub.example.com.", "invalid host"])).toEqual([
        "example.com", "sub.example.com",
    ]);
});

test("top-level navigation uses its destination host while subresources use the page host", () => {
    expect(siteHostForRequest({ type: "main_frame", frameId: 0, url: "https://new.example/path" }, "https://old.example/")).toBe("new.example");
    expect(siteHostForRequest({ type: "script", url: "https://cdn.test/x.js" }, "https://page.example/")).toBe("page.example");
});

test("global and per-rule site suppression are exact-host only", () => {
    const request = { type: "script", url: "https://cdn.test/x.js" };
    expect(isSiteDisabledForRequest(request, "https://www.example.com/", new Set(["www.example.com"]))).toBe(true);
    expect(isSiteDisabledForRequest(request, "https://shop.example.com/", new Set(["www.example.com"]))).toBe(false);

    const raw = normalizeRuleSiteExceptions({ ruleA: ["www.example.com"], empty: [] });
    const compiled = compileRuleSiteExceptions(raw);
    expect(isRuleSuppressedForRequest("ruleA", request, "https://www.example.com/", compiled)).toBe(true);
    expect(isRuleSuppressedForRequest("ruleA", request, "https://shop.example.com/", compiled)).toBe(false);
});
