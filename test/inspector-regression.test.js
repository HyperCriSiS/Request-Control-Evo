import fs from "node:fs";

const inspector = fs.readFileSync(new URL("../src/inspector/inspector.js", import.meta.url), "utf8");
const background = fs.readFileSync(new URL("../src/background.js", import.meta.url), "utf8");

test("post-1.19 rule-source diagnostics cannot block the Inspector entry module", () => {
    expect(inspector).not.toContain('import { renderRuleSourceDetails } from "./rule-source-details.js"');
    expect(inspector).toContain('import("./rule-source-details.js").catch(() => null)');
    expect(inspector).toContain("renderRuleSourceDetailsSafely");
});

test("Inspector validates background responses and tolerates an empty initial snapshot", () => {
    expect(inspector).toContain('inspectionMessage("get"), { allowNull: true }');
    expect(inspector).toContain("if (response?.error)");
    expect(inspector).toContain('throw new TypeError("Invalid inspection response")');
});

test("Inspector lifecycle remains start, capture listeners, get, stop and clear", () => {
    for (const action of ["start", "get", "stop", "clear"]) {
        expect(background).toContain(`case "${action}"`);
    }
    expect(background).toContain("ensureInspectionListeners()");
    expect(background).toContain("inspectionLimiter.start(tabId)");
    expect(background).toContain("maybeRemoveInspectionListeners()");
});
