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

const ACTION_ORDER = ["filter", "redirect", "secure", "block", "whitelist"];

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
        this._selectableRuleCount = 0;
        this._selectionListDirty = true;
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
                    await this.openSelection();
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

        const copy = document.createElement("div");
        copy.className = "import-copy";
        const name = this.shadowRoot.getElementById("name");
        name.classList.add("import-name");
        const description = document.createElement("p");
        description.id = "description";
        description.className = "description";
        description.hidden = true;
        copy.append(name, description);

        const actions = document.createElement("div");
        actions.className = "import-actions";
        for (const id of [
            "count",
            "imported",
            "update",
            "integrity",
            "error",
            "import",
            "delete-imported",
            "show-imported",
            "delete",
        ]) {
            const element = this.shadowRoot.getElementById(id);
            if (element) actions.append(element);
        }
        heading.append(copy, actions);
        row.prepend(heading);

        const meta = document.createElement("div");
        meta.className = "import-meta";

        const catalogMetadata = document.createElement("span");
        catalogMetadata.id = "catalog-metadata";
        catalogMetadata.className = "catalog-metadata";
        catalogMetadata.hidden = true;
        meta.append(catalogMetadata);

        const selectionToggle = document.createElement("button");
        selectionToggle.id = "selection-toggle";
        selectionToggle.type = "button";
        selectionToggle.className = "btn text selection-toggle";
        selectionToggle.setAttribute("aria-expanded", "false");
        selectionToggle.textContent = message("import_choose_rules", "Choose rules");
        selectionToggle.addEventListener("click", () => this.toggleSelection());
        meta.append(selectionToggle);

        const types = document.createElement("span");
        types.id = "import-types";
        types.className = "import-types";
        types.hidden = true;
        meta.append(types);

        const url = this.shadowRoot.getElementById("url");
        url.classList.add("source-link");
        url.rel = "noopener noreferrer";
        meta.append(url);

        row.append(meta);

        const selection = document.createElement("div");
        selection.id = "rule-selection";
        selection.className = "rule-selection";
        selection.hidden = true;

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
        selection.append(selectionToolbar, selectionList);
        row.append(selection);
    }

    async toggleSelection() {
        const panel = this.shadowRoot.getElementById("rule-selection");
        if (panel.hidden) {
            await this.openSelection();
        } else {
            panel.hidden = true;
            this.shadowRoot.getElementById("selection-toggle").setAttribute("aria-expanded", "false");
            this.renderRuleSelection();
        }
    }

    async openSelection() {
        const panel = this.shadowRoot.getElementById("rule-selection");
        const toggle = this.shadowRoot.getElementById("selection-toggle");
        panel.hidden = false;
        toggle.setAttribute("aria-expanded", "true");
        if (this.source) {
            await this.load();
        }
        if (this._selectionListDirty) {
            this.renderRuleSelection();
        }
    }

    onSourceChanged(src) {
        const text = this.shadowRoot.getElementById("name");
        const url = this.shadowRoot.getElementById("url");
        const toggle = this.shadowRoot.getElementById("selection-toggle");
        url.title = message("view_list", "View source");

        if (!src) {
            if (!this.textContent.trim()) text.textContent = "";
            url.removeAttribute("href");
            toggle.hidden = true;
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

        toggle.hidden = false;
        url.href = humanReadableSource(src);
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
        if (source) link.href = source;
    }

    set catalogMetadata(value = {}) {
        const container = this.shadowRoot.getElementById("catalog-metadata");
        if (!container) return;
        container.replaceChildren();

        const behavior = catalogBehaviorLabel(value.behavior);
        const scope = catalogScopeLabel(value.scope);
        if (behavior) container.append(createMetadataBadge(behavior, "behavior"));
        if (scope) container.append(createMetadataBadge(scope, "scope"));
        if (value.risk === "medium" || value.risk === "high") {
            container.append(createMetadataBadge(catalogRiskLabel(value.risk), `risk risk-${value.risk}`));
        }
        container.hidden = container.childElementCount === 0;
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
        if (this.digest && this._rules.length) this.initializeSelection();
        this.updateImportAction();
    }

    set description(value) {
        const description = this.shadowRoot.getElementById("description");
        const text = (value || "").trim();
        description.textContent = text;
        description.title = text;
        description.hidden = !text;
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
            if (rule?.uuid && !this._selectedUuids.has(rule.uuid)) next.add(rule.uuid);
        }
        this._selectedUuids = next;
        this.updateSelectionPresentation();
    }

    resetRuleSelection() {
        this._selectedUuids = new Set(this._baselineSelectedUuids);
        this.updateSelectionPresentation();
    }

    renderRuleSelection() {
        const panel = this.shadowRoot.getElementById("rule-selection");
        const list = this.shadowRoot.getElementById("selection-list");
        if (!panel || !list) return;

        const selectable = this._rules.filter((rule) => rule?.uuid);
        this._selectableRuleCount = selectable.length;
        this.renderActionBadges(selectable);

        if (panel.hidden) {
            list.replaceChildren();
            this._selectionListDirty = true;
            this.updateSelectionPresentation({ syncCheckboxes: false });
            return;
        }

        list.replaceChildren();
        for (const [action, rules] of groupRulesByAction(selectable)) {
            const header = document.createElement("li");
            header.className = "selection-group-header";
            header.dataset.action = action;
            const label = document.createElement("span");
            label.textContent = actionLabel(action);
            const count = document.createElement("span");
            count.className = "badge badge-light";
            count.textContent = String(rules.length);
            header.append(label, count);
            list.append(header);

            for (const rule of rules) {
                const item = document.createElement("li");
                item.className = "selection-rule";
                item.dataset.action = action;
                const labelNode = document.createElement("label");
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = this._selectedUuids.has(rule.uuid);
                checkbox.dataset.uuid = rule.uuid;
                checkbox.addEventListener("change", () => {
                    if (checkbox.checked) this._selectedUuids.add(rule.uuid);
                    else this._selectedUuids.delete(rule.uuid);
                    this.updateSelectionPresentation({ syncCheckboxes: false });
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
                labelNode.append(checkbox, text);
                item.append(labelNode);
                list.append(item);
            }
        }
        this._selectionListDirty = false;
        this.updateSelectionPresentation();
    }

    renderActionBadges(rules) {
        const container = this.shadowRoot.getElementById("import-types");
        if (!container) return;
        const actions = [...new Set(rules.map((rule) => rule.action).filter(Boolean))]
            .sort((a, b) => actionRank(a) - actionRank(b));
        container.replaceChildren();
        for (const action of actions) {
            const badge = document.createElement("span");
            badge.className = "badge badge-light import-type-badge";
            badge.textContent = actionLabel(action).replace(/\s+rules$/i, "");
            container.append(badge);
        }
        container.hidden = actions.length === 0;
    }

    updateSelectionPresentation({ syncCheckboxes = true } = {}) {
        const toggle = this.shadowRoot.getElementById("selection-toggle");
        const list = this.shadowRoot.getElementById("selection-list");
        if (!toggle || !list) return;
        const selectableCount = this._selectableRuleCount;
        const selectedCount = this._selectedUuids.size;
        toggle.textContent = this.digest
            ? (browser.i18n.getMessage("import_selected_count", [String(selectedCount), String(selectableCount)]) ||
                `${selectedCount} of ${selectableCount} rules selected`)
            : message("import_choose_rules", "Choose rules");
        if (syncCheckboxes) {
            list.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
                checkbox.checked = this._selectedUuids.has(checkbox.dataset.uuid);
            });
        }
        this.shadowRoot.querySelectorAll(".selection-action").forEach((button) => {
            button.disabled = selectableCount === 0;
        });
        const reset = this.shadowRoot.getElementById("reset-rule-selection");
        if (reset) reset.disabled = sameRuleSelection(this._selectedUuids, this._baselineSelectedUuids);
        this.updateImportAction();
    }

    updateImportAction() {
        const importList = this.shadowRoot.getElementById("import");
        const imported = Boolean(this._data?.imported);
        const selectionDirty = imported && !sameRuleSelection(this._selectedUuids, this._baselineSelectedUuids);
        const unavailable = !this.digest && !this.hasAttribute("lazy");
        importList.hidden = unavailable || Boolean(imported && !this.updateAvailable && !selectionDirty);
        importList.disabled = Boolean(!imported && this.digest && this._selectedUuids.size === 0);
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
            if (!source) throw new TypeError("Unsupported rule source URL");
            const response = await fetchWithTimeout(source, { cache: "no-store" });
            if (!response.ok) throw new Error(`Failed to fetch rule list: ${response.status}`);
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
            if (this.expectedSha256) this.integrityStatus = "verified";
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
            if (this.integrityStatus === "pending") this.integrityStatus = "unknown";
            count.hidden = false;
            count.textContent = message("import_unavailable", "Unavailable");
        } finally {
            this.removeAttribute("aria-busy");
        }
    }
}

