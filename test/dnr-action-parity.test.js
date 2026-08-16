import { compileRuleToDnr } from "../src/main/backends/dnr/compiler.js";

function rule(overrides = {}) {
    return {
        uuid: "action-parity",
        active: true,
        pattern: { scheme: "https", host: ["example.com"], path: ["*"] },
        types: ["main_frame"],
        action: "block",
        ...overrides,
    };
}

test("lossless Request Control actions map to their exact DNR action types", () => {
    const block = compileRuleToDnr(rule({ action: "block" }));
    const secure = compileRuleToDnr(rule({ action: "secure" }));
    const whitelist = compileRuleToDnr(rule({ action: "whitelist", log: false }));
    const redirect = compileRuleToDnr(
        rule({ action: "redirect", redirectUrl: "https://destination.example/path" })
    );
    const filter = compileRuleToDnr(
        rule({ action: "filter", trimAllParams: true, skipRedirectionFilter: true })
    );

    expect(block.status).toBe("supported");
    expect(block.rules[0].action).toEqual({ type: "block" });

    expect(secure.status).toBe("supported");
    expect(secure.rules[0].action).toEqual({ type: "upgradeScheme" });

    expect(whitelist.status).toBe("supported");
    expect(whitelist.rules[0].action).toEqual({ type: "allow" });

    expect(redirect.status).toBe("supported");
    expect(redirect.rules[0].action).toEqual({
        type: "redirect",
        redirect: { url: "https://destination.example/path" },
    });

    expect(filter.status).toBe("supported");
    expect(filter.rules[0].action.type).toBe("redirect");
    expect(filter.rules[0].action.redirect.transform.query).toBe("");
});

test("unsupported action semantics stay out of the lossless DNR path", () => {
    const loggedWhitelist = compileRuleToDnr(rule({ action: "whitelist", log: true }));
    const redirectDsl = compileRuleToDnr(rule({ action: "redirect", redirectDocument: "example.html" }));

    expect(loggedWhitelist.status).toBe("unsupported");
    expect(loggedWhitelist.rules).toEqual([]);

    expect(redirectDsl.status).toBe("unsupported");
    expect(redirectDsl.rules).toEqual([]);
});