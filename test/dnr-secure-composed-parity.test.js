import { createRequestFilters } from "../src/main/api.js";
import { compileRuleToDnr } from "../src/main/backends/dnr/compiler.js";

test("secure action preserves method, port, path and resource-type constraints", () => {
    const rule = {
        uuid: "secure-composed-parity",
        active: true,
        pattern: {
            scheme: "http",
            host: ["api.example.com:8080"],
            path: ["v1/*"],
            method: ["POST"],
        },
        types: ["xmlhttprequest"],
        action: "secure",
    };

    const firefoxFilters = createRequestFilters(rule);
    const compiled = compileRuleToDnr(rule);

    expect(firefoxFilters).toHaveLength(1);
    expect(firefoxFilters[0].types).toEqual(["xmlhttprequest"]);
    expect(compiled.status).toBe("supported");
    expect(compiled.rules).toHaveLength(1);
    expect(compiled.rules[0].action).toEqual({ type: "upgradeScheme" });
    expect(compiled.rules[0].condition.requestMethods).toEqual(["post"]);
    expect(compiled.rules[0].condition.resourceTypes).toEqual(["xmlhttprequest"]);

    const regex = new RegExp(compiled.rules[0].condition.regexFilter);
    expect(regex.test("http://api.example.com:8080/v1/events")).toBe(true);
    expect(regex.test("http://api.example.com/v1/events")).toBe(false);
    expect(regex.test("http://api.example.com:8080/v2/events")).toBe(false);
    expect(regex.test("https://api.example.com:8080/v1/events")).toBe(false);
    expect(regex.test("http://sub.api.example.com:8080/v1/events")).toBe(false);
});
