import { createRequestFilters } from "../src/main/api.js";
import { compileRuleToDnr } from "../src/main/backends/dnr/compiler.js";

function rule(types) {
    return {
        uuid: "resource-type-parity",
        active: true,
        pattern: { scheme: "https", host: ["example.com"], path: ["*"] },
        types,
        action: "block",
    };
}

test("resource types shared by Firefox webRequest and DNR preserve exact filter semantics", () => {
    const types = ["main_frame", "script", "image", "xmlhttprequest", "websocket"];
    const source = rule(types);
    const firefoxFilters = createRequestFilters(source);
    const compiled = compileRuleToDnr(source);

    expect(firefoxFilters).toHaveLength(1);
    expect(firefoxFilters[0].types).toEqual(types);
    expect(compiled.status).toBe("supported");
    expect(compiled.rules).toHaveLength(1);
    expect(compiled.rules[0].condition.resourceTypes).toEqual(types);
});

test("Firefox-only request types remain explicitly unsupported by the DNR compiler", () => {
    const source = rule(["beacon"]);
    const firefoxFilters = createRequestFilters(source);
    const compiled = compileRuleToDnr(source);

    expect(firefoxFilters).toHaveLength(1);
    expect(firefoxFilters[0].types).toEqual(["beacon"]);
    expect(compiled.status).toBe("unsupported");
    expect(compiled.rules).toEqual([]);
    expect(compiled.diagnostics.map(({ code }) => code)).toContain("resource-type-unsupported");
});
