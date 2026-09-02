import fs from "node:fs";

const inspector = fs.readFileSync(new URL("../src/inspector/inspector.js", import.meta.url), "utf8");
const background = fs.readFileSync(new URL("../src/background.js", import.meta.url), "utf8");
const compatibility = fs.readFileSync(new URL("../src/inspector/compatibility.js", import.meta.url), "utf8");
const inspectorHtml = fs.readFileSync(new URL("../src/inspector/inspector.html", import.meta.url), "utf8");
const inspectionRuntime = fs.readFileSync(new URL("../src/main/inspection/runtime.js", import.meta.url), "utf8");

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

test("Inspector background delegates start/get/stop/clear to the isolated capture runtime", () => {
    for (const action of ["start", "get", "stop", "clear"]) {
        expect(background).toContain(`case "${action}"`);
    }
    expect(background).toContain("inspectionRuntime.start(tabId");
    expect(background).toContain("inspectionRuntime.get(tabId)");
    expect(background).toContain("inspectionRuntime.stop(tabId)");
    expect(background).toContain("inspectionRuntime.clear(tabId)");
    expect(background).toContain("inspectionLimiter.start(tabId)");
    expect(inspectionRuntime).toContain("this.ensureListeners();");
    expect(inspectionRuntime).toContain("this.cleanupListeners();");
});

test("Compatibility Guardian remains isolated from the Inspector core", () => {
    expect(inspector).not.toContain('namespace: "guardian"');
    expect(inspectorHtml).toContain('src="compatibility.js"');
    expect(compatibility).toContain('guardianMessageSafely("status")');
    expect(compatibility).toContain('guardianMessageSafely("stop")');
    expect(compatibility).toContain("renderCompatibilityStatus");
});

test("explicit Inspection starts the bounded Breakage Check beside the isolated capture runtime", () => {
    const startCase = background.slice(
        background.indexOf('case "start":'),
        background.indexOf('case "get":')
    );
    expect(startCase).toContain("inspectionRuntime.start(tabId");
    expect(startCase).toContain("inspectionLimiter.start(tabId)");
    expect(startCase).toContain("guardian.start(tabId)");
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

test("Inspector keeps privacy as an invariant instead of permanent banner/export chrome", () => {
    expect(inspectorHtml).not.toContain("inspection_local_only");
    expect(inspectorHtml).not.toContain("export-support-diagnostic");
    expect(inspectorHtml).toContain('id="dropped"');
});
