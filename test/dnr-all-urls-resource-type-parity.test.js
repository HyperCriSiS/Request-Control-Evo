import { createRequestFilters } from "../src/main/api.js";
import { compileRuleToDnr } from "../src/main/backends/dnr/compiler.js";

function blockRule() {
    return {
        uuid: "firefox-dnr-all-urls-resource-type-parity",
        active: true,
        pattern: { allUrls: true },
        types: ["script"],
        action: "block",
    };
}

test("allUrls and script resource type stay aligned between Firefox and DNR", () => {
    const rule = blockRule();
    const firefoxFilters = createRequestFilters(rule);
    const compiled = compileRuleToDnr(rule);

    expect(firefoxFilters).toHaveLength(1);
    expect(firefoxFilters[0].urls).toEqual(["<all_urls>"]);
    expect(firefoxFilters[0].types).toEqual(["script"]);

    expect(compiled.status).toBe("supported");
    expect(compiled.rules).toHaveLength(1);
    expect(compiled.rules[0].condition.resourceTypes).toEqual(["script"]);

    const regex = new RegExp(compiled.rules[0].condition.regexFilter);
    for (const url of [
        "https://example.com/app.js",
        "http://example.com/app.js",
        "file:///tmp/app.js",
        "data:text/javascript,console.log(1)",
    ]) {
        expect(regex.test(url)).toBe(true);
    }

    expect(regex.test("chrome-extension://example/app.js")).toBe(false);
});
