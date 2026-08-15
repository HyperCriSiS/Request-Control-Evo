import { compileRuleToDnr, compileRulesToDnr } from "../src/main/backends/dnr/compiler.js";

function rule(overrides = {}) {
    return {
        uuid: "subset-rule",
        active: true,
        pattern: { scheme: "https", host: ["example.com"], path: ["*"] },
        types: ["main_frame"],
        action: "block",
        ...overrides,
    };
}

test("lossless MV3 subset keeps exact actions activatable", () => {
    expect(compileRuleToDnr(rule({ action: "block" })).status).toBe("supported");
    expect(compileRuleToDnr(rule({ action: "secure" })).status).toBe("supported");
    expect(compileRuleToDnr(rule({ action: "whitelist", log: false })).status).toBe("supported");
    expect(
        compileRuleToDnr(rule({ action: "redirect", redirectUrl: "https://destination.example/path" })).status
    ).toBe("supported");
    expect(
        compileRuleToDnr(rule({ action: "filter", trimAllParams: true, skipRedirectionFilter: true })).status
    ).toBe("supported");
});

test("lossless MV3 subset rejects context semantics DNR cannot reproduce", () => {
    for (const origin of ["same-domain", "third-party-domain", "same-origin", "third-party-origin"]) {
        const result = compileRuleToDnr(
            rule({ pattern: { scheme: "https", host: ["example.com"], path: ["*"], origin } })
        );
        expect(result.status).toBe("unsupported");
    }

    expect(
        compileRuleToDnr(rule({ pattern: { allUrls: true, includes: ["https://example.com/*"] } })).status
    ).toBe("unsupported");
    expect(
        compileRuleToDnr(rule({ pattern: { allUrls: true, excludes: ["https://example.com/*"] } })).status
    ).toBe("unsupported");
});

test("approximate query-key removal is not activated by default", () => {
    const source = rule({
        action: "filter",
        skipRedirectionFilter: true,
        paramsFilter: { values: ["utm_source", "fbclid"] },
    });

    const conservative = compileRuleToDnr(source);
    expect(conservative.status).toBe("approximate");
    expect(conservative.rules).toEqual([]);

    const explicitlyApproximate = compileRuleToDnr(source, { allowApproximate: true });
    expect(explicitlyApproximate.status).toBe("approximate");
    expect(explicitlyApproximate.rules).toHaveLength(1);
});

test("redirect/filter composition conflicts keep a collection unsupported", () => {
    const pattern = { scheme: "https", host: ["example.com"], path: ["*"] };
    const result = compileRulesToDnr([
        rule({ uuid: "redirect", action: "redirect", redirectUrl: "https://destination.example/", pattern }),
        rule({ uuid: "filter", action: "filter", trimAllParams: true, skipRedirectionFilter: true, pattern }),
    ]);

    expect(result.status).toBe("unsupported");
    expect(result.conflicts.map(({ code }) => code)).toContain("redirect-composition-conflict");
});
