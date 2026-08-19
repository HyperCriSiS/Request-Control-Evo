/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export function selectableRuleUuids(rules = []) {
    return rules
        .filter((rule) => rule && typeof rule === "object" && typeof rule.uuid === "string" && rule.uuid)
        .map((rule) => rule.uuid);
}

export function initialSelectedRuleUuids(rules = [], imported = null) {
    const available = selectableRuleUuids(rules);
    if (!imported) {
        return new Set(available);
    }

    const stored = Array.isArray(imported.selectedUuids)
        ? imported.selectedUuids
        : Array.isArray(imported.uuids)
            ? imported.uuids
            : available;
    const wanted = new Set(stored);
    return new Set(available.filter((uuid) => wanted.has(uuid)));
}

export function selectedRules(rules = [], selectedUuids = new Set()) {
    const selected = selectedUuids instanceof Set ? selectedUuids : new Set(selectedUuids || []);
    return rules.filter((rule) => rule && typeof rule.uuid === "string" && selected.has(rule.uuid));
}

export function sameRuleSelection(left = [], right = []) {
    const a = left instanceof Set ? left : new Set(left || []);
    const b = right instanceof Set ? right : new Set(right || []);
    if (a.size !== b.size) {
        return false;
    }
    return Array.from(a).every((uuid) => b.has(uuid));
}
