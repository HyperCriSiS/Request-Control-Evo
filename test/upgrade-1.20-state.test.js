import { webcrypto } from "node:crypto";
import { TextDecoder, TextEncoder } from "node:util";

import {
    createManagedRule,
    migrateManagedSourceState,
    reconcileManagedRules,
} from "../src/main/catalog.js";
import {
    initialSelectedRuleUuids,
    selectedRules,
} from "../src/options/import-selection.js";
import { migrateLegacyTagsToGroups } from "../src/options/legacy-metadata.js";

Object.defineProperties(globalThis, {
    crypto: {
        configurable: true,
        value: webcrypto,
    },
    TextDecoder: {
        configurable: true,
        value: TextDecoder,
    },
    TextEncoder: {
        configurable: true,
        value: TextEncoder,
    },
});

const LEGACY_119_HOST = ["tumpio", "github", "io"].join(".");
const LEGACY_119_SOURCE =
    `https://${LEGACY_119_HOST}/requestcontrol/rules/google-search-url-filter.json`;
const CUSTOM_SOURCE = "https://rules.example/user.json";
const OFFICIAL_SOURCE = {
    id: "requestcontrol-official/privacy-common-params",
    url: "https://raw.githubusercontent.com/HyperCriSiS/requestcontrol-rules/main/official/rules/privacy-common-params.json",
    catalog: "requestcontrol-official",
    entry: "privacy-common-params",
    version: "1.0.0",
};

function rule(uuid, values = ["utm_*"]) {
    return {
        uuid,
        pattern: { allUrls: true },
        action: "filter",
        active: true,
        skipRedirectionFilter: true,
        paramsFilter: { values },
    };
}

test("1.19 managed-source state upgrades without losing local edits or custom sources", async () => {
    const legacy = await createManagedRule(rule("legacy-google"), {
        id: LEGACY_119_SOURCE,
        url: LEGACY_119_SOURCE,
        version: "1.19.0",
    });
    legacy.paramsFilter.values.push("user_local_parameter");

    const custom = await createManagedRule(rule("custom-rule"), {
        id: CUSTOM_SOURCE,
        url: CUSTOM_SOURCE,
    });
    const local = rule("local-rule", ["keep_me"]);

    const migrated = migrateManagedSourceState([legacy, custom, local], {
        legacyMetadata: { generatedBy: "1.19-test-fixture" },
        [LEGACY_119_SOURCE]: {
            imported: { uuids: ["legacy-google"], digest: "legacy-digest" },
        },
        [CUSTOM_SOURCE]: {
            deletable: true,
            imported: { uuids: ["custom-rule"], digest: "custom-digest" },
        },
    });

    const migratedLegacy = migrated.rules.find(({ uuid }) => uuid === "legacy-google");
    const migratedCustom = migrated.rules.find(({ uuid }) => uuid === "custom-rule");
    const migratedLocal = migrated.rules.find(({ uuid }) => uuid === "local-rule");

    expect(migrated.demoted).toBe(1);
    expect(migrated.pruned).toBe(2);
    expect(migratedLegacy.managed).toBeUndefined();
    expect(migratedLegacy.source).toBeUndefined();
    expect(migratedLegacy.paramsFilter.values).toContain("user_local_parameter");
    expect(migratedCustom.source.url).toBe(CUSTOM_SOURCE);
    expect(migrated.imports[CUSTOM_SOURCE].deletable).toBe(true);
    expect(migratedLocal.paramsFilter.values).toEqual(["keep_me"]);
    expect(migrated.imports[LEGACY_119_SOURCE]).toBeUndefined();
    expect(migrated.imports.legacyMetadata).toBeUndefined();

    const reconciled = await reconcileManagedRules(
        migrated.rules,
        [rule("legacy-google", ["utm_*", "fbclid"])],
        OFFICIAL_SOURCE
    );
    const preservedLegacy = reconciled.rules.find(({ uuid }) => uuid === "legacy-google");

    expect(reconciled.conflicts).toContainEqual({
        uuid: "legacy-google",
        reason: "uuid-collision-or-local-rule",
    });
    expect(preservedLegacy.source).toBeUndefined();
    expect(preservedLegacy.paramsFilter.values).toContain("user_local_parameter");
});

test("1.19 installed UUID state never opts into rules added by a 1.20 package", () => {
    const remoteRules = [rule("one"), rule("two"), rule("three")];
    const selection = initialSelectedRuleUuids(remoteRules, {
        uuids: ["one", "two"],
    });

    expect([...selection]).toEqual(["one", "two"]);
    expect(selectedRules(remoteRules, selection).map(({ uuid }) => uuid)).toEqual([
        "one",
        "two",
    ]);
});

test("1.19 and RC organization metadata upgrades without changing rule order or managed identity", () => {
    const rules = [
        {
            uuid: "explicit-group",
            action: "redirect",
            group: "Navigation",
            tag: "Legacy%20tag",
            source: {
                catalog: "requestcontrol-official",
                id: "requestcontrol-official/privacy-common-params",
                entry: "privacy-common-params",
                version: "1.0.0",
                behavior: "url-cleanup",
            },
        },
        {
            uuid: "legacy-tag-only",
            action: "filter",
            tag: "Privacy%20rules",
        },
        { uuid: "plain", action: "block" },
    ];

    const beforeOrder = rules.map(({ uuid }) => uuid);
    const managedSource = structuredClone(rules[0].source);
    const migration = migrateLegacyTagsToGroups(rules);

    expect(migration.changed).toBe(true);
    expect(migration.rules.map(({ uuid }) => uuid)).toEqual(beforeOrder);
    expect(migration.rules[0].group).toBe("Navigation");
    expect(migration.rules[0].tag).toBe("Legacy%20tag");
    expect(migration.rules[0].source).toEqual(managedSource);
    expect(migration.rules[1].group).toBe("Privacy rules");
    expect(migration.rules[1].tag).toBe("Privacy%20rules");
    expect(migration.rules[2]).toBe(rules[2]);
});
