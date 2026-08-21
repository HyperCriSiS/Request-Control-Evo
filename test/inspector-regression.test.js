import fs from "node:fs";

const inspector = fs.readFileSync(new URL("../src/inspector/inspector.js", import.meta.url), "utf8");
const background = fs.readFileSync(new URL("../src/background.js", import.meta.url), "utf8");
const compatibility = fs.readFileSync(new URL("../src/inspector/compatibility.js", import.meta.url), "utf8");
const inspectorHtml = fs.readFileSync(new URL("../src/inspector/inspector.html", import.meta.url), "utf8");

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

test("Compatibility Guardian remains isolated from the Inspector core", () => {
    expect(inspector).not.toContain('namespace: "guardian"');
    expect(inspectorHtml).toContain('src="compatibility.js"');
    expect(compatibility).toContain('guardianMessageSafely("status")');
    expect(compatibility).toContain('guardianMessageSafely("stop")');
    expect(compatibility).toContain("renderCompatibilityStatus");
});

test("explicit Inspection starts the bounded Breakage Check in background", () => {
    expect(background).toMatch(/case "start":[\s\S]*guardian\.start\(tabId\)[\s\S]*ensureInspectionListeners\(\)/);
    expect(compatibility).toContain("awaitingStartUntil");
});

test("Inspector can allow Referer for only the diagnosed exact host", () => {
    expect(compatibility).toContain('browser.storage.local.get("referrerProtectionExceptions")');
    expect(compatibility).toContain("exceptions.add(host)");
    expect(compatibility).toContain('item?.kind === "referrer-protection"');
});

test("rule breakage warning uses the Guardian exact request correlation", () => {
    expect(compatibility).toContain("item.requestId === request.requestId");
    expect(compatibility).toContain("ruleSuspects");
    expect(compatibility).toContain("referrerSuspects");
});
