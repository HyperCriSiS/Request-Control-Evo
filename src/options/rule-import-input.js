/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

class RuleImportInput extends HTMLElement {
    constructor() {
        super();
        this.rules = [];
        this._data = {};
        const template = document.getElementById("rule-import-input");
        this.attachShadow({ mode: "open" }).appendChild(template.content.cloneNode(true));

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

        this.shadowRoot.getElementById("import").addEventListener("click", () => {
            this.dispatchEvent(
                new CustomEvent("rule-import-import-list", {
                    bubbles: true,
                    composed: true,
                })
            );
        });
    }

    static get observedAttributes() {
        return ["src", "deletable", "expected-sha256"];
    }

    attributeChangedCallback(name, _oldValue, newValue) {
        switch (name) {
            case "src":
                this.onSourceChanged(newValue);
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

    onSourceChanged(src) {
        const text = this.shadowRoot.getElementById("name");
        const url = this.shadowRoot.getElementById("url");
        if (text.childElementCount === 0) {
            text.textContent = src;
        }
        url.href = src;
        this.fetchRules(src);
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

    get data() {
        return this._data;
    }

    set data(value = {}) {
        const imported = this.shadowRoot.getElementById("imported");
        const update = this.shadowRoot.getElementById("update");
        const importList = this.shadowRoot.getElementById("import");
        const deleteImported = this.shadowRoot.getElementById("delete-imported");
        const showImported = this.shadowRoot.getElementById("show-imported");
        imported.hidden = !value.imported;
        update.hidden = !value.imported || !this.digest || value.imported.digest === this.digest;
        importList.hidden = value.imported && update.hidden || !this.digest;
        showImported.hidden = !value.imported;
        deleteImported.hidden = !value.imported;
        this._data = value;
    }

    async fetchRules(src) {
        const loading = this.shadowRoot.getElementById("loading");
        const error = this.shadowRoot.getElementById("error");
        const update = this.shadowRoot.getElementById("update");
        const importList = this.shadowRoot.getElementById("import");
        loading.hidden = false;
        error.hidden = true;
        update.hidden = true;
        importList.hidden = true;
        this.disabled = true;

        try {
            const response = await fetch(src);

            if (!response.ok) {
                throw `${response.status} - ${response.statusText}`;
            }

            const text = await response.text();
            if (this.expectedSha256) {
                const actualSha256 = await digest(text, "SHA-256");
                if (actualSha256 !== this.expectedSha256) {
                    throw new Error("Rule list integrity check failed (SHA-256 mismatch)");
                }
            }

            const data = JSON.parse(text);
            const rules = (Array.isArray(data) ? data : [data]).filter((rule) => rule.uuid);
            this.digest = await digest(JSON.stringify(rules), "SHA-256");
            this.etag = response.headers.get("etag");
            this.rules = rules;
            this.shadowRoot.getElementById("count").textContent = browser.i18n.getMessage(
                "count_rules",
                this.rules.length
            );
            this.disabled = false;
            update.hidden = !this.data.imported || this.data.imported.digest === this.digest;
            importList.hidden = this.data.imported && update.hidden;
        } catch (e) {
            error.title = e;
            error.hidden = false;
        }

        loading.hidden = true;
    }
}

customElements.define("rule-import-input", RuleImportInput);

async function digest(text, algorithm = "SHA-256") {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const digest = await crypto.subtle.digest(algorithm, data);
    const bytes = Array.from(new Uint8Array(digest));
    return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
