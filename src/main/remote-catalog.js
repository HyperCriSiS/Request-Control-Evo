/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const REMOTE_CATALOG_SCHEMA_VERSION = 3;

export const CATALOG_CHANNEL = Object.freeze({
    OFFICIAL: "official",
    COMMUNITY: "community",
});

export function validateRemoteCatalog(catalog, expectedChannel) {
    const errors = [];
    if (catalog?.schemaVersion !== REMOTE_CATALOG_SCHEMA_VERSION) errors.push("unsupported-schema-version");
    if (catalog?.channel !== expectedChannel) errors.push("unexpected-channel");
    if (!catalog?.catalog || typeof catalog.catalog !== "string") errors.push("missing-catalog-id");
    if (!Array.isArray(catalog?.ruleSets)) errors.push("missing-rule-sets");

    const ids = new Set();
    for (const entry of catalog?.ruleSets || []) {
        if (!entry?.id || ids.has(entry.id)) errors.push("missing-or-duplicate-entry-id");
        ids.add(entry?.id);
        if (!entry?.name || !entry?.url || !entry?.version || !entry?.sha256) errors.push(`incomplete-entry:${entry?.id || "unknown"}`);
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
