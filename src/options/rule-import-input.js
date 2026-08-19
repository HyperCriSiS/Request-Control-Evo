/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { normalizeImportSource } from "./import-source.js";
import {
    initialSelectedRuleUuids,
    sameRuleSelection,
    selectedRules as filterSelectedRules,
} from "./import-selection.js";
import { fetchWithTimeout } from "../main/remote-fetch.js";

class RuleImportInput extends HTMLElement {
    constructor() {
        super();
        this._rules = [];
        this._data = {};
        this._source = "";
        this._fetchSource = "";
        this._loadPromise = null;
        this._selectedUuids = new Set();
        this._baselineSelectedUuids = new Set();
        this.loadStatus = "idle";
        this.integrityStatus = "unknown";
        const template = document.getElementById("rule-import-input");
        this.attachShadow({ mode: "open" }).appendChild(template.content.cloneNode(true));
        this.enhancePresentation();

        this.shadowRoot.getElementById("show-imported").addEventListener("click", () => {
            this.dispatchEvent(
                new CustomEvent("rule-import-show-imported", {
                    bubbles: true,
                    composed: true,
                })
            );
        });

        this.shadowRoot.getElementById("delete-imported").addEventListener("click", () => {
            this.dispatchEvent(
                new CustomEvent("rule-import-delete-imported", {
                    bubbles: true,
                    composed: true,
                })
            );
        });

        this.shadowRoot.getElementById("import").addEventListener("click", async () => {
            const button = this.shadowRoot.getElementById("import");
            button.disabled = true;
            button.classList.add("is-loading");
            try {
                await this.load();
                if (!this.digest) {
                    return;
                }
                if (this.selectedRules.length === 0 && !this._data?.imported) {
                    this.shadowRoot.getElementById("rule-selection").open = true;
                    return;
                }
                this.dispatchEvent(
                    new CustomEvent("rule-import-import-list", {
                        bubbles: true,
                        composed: true,
                    })
                );
            } finally {
                button.classList.remove("is-loading");
                this.updateImportAction();
            }
        });
    }

    static get observedAttributes() {
        return ["src", "deletable", "expected-sha256"];
    }

    attributeChangedCallback(name, _oldValue, newValue) {
        switch (name) {
            case "src":
                this.source = newValue;
                break;
            case "deletable":
                this.onDeletableChanged(newValue);
                break;
            case "expected-sha256":
                this.expectedSha256 = newValue ? newValue.toLowerCase() : null;
                break;
            default:
                break;
        }
    }

    enhancePresentation() {
        const row = this.shadowRoot.querySelector("li");
        row.classList.add("import-row");

        const heading = document.createElement("div");
        heading.className = "import-heading";
        const name = this.shadowRoot.getElementById("name");
        name.classList.add("import-name");
        heading.append(name);

        const actions = document.createElement("div");
        actions.className = "import-actions";
        for (const id of [
            "count",
            "imported",
            "update",
            "integrity",
            "import",
            "delete-imported",
            "show-imported",
            "delete",
            "error",
        ]) {
            const element = this.shadowRoot.getElementById(id);
            if (element) {
                actions.append(element);
            }
        }
        heading.append(actions);
        row.prepend(heading);

        const description = document.createElement("p");
        description.id = "description";
        description.className = "description";
        description.hidden = true;

        const meta = document.createElement("div");
        meta.className = "import-meta";

        const url = this.shadowRoot.getElementById("url");
        url.classList.add("source-link");
        url.rel = "noopener noreferrer";
        const sourceLabel = document.createElement("span");
        sourceLabel.textContent = message("source", "Source");
        url.append(sourceLabel);
        meta.append(url);

        const rating = document.createElement("span");
        rating.id = "rating";
        rating.className = "rating";
        rating.hidden = true;
        const ratingLink = document.createElement("a");
        ratingLink.id = "rating-link";
        ratingLink.className = "rating-link";
        ratingLink.target = "_blank";
        ratingLink.rel = "noopener noreferrer";
        ratingLink.textContent = message("community_review", "Community review");
        rating.append(ratingLink);
        meta.append(rating);

        const details = document.createElement("details");
        details.className = "import-details";
        const summary = document.createElement("summary");
        summary.textContent = message("import_details", "Details");
        details.append(summary, description, meta);
        row.append(details);

        const selection = document.createElement("details");
        selection.id = "rule-selection";
        selection.className = "rule-selection";
        const selectionSummary = document.createElement("summary");
        selectionSummary.id = "selection-summary";
        selectionSummary.textContent = message("import_choose_rules", "Choose rules");

        const selectionToolbar = document.createElement("div");
        selectionToolbar.className = "selection-toolbar";
        for (const [id, key, fallback, handler] of [
            ["select-all-rules", "import_select_all", "Select all", () => this.selectAllRules()],
            ["select-no-rules", "import_select_none", "Select none", () => this.selectNoRules()],
            ["invert-rule-selection", "import_invert_selection", "Invert selection", () => this.invertRuleSelection()],
            ["reset-rule-selection", "import_reset_selection", "Reset selection", () => this.resetRuleSelection()],
        ]) {
            const button = document.createElement("button");
            button.id = id;
            button.type = "button";
            button.className = "btn text selection-action";
            button.textContent = message(key, fallback);
            button.addEventListener("click", handler);
            selectionToolbar.append(button);
        }

        const selectionList = document.createElement("ul");
        selectionList.id = "selection-list";
        selectionList.className = "selection-list";
        selection.append(selectionSummary, selectionToolbar, selectionList);
        selection.addEventListener("toggle", () => {
            if (selection.open && this.source) {
                this.load();
            }
        });
        row.append(selection);
    }

