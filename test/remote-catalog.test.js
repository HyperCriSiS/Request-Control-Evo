import {
    CATALOG_CHANNEL,
    buildCatalogSource,
    findCatalogImportState,
    validateRemoteCatalog,
} from "../src/main/remote-catalog.js";

const ENTRY = {
    id: "privacy-common-params",
    name: "Tracking parameters",
    version: "1.0.0",
    url: "https://raw.githubusercontent.com/HyperCriSiS/requestcontrol-rules/main/official/rules/privacy-common-params.json",
    sha256: "a".repeat(64),
    legacySources: ["https://tumpio.github.io/requestcontrol/rules/privacy-common-params.json"],
    legacySourceIds: ["requestcontrol-community/privacy-common-params"],
    legacyPaths: ["rules/privacy-common-params.json"],
};

const CATALOG = {
    schemaVersion: 3,
    channel: CATALOG_CHANNEL.OFFICIAL,
    catalog: "requestcontrol-official",
    version: "1.0.0",
    ruleSets: [ENTRY],
};

test("official catalog schema is channel-bound and complete", () => {
    expect(validateRemoteCatalog(CATALOG, CATALOG_CHANNEL.OFFICIAL)).toEqual([]);
    expect(validateRemoteCatalog(CATALOG, CATALOG_CHANNEL.COMMUNITY)).toContain("unexpected-channel");
});

test("legacy imported state is found by exact source or packaged path", () => {
    const exact = findCatalogImportState({
        "https://tumpio.github.io/requestcontrol/rules/privacy-common-params.json": { imported: { digest: "old" } },
    }, ENTRY, ENTRY.url);
    expect(exact.legacy).toBe(true);
    expect(exact.data.imported.digest).toBe("old");

    const packaged = findCatalogImportState({
        "moz-extension://abcdef/rules/privacy-common-params.json": { imported: { digest: "bundled" } },
    }, ENTRY, ENTRY.url);
    expect(packaged.legacy).toBe(true);
    expect(packaged.data.imported.digest).toBe("bundled");
});

test("catalog source carries migration aliases transiently", () => {
    expect(buildCatalogSource(CATALOG, ENTRY, ENTRY.url)).toMatchObject({
        id: "requestcontrol-official/privacy-common-params",
        catalog: "requestcontrol-official",
        entry: "privacy-common-params",
        aliases: expect.arrayContaining([
            "requestcontrol-community/privacy-common-params",
            "https://tumpio.github.io/requestcontrol/rules/privacy-common-params.json",
        ]),
        legacyPaths: ["rules/privacy-common-params.json"],
    });
});
