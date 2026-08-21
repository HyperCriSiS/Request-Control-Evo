import {
    migrateManagedPackageState,
    validateManagedPackageMigration,
} from "../src/main/managed-package-migration.js";

const OLD = {
    id: "requestcontrol-official/privacy-common-images",
    url: "https://raw.githubusercontent.com/HyperCriSiS/requestcontrol-rules/main/official/rules/privacy-common-images.json",
};
const A = {
    id: "requestcontrol-official/privacy-image-cleanup",
    url: "https://raw.githubusercontent.com/HyperCriSiS/requestcontrol-rules/main/official/rules/privacy-image-cleanup.json",
    catalog: "requestcontrol-official",
    entry: "privacy-image-cleanup",
    version: "1.0.0",
    behavior: "media-url-cleanup",
};
const B = {
    id: "requestcontrol-official/privacy-image-compat",
    url: "https://raw.githubusercontent.com/HyperCriSiS/requestcontrol-rules/main/official/rules/privacy-image-compat.json",
    catalog: "requestcontrol-official",
    entry: "privacy-image-compat",
    version: "1.0.0",
    behavior: "media-url-cleanup",
};
const MIGRATION = {
    from: OLD,
    targets: [
        { source: A, uuids: ["rule-a"] },
        { source: B, uuids: ["rule-b"] },
    ],
};

function managedRule(uuid, active, extra = {}) {
    return {
        uuid,
        active,
        action: "filter",
        ...extra,
        managed: true,
        source: {
            ...OLD,
            catalog: "requestcontrol-official",
            entry: "privacy-common-images",
            upstreamDigest: `baseline-${uuid}`,
        },
    };
}

test("managed package migration contract rejects ambiguous or partial mappings", () => {
    expect(validateManagedPackageMigration({ from: OLD, targets: [] })).toContain("missing-targets");
    expect(validateManagedPackageMigration({
        from: OLD,
        targets: [
            { source: A, uuids: ["rule-a"] },
            { source: B, uuids: ["rule-a"] },
        ],
    })).toContain("duplicate-or-invalid-uuid:rule-a");

    const rules = [managedRule("rule-a", true), managedRule("rule-unmapped", false)];
    const result = migrateManagedPackageState(rules, {}, MIGRATION);
    expect(result.blocked).toBe(true);
    expect(result.changed).toBe(false);
    expect(result.rules).toBe(rules);
    expect(result.errors).toContain("unmapped-managed-uuid:rule-unmapped");
});

test("managed package split changes identity only and preserves local state/baselines", () => {
    const rules = [
        managedRule("rule-a", false, { title: "Locally edited title" }),
        managedRule("rule-b", true),
        { uuid: "local", active: true, action: "redirect" },
    ];
    const imports = {
        [OLD.url]: {
            imported: {
                uuids: ["rule-a", "rule-b"],
                digest: "old-package-digest",
                availableDigest: "old-package-digest",
                timestamp: 1234,
                conflicts: [{ uuid: "rule-a", reason: "local-modified" }],
                catalog: "requestcontrol-official",
                entry: "privacy-common-images",
                version: "1.0.0",
            },
        },
    };

    const result = migrateManagedPackageState(rules, imports, MIGRATION);
    expect(result.blocked).toBe(false);
    expect(result.migrated).toEqual(["rule-a", "rule-b"]);
    expect(result.rules[0]).toMatchObject({
        uuid: "rule-a",
        active: false,
        title: "Locally edited title",
        managed: true,
        source: { id: A.id, upstreamDigest: "baseline-rule-a" },
    });
    expect(result.rules[1]).toMatchObject({
        uuid: "rule-b",
        active: true,
        managed: true,
        source: { id: B.id, upstreamDigest: "baseline-rule-b" },
    });
    expect(result.rules[2]).toEqual(rules[2]);

    expect(result.imports[OLD.url]).toBeUndefined();
    expect(result.imports[A.url].imported).toMatchObject({
        uuids: ["rule-a"],
        migrationPending: true,
        migratedFrom: OLD.id,
        conflicts: [{ uuid: "rule-a", reason: "local-modified" }],
    });
    expect("digest" in result.imports[A.url].imported).toBe(false);
    expect(result.imports[B.url].imported).toMatchObject({
        uuids: ["rule-b"],
        migrationPending: true,
        migratedFrom: OLD.id,
        conflicts: [],
    });
});

test("migration never introduces rules that were not already installed", () => {
    const result = migrateManagedPackageState(
        [managedRule("rule-a", true)],
        { [OLD.url]: { imported: { uuids: ["rule-a"] } } },
        {
            ...MIGRATION,
            targets: [
                { source: A, uuids: ["rule-a", "future-upstream-rule"] },
                { source: B, uuids: ["rule-b"] },
            ],
        }
    );

    expect(result.rules.map((rule) => rule.uuid)).toEqual(["rule-a"]);
    expect(result.imports[A.url].imported.uuids).toEqual(["rule-a"]);
    expect(result.imports[B.url]).toBeUndefined();
});
