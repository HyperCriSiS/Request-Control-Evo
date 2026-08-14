/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export function groupRuleInputs(inputs) {
    const sorted = [...inputs].sort((a, b) => a.title.localeCompare(b.title));
    const hasNamedGroup = sorted.some((input) => Boolean(input.rule.group));

    if (!hasNamedGroup) {
        return [{ name: null, inputs: sorted }];
    }

    const groups = new Map();
    for (const input of sorted) {
        const name = input.rule.group ? decodeURIComponent(input.rule.group) : "";
        if (!groups.has(name)) {
            groups.set(name, []);
        }
        groups.get(name).push(input);
    }

    return Array.from(groups, ([name, groupInputs]) => ({ name, inputs: groupInputs })).sort((a, b) => {
        if (!a.name) {
            return 1;
        }
        if (!b.name) {
            return -1;
        }
        return a.name.localeCompare(b.name);
    });
}
