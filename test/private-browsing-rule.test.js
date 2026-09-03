import fs from "node:fs";

import { createRequestFilters } from "../src/main/api.js";

function requestFilterFor(incognito) {
    const pattern = { allUrls: true };
    if (typeof incognito === "boolean") {
        pattern.incognito = incognito;
    }
    return createRequestFilters({ pattern, action: "block" })[0];
}

test("request filters preserve private-only, regular-only, and spanning rule semantics", () => {
    expect(requestFilterFor(true).incognito).toBe(true);
    expect(requestFilterFor(false).incognito).toBe(false);
    expect(requestFilterFor(undefined).incognito).toBeUndefined();
});

test("rule editor restores explicit false and resets absent private-window state", () => {
    const source = fs.readFileSync(new URL("../src/options/rule-input.js", import.meta.url), "utf8");

    expect(source).toContain('typeof this.rule.pattern.incognito === "boolean"');
    expect(source).toContain('this.querySelector("#incognito").value = this.rule.pattern.incognito.toString()');
    expect(source).toContain('this.querySelector("#incognito").value = ""');
});

test("Firefox private access remains user-controlled rather than forced by the manifest", () => {
    const manifest = JSON.parse(
        fs.readFileSync(new URL("../manifest.json", import.meta.url), "utf8")
    );

    expect(manifest.incognito).toBeUndefined();
});
