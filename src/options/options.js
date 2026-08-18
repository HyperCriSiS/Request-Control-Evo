/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { reconcileManagedRules } from "../main/catalog.js";
import { exportObject, importFile } from "../util/import-export.js";
import { Toc } from "../util/toc.js";
import { uuid } from "../util/uuid.js";
import { showAlertPopup } from "./alert-popup.js";
import { showChangelog } from "./changelog-dialog.js";
import { OPTION_CHANGE_ICON, OPTION_SHOW_COUNTER } from "./constants.js";
import { showRuleTestDialog } from "./rule-tester.js";
import { normalizeImportSource } from "./import-source.js";

const COMMUNITY_REPOSITORY = "HyperCriSiS/requestcontrol-rules";

document.addEventListener("DOMContentLoaded", async () => {
    const { rules } = await browser.storage.local.get("rules");

    if (rules) {
        createRuleInputs(rules);
    } else {
        toggleEmpty();
    }

    const query = new URLSearchParams(location.search);
    if (query.has("edit")) {
        document.querySelectorAll("rule-list").forEach((list) => list.edit(query.get("edit")));
    }

    fetchLocalisedManual();
    setCreateOrImportLink();

    document.getElementById("addNewRule").addEventListener("click", () => {
        document.getElementById("new").newRule();
        toggleEmpty();
    });

    document.getElementById("exportRules").addEventListener("click", async () => {
        const fileName = browser.i18n.getMessage("export-file-name");
        const { rules } = await browser.storage.local.get("rules");
        exportObject(fileName, rules);
    });

    document.getElementById("importRules").addEventListener("change", async (e) => {
        try {
            const rules = await importFile(e.target.files[0]);
            await importRules(rules);
            window.location.hash = "#tab-rules";
            document.body.scrollIntoView(false);
        } catch (error) {
            showAlertPopup(error);
        }
    });

    const optionShowCounter = document.getElementById("optionShowCounter");
    const optionChangeIcon = document.getElementById("optionChangeIcon");

    browser.storage.local
        .get({
            [OPTION_SHOW_COUNTER]: true,
            [OPTION_CHANGE_ICON]: true,
        })
        .then((options) => {
            optionShowCounter.checked = options[OPTION_SHOW_COUNTER];
            optionChangeIcon.checked = options[OPTION_CHANGE_ICON];
        });

    optionShowCounter.addEventListener("change", function () {
        browser.storage.local.set({ [OPTION_SHOW_COUNTER]: this.checked });
    });

    optionChangeIcon.addEventListener("change", function () {
        browser.storage.local.set({ [OPTION_CHANGE_ICON]: this.checked });
    });

    document.getElementById("exportSelectedRules").addEventListener("click", async () => {
        const fileName = browser.i18n.getMessage("export-file-name");
        const selected = getSelectedRules();
        exportObject(fileName, selected);
    });

    document.getElementById("shareSelectedRulesGitHub").addEventListener("click", showCommunityShareDialog);

    document.getElementById("removeSelectedRules").addEventListener("click", async () => {
        const selected = new Set(getSelectedRules().map((rule) => rule.uuid));
        const { rules } = await browser.storage.local.get("rules");

        if (rules) {
            await browser.storage.local.set({ rules: rules.filter((rule) => !selected.has(rule.uuid)) });
        }

        document.querySelectorAll("rule-list").forEach((list) => list.removeSelected());
        updateToolbar();
        toggleEmpty();
    });

    document
        .getElementById("testSelectedRules")
        .addEventListener("click", () => showRuleTestDialog(getSelectedRules()));

    browser.management.getSelf((info) => {
        document.getElementById("version").textContent = browser.i18n.getMessage("version", info.version);
    });

    document.getElementById("changelog").addEventListener("click", showChangelog);

    document.getElementById("selectedRules").addEventListener("click", () => {
        document.querySelector(".mobile-toolbar").classList.toggle("show");
    });

    document.querySelector(".mobile-toolbar").addEventListener("click", function () {
        this.classList.remove("show");
    });

    document
        .querySelectorAll("rule-list")
        .forEach((list) => list.addEventListener("rule-edit-completed", onRuleEditCompleted));

    setupImportsTab();
});

document.addEventListener("rule-created", async (e) => {
    const { rule } = e.detail;

    let { rules } = await browser.storage.local.get("rules");

    if (!rules) {
        rules = [];
    }
    rules.push(rule);

    await browser.storage.local.set({ rules });

    document.getElementById(rule.action).addCreated(rule);
});

document.addEventListener("rule-changed", async (e) => {
    const { input, rule } = e.detail;

    let { rules } = await browser.storage.local.get("rules");

    if (!rules) {
        rules = [];
    }

    const index = rules.findIndex((item) => item.uuid === rule.uuid);

    if (index !== -1) {
        rules[index] = rule;
    } else {
        rules.push(rule);
    }

    await browser.storage.local.set({ rules });

    input.toggleSaved();
});

document.addEventListener("rule-deleted", async (e) => {
    const deleted = e.detail.uuid;
    const { rules } = await browser.storage.local.get("rules");
    if (rules) {
        await browser.storage.local.set({ rules: rules.filter((rule) => rule.uuid !== deleted) });
    }
    updateToolbar();
    toggleEmpty();
});

document.addEventListener("rule-selected", updateToolbar);

document.addEventListener("rule-import-selected", toggleImportSelectedButton);

document.addEventListener("rule-import-deleted", onImportSourceDeleted);

document.addEventListener("rule-import-delete-imported", onRemoveImportedRules);

document.addEventListener("rule-import-show-imported", (e) => {
    const { uuids } = e.target.data.imported;
    uuids.forEach((uuid) => {
        const input = document.querySelector(`[data-uuid="${uuid}"]`);
        if (input) {
            input.select();
        }
    });
    window.location.hash = "#tab-rules";
    document.body.scrollIntoView(false);
    updateLists();
    updateToolbar();
});

document.addEventListener("rule-import-import-list", async (e) => {
    const input = e.target;
    let { imports } = await browser.storage.local.get("imports");
    const src = input.source;
    const rulesToImport = input.rules.filter((rule) => rule.uuid);

    if (!imports) {
        imports = {};
    }

    if (!(src in imports)) {
        imports[src] = input.data;
    }

    const data = imports[src];
    const source = {
        id: input.dataset.entry ? `${input.dataset.catalog}/${input.dataset.entry}` : src,
        url: src,
        revision: input.etag || input.digest,
        catalog: input.dataset.catalog || undefined,
        entry: input.dataset.entry || undefined,
        version: input.dataset.version || undefined,
    };

    let { rules } = await browser.storage.local.get("rules");
    if (!rules) {
        rules = [];
    }

    rules = markLegacyImportedRules(rules, data.imported, source);
    const reconciliation = await reconcileManagedRules(rules, rulesToImport, source);

    await browser.storage.local.set({ rules: reconciliation.rules });
    document.querySelectorAll("rule-list").forEach((list) => list.removeAll());
    createRuleInputs(reconciliation.rules);

    const managedUuids = reconciliation.rules
        .filter((rule) => rule.source && rule.source.id === source.id)
        .map((rule) => rule.uuid);
    const hasConflicts = reconciliation.conflicts.length > 0;

    imports[src].imported = {
        uuids: managedUuids,
        etag: input.etag,
        digest: hasConflicts ? data.imported && data.imported.digest : input.digest,
        availableDigest: input.digest,
        timestamp: Date.now(),
        conflicts: reconciliation.conflicts,
    };

    await browser.storage.local.set({ imports });
    input.data = imports[src];
});

function markLegacyImportedRules(rules, imported, source) {
    if (!imported || !Array.isArray(imported.uuids)) {
        return rules;
    }

    const importedUuids = new Set(imported.uuids);
    return rules.map((rule) => {
        if (!importedUuids.has(rule.uuid) || rule.source) {
            return rule;
        }
        return {
            ...rule,
            managed: true,
            source: { ...source },
        };
    });
}

async function setupImportsTab() {
    const { imports } = await browser.storage.local.get("imports");

    if (imports) {
        Object.entries(imports).forEach(([src, data]) => {
            if (data.deletable) {
                createImportInput(src, data);
            } else {
                const input = findImportInputBySource(src);
                if (input) {
                    input.data = data;
                }
            }
        });
    }

    const communityDetails = document.getElementById("community-rule-lists");
    communityDetails.addEventListener("toggle", () => {
        if (communityDetails.open) {
            setupCommunityCatalog(imports || {});
        }
    });

    const customDetails = document.getElementById("custom-rule-lists");
    customDetails.addEventListener("toggle", () => {
        if (customDetails.open) {
            customDetails.querySelectorAll("rule-import-input").forEach((input) => input.load());
        }
    });

    document.getElementById("import-source-form").addEventListener("submit", onImportSourceAdded);
    document.getElementById("new-import-source").addEventListener("input", checkImportSourceValidity);
}

