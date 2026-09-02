import { webcrypto } from "node:crypto";
import { TextDecoder, TextEncoder } from "node:util";

import {
    canonicalStringify,
    createManagedRule,
    isManagedRuleModified,
    migrateManagedSourceState,
    reconcileManagedRules,
    ruleDigest,
} from "../src/main/catalog.js";

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

const SOURCE = {
    id: "requestcontrol-community/common",
    url: "https://example.test/common.json",
    version: "1.0.0",
};

function rule(uuid, values = ["utm_*"]) {
    return {
        uuid,
        pattern: {allUrls: true},
        action: "filter",
        active: true,
        skipRedirectionFilter: true,
        paramsFilter: {values},
    };
}

test("canonicalStringify is independent of object key ordering", () => {
    expect(canonicalStringify({b: 2, a: {d: 4, c: 3}})).toBe(
        canonicalStringify({a: {c: 3, d: 4}, b: 2})
    );
});

test("ruleDigest ignores catalog management metadata", async () => {
    const original = rule("a");
    const managed = await createManagedRule(original, SOURCE);

    expect(await ruleDigest(managed)).toBe(await ruleDigest(original));
});

test("isManagedRuleModified detects local edits", async () => {
    const managed = await createManagedRule(rule("a"), SOURCE);
    expect(await isManagedRuleModified(managed)).toBe(false);

    managed.paramsFilter.values.push("fbclid");
    expect(await isManagedRuleModified(managed)).toBe(true);
});

test("reconcileManagedRules safely updates an unchanged managed rule", async () => {
    const local = await createManagedRule(rule("a"), SOURCE);
    const incoming = rule("a", ["utm_*", "fbclid"]);
    const result = await reconcileManagedRules([local], [incoming], {...SOURCE, version: "1.1.0"});

    expect(result.updated).toEqual(["a"]);
    expect(result.conflicts).toEqual([]);
    expect(result.rules[0].paramsFilter.values).toEqual(["utm_*", "fbclid"]);
    expect(result.rules[0].source.version).toBe("1.1.0");
});

test("reconcileManagedRules preserves a locally modified managed rule", async () => {
    const local = await createManagedRule(rule("a"), SOURCE);
    local.paramsFilter.values.push("my_local_parameter");

    const result = await reconcileManagedRules([local], [rule("a", ["utm_*", "fbclid"])], {
        ...SOURCE,
        version: "1.1.0",
    });

    expect(result.updated).toEqual([]);
    expect(result.conflicts).toEqual([{uuid: "a", reason: "local-modified"}]);
    expect(result.rules[0].paramsFilter.values).toContain("my_local_parameter");
});

test("reconcileManagedRules removes an upstream-deleted rule only when unchanged", async () => {
    const unchanged = await createManagedRule(rule("a"), SOURCE);
    const modified = await createManagedRule(rule("b"), SOURCE);
    modified.active = false;

    const result = await reconcileManagedRules([unchanged, modified], [], {...SOURCE, version: "1.1.0"});

    expect(result.removed).toEqual(["a"]);
    expect(result.conflicts).toEqual([{uuid: "b", reason: "removed-upstream-local-modified"}]);
    expect(result.rules.map(({uuid}) => uuid)).toEqual(["b"]);
});

test("reconcileManagedRules adopts an identical local rule but protects a different UUID collision", async () => {
    const identical = rule("a");
    const collision = rule("b", ["local-only"]);
    const result = await reconcileManagedRules([identical, collision], [rule("a"), rule("b")], SOURCE);

    expect(result.unchanged).toEqual(["a"]);
    expect(result.rules.find(({uuid}) => uuid === "a").managed).toBe(true);
    expect(result.conflicts).toEqual([
        {uuid: "b", reason: "uuid-collision-or-local-rule"},
    ]);
});

test("reconcileManagedRules rejects duplicate incoming UUIDs", async () => {
    await expect(reconcileManagedRules([], [rule("duplicate"), rule("duplicate")], SOURCE))
        .rejects.toThrow("Managed rule package contains duplicate UUID: duplicate");
});

test("managed-source migration demotes unknown remote rules without changing rule behavior", async () => {
    const oldSource = {
        id: "retired-remote-source",
        url: "https://old.example/rules.json",
        version: "legacy",
    };
    const managed = await createManagedRule(rule("a", ["utm_*", "fbclid"]), oldSource);
    const result = migrateManagedSourceState([managed], {
        [oldSource.url]: { imported: { uuids: ["a"], digest: "old" } },
    });

    expect(result.changed).toBe(true);
    expect(result.demoted).toBe(1);
    expect(result.pruned).toBe(1);
    expect(result.imports).toEqual({});
    expect(result.rules[0].managed).toBeUndefined();
    expect(result.rules[0].source).toBeUndefined();
    expect(result.rules[0].paramsFilter.values).toEqual(["utm_*", "fbclid"]);
});

test("managed-source migration preserves current catalog and explicit custom sources", async () => {
    const officialUrl = "https://raw.githubusercontent.com/HyperCriSiS/requestcontrol-rules/main/official/rules/privacy-common-params.json";
    const customUrl = "https://rules.example/custom.json";
    const official = await createManagedRule(rule("a"), {
        id: "requestcontrol-official/privacy-common-params",
        url: officialUrl,
        catalog: "requestcontrol-official",
        entry: "privacy-common-params",
        version: "1.0.0",
    });
    const custom = await createManagedRule(rule("b"), { id: customUrl, url: customUrl });
    const imports = {
        [officialUrl]: { imported: { uuids: ["a"], catalog: "requestcontrol-official", entry: "privacy-common-params" } },
        [customUrl]: { deletable: true, imported: { uuids: ["b"] } },
    };

    const result = migrateManagedSourceState([official, custom], imports);
    expect(result.changed).toBe(false);
    expect(result.demoted).toBe(0);
    expect(result.pruned).toBe(0);
    expect(result.rules.every((item) => item.managed)).toBe(true);
    expect(result.imports).toEqual(imports);
});
