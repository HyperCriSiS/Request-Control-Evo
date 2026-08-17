import { createRequestFilters } from "../src/main/api.js";
import { compileRuleToDnr } from "../src/main/backends/dnr/compiler.js";

function websocketRule() {
    return {
        uuid: "firefox-dnr-all-urls-websocket-parity",
        active: true,
        pattern: { allUrls: true },
        types: ["websocket"],
        action: "block",
    };
}

test("allUrls and websocket resource type stay aligned between Firefox and DNR", () => {
    const rule = websocketRule();
    const firefoxFilters = createRequestFilters(rule);
    const compiled = compileRuleToDnr(rule);

    expect(firefoxFilters).toHaveLength(1);
    expect(firefoxFilters[0].urls).toEqual(["<all_urls>"]);
    expect(firefoxFilters[0].types).toEqual(["websocket"]);

    expect(compiled.status).toBe("supported");
    expect(compiled.rules).toHaveLength(1);
    expect(compiled.rules[0].condition.resourceTypes).toEqual(["websocket"]);

    const regex = new RegExp(compiled.rules[0].condition.regexFilter);
    expect(regex.test("ws://example.com/socket")).toBe(true);
    expect(regex.test("wss://example.com/socket")).toBe(true);
    expect(regex.test("https://example.com/socket")).toBe(true);
    expect(regex.test("chrome-extension://example/socket")).toBe(false);
});
