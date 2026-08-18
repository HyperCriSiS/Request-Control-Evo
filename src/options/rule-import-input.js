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

        try {
            const response = await fetch(`https://api.github.com/repos/${repository}/issues/${issueNumber}`, {
                headers: { Accept: "application/vnd.github+json" },
                cache: "no-store",
            });
            if (!response.ok) {
                throw new Error(`GitHub rating request failed: ${response.status}`);
            }
            const issue = await response.json();
            const reactions = issue.reactions || {};
            this.shadowRoot.getElementById("rating-positive").textContent = reactions["+1"] || 0;
            this.shadowRoot.getElementById("rating-negative").textContent = reactions["-1"] || 0;
            rating.hidden = false;
        } catch {
            rating.hidden = true;
        }
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

            const description = this.shadowRoot.getElementById("description");
            if (description.hidden) {
                const actions = [...new Set(this.rules.map((rule) => rule.action).filter(Boolean))].slice(0, 3);
                this.description = actions.length
                    ? message(
                        "import_generated_description",
                        `${this.rules.length} rules · actions: ${actions.join(", ")}`,
                        [this.rules.length, actions.join(", ")]
                    )
                    : browser.i18n.getMessage("count_rules", this.rules.length);
            }

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

async function getCommunityCatalog() {
    if (!communityCatalogPromise) {
        communityCatalogPromise = fetch(COMMUNITY_CATALOG_URL, { cache: "no-store" })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Community catalog request failed: ${response.status}`);
                }
                return response.json();
            })
            .then((catalog) => {
                if (!catalog || !Array.isArray(catalog.ruleSets)) {
                    throw new Error("Invalid community catalog");
                }
                return catalog;
            });
    }
    return communityCatalogPromise;
}

function humanReadableSource(src) {
    try {
        const url = new URL(src);
        if (url.hostname === "raw.githubusercontent.com") {
            const parts = url.pathname.split("/").filter(Boolean);
            if (parts.length >= 4) {
                const [owner, repo, ref, ...path] = parts;
                return `https://github.com/${owner}/${repo}/blob/${ref}/${path.join("/")}`;
            }
        }
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
            title: "First-Party Firewall",
            description: "Block third-party-domain subresources while leaving top-level navigation alone. This can break sites.",
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
        const label = document.createElement("span");
        label.textContent = preset.title;
        input.append(label);
        list.append(input);
    }

    details.append(summary, list);
    const commonLists = tab.querySelector("details");
    if (commonLists?.nextSibling) {
        tab.insertBefore(details, commonLists.nextSibling);
    } else {
        tab.append(details);
    }
}

function setupGitHubCommunityShare() {
    const tab = document.getElementById("tab-imports");
    if (!tab || document.getElementById("github-community-share")) {
        return;
    }

    const details = document.createElement("details");
    details.id = "github-community-share";
    details.className = "community-share";
    details.open = true;

    const summary = document.createElement("summary");
    summary.textContent = message("github_community", "GitHub Community");

    const description = document.createElement("p");
    description.textContent = message(
        "github_community_description",
        "Share selected local rules for review in the Request Control community repository."
    );

    const actions = document.createElement("div");
    actions.className = "community-share-actions";

    const share = document.createElement("button");
    share.id = "shareRulesGitHub";
    share.className = "btn primary";
    share.type = "button";
    share.textContent = message("share_selected_github", "Share selected rules on GitHub");

    const repository = document.createElement("a");
    repository.className = "btn";
    repository.target = "_blank";
    repository.rel = "noopener noreferrer";
    repository.href = `https://github.com/${COMMUNITY_REPOSITORY}`;
    repository.textContent = message("open_community_repository", "Open community repository");

    const status = document.createElement("span");
    status.className = "community-share-status";

    actions.append(share, repository, status);
    details.append(summary, description, actions);

    const myLists = Array.from(tab.querySelectorAll("details")).find(
        (item) => item.querySelector("summary")?.dataset.i18n === "my_lists"
    );
    tab.insertBefore(details, myLists || null);

    const getSelectedRules = () =>
        Array.from(document.querySelectorAll("rule-list")).flatMap((list) => list.selected || []);

    const update = () => {
        const count = getSelectedRules().length;
        share.disabled = count === 0;
        status.textContent = count
            ? message("github_share_selected_count", `${count} selected rule(s) ready to share.`, count)
            : message("github_share_select_rules", "Select one or more rules in the Rules tab first.");
    };

    share.addEventListener("click", async () => {
        const selected = getSelectedRules();
        if (selected.length === 0) {
            update();
            return;
        }

        const payload = {
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            rules: selected,
        };
        const json = JSON.stringify(payload, null, 2);
        const title = message(
            "github_share_issue_title",
            `Rule set submission (${selected.length} rules)`,
            selected.length
        );
        const intro = message(
            "github_share_issue_intro",
            "Generated by Request Control for community review. I reviewed this payload and removed private or sensitive values."
        );

        const url = new URL(`https://github.com/${COMMUNITY_REPOSITORY}/issues/new`);
        url.searchParams.set("template", "rule-set-submission.md");
        url.searchParams.set("title", title);

        if (json.length <= 24000) {
            url.searchParams.set("body", `${intro}\n\n\`\`\`json\n${json}\n\`\`\``);
        } else {
            exportJsonFile("request-control-community-submission.json", payload);
            status.textContent = message(
                "github_share_too_large",
                "The selection is too large for a prefilled GitHub submission. A JSON file was exported; attach or paste it into the opened form."
            );
        }

        await browser.tabs.create({ url: url.toString() });
    });

    document.addEventListener("rule-selected", update);
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
