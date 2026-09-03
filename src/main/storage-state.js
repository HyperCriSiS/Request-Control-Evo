/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { migrateManagedSourceState } from "./catalog.js";
import { migrateLegacyTagsToGroups } from "../options/legacy-metadata.js";

function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeRules(value) {
    if (typeof value === "undefined") {
        return { value: [], changed: false };
    }
    if (!Array.isArray(value)) {
        return { value: [], changed: true };
    }

    const rules = value.filter(isRecord);
    return {
        value: rules.length === value.length ? value : rules,
        changed: rules.length !== value.length,
    };
}

function normalizeImports(value) {
    if (typeof value === "undefined") {
        return { value: {}, changed: false };
    }
    if (!isRecord(value)) {
        return { value: {}, changed: true };
    }

    let changed = false;
    const imports = {};
    for (const [source, data] of Object.entries(value)) {
        if (!isRecord(data)) {
            changed = true;
            continue;
        }
        imports[source] = data;
    }

    return {
        value: changed ? imports : value,
        changed,
    };
}

export function normalizeStoredState(options = {}) {
    const source = isRecord(options) ? options : {};
    const rules = normalizeRules(source.rules);
    const imports = normalizeImports(source.imports);

    return {
        options: {
            ...source,
            rules: rules.value,
            imports: imports.value,
        },
        changed: source !== options || rules.changed || imports.changed,
    };
}

export async function loadAndRepairStoredState(storage, keys, { onWriteError = () => {} } = {}) {
    const stored = await storage.get(keys);
    const normalizedState = normalizeStoredState(stored);
    const managedMigration = migrateManagedSourceState(
        normalizedState.options.rules,
        normalizedState.options.imports
    );
    const legacyMetadataMigration = migrateLegacyTagsToGroups(managedMigration.rules);
    const options = {
        ...normalizedState.options,
        rules: legacyMetadataMigration.rules,
        imports: managedMigration.imports,
    };

    if (normalizedState.changed || managedMigration.changed || legacyMetadataMigration.changed) {
        try {
            await storage.set({
                rules: options.rules,
                imports: options.imports,
            });
        } catch (error) {
            try {
                onWriteError(error);
            } catch {
                // Reporting must not turn a recoverable storage write failure into a startup failure.
            }
        }
    }

    return options;
}
