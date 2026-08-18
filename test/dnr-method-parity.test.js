import { MethodMatcher } from "../src/main/matchers.js";
import { compileRuleToDnr } from "../src/main/backends/dnr/compiler.js";

function rule(methods) {
    return {
        uuid: "method-parity",
        active: true,
        pattern: {
            scheme: "https",
            host: ["example.com"],
            path: ["*"],
            method: methods,
        },
        types: ["xmlhttprequest"],
        action: "block",
    };
}

test("supported DNR request methods preserve Firefox matcher case-insensitive semantics", () => {
    const methods = ["GET", "post", "Patch"];
    const matcher = new MethodMatcher(methods);
    const compiled = compileRuleToDnr(rule(methods));

    expect(compiled.status).toBe("supported");
    expect(compiled.rules).toHaveLength(1);
    expect(compiled.rules[0].condition.requestMethods).toEqual(["get", "post", "patch"]);

    for (const method of ["GET", "get", "POST", "post", "PATCH", "patch"]) {
        expect(matcher.test({ method })).toBe(true);
        expect(compiled.rules[0].condition.requestMethods).toContain(method.toLowerCase());
    }

    for (const method of ["PUT", "DELETE", "OPTIONS"]) {
        expect(matcher.test({ method })).toBe(false);
        expect(compiled.rules[0].condition.requestMethods).not.toContain(method.toLowerCase());
    }
});

test("methods outside DNR's exact set stay unsupported even when Firefox can match them", () => {
    const matcher = new MethodMatcher(["TRACE"]);
    const compiled = compileRuleToDnr(rule(["TRACE"]));

    expect(matcher.test({ method: "TRACE" })).toBe(true);
    expect(compiled.status).toBe("unsupported");
    expect(compiled.rules).toEqual([]);
    expect(compiled.diagnostics.map(({ code }) => code)).toContain("request-method-unsupported");
});
