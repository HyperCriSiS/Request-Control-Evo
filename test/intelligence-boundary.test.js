import fs from "fs";

function source(path) {
    return fs.readFileSync(path, "utf8");
}

test("Inspection request listeners are activated only by explicit inspection start", () => {
    const background = source("src/background.js");
    const calls = background.match(/ensureInspectionListeners\(\);/g) || [];
    expect(calls).toHaveLength(1);

    const startCase = background.slice(
        background.indexOf('case "start":'),
        background.indexOf('case "get":')
    );
    expect(startCase).toContain("ensureInspectionListeners();");
    expect(background).toContain("maybeRemoveInspectionListeners();");
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