    onSourceChanged(src) {
        const text = this.shadowRoot.getElementById("name");
        const url = this.shadowRoot.getElementById("url");
        url.title = message("view_list", "View source");

        if (!src) {
            if (!this.textContent.trim()) {
                text.textContent = "";
            }
            url.removeAttribute("href");
            this._rules = [];
            this.digest = null;
            this._selectedUuids = new Set();
            this._baselineSelectedUuids = new Set();
            this.renderRuleSelection();
            this.loadStatus = "idle";
            this.integrityStatus = "unknown";
            return;
        }

        if (!this.textContent.trim()) {
            text.textContent = new URL(src).hostname || src;
        }

        url.href = humanReadableSource(src);
        this.shadowRoot.getElementById("rule-selection").hidden = false;
        if (!this.hasAttribute("lazy")) {
            this.load();
        }
    }

    onDeletableChanged(deletable) {
        const deleteButton = this.shadowRoot.getElementById("delete");
        deleteButton.hidden = !deletable;
        deleteButton.addEventListener("click", () => {
            this.dispatchEvent(
                new CustomEvent("rule-import-deleted", {
                    bubbles: true,
                    composed: true,
                })
            );
        });
    }

    get source() {
        return this._source;
    }

    set source(value) {
        const source = normalizeImportSource(value);
        this._source = source || "";
        this.onSourceChanged(this._source);
    }

    set fetchSource(value) {
        this._fetchSource = normalizeImportSource(value) || "";
    }

    set sourceHomepage(value) {
        const link = this.shadowRoot.getElementById("url");
        const source = normalizeImportSource(value);
        if (source) {
            link.href = source;
        }
    }

    set communityReview(value) {
        const rating = this.shadowRoot.getElementById("rating");
        const link = this.shadowRoot.getElementById("rating-link");
        const source = normalizeImportSource(value);
        rating.hidden = !source;
        if (source) {
            link.href = source;
        } else {
            link.removeAttribute("href");
        }
    }

    load() {
        if (!this._loadPromise) {
            const source = this._fetchSource || this.source;
            this._loadPromise = this.fetchRules(source).finally(() => {
                this.data = this._data;
                if (!this.digest) {
                    this._loadPromise = null;
                    this._selectedUuids = new Set();
                    this._baselineSelectedUuids = new Set();
                    this.renderRuleSelection();
                }
            });
        }
        return this._loadPromise;
    }

    get data() {
        return this._data;
    }

    get updateAvailable() {
        return Boolean(this._data?.imported && this.digest && this._data.imported.digest !== this.digest);
    }

