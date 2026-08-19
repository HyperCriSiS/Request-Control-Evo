import {
    SUPPORT_DIAGNOSTIC_SCHEMA_VERSION,
    buildSupportDiagnostic,
    summarizeImportState,
    summarizeRuleRuntimeState,
    summarizeRuleSource,
} from "../src/main/analysis/support-diagnostic.js";

const secretRequestUrl = "https://tracker.secret.example/pixel?token=private-value";
const secretPageUrl = "https://private.example/account?session=secret";
const secretCustomSource = "https://rules.private.example/user/rules.json?token=source-secret";
const officialSource = "https://raw.githubusercontent.com/HyperCriSiS/requestcontrol-rules/main/official/rules/privacy-common-params.json";
const installedDigest = "a".repeat(64);
const availableDigest = "b".repeat(64);

test("rule source summaries expose channel identity without remote URLs", () => {
    expect(summarizeRuleSource({uuid: "local"})).toEqual({channel: "local"});
    expect(summarizeRuleSource({
        managed: true,
        source: {
            catalog: "requestcontrol-official",
            entry: "privacy-common-params",
            version: "1.2.0",
            url: officialSource,
        },
    })).toEqual({
        channel: "official",
        packageId: "privacy-common-params",
        version: "1.2.0",
    });
    expect(summarizeRuleSource({
        managed: true,
        source: {url: secretCustomSource},
    })).toEqual({channel: "custom"});
});

test("import summary omits source keys and keeps update, integrity and conflict reason codes", () => {
    const packages = summarizeImportState({
        [secretCustomSource]: {
            deletable: true,
            imported: {
                digest: installedDigest,
                availableDigest,
                conflicts: [{uuid: "custom-rule", reason: "local-modified"}],
            },
        },
        [officialSource]: {
            imported: {
                catalog: "requestcontrol-official",
                entry: "privacy-common-params",
                version: "1.0.0",
                digest: installedDigest,
                availableDigest: installedDigest,
                conflicts: [],
            },
        },
    });

    expect(packages).toEqual([
        expect.objectContaining({channel: "custom", updateAvailable: true, integrityStatus: "not-required"}),
        expect.objectContaining({
            channel: "official",
            packageId: "privacy-common-params",
            updateAvailable: false,
            integrityStatus: "verified-at-import",
        }),
    ]);
    expect(JSON.stringify(packages)).not.toContain(secretCustomSource);
    expect(packages[0].conflicts).toEqual([{uuid: "custom-rule", reason: "local-modified"}]);
});

test("matched rule runtime state combines source, update and rule-specific conflicts", () => {
    const rule = {
        uuid: "official-rule",
        managed: true,
        source: {
            catalog: "requestcontrol-official",
            entry: "privacy-common-params",
            version: "1.0.0",
            url: officialSource,
        },
    };
    const imports = {
        [officialSource]: {
            imported: {
                catalog: "requestcontrol-official",
                entry: "privacy-common-params",
                version: "1.0.0",
                digest: installedDigest,
                availableDigest,
                availableVersion: "1.1.0",
                conflicts: [
                    {uuid: "other-rule", reason: "local-modified"},
                    {uuid: "official-rule", reason: "baseline-unknown"},
                ],
            },
        },
    };

    expect(summarizeRuleRuntimeState(rule, imports)).toEqual({
        channel: "official",
        packageId: "privacy-common-params",
        version: "1.0.0",
        integrityStatus: "verified-at-import",
        updateAvailable: true,
        availableVersion: "1.1.0",
        conflictReason: "baseline-unknown",
        lastCheckStatus: null,
    });
});

test("support diagnostic is privacy-minimized by construction", () => {
    const session = {
        active: false,
        pageUrl: secretPageUrl,
        dropped: 2,
        requests: [{
            requestId: "request-secret-id",
            url: secretRequestUrl,
            type: "script",
            method: "GET",
            status: "completed",
            statusCode: 204,
            classification: {
                hostname: "tracker.secret.example",
                thirdParty: true,
                trackingHint: true,
            },
            effect: {
                action: "filter",
                target: "https://clean.secret.example/path?still=private",
                rule: {uuid: "official-rule"},
            },
        }],
    };
    const rules = [{
        uuid: "official-rule",
        managed: true,
        source: {
            catalog: "requestcontrol-official",
            entry: "privacy-common-params",
            version: "1.0.0",
            url: officialSource,
        },
    }];

    const diagnostic = buildSupportDiagnostic(session, {
        rules,
        imports: {},
        extensionVersion: "1.20.0-test",
        generatedAt: "2026-08-19T00:00:00.000Z",
    });
    const serialized = JSON.stringify(diagnostic);

    expect(diagnostic.schemaVersion).toBe(SUPPORT_DIAGNOSTIC_SCHEMA_VERSION);
    expect(diagnostic.privacy).toEqual({
        containsRawUrls: false,
        containsHostnames: false,
        containsQueryStrings: false,
        containsCustomSourceUrls: false,
    });
    expect(diagnostic.inspection.totals).toMatchObject({requests: 1, thirdParty: 1, trackingHints: 1, affected: 1, dropped: 2});
    expect(diagnostic.inspection.affectedRules).toEqual([{
        uuid: "official-rule",
        action: "filter",
        count: 1,
        source: {channel: "official", packageId: "privacy-common-params", version: "1.0.0"},
    }]);
    expect(serialized).not.toContain(secretRequestUrl);
    expect(serialized).not.toContain(secretPageUrl);
    expect(serialized).not.toContain("tracker.secret.example");
    expect(serialized).not.toContain("private-value");
    expect(serialized).not.toContain("request-secret-id");
});

test("support diagnostic rejects URL-like and unbounded free identifiers", () => {
    const secretIdentifier = "https://private.example/?token=secret";
    const diagnostic = buildSupportDiagnostic({
        active: false,
        requests: [{
            type: "script",
            classification: { thirdParty: true, trackingHint: false },
            effect: {
                action: secretIdentifier,
                rule: { uuid: secretIdentifier },
            },
        }],
    }, {
        extensionVersion: secretIdentifier,
        generatedAt: secretIdentifier,
        rules: [{
            uuid: secretIdentifier,
            managed: true,
            source: {
                catalog: "requestcontrol-official",
                entry: secretIdentifier,
                version: secretIdentifier,
            },
        }],
        imports: {
            [secretCustomSource]: {
                imported: {
                    catalog: "requestcontrol-official",
                    entry: secretIdentifier,
                    version: secretIdentifier,
                    digest: secretIdentifier,
                    availableDigest: secretIdentifier,
                    conflicts: [{ uuid: secretIdentifier, reason: secretIdentifier }],
                    lastCheckStatus: secretIdentifier,
                },
            },
        },
    });

    const serialized = JSON.stringify(diagnostic);
    expect(serialized).not.toContain("private.example");
    expect(serialized).not.toContain("token=secret");
    expect(diagnostic.generatedAt).toBeNull();
    expect(diagnostic.extensionVersion).toBeNull();
    expect(diagnostic.inspection.affectedRules).toEqual([]);
    expect(diagnostic.packages[0]).toMatchObject({
        packageId: null,
        version: null,
        installedDigest: null,
        availableDigest: null,
        lastCheckStatus: null,
        conflicts: [],
    });
});
