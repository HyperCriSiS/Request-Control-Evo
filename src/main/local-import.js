/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export function sanitizeLocalRule(rule) {
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
        throw new TypeError("Imported rules must be JSON objects.");
    }

    const copy = JSON.parse(JSON.stringify(rule));
    delete copy.managed;
    delete copy.source;
    return copy;
}
