import { decodeLegacyMetadata, migrateLegacyTagsToGroups } from "../src/options/legacy-metadata.js";

test("legacy rule metadata decodes valid values and preserves malformed input", () => {
    expect(decodeLegacyMetadata("Privacy%20rule")).toBe("Privacy rule");
    expect(decodeLegacyMetadata("%E2%9C%93")).toBe("✓");
    expect(decodeLegacyMetadata("%")).toBe("%");
    expect(decodeLegacyMetadata("%ZZ")).toBe("%ZZ");
    expect(decodeLegacyMetadata("valid%20prefix%ZZ")).toBe("valid%20prefix%ZZ");
    expect(decodeLegacyMetadata(null)).toBe("");
});

test("legacy tags become a non-destructive group fallback only when no explicit group exists", () => {
    const tagged = { uuid: "tagged", tag: "Privacy%20rules", action: "filter" };
    const grouped = { uuid: "grouped", tag: "Legacy", group: "My group", action: "block" };
    const plain = { uuid: "plain", action: "redirect" };

    const migration = migrateLegacyTagsToGroups([tagged, grouped, plain]);

    expect(migration.changed).toBe(true);
    expect(migration.rules[0]).toEqual({
        ...tagged,
        group: "Privacy rules",
    });
    expect(migration.rules[0].tag).toBe("Privacy%20rules");
    expect(migration.rules[1]).toBe(grouped);
    expect(migration.rules[2]).toBe(plain);
});

test("legacy metadata migration is stable when no fallback is needed", () => {
    const rules = [{ uuid: "grouped", tag: "Legacy", group: "Existing" }];
    const migration = migrateLegacyTagsToGroups(rules);

    expect(migration.changed).toBe(false);
    expect(migration.rules).toBe(rules);
});
