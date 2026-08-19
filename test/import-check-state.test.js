import { recordCatalogUnavailable, recordImportCheck } from "../src/main/import-check-state.js";

const installed = {
    imported: {
        catalog: "requestcontrol-official",
        entry: "privacy-common-params",
        version: "1.0.0",
        digest: "installed",
        availableDigest: "installed",
        integrityStatus: "verified-at-import",
    },
};

test("successful package checks persist available version, digest and integrity", () => {
    expect(recordImportCheck(installed, {
        loadStatus: "available",
        digest: "new",
        version: "1.1.0",
        integrityStatus: "verified",
    }, 1234)).toEqual({
        imported: expect.objectContaining({
            digest: "installed",
            availableDigest: "new",
            availableVersion: "1.1.0",
            integrityStatus: "verified",
            lastCheckStatus: "ok",
            lastCheckedAt: 1234,
        }),
    });
});

test("failed checks remain observable without erasing the last known availability", () => {
    const withKnownUpdate = recordImportCheck(installed, {
        loadStatus: "available",
        digest: "new",
        version: "1.1.0",
        integrityStatus: "verified",
    }, 1000);
    const unavailable = recordImportCheck(withKnownUpdate, { loadStatus: "unavailable" }, 2000);
    const integrityFailure = recordImportCheck(withKnownUpdate, { loadStatus: "integrity-failed" }, 3000);

    expect(unavailable.imported).toMatchObject({
        availableDigest: "new",
        availableVersion: "1.1.0",
        integrityStatus: "verified",
        lastCheckStatus: "unavailable",
        lastCheckedAt: 2000,
    });
    expect(integrityFailure.imported).toMatchObject({
        availableDigest: "new",
        integrityStatus: "failed",
        lastCheckStatus: "integrity-failed",
        lastCheckedAt: 3000,
    });
});

test("catalog failure marks only installed packages from that catalog unavailable", () => {
    const imports = {
        official: installed,
        community: { imported: { catalog: "requestcontrol-community", digest: "community" } },
        uninstalled: {},
    };

    const result = recordCatalogUnavailable(imports, "requestcontrol-official", 4321);

    expect(result.official.imported.lastCheckStatus).toBe("unavailable");
    expect(result.official.imported.lastCheckedAt).toBe(4321);
    expect(result.community).toBe(imports.community);
    expect(result.uninstalled).toBe(imports.uninstalled);
});
