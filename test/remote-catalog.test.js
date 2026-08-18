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

test("catalog import state uses only the current exact source", () => {
    const imports = {
        [ENTRY.url]: { imported: { digest: "current" } },
        "https://example.test/old-source.json": { imported: { digest: "old" } },
    };

    expect(findCatalogImportState(imports, ENTRY, ENTRY.url)).toEqual({
        key: ENTRY.url,
        data: imports[ENTRY.url],
    });
    expect(findCatalogImportState(imports, ENTRY, "https://example.test/missing.json")).toEqual({
        key: "https://example.test/missing.json",
        data: {},
    });
});

test("catalog source contains only current remote identity", () => {
    expect(buildCatalogSource(CATALOG, ENTRY, ENTRY.url)).toEqual({
        id: "requestcontrol-official/privacy-common-params",
        url: ENTRY.url,
        catalog: "requestcontrol-official",
        entry: "privacy-common-params",
        version: "1.0.0",
    });
});