async function setupCommunityCatalog(imports) {
    const details = document.getElementById("community-rule-lists");
    if (details.dataset.loaded === "true" || details.dataset.loading === "true") {
        return;
    }

    const status = document.getElementById("community-rule-status");
    const list = document.getElementById("community-rule-list");
    details.dataset.loading = "true";
    status.hidden = false;
    status.textContent = browser.i18n.getMessage("imports_community_loading") || "Loading community catalog…";

    const catalogUrl = "https://raw.githubusercontent.com/HyperCriSiS/requestcontrol-rules/main/catalog.json";
    try {
        const response = await fetch(catalogUrl, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`Community catalog request failed: ${response.status}`);
        }
        const catalog = await response.json();
        if (!catalog || !Array.isArray(catalog.ruleSets)) {
            throw new Error("Invalid community catalog");
        }

        const importedChecks = [];
        for (const entry of catalog.ruleSets) {
            if (!entry || !entry.url || !entry.name) {
                continue;
            }
            const source = normalizeImportSource(entry.url);
            if (!source) {
                continue;
            }

            const input = document.createElement("rule-import-input");
            input.setAttribute("lazy", "");
            input.textContent = entry.name;
            input.description = entry.description || "";
            input.dataset.catalog = catalog.catalog || "requestcontrol-community";
            input.dataset.entry = entry.id || entry.url;
            input.dataset.version = entry.version || catalog.version || "";
            input.dataset.group = entry.group || "";
            if (entry.sha256) {
                input.setAttribute("expected-sha256", entry.sha256);
            }
            input.source = source;
            if (entry.homepage) {
                input.sourceHomepage = entry.homepage;
            }
            if (entry.ratingIssue) {
                const repository = entry.ratingRepository || catalog.ratingRepository || COMMUNITY_REPOSITORY;
                input.communityReview = `https://github.com/${repository}/issues/${entry.ratingIssue}`;
            }
            input.data = imports[source] || imports[entry.url] || {};
            list.append(input);
            if (input.data.imported) {
                importedChecks.push(input.load());
            }
        }

        details.dataset.loaded = "true";
        status.hidden = true;
        await Promise.allSettled(importedChecks);
    } catch {
        status.hidden = false;
        status.textContent = browser.i18n.getMessage("imports_community_unavailable") || "Community catalog is currently unavailable.";
    } finally {
        delete details.dataset.loading;
    }
}

async function checkImportSourceValidity() {
    const { imports } = await browser.storage.local.get("imports");
    const input = document.getElementById("new-import-source");
    const source = normalizeImportSource(input.value);

    if (!source) {
        input.setCustomValidity(browser.i18n.getMessage("analyzer_invalid_url") || "Enter a valid URL.");
        return;
    }

    const duplicate = findImportInputBySource(source);
    if (duplicate || (imports && (source in imports || input.value in imports))) {
        input.setCustomValidity(browser.i18n.getMessage("duplicate_entry"));
    } else {
        input.setCustomValidity("");
    }
}

async function onImportSourceAdded(e) {
    e.preventDefault();
    const src = normalizeImportSource(this.src.value);
    if (!src) {
        this.src.setCustomValidity(browser.i18n.getMessage("analyzer_invalid_url") || "Enter a valid URL.");
        this.src.reportValidity();
        return;
    }

    let { imports } = await browser.storage.local.get("imports");

    if (!imports) {
        imports = {};
    }

    imports[src] = { deletable: true };
    await browser.storage.local.set({ imports });

    createImportInput(src, imports[src]);
    this.reset();
    checkImportSourceValidity();
}

async function onImportSourceDeleted(e) {
    const input = e.target;
    const src = input.source;
    const { imports } = await browser.storage.local.get("imports");

    if (!imports || !(src in imports)) {
        return;
    }

    delete imports[src];

    await browser.storage.local.set({ imports });

    input.remove();
    checkImportSourceValidity();
    toggleImportSelectedButton();
}

