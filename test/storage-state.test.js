import { normalizeStoredState } from "../src/main/storage-state.js";

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
