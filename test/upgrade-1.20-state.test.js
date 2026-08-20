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

const LEGACY_119_SOURCE =
    "https://tumpio.github.io/requestcontrol/rules/google-search-url-filter.json";
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
        t: 123,
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
    expect(migrated.pruned).toBe(1);
    expect(migratedLegacy.managed).toBeUndefined();
    expect(migratedLegacy.source).toBeUndefined();
    expect(migratedLegacy.paramsFilter.values).toContain("user_local_parameter");
    expect(migratedCustom.source.url).toBe(CUSTOM_SOURCE);
    expect(migrated.imports[CUSTOM_SOURCE].deletable).toBe(true);
    expect(migratedLocal.paramsFilter.values).toEqual(["keep_me"]);
    expect(migrated.imports[LEGACY_119_SOURCE]).toBeUndefined();
    expect(migrated.imports.t).toBe(123);

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