async function onRemoveImportedRules(e) {
    const input = e.target;
    const { rules } = await browser.storage.local.get("rules");

    if (rules) {
        const { uuids } = input.data.imported;
        const newRules = rules.filter(({ uuid }) => !uuids.includes(uuid));
        await browser.storage.local.set({ rules: newRules });
        document.querySelectorAll("rule-list").forEach((list) => list.removeAll());
        createRuleInputs(newRules);
    }
    const src = input.source;
    const { imports } = await browser.storage.local.get("imports");

    if (imports && src in imports) {
        const { data } = input;
        delete data.imported;
        imports[src] = data;
        browser.storage.local.set({ imports });
    }
    input.data = {};
}

function createImportInput(src, data) {
    const source = normalizeImportSource(src);
    if (!source) {
        return null;
    }

    const input = document.createElement("rule-import-input");
    const inputs = document.getElementById("my-import-sources");
    input.setAttribute("lazy", "");
    input.source = source;
    input.setAttribute("deletable", true);
    input.data = data;
    inputs.append(input);
    if (document.getElementById("custom-rule-lists")?.open) {
        input.load();
    }
    return input;
}

function findImportInputBySource(src) {
    const source = normalizeImportSource(src);
    if (!source) {
        return null;
    }

    return (
        Array.from(document.querySelectorAll("rule-import-input")).find(
            (input) => input.source === source
        ) || null
    );
}

function toggleImportSelectedButton() {
    const selected = document.querySelectorAll("rule-import-input[selected]");
    const importButton = document.getElementById("importSelected");
    importButton.disabled = selected.length === 0;
}

function onRuleEditCompleted(e) {
    const { action, input } = e.detail;
    if (action !== this.id) {
        document.getElementById(action).addFrom(input);
    }
}

function createRuleInputs(rules) {
    rules.forEach((rule) => document.getElementById(rule.action).add(rule));
    updateLists();
    updateToolbar();
}

function getSelectedRules() {
    return Array.from(document.querySelectorAll("rule-list")).flatMap((list) => list.selected);
}

async function importRules(imported) {
    let { rules } = await browser.storage.local.get("rules");

    if (!rules) {
        rules = [];
    }

    const [newRules, mergedRules] = mergeRules(rules, imported);

    try {
        document.querySelectorAll("rule-list").forEach((list) => list.removeAll());
        createRuleInputs(rules);
        await browser.storage.local.set({ rules });

        document.querySelectorAll("rule-list").forEach((list) => {
            list.mark(newRules, "new");
            list.mark(mergedRules, "merged");
        });
    } catch (ex) {
        showAlertPopup(ex);
    }
}

function mergeRules(rules, imported) {
    const newRules = [];
    const mergedRules = [];
    const importedRules = Array.isArray(imported) ? imported : [imported];
    for (const rule of importedRules) {
        if (!rule.hasOwnProperty("uuid")) {
            rule.uuid = uuid();
            rules.push(rule);
            newRules.push(rule);
            continue;
        }
        let merged = false;
        for (let i = 0; i < rules.length; i++) {
            if (rule.uuid === rules[i].uuid) {
                rules[i] = rule;
                merged = true;
                mergedRules.push(rule);
                break;
            }
        }
        if (!merged) {
            rules.push(rule);
            newRules.push(rule);
        }
    }
    return [newRules, mergedRules];
}

function updateLists() {
    document.querySelectorAll("rule-list").forEach((list) => {
        list.updateHeader();
        list.toggle();
    });
    toggleEmpty();
}

