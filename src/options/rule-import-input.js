/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { normalizeImportSource } from "./import-source.js";

class RuleImportInput extends HTMLElement {
    constructor() {
        super();
        this.rules = [];
        this._data = {};
        this._source = "";
        this._fetchSource = "";
        this._loadPromise = null;
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
                this.dispatchEvent(
                    new CustomEvent("rule-import-import-list", {
                        bubbles: true,
                        composed: true,
                    })
                );
            } finally {
                button.disabled = false;
                button.classList.remove("is-loading");
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
            this.rules = [];
            this.digest = null;
            return;
        }

        if (!this.textContent.trim()) {
            text.textContent = new URL(src).hostname || src;
        }

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
        const importList = this.shadowRoot.getElementById("import");
        const deleteImported = this.shadowRoot.getElementById("delete-imported");
        const showImported = this.shadowRoot.getElementById("show-imported");
        imported.hidden = !value.imported;
        update.hidden = !value.imported || !this.digest || value.imported.digest === this.digest;
        importList.hidden = Boolean(value.imported && update.hidden) || (!this.digest && !this.hasAttribute("lazy"));
        showImported.hidden = !value.imported;
        deleteImported.hidden = !value.imported;
        this._data = value;
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

    async fetchRules(src) {
        const count = this.shadowRoot.getElementById("count");
        const integrity = this.shadowRoot.getElementById("integrity");
        this.setAttribute("aria-busy", "true");
        count.hidden = true;
        integrity.hidden = true;
        this.digest = null;
        this.rules = [];

        try {
            const source = normalizeImportSource(src);
            if (!source) {
                throw new TypeError("Unsupported rule source URL");
            }
            const response = await fetch(source);
            if (!response.ok) {
                throw new Error(`Failed to fetch rule list: ${response.status}`);
            }
            const text = await response.text();
            this.digest = await digest(text);
            if (this.expectedSha256 && this.digest !== this.expectedSha256) {
                integrity.hidden = false;
                integrity.textContent = message("integrity_failed", "Integrity check failed");
                this.digest = null;
                return;
            }
            const parsed = JSON.parse(text);
            this.rules = Array.isArray(parsed) ? parsed : [parsed];
            if (this.rules.some((rule) => !rule || typeof rule !== "object")) {
                throw new TypeError("Invalid rule payload");
            }
            count.hidden = false;
            if (this.rules.length === 1) {
                count.textContent = browser.i18n.getMessage("count_rule") || "1 rule";
            } else {
                count.textContent = browser.i18n.getMessage("count_rules", this.rules.length) || `${this.rules.length} rules`;
            }
        } catch {
            this.digest = null;
            this.rules = [];
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
