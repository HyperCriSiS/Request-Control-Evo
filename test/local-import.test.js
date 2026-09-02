import { sanitizeLocalRule } from "../src/main/local-import.js";

test("local files cannot claim managed Official or Community provenance", () => {
    const imported = {
        uuid: "local-copy",
        action: "block",
        managed: true,
        source: {
            catalog: "requestcontrol-official",
            entry: "trusted-package",
            url: "https://raw.githubusercontent.com/HyperCriSiS/requestcontrol-rules/main/official/rules/trusted-package.json",
        },
        pattern: {
            source: ["*://*.example.com/*"],
            host: ["tracker.example"],
        },
    };

    expect(sanitizeLocalRule(imported)).toEqual({
        uuid: "local-copy",
        action: "block",
        pattern: imported.pattern,
    });
    expect(imported.managed).toBe(true);
});

test.each([null, [], "rule"])("local import rejects non-object rule payload %p", (value) => {
    expect(() => sanitizeLocalRule(value)).toThrow("Imported rules must be JSON objects.");
});
