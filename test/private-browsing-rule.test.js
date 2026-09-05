import fs from "node:fs";

import { createRequestFilters } from "../src/main/api.js";
import { privateWindowEditorValue } from "../src/options/rule-editor-state.js";

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

test("rule editor preserves all three private-window states", () => {
    expect(privateWindowEditorValue({ incognito: true })).toBe("true");
    expect(privateWindowEditorValue({ incognito: false })).toBe("false");
    expect(privateWindowEditorValue({})).toBe("");
    expect(privateWindowEditorValue()).toBe("");
});

test("Firefox private access remains user-controlled rather than forced by the manifest", () => {
    const manifest = JSON.parse(
        fs.readFileSync(new URL("../manifest.json", import.meta.url), "utf8")
    );

    expect(manifest.incognito).toBeUndefined();
});
