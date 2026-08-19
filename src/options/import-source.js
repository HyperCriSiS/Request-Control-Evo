/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const ALLOWED_IMPORT_PROTOCOLS = new Set([
    "http:",
    "https:",
    "moz-extension:",
    "chrome-extension:",
]);

export function normalizeImportSource(value) {
    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    try {
        const url = new URL(value.trim());
        if (!ALLOWED_IMPORT_PROTOCOLS.has(url.protocol)) {
            return null;
        }
        if (url.username || url.password) {
            return null;
        }
        return url.href;
    } catch {
        return null;
    }
}