    set data(value = {}) {
        const imported = this.shadowRoot.getElementById("imported");
        const update = this.shadowRoot.getElementById("update");
        const deleteImported = this.shadowRoot.getElementById("delete-imported");
        const showImported = this.shadowRoot.getElementById("show-imported");
        imported.hidden = !value.imported;
        update.hidden = !value.imported || !this.digest || value.imported.digest === this.digest;
        showImported.hidden = !value.imported;
        deleteImported.hidden = !value.imported;
        this._data = value;
        if (this.digest && this._rules.length) {
            this.initializeSelection();
        }
        this.updateImportAction();
    }

    set description(value) {
        const description = this.shadowRoot.getElementById("description");
        const text = (value || "").trim();
        description.textContent = text;
        description.title = text;
        description.hidden = !text;
        if (this.hasAttribute("warning") && text) {
            const details = this.shadowRoot.querySelector(".import-details");
            if (details) {
                details.open = true;
            }
        }
    }

    get selectedRules() {
        return filterSelectedRules(this._rules, this._selectedUuids);
    }

    get rules() {
        return this.selectedRules;
    }

    get selectedUuids() {
        return this.selectedRules.map((rule) => rule.uuid);
    }

    initializeSelection() {
        const selected = initialSelectedRuleUuids(this._rules, this._data?.imported || null);
        this._selectedUuids = new Set(selected);
        this._baselineSelectedUuids = new Set(selected);
        this.renderRuleSelection();
    }

    selectAllRules() {
        this._selectedUuids = new Set(this._rules.filter((rule) => rule?.uuid).map((rule) => rule.uuid));
        this.updateSelectionPresentation();
    }

    selectNoRules() {
        this._selectedUuids = new Set();
        this.updateSelectionPresentation();
    }

    invertRuleSelection() {
        const next = new Set();
        for (const rule of this._rules) {
            if (rule?.uuid && !this._selectedUuids.has(rule.uuid)) {
                next.add(rule.uuid);
            }
        }
        this._selectedUuids = next;
        this.updateSelectionPresentation();
    }

    resetRuleSelection() {
        this._selectedUuids = new Set(this._baselineSelectedUuids);
        this.updateSelectionPresentation();
    }

    renderRuleSelection() {
        const details = this.shadowRoot.getElementById("rule-selection");
        const list = this.shadowRoot.getElementById("selection-list");
        if (!details || !list) {
            return;
        }
        list.replaceChildren();
        const selectable = this._rules.filter((rule) => rule?.uuid);
        details.hidden = !this.source;

        for (const rule of selectable) {
            const item = document.createElement("li");
            item.className = "selection-rule";
            const label = document.createElement("label");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = this._selectedUuids.has(rule.uuid);
            checkbox.dataset.uuid = rule.uuid;
            checkbox.addEventListener("change", () => {
                if (checkbox.checked) {
                    this._selectedUuids.add(rule.uuid);
                } else {
                    this._selectedUuids.delete(rule.uuid);
                }
                this.updateSelectionPresentation();
            });

            const text = document.createElement("span");
            text.className = "selection-rule-text";
            const title = document.createElement("strong");
            title.textContent = rule.title || rule.uuid;
            text.append(title);
            if (rule.description) {
                const description = document.createElement("small");
                description.textContent = rule.description;
                text.append(description);
            }
            label.append(checkbox, text);
            item.append(label);
            list.append(item);
        }
        this.updateSelectionPresentation();
    }