function showCommunityShareDialog() {
    const selected = getSelectedRules();
    if (selected.length === 0) {
        return;
    }

    const payload = {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        rules: selected,
    };
    const json = JSON.stringify(payload, null, 2);

    const dialog = document.createElement("modal-dialog");
    dialog.className = "community-share-dialog";

    const title = document.createElement("span");
    title.slot = "title";
    title.textContent = browser.i18n.getMessage("share_rules_title") || "Share rules with the community";

    const content = document.createElement("div");
    content.slot = "content";
    content.className = "community-share-content";

    const description = document.createElement("p");
    description.textContent = browser.i18n.getMessage("share_rules_description", selected.length) ||
        `${selected.length} selected rules will be prepared for public review in the Request Control community repository.`;

    const warning = document.createElement("p");
    warning.className = "community-share-warning";
    warning.textContent = browser.i18n.getMessage("share_rules_public_warning") ||
        "GitHub submissions are public. Review URLs, parameters and rule descriptions for private or sensitive values before continuing.";

    const preview = document.createElement("details");
    preview.className = "community-share-preview";
    const previewSummary = document.createElement("summary");
    previewSummary.textContent = browser.i18n.getMessage("share_rules_preview") || "Preview JSON";
    const pre = document.createElement("pre");
    pre.textContent = json;
    preview.append(previewSummary, pre);

    const actions = document.createElement("div");
    actions.className = "community-share-actions";
    const download = document.createElement("button");
    download.type = "button";
    download.className = "btn";
    download.textContent = browser.i18n.getMessage("share_rules_download_json") || "Download JSON";
    download.addEventListener("click", () => exportObject("request-control-community-submission.json", payload));

    const continueButton = document.createElement("button");
    continueButton.type = "button";
    continueButton.className = "btn btn-dark";
    continueButton.textContent = browser.i18n.getMessage("share_rules_continue_github") || "Continue to GitHub";
    continueButton.addEventListener("click", async () => {
        const url = new URL(`https://github.com/${COMMUNITY_REPOSITORY}/issues/new`);
        url.searchParams.set("template", "rule-set-submission.md");
        url.searchParams.set(
            "title",
            browser.i18n.getMessage("github_share_issue_title", selected.length) || `Rule set submission (${selected.length} rules)`
        );
        const intro = browser.i18n.getMessage("github_share_issue_intro") ||
            "Generated by Request Control for community review. I reviewed this payload and removed private or sensitive values.";
        if (json.length <= 24000) {
            url.searchParams.set("body", `${intro}\n\n\`\`\`json\n${json}\n\`\`\``);
        } else {
            exportObject("request-control-community-submission.json", payload);
        }
        await browser.tabs.create({ url: url.toString() });
        dialog.remove();
    });
    actions.append(download, continueButton);
    content.append(description, warning, preview, actions);
    dialog.append(title, content);
    document.body.append(dialog);
}

function toggleEmpty() {
    const lists = document.querySelectorAll("rule-list");
    const isEmpty = Array.from(lists).every((list) => list.isEmpty);
    document.querySelector(".no-rules-block").classList.toggle("d-none", !isEmpty);
    document.getElementById("exportRules").disabled = isEmpty;
}

function setCreateOrImportLink() {
    const p = document.querySelector(".create-or-import");
    const link = document.querySelector(".create-or-import-link");
    const textNode = p.firstChild;
    const marker = "/";

    const startMark = textNode.textContent.indexOf(marker);
    const markNode = textNode.splitText(startMark);
    const endMark = markNode.textContent.indexOf(marker, 1);
    markNode.splitText(endMark + 1);

    link.textContent = markNode.textContent.substring(1, markNode.textContent.length - 1);
    markNode.replaceWith(link);
}

function updateToolbar() {
    const count = getSelectedRules().length;
    document.querySelectorAll(".selected-count").forEach((totalText) => {
        totalText.textContent = count.toString();
    });
    const isSelected = count > 0;
    document.querySelectorAll(".btn-selected-action").forEach((button) => {
        button.disabled = !isSelected;
    });
    const selectedButton = document.getElementById("selectedRules");
    selectedButton.disabled = !isSelected;
    selectedButton.textContent = getSelectedRulesText(count);
}

function getSelectedRulesText(count) {
    let text;
    if (count === 0) {
        text = browser.i18n.getMessage("zero_selected_rules");
    } else if (count === 1) {
        text = browser.i18n.getMessage("one_selected_rule");
    } else {
        text = browser.i18n.getMessage("multiple_selected_rules", count);
    }
    return text;
}

async function fetchLocalisedManual() {
    const url = browser.i18n.getMessage("extensionManual");
    const response = await fetch(url, {
        headers: {
            "Content-Type": "text/html",
        },
        mode: "same-origin",
    });
    const text = await response.text();
    const manual = document.getElementById("manual");
    const contents = document.getElementById("contents");
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");

    manual.append(...doc.body.children);

    // generate table of contents
    const toc = new Toc(manual).render();
    const backTop = document.createElement("li");
    const backTopLink = document.createElement("a");
    backTopLink.textContent = browser.i18n.getMessage("back_to_top");
    backTopLink.href = "#tabs";
    backTop.append(backTopLink);
    toc.append(backTop);
    contents.append(toc);

    // add bootstrap table classes
    manual.querySelectorAll("table").forEach((table) => {
        table.className = "table table-striped";
    });
}
