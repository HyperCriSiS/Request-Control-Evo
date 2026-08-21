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
    presentation: "standard",
    behavior: "url-cleanup",
    scope: "global",
    risk: "medium",
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
    expect(validateRemoteCatalog(CATALOG, CATALOG_CHANNEL.COMMUNITY)).toContain("unexpected-catalog-id");
});

test("catalog entries cannot cross channel, host, transport or integrity boundaries", () => {
    const invalid = {
        ...CATALOG,
        ruleSets: [
            { ...ENTRY, id: "wrong-host", url: "https://example.test/wrong-host.json" },
            { ...ENTRY, id: "wrong-channel", url: ENTRY.url.replace("/official/", "/community/") },
            { ...ENTRY, id: "weak-integrity", url: ENTRY.url.replace("privacy-common-params", "weak-integrity"), sha256: "abc" },
        ],
    };
    const errors = validateRemoteCatalog(invalid, CATALOG_CHANNEL.OFFICIAL);

    expect(errors).toContain("unexpected-entry-url:wrong-host");
    expect(errors).toContain("unexpected-entry-url:wrong-channel");
    expect(errors).toContain("invalid-sha256:weak-integrity");
});

test("catalog entry ids and source URLs are unique", () => {
    const duplicateUrl = {
        ...CATALOG,
        ruleSets: [
            ENTRY,
            { ...ENTRY, id: "other-package" },
        ],
    };

    expect(validateRemoteCatalog(duplicateUrl, CATALOG_CHANNEL.OFFICIAL)).toContain(
        "unexpected-entry-url:other-package"
    );
    expect(validateRemoteCatalog(duplicateUrl, CATALOG_CHANNEL.OFFICIAL)).toContain(
        "duplicate-entry-url:other-package"
    );
});


test("catalog entries require validated presentation metadata", () => {
    const invalid = {
        ...CATALOG,
        ruleSets: [{
            ...ENTRY,
            presentation: "expert",
            behavior: "anything",
            scope: "internet",
            risk: "severe",
        }],
    };
    const errors = validateRemoteCatalog(invalid, CATALOG_CHANNEL.OFFICIAL);

    expect(errors).toContain("invalid-presentation:privacy-common-params");
    expect(errors).toContain("invalid-behavior:privacy-common-params");
    expect(errors).toContain("invalid-scope:privacy-common-params");
    expect(errors).toContain("invalid-risk:privacy-common-params");
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
        name: "Tracking parameters",
        behavior: "url-cleanup",
        presentation: "standard",
        scope: "global",
        risk: "medium",
    });
});


test("presentation metadata does not alter managed source identity fields", () => {
    const advancedEntry = {
        ...ENTRY,
        presentation: "advanced",
        behavior: "provider-override",
        scope: "cross-site",
        risk: "high",
    };

    const standard = buildCatalogSource(CATALOG, ENTRY, ENTRY.url);
    const advanced = buildCatalogSource(CATALOG, advancedEntry, ENTRY.url);
    for (const key of ["id", "url", "catalog", "entry", "version"]) {
        expect(advanced[key]).toBe(standard[key]);
    }
    expect(advanced).toMatchObject({
        behavior: "provider-override",
        presentation: "advanced",
        scope: "cross-site",
        risk: "high",
    });
});
