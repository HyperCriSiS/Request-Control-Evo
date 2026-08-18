import { createRequestFilters } from "../src/main/api.js";
import { compileRuleToDnr } from "../src/main/backends/dnr/compiler.js";

test("static redirect preserves method, port, path and resource-type constraints", () => {
    const rule = {
        uuid: "redirect-composed-parity",
        active: true,
        pattern: {
            scheme: "https",
            host: ["api.example.com:8443"],
            path: ["legacy/*"],
            method: ["GET"],
        },
        types: ["xmlhttprequest"],
        action: "redirect",
        redirectUrl: "https://api.example.com/v2/endpoint",
    };

    const firefoxFilters = createRequestFilters(rule);
    const compiled = compileRuleToDnr(rule);

    expect(firefoxFilters).toHaveLength(1);
    expect(firefoxFilters[0].types).toEqual(["xmlhttprequest"]);
    expect(compiled.status).toBe("supported");
    expect(compiled.rules).toHaveLength(1);
    expect(compiled.rules[0].action).toEqual({
        type: "redirect",
        redirect: { url: "https://api.example.com/v2/endpoint" },
    });
    expect(compiled.rules[0].condition.requestMethods).toEqual(["get"]);
    expect(compiled.rules[0].condition.resourceTypes).toEqual(["xmlhttprequest"]);

    const regex = new RegExp(compiled.rules[0].condition.regexFilter);
    expect(regex.test("https://api.example.com:8443/legacy/item")).toBe(true);
    expect(regex.test("https://api.example.com/legacy/item")).toBe(false);
    expect(regex.test("https://api.example.com:8443/v2/item")).toBe(false);
    expect(regex.test("http://api.example.com:8443/legacy/item")).toBe(false);
    expect(regex.test("https://sub.api.example.com:8443/legacy/item")).toBe(false);
});