    updateSelectionPresentation() {
        const summary = this.shadowRoot.getElementById("selection-summary");
        const list = this.shadowRoot.getElementById("selection-list");
        if (!summary || !list) {
            return;
        }
        const selectable = this._rules.filter((rule) => rule?.uuid);
        const selectedCount = selectable.filter((rule) => this._selectedUuids.has(rule.uuid)).length;
        summary.textContent = this.digest
            ? (browser.i18n.getMessage("import_selected_count", [String(selectedCount), String(selectable.length)]) ||
                `${selectedCount} of ${selectable.length} rules selected`)
            : message("import_choose_rules", "Choose rules");
        list.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
            checkbox.checked = this._selectedUuids.has(checkbox.dataset.uuid);
        });
        this.shadowRoot.querySelectorAll(".selection-action").forEach((button) => {
            button.disabled = selectable.length === 0;
        });
        const reset = this.shadowRoot.getElementById("reset-rule-selection");
        if (reset) {
            reset.disabled = sameRuleSelection(this._selectedUuids, this._baselineSelectedUuids);
        }
        this.updateImportAction();
    }

    updateImportAction() {
        const importList = this.shadowRoot.getElementById("import");
        const imported = Boolean(this._data?.imported);
        const selectionDirty = imported && !sameRuleSelection(this._selectedUuids, this._baselineSelectedUuids);
        const unavailable = !this.digest && !this.hasAttribute("lazy");
        importList.hidden = unavailable || Boolean(imported && !this.updateAvailable && !selectionDirty);
        importList.disabled = Boolean(!imported && this.digest && this.selectedRules.length === 0);
        importList.title = imported
            ? message("import_apply_selection", "Apply selection")
            : message("import_selected_rules", "Import selected rules");
    }

    async fetchRules(src) {
        const count = this.shadowRoot.getElementById("count");
        const integrity = this.shadowRoot.getElementById("integrity");
        this.setAttribute("aria-busy", "true");
        count.hidden = true;
        integrity.hidden = true;
        this.digest = null;
        this._rules = [];
        this.loadStatus = "loading";
        this.integrityStatus = this.expectedSha256 ? "pending" : "not-required";

        try {
            const source = normalizeImportSource(src);
            if (!source) {
                throw new TypeError("Unsupported rule source URL");
            }
            const response = await fetchWithTimeout(source, { cache: "no-store" });
            if (!response.ok) {
                throw new Error(`Failed to fetch rule list: ${response.status}`);
            }
            const text = await response.text();
            this.digest = await digest(text);
            if (this.expectedSha256 && this.digest !== this.expectedSha256) {
                integrity.hidden = false;
                integrity.textContent = message("integrity_failed", "Integrity check failed");
                this.digest = null;
                this.loadStatus = "integrity-failed";
                this.integrityStatus = "failed";
                return;
            }
            if (this.expectedSha256) {
                this.integrityStatus = "verified";
            }
            const parsed = JSON.parse(text);
            this._rules = Array.isArray(parsed) ? parsed : [parsed];
            if (this._rules.some((rule) => !rule || typeof rule !== "object")) {
                throw new TypeError("Invalid rule payload");
            }
            this.loadStatus = "available";
            this.initializeSelection();
            count.hidden = false;
            if (this._rules.length === 1) {
                count.textContent = browser.i18n.getMessage("count_rule") || "1 rule";
            } else {
                count.textContent = browser.i18n.getMessage("count_rules", this._rules.length) || `${this._rules.length} rules`;
            }
        } catch {
            this.digest = null;
            this._rules = [];
            this._selectedUuids = new Set();
            this._baselineSelectedUuids = new Set();
            this.renderRuleSelection();
            this.loadStatus = "unavailable";
            if (this.integrityStatus === "pending") {
                this.integrityStatus = "unknown";
            }
            count.hidden = false;
            count.textContent = message("import_unavailable", "Unavailable");
        } finally {
            this.removeAttribute("aria-busy");
        }
    }
}

customElements.define("rule-import-input", RuleImportInput);

function humanReadableSource(src) {
    const source = normalizeImportSource(src);
    if (!source) {
        return "about:blank";
    }

    try {
        const url = new URL(source);
        if (url.hostname === "raw.githubusercontent.com") {
            const parts = url.pathname.split("/").filter(Boolean);
            if (parts.length >= 4) {
                const [owner, repo, ref, ...path] = parts;
                return `https://github.com/${owner}/${repo}/blob/${ref}/${path.join("/")}`;
            }
        }
        return source;
    } catch {
        return "about:blank";
    }
}

function message(key, fallback, substitutions) {
    return browser.i18n.getMessage(key, substitutions) || fallback;
}

async function digest(text, algorithm = "SHA-256") {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const digest = await crypto.subtle.digest(algorithm, data);
    const bytes = Array.from(new Uint8Array(digest));
    return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
