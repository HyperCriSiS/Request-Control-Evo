/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const COMMUNITY_CATALOG_URL =
    "https://raw.githubusercontent.com/HyperCriSiS/requestcontrol-rules/main/catalog.json";
const COMMUNITY_REPOSITORY = "HyperCriSiS/requestcontrol-rules";

let communityCatalogPromise;

class RuleImportInput extends HTMLElement {
    constructor() {
        super();
        this.rules = [];
        this._data = {};
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

        this.shadowRoot.getElementById("import").addEventListener("click", () => {
            this.dispatchEvent(
                new CustomEvent("rule-import-import-list", {
                    bubbles: true,
                    composed: true,
                })
            );
        });
    }

    connectedCallback() {
        this.applyCommunityMetadata();
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

    enhancePresentation() {
        const row = this.shadowRoot.querySelector("li");
        row.classList.add("import-row");

        const name = this.shadowRoot.getElementById("name");
        name.classList.add("import-name");

        const description = document.createElement("p");
        description.id = "description";
        description.className = "description";
        description.hidden = true;
        row.append(description);

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
        const ratingLabel = document.createElement("span");
        ratingLabel.textContent = message("community_rating", "Community");
        const ratingLink = document.createElement("a");
        ratingLink.id = "rating-link";
        ratingLink.className = "rating-link";
        ratingLink.target = "_blank";
        ratingLink.rel = "noopener noreferrer";
        ratingLink.title = message("rate_on_github", "Rate or review on GitHub");

        const positive = document.createElement("span");
        positive.append("👍 ");
        const positiveCount = document.createElement("span");
        positiveCount.id = "rating-positive";
        positiveCount.textContent = "0";
        positive.append(positiveCount);

        const negative = document.createElement("span");
        negative.append("👎 ");
        const negativeCount = document.createElement("span");
        negativeCount.id = "rating-negative";
        negativeCount.textContent = "0";
        negative.append(negativeCount);

        ratingLink.append(positive, negative);
        rating.append(ratingLabel, ratingLink);
        meta.append(rating);
        row.append(meta);
    }

    onSourceChanged(src) {
        const text = this.shadowRoot.getElementById("name");
        if (!this.textContent.trim()) {
            try {
                text.textContent = new URL(src).hostname;
            } catch {
                text.textContent = src;
            }
        }

        const url = this.shadowRoot.getElementById("url");
        url.href = humanReadableSource(src);
        url.title = message("view_list", "View source");
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

    set description(value) {
        const description = this.shadowRoot.getElementById("description");
        const text = (value || "").trim();
        description.textContent = text;
        description.title = text;
        description.hidden = !text;
    }

    async applyCommunityMetadata() {
        if (!this.dataset.catalog || !this.dataset.entry) {
            return;
        }

        try {
            const catalog = await getCommunityCatalog();
            const entry = catalog.ruleSets.find(
                (item) => item && (item.id === this.dataset.entry || item.url === this.getAttribute("src"))
            );
            if (!entry) {
                return;
            }

            if (entry.description) {
                this.description = entry.description;
            }
            if (entry.homepage) {
                this.shadowRoot.getElementById("url").href = entry.homepage;
            }
            if (entry.ratingIssue) {
                await this.fetchRating(
                    entry.ratingRepository || catalog.ratingRepository || COMMUNITY_REPOSITORY,
                    entry.ratingIssue
                );
            }
        } catch {
            // Catalog presentation metadata is optional; importing must keep working offline.
        }
    }

    async fetchRating(repository, issueNumber) {
        const rating = this.shadowRoot.getElementById("rating");
        const link = this.shadowRoot.getElementById("rating-link");
        const issueUrl = `https://github.com/${repository}/issues/${issueNumber}`;
        link.href = issueUrl;
        rating.hidden = false;

        try {
            const response = await fetch(`https://api.github.com/repos/${repository}/issues/${issueNumber}`);
            if (!response.ok) {
                throw new Error(`GitHub rating request failed: ${response.status}`);
            }
            const issue = await response.json();
            this.shadowRoot.getElementById("rating-positive").textContent = issue.reactions?.["+1"] || 0;
            this.shadowRoot.getElementById("rating-negative").textContent = issue.reactions?.["-1"] || 0;
        } catch {
            rating.title = message("community_rating_unavailable", "Community rating unavailable");
        }
    }

    async fetchRules(src) {
        const loading = this.shadowRoot.getElementById("loading");
        const count = this.shadowRoot.getElementById("count");
        const integrity = this.shadowRoot.getElementById("integrity");
        loading.hidden = false;
        count.hidden = true;
        integrity.hidden = true;
        this.digest = null;
        this.rules = [];

        try {
            const response = await fetch(src);
            if (!response.ok) {
                throw new Error(`Failed to fetch rule list: ${response.status}`);
            }
            const text = await response.text();
            this.digest = await digest(text);
            if (this.expectedSha256 && this.digest !== this.expectedSha256) {
                integrity.hidden = false;
                integrity.textContent = message("integrity_failed", "Integrity check failed");
                return;
            }
            this.rules = JSON.parse(text);
            count.hidden = false;
            if (this.rules.length === 1) {
                count.textContent = browser.i18n.getMessage("count_rule") || "1 rule";
            } else {
                count.textContent = browser.i18n.getMessage("count_rules", this.rules.length) || `${this.rules.length} rules`;
            }
        } catch {
            count.hidden = false;
            count.textContent = message("import_unavailable", "Unavailable");
        } finally {
            loading.hidden = true;
        }
    }
}

customElements.define("rule-import-input", RuleImportInput);

async function getCommunityCatalog() {
    if (!communityCatalogPromise) {
        communityCatalogPromise = fetch(COMMUNITY_CATALOG_URL, { cache: "no-store" })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Community catalog request failed: ${response.status}`);
                }
                return response.json();
            })
            .finally(() => {
                communityCatalogPromise = null;
            });
    }
    return communityCatalogPromise;
}

function humanReadableSource(src) {
    try {
        const url = new URL(src);
        if (url.hostname === "tumpio.github.io" && url.pathname.startsWith("/requestcontrol/rules/")) {
            return "https://github.com/tumpio/requestcontrol/tree/master/rules";
        }
        if (url.protocol === "moz-extension:" || url.protocol === "chrome-extension:") {
            return "https://github.com/HyperCriSiS/Request-Control-Evo/tree/dev/rules";
        }
        return src;
    } catch {
        return src;
    }
}

function message(key, fallback, substitutions) {
    return browser.i18n.getMessage(key, substitutions) || fallback;
}

function exportJsonFile(name, object) {
    const blob = new Blob([JSON.stringify(object, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function digest(text, algorithm = "SHA-256") {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const digest = await crypto.subtle.digest(algorithm, data);
    const bytes = Array.from(new Uint8Array(digest));
    return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function setupBundledSpecialRulesets() {
    const tab = document.getElementById("tab-imports");
    if (!tab || document.getElementById("bundled-special-rulesets")) {
        return;
    }

    const presets = [
        {
            path: "rules/media-original-quality.json",
            title: "Original Media / Maximum Quality",
            description: "Request original or highest-quality media from selected thumbnail and media endpoints.",
        },
        {
            path: "rules/privacy-enhanced-embeds.json",
            title: "Privacy Enhanced Embeds",
            description: "Use privacy-oriented embed variants and supported privacy parameters without blocking the content.",
        },
        {
            path: "rules/developer-direct-raw.json",
            title: "Developer Direct / Raw",
            description: "Turn selected GitHub and GitLab file-view URLs into raw file responses.",
        },
        {
            path: "rules/search-engine-escape.json",
            title: "Search Engine Escape",
            description: "Redirect Google or Bing result-page searches to DuckDuckGo. Rules are disabled until explicitly enabled.",
        },
        {
            path: "rules/privacy-aggressive-direct-links.json",
            title: "Aggressive Direct Links",
            description: "Skip selected redirect and warning wrappers. Security-sensitive rules are disabled until explicitly enabled.",
        },
        {
            path: "rules/web-canonical-desktop.json",
            title: "Canonical Desktop Web",
            description: "Normalize selected mobile hosts to their desktop counterparts. Rules are disabled until explicitly enabled.",
        },
        {
            path: "rules/special-text-first-low-bandwidth.json",
            title: "Text-First / Low Bandwidth",
            description: "Block images, media and web fonts for a deliberately austere low-bandwidth mode.",
        },
        {
            path: "rules/special-first-party-firewall.json",
            title: "Strict First-Party Mode — can break sites",
            description: "WARNING: Blocks every third-party-domain subresource. Logins, CDNs, APIs, embeds, payments, CAPTCHAs and other site functionality may stop working. The rule is disabled after import and must be enabled deliberately.",
            warning: true,
        },
    ];

    const details = document.createElement("details");
    details.id = "bundled-special-rulesets";
    details.open = true;

    const summary = document.createElement("summary");
    summary.textContent = "Request Control Evo";
    summary.title = "Bundled showcase rulesets";

    const list = document.createElement("ul");
    for (const preset of presets) {
        const input = document.createElement("rule-import-input");
        input.src = browser.runtime.getURL(preset.path);
        input.title = preset.description;
        input.description = preset.description;
        if (preset.warning) {
            input.setAttribute("warning", "");
        }
        const label = document.createElement("span");
        label.textContent = preset.title;
        input.append(label);
        list.append(input);
    }

    details.append(summary, list);
    const communityLists = tab.querySelector("#community-rule-lists");
    if (communityLists) {
        tab.insertBefore(details, communityLists);
    } else {
        tab.append(details);
    }
}

function setupGitHubCommunityShare() {
    const tab = document.getElementById("tab-imports");
    if (!tab || document.getElementById("github-community-share")) {
        return;
    }

    const section = document.createElement("section");
    section.id = "github-community-share";
    section.className = "github-community-share";

    const heading = document.createElement("h3");
    heading.textContent = message("github_community_title", "GitHub Community");

    const intro = document.createElement("p");
    intro.textContent = message(
        "github_community_intro",
        "Share selected local rules through a reviewable GitHub submission. Request Control does not store GitHub credentials."
    );

    const controls = document.createElement("div");
    controls.className = "github-community-controls";
    const select = document.createElement("select");
    select.multiple = true;
    select.size = 7;
    select.setAttribute("aria-label", message("github_community_select", "Select rules to share"));

    const actions = document.createElement("div");
    actions.className = "github-community-actions";
    const exportButton = document.createElement("button");
    exportButton.type = "button";
    exportButton.className = "btn btn-primary";
    exportButton.textContent = message("github_community_export", "Export selected rules");
    const submit = document.createElement("a");
    submit.className = "btn";
    submit.target = "_blank";
    submit.rel = "noopener noreferrer";
    submit.href = `https://github.com/${COMMUNITY_REPOSITORY}/issues/new?template=ruleset-submission.yml`;
    submit.textContent = message("github_community_submit", "Open GitHub submission");
    actions.append(exportButton, submit);

    const status = document.createElement("p");
    status.className = "note";
    status.textContent = message(
        "github_community_note",
        "Only the rules you select are exported. Browsing and inspection data are never included automatically."
    );

    controls.append(select, actions);
    section.append(heading, intro, controls, status);

    async function getLocalRules() {
        const { rules = [] } = await browser.storage.local.get("rules");
        return Array.isArray(rules) ? rules : Object.values(rules || {});
    }

    async function update() {
        const rules = (await getLocalRules()).sort((a, b) =>
            (a.title || "").localeCompare(b.title || "")
        );
        select.replaceChildren();
        for (const rule of rules) {
            const option = document.createElement("option");
            option.value = rule.uuid;
            option.textContent = rule.title || rule.uuid;
            select.append(option);
        }
        exportButton.disabled = !rules.length;
    }

    exportButton.addEventListener("click", async () => {
        const selected = new Set(Array.from(select.selectedOptions, (option) => option.value));
        if (!selected.size) {
            alert(message("github_community_choose_rule", "Select at least one rule to export."));
            return;
        }
        const rules = (await getLocalRules()).filter((rule) => selected.has(rule.uuid));
        const payload = {
            format: 1,
            exportedAt: new Date().toISOString(),
            rules,
        };
        const serialized = JSON.stringify(payload);
        if (serialized.length > 500000) {
            alert(message("github_community_too_large", "The selected export is too large. Export fewer rules."));
            return;
        }
        exportJsonFile("request-control-community-rules.json", payload);
    });

    browser.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "local" && changes.rules) {
            update();
        }
    });
    update();
}

function setupImportExtras() {
    setupBundledSpecialRulesets();
    setupGitHubCommunityShare();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupImportExtras, { once: true });
} else {
    setupImportExtras();
}