customElements.define("rule-import-input", RuleImportInput);

function groupRulesByAction(rules) {
    const groups = new Map();
    for (const rule of rules) {
        const action = rule.action || "other";
        if (!groups.has(action)) groups.set(action, []);
        groups.get(action).push(rule);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => actionRank(a) - actionRank(b));
}

function actionRank(action) {
    const index = ACTION_ORDER.indexOf(action);
    return index === -1 ? ACTION_ORDER.length : index;
}

function actionLabel(action) {
    const keys = {
        filter: "filter_rules",
        redirect: "redirect_rules",
        secure: "secure_rules",
        block: "block_rules",
        whitelist: "whitelist_rules",
    };
    return browser.i18n.getMessage(keys[action]) || action || "Other";
}

function humanReadableSource(src) {
    const source = normalizeImportSource(src);
    if (!source) return "about:blank";

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

function createMetadataBadge(text, kind) {
    const badge = document.createElement("span");
    badge.className = `catalog-badge catalog-badge-${kind.split(" ").join(" catalog-badge-")}`;
    badge.textContent = text;
    return badge;
}

function catalogBehaviorLabel(value) {
    const labels = {
        "direct-link": ["catalog_behavior_direct_link", "Direct links"],
        "media-quality": ["catalog_behavior_media_quality", "Media quality"],
        "media-url-cleanup": ["catalog_behavior_media_url_cleanup", "Media URL cleanup"],
        "site-cleanup": ["catalog_behavior_site_cleanup", "Site cleanup"],
        "request-blocking": ["catalog_behavior_request_blocking", "Request blocking"],
        "url-cleanup": ["catalog_behavior_url_cleanup", "URL cleanup"],
        "privacy-embed": ["catalog_behavior_privacy_embed", "Private embeds"],
        "provider-override": ["catalog_behavior_provider_override", "Provider override"],
        "special-mode": ["catalog_behavior_special_mode", "Special mode"],
        "url-normalization": ["catalog_behavior_url_normalization", "URL normalization"],
    };
    const label = labels[value];
    return label ? message(label[0], label[1]) : "";
}

function catalogScopeLabel(value) {
    const labels = {
        "site-specific": ["catalog_scope_site_specific", "Site-specific"],
        "cross-site": ["catalog_scope_cross_site", "Cross-site"],
        global: ["catalog_scope_global", "Global"],
    };
    const label = labels[value];
    return label ? message(label[0], label[1]) : "";
}

function catalogRiskLabel(value) {
    return value === "high"
        ? message("catalog_risk_high", "High risk")
        : message("catalog_risk_medium", "Medium risk");
}

function message(key, fallback, substitutions) {
    return browser.i18n.getMessage(key, substitutions) || fallback;
}

async function digest(text, algorithm = "SHA-256") {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const digestValue = await crypto.subtle.digest(algorithm, data);
    const bytes = Array.from(new Uint8Array(digestValue));
    return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
