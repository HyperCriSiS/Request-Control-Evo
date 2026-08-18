/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { SourceMatcher } from "../main/matchers.js";
import { newRuleInput as createRuleInput } from "./rule-input.js";

export function newRuleInput(rule) {
    const input = createRuleInput(rule);
    installSourceScopeEditor(input);
    return input;
}

function installSourceScopeEditor(input) {
    const matchers = input.querySelector("#matchers");
    const includes = input.querySelector("#includes");
    const includesLabel = matchers?.querySelector('small[data-i18n="includes"]');
    if (!matchers || !includes || !includesLabel) {
        return;
    }

    const label = document.createElement("small");
    label.className = "source-sites-label";
    label.textContent = browser.i18n.getMessage("source");

    const sourceSitesInput = includes.cloneNode(true);
    sourceSitesInput.id = "source-sites";
    sourceSitesInput.tags = [];
    sourceSitesInput.setAttribute("data-separator", ", ");
    sourceSitesInput.removeAttribute("data-i18n-placeholder");
    sourceSitesInput.placeholder = "*://example.com/*";

    matchers.insertBefore(label, includesLabel);
    matchers.insertBefore(sourceSitesInput, includesLabel);

    const updateInputs = input.updateInputs.bind(input);
    input.updateInputs = function () {
        updateInputs();
        sourceSitesInput.tags = normalizeSourceSites(this.rule.pattern.source);
    };

    const updateRule = input.updateRule.bind(input);
    input.updateRule = function () {
        updateRule();
        const sourceSites = sourceSitesInput.tags;
        if (sourceSites.length > 0) {
            this.rule.pattern.source = sourceSites;
        } else {
            delete this.rule.pattern.source;
        }
    };

    const isValid = input.isValid.bind(input);
    input.isValid = function () {
        if (!isValid()) {
            return false;
        }
        try {
            const sourceSites = sourceSitesInput.tags;
            if (sourceSites.length > 0) {
                new SourceMatcher(sourceSites);
            }
        } catch {
            return false;
        }
        this.classList.remove("error");
        return true;
    };
}

function normalizeSourceSites(value) {
    if (!value) {
        return [];
    }
    return Array.isArray(value) ? value : [value];
}
