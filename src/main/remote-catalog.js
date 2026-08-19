/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const REMOTE_CATALOG_SCHEMA_VERSION = 3;

export const CATALOG_CHANNEL = Object.freeze({
    OFFICIAL: "official",
    COMMUNITY: "community",
});

const CATALOG_IDENTITIES = Object.freeze({
    [CATALOG_CHANNEL.OFFICIAL]: {
        catalog: "requestcontrol-official",
        path: "/HyperCriSiS/requestcontrol-rules/main/official/rules/",
    },
    [CATALOG_CHANNEL.COMMUNITY]: {
        catalog: "requestcontrol-community",
        path: "/HyperCriSiS/requestcontrol-rules/main/community/rules/",
    },
});

function isExpectedEntryUrl(value, entryId, expectedChannel) {
    const identity = CATALOG_IDENTITIES[expectedChannel];
    if (!identity || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(entryId || "")) return false;
    try {
        const url = new URL(value);
        return url.protocol === "https:" &&
            url.hostname === "raw.githubusercontent.com" &&
            !url.username &&
            !url.password &&
            !url.port &&
            !url.search &&
            !url.hash &&
            url.pathname === `${identity.path}${entryId}.json`;
    } catch {
        return false;
    }
}

export function validateRemoteCatalog(catalog, expectedChannel) {
    const errors = [];
    const identity = CATALOG_IDENTITIES[expectedChannel];
    if (catalog?.schemaVersion !== REMOTE_CATALOG_SCHEMA_VERSION) errors.push("unsupported-schema-version");
    if (catalog?.channel !== expectedChannel) errors.push("unexpected-channel");
    if (!identity || catalog?.catalog !== identity.catalog) errors.push("unexpected-catalog-id");
    if (!Array.isArray(catalog?.ruleSets)) errors.push("missing-rule-sets");

    const ids = new Set();
    const urls = new Set();
    for (const entry of catalog?.ruleSets || []) {
        if (!entry?.id || ids.has(entry.id)) errors.push("missing-or-duplicate-entry-id");
        ids.add(entry?.id);
        if (!entry?.name || !entry?.url || !entry?.version || !entry?.sha256) errors.push(`incomplete-entry:${entry?.id || "unknown"}`);
        if (!isExpectedEntryUrl(entry?.url, entry?.id, expectedChannel)) {
            errors.push(`unexpected-entry-url:${entry?.id || "unknown"}`);
        }
        if (urls.has(entry?.url)) errors.push(`duplicate-entry-url:${entry?.id || "unknown"}`);
        urls.add(entry?.url);
        if (!/^[a-f0-9]{64}$/i.test(entry?.sha256 || "")) {
            errors.push(`invalid-sha256:${entry?.id || "unknown"}`);
        }
    }
    return errors;
}

export function findCatalogImportState(imports = {}, _entry = {}, currentSource = "") {
    return {
        key: currentSource,
        data: imports[currentSource] || {},
    };
}

export function buildCatalogSource(catalog, entry, sourceUrl) {
    return {
        id: `${catalog.catalog}/${entry.id}`,
        url: sourceUrl,
        catalog: catalog.catalog,
        entry: entry.id,
        version: entry.version || catalog.version,
    };
}
