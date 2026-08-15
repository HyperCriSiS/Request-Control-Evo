import { compileRuleToDnr } from "../src/main/backends/dnr/compiler.js";

function rule(overrides = {}) {
    return {
        uuid: "boundary-rule",
        active: true,
        pattern: { scheme: "https", host: ["example.com"], path: ["*"] },
        types: ["main_frame"],
        action: "block",
        ...overrides,
    };
}

test("logged whitelist remains unsupported because DNR cannot preserve logging semantics", () => {
    const result = compileRuleToDnr(rule({ action: "whitelist", log: true }));

    expect(result.status).toBe("unsupported");
    expect(result.rules).toEqual([]);
});

test("redirect DSL remains unsupported while static absolute redirects are supported", () => {
    const dslRedirect = compileRuleToDnr(
        rule({ action: "redirect", redirectDocument: "example.html" })
    );
    const staticRedirect = compileRuleToDnr(
        rule({ action: "redirect", redirectUrl: "https://destination.example/path" })
    );

    expect(dslRedirect.status).toBe("unsupported");
    expect(dslRedirect.rules).toEqual([]);
    expect(staticRedirect.status).toBe("supported");
    expect(staticRedirect.rules).toHaveLength(1);
});

test("unsupported request methods are rejected instead of approximated", () => {
    const result = compileRuleToDnr(
        rule({ methods: ["trace"] })
    );

    expect(result.status).toBe("unsupported");
    expect(result.rules).toEqual([]);
});

test("filter parameter removal stays approximate unless explicitly enabled", () => {
    const source = rule({
        action: "filter",
        skipRedirectionFilter: true,
        paramsFilter: { values: ["utm_source"] },
    });

    const conservative = compileRuleToDnr(source);
    const optedIn = compileRuleToDnr(source, { allowApproximate: true });

    expect(conservative.status).toBe("approximate");
    expect(conservative.rules).toEqual([]);
    expect(optedIn.status).toBe("approximate");
    expect(optedIn.rules).toHaveLength(1);
});
