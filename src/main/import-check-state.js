/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export function recordImportCheck(data, result, checkedAt = Date.now()) {
    if (!data?.imported) return data;

    const imported = {
        ...data.imported,
        lastCheckedAt: checkedAt,
    };

    if (result.loadStatus === "available" && result.digest) {
        imported.availableDigest = result.digest;
        imported.availableVersion = result.version || null;
        imported.integrityStatus = result.integrityStatus || "unknown";
        imported.lastCheckStatus = "ok";
    } else if (result.loadStatus === "integrity-failed") {
        imported.integrityStatus = "failed";
        imported.lastCheckStatus = "integrity-failed";
    } else {
        imported.lastCheckStatus = "unavailable";
    }

    return { ...data, imported };
}

export function recordCatalogUnavailable(imports = {}, catalog, checkedAt = Date.now()) {
    return Object.fromEntries(Object.entries(imports).map(([source, data]) => [
        source,
        data?.imported?.catalog === catalog
            ? recordImportCheck(data, { loadStatus: "unavailable" }, checkedAt)
            : data,
    ]));
}
