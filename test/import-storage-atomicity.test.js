import fs from "node:fs";

import { persistImportState } from "../src/options/import-storage.js";

const optionsSource = fs.readFileSync(new URL("../src/options/options.js", import.meta.url), "utf8");

function functionBody(name, nextName) {
    const start = optionsSource.indexOf(`function ${name}`);
    const asyncStart = optionsSource.indexOf(`async function ${name}`);
    const actualStart = start === -1 || (asyncStart !== -1 && asyncStart < start) ? asyncStart : start;
    const nextFunction = optionsSource.indexOf(`function ${nextName}`, actualStart + 1);
    const nextAsyncFunction = optionsSource.indexOf(`async function ${nextName}`, actualStart + 1);
    const candidates = [nextFunction, nextAsyncFunction].filter((value) => value !== -1);
    const end = candidates.length ? Math.min(...candidates) : optionsSource.length;
    return optionsSource.slice(actualStart, end);
}

test("import state persists rules and metadata in one storage operation", async () => {
    const calls = [];
    const storage = {
        set: async (payload) => calls.push(payload),
    };
    const rules = [{ uuid: "one" }];
    const imports = { source: { imported: { uuids: ["one"] } } };

    await persistImportState(storage, rules, imports);

    expect(calls).toEqual([{ rules, imports }]);
});

test("managed import updates UI only after atomic persistence", () => {
    const body = functionBody("applyManagedImport", "markLegacyImportedRules");
    const persist = body.indexOf("await persistImportState(browser.storage.local, reconciliation.rules, imports)");
    const rebuild = body.indexOf('document.querySelectorAll("rule-list").forEach((list) => list.removeAll())');

    expect(persist).toBeGreaterThan(-1);
    expect(rebuild).toBeGreaterThan(persist);
    expect(body).not.toContain("browser.storage.local.set({ rules: reconciliation.rules })");
});

test("removing imported rules persists rules and import metadata together and reports failures", () => {
    const body = functionBody("onRemoveImportedRules", "createImportInput");

    expect(body).toContain('browser.storage.local.get(["rules", "imports"])');
    expect(body).toContain("await persistImportState(browser.storage.local, newRules, nextImports)");
    expect(optionsSource).toContain("onRemoveImportedRules(e).catch(showAlertPopup)");
});
