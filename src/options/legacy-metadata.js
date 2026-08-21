/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export function decodeLegacyMetadata(value) {
    if (typeof value !== "string") {
        return "";
    }
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

export function migrateLegacyTagsToGroups(rules = []) {
    if (!Array.isArray(rules)) {
        return { rules: [], changed: false };
    }

    let changed = false;
    const migrated = rules.map((rule) => {
        if (!rule || typeof rule !== "object") {
            return rule;
        }

        const explicitGroup = String(rule.group || "").trim();
        const legacyTag = decodeLegacyMetadata(rule.tag).trim();
        if (explicitGroup || !legacyTag) {
            return rule;
        }

        changed = true;
        return {
            ...rule,
            group: legacyTag,
        };
    });

    return {
        rules: changed ? migrated : rules,
        changed,
    };
}
