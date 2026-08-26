import fs from "fs";

function source(path) {
    return fs.readFileSync(path, "utf8");
}

test("Inspection request listeners are owned by the explicit capture runtime lifecycle", () => {
    const background = source("src/background.js");
    const runtime = source("src/main/inspection/runtime.js");

    expect(background).not.toContain("ensureInspectionListeners");
    expect(background).toContain("inspectionRuntime.start(tabId");

    const startMethod = runtime.slice(
        runtime.indexOf("\n    start(tabId"),
        runtime.indexOf("\n    get(tabId")
    );
    expect(startMethod).toContain("this.ensureListeners();");

    const constructor = runtime.slice(
        runtime.indexOf("constructor("),
        runtime.indexOf("\n    start(tabId")
    );
    expect(constructor).not.toContain("this.ensureListeners();");
    expect(runtime).toContain("this.cleanupListeners();");
});

test("Guardian listener activation remains inside explicit start lifecycle", () => {
    const guardian = source("src/main/guardian.js");
    const calls = guardian.match(/this\.ensureListeners\(\);/g) || [];
    expect(calls).toHaveLength(1);

    const startMethod = guardian.slice(
        guardian.indexOf("\n    start(tabId) {"),
        guardian.indexOf("\n    stop(tabId) {")
    );
    expect(startMethod).toContain("this.ensureListeners();");
    expect(guardian).toContain("this.cleanupListeners();");
});

test("Observatory contract has no runtime transport and background does not depend on Observatory", () => {
    const contract = source("src/main/intelligence/observatory-contract.js");
    const background = source("src/background.js");

    expect(contract).not.toMatch(/\bfetch\s*\(/);
    expect(contract).not.toMatch(/\bWebSocket\b/);
    expect(contract).not.toMatch(/\bEventSource\b/);
    expect(background.toLowerCase()).not.toContain("observatory");
});
