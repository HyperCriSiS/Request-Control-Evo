import { jest } from "@jest/globals";

import {
    loadAndRepairStoredState,
    normalizeStoredState,
} from "../src/main/storage-state.js";

test("missing stored rule/import state gets safe in-memory defaults without forcing a repair write", () => {
    const normalized = normalizeStoredState({ disabled: false });

    expect(normalized.changed).toBe(false);
    expect(normalized.options).toEqual({
        disabled: false,
        rules: [],
        imports: {},
    });
});

test("malformed top-level rule/import values are repaired to safe defaults", () => {
    const normalized = normalizeStoredState({
        rules: "not-an-array",
        imports: [],
        disabled: true,
    });

    expect(normalized.changed).toBe(true);
    expect(normalized.options.rules).toEqual([]);
    expect(normalized.options.imports).toEqual({});
    expect(normalized.options.disabled).toBe(true);
});

test("partial corruption drops only unusable entries and preserves valid neighbors", () => {
    const validRule = { uuid: "keep-rule", action: "block", active: true };
    const validImport = { deletable: true, imported: { uuids: ["keep-rule"] } };
    const normalized = normalizeStoredState({
        rules: [validRule, null, "broken", ["also-broken"]],
        imports: {
            "https://rules.example/keep.json": validImport,
            "https://rules.example/null.json": null,
            "https://rules.example/string.json": "broken",
        },
    });

    expect(normalized.changed).toBe(true);
    expect(normalized.options.rules).toEqual([validRule]);
    expect(normalized.options.imports).toEqual({
        "https://rules.example/keep.json": validImport,
    });
});

test("valid stored state preserves object identity to avoid unnecessary churn", () => {
    const rules = [{ uuid: "one", action: "block", active: true }];
    const imports = {
        "https://rules.example/one.json": { deletable: true },
    };
    const normalized = normalizeStoredState({ rules, imports });

    expect(normalized.changed).toBe(false);
    expect(normalized.options.rules).toBe(rules);
    expect(normalized.options.imports).toBe(imports);
});

test("non-object storage payloads degrade to a safe empty state", () => {
    const normalized = normalizeStoredState(null);

    expect(normalized.changed).toBe(true);
    expect(normalized.options).toEqual({ rules: [], imports: {} });
});

test("storage repair persists only cleaned rule/import state", async () => {
    const storage = {
        get: jest.fn().mockResolvedValue({
            rules: [{ uuid: "keep", action: "block" }, null],
            imports: {
                "https://rules.example/keep.json": { deletable: true },
                "https://rules.example/broken.json": null,
            },
            disabled: false,
        }),
        set: jest.fn().mockResolvedValue(undefined),
    };

    const options = await loadAndRepairStoredState(storage, ["rules", "imports", "disabled"]);

    expect(options.rules).toEqual([{ uuid: "keep", action: "block" }]);
    expect(options.imports).toEqual({
        "https://rules.example/keep.json": { deletable: true },
    });
    expect(options.disabled).toBe(false);
    expect(storage.set).toHaveBeenCalledWith({
        rules: options.rules,
        imports: options.imports,
    });
});

test("storage write failure reports the error but still returns safe in-memory state", async () => {
    const writeError = new Error("quota exceeded");
    const onWriteError = jest.fn();
    const storage = {
        get: jest.fn().mockResolvedValue({ rules: "broken", imports: {} }),
        set: jest.fn().mockRejectedValue(writeError),
    };

    await expect(loadAndRepairStoredState(storage, ["rules", "imports"], { onWriteError }))
        .resolves.toEqual({ rules: [], imports: {} });
    expect(onWriteError).toHaveBeenCalledWith(writeError);
});
