/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { CATALOG_CATEGORY_ORDER, catalogCategoryLabel } from "./catalog-groups.js";

const QUICK_ACTION_SELECTION_KEY = "ruleQuickActionSelection";
const RULE_GROUPS_KEY = "ruleGroups";
const RULE_GROUP_FILTER_KEY = "ruleGroupFilter";
const RULE_CATEGORY_FILTER_KEY = "ruleCategoryFilter";
const QUICK_COMMANDS = ["test", "export", "share", "delete"];

let selectedGroup = "all";
let selectedCategory = "all";
let groups = [];

if (typeof document !== "undefined" && typeof browser !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        patchRuleListView();
        initializeRuleManagementUi().catch(() => undefined);
    });
}

function message(key, fallback) {
    return browser.i18n.getMessage(key) || fallback;
}

function normalizeGroups(values = []) {
    return Array.from(new Set(
        (Array.isArray(values) ? values : [])
            .map((value) => String(value || "").trim())
            .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }));
}

function groupsFromRules(rules = []) {
    return normalizeGroups(rules.map((rule) => rule?.group));
}

async function initializeRuleManagementUi() {
    const stored = await browser.storage.local.get({
        rules: [],
        [QUICK_ACTION_SELECTION_KEY]: [],
        [RULE_GROUPS_KEY]: [],
        [RULE_GROUP_FILTER_KEY]: "all",
        [RULE_CATEGORY_FILTER_KEY]: "all",
        ruleViewSettings: {},
    });

    groups = normalizeGroups([
        ...(stored[RULE_GROUPS_KEY] || []),
        ...groupsFromRules(stored.rules || []),
    ]);
    selectedGroup = normalizeGroupFilter(stored[RULE_GROUP_FILTER_KEY]);
    selectedCategory = normalizeCategoryFilter(stored[RULE_CATEGORY_FILTER_KEY]);

    injectStyles();
    setupMobileSelectedActions();
    hideLegacyQuickActionToggle();
    await normalizeLegacyBehaviorGrouping(stored.ruleViewSettings || {});
    createCategoryControl();
    createGroupControls();
    createQuickActionControls(stored[QUICK_ACTION_SELECTION_KEY]);
    decorateRuleRows();
    observeRuleRows();
    applyGroupFilter();
    applyCategoryFilter();

    document.addEventListener("rule-created", onRulesChanged);
    document.addEventListener("rule-changed", onRulesChanged);
    document.addEventListener("rule-deleted", onRulesChanged);
}

function patchRuleListView() {
    const RuleList = customElements.get("rule-list");
    if (!RuleList || RuleList.prototype.__requestControlGroupFilterPatched) return;

    const originalSetView = RuleList.prototype.setView;
    RuleList.prototype.setView = function setViewWithGroupFilter(view = {}) {
        return originalSetView.call(this, {
            ...view,
            group: selectedGroup,
            category: selectedCategory,
        });
    };
    RuleList.prototype.__requestControlGroupFilterPatched = true;
}

function normalizeGroupFilter(value) {
    const filter = String(value || "all");
    if (filter === "all" || filter === "ungrouped" || filter.startsWith("group:")) {
        return filter;
    }
    return "all";
}

function injectStyles() {
    if (document.getElementById("request-control-rule-management-style")) return;

    const style = document.createElement("style");
    style.id = "request-control-rule-management-style";
    style.textContent = `
        .rule-quick-actions-toggle { display: none !important; }
        .rc-rule-group-control { display: inline-flex; align-items: stretch; gap: .25rem; }
        .rc-rule-group-control select { min-width: 8rem; }
        .rc-command-icon { display: inline-flex; align-items: center; justify-content: center; min-width: 2.35rem; min-height: 2.35rem; padding: .35rem; margin: 0; }
        .rc-quick-config { position: relative; margin: 0; }
        .rc-quick-config > button { display: inline-flex; align-items: center; gap: .35rem; min-height: 2.35rem; margin: 0; }
        .rc-quick-menu { position: absolute; z-index: 30; right: 0; top: calc(100% + .35rem); display: grid; gap: .15rem; min-width: 11rem; padding: .4rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--surface-color); box-shadow: 0 .4rem 1rem var(--shadow-color); }
        .rc-quick-menu[hidden] { display: none; }
        .rc-quick-menu label { display: flex; align-items: center; gap: .45rem; min-height: 2.15rem; margin: 0; padding: .25rem .4rem; border-radius: var(--radius-sm); }
        .rc-quick-menu label:hover { background: var(--button-background-hover); }
        body.rc-has-quick-actions .rule-quick-actions { display: inline-flex !important; align-items: center; gap: .25rem; }
        body:not(.rc-has-quick-actions) .rule-quick-actions { display: none !important; }
        .rule-quick-actions [data-rule-command] { display: none !important; }
        body.rc-show-quick-test .rule-quick-actions [data-rule-command="test"],
        body.rc-show-quick-export .rule-quick-actions [data-rule-command="export"],
        body.rc-show-quick-share .rule-quick-actions [data-rule-command="share"],
        body.rc-show-quick-delete .rule-quick-actions [data-rule-command="delete"] { display: inline-flex !important; }
        .rule-header-buttons .btn-edit,
        .rule-header-buttons .btn-activate { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 2.2rem; min-width: 2.2rem; width: 2.2rem; min-height: 2.2rem; padding: .3rem; overflow: hidden; font-size: 0; }
        .rc-rule-control-icon { display: block; width: 1.1rem; height: 1.1rem; flex: 0 0 1.1rem; pointer-events: none; }
        rule-input.disabled .rule-header-buttons .btn-activate { opacity: .72; }
        .mobile-toolbar .rc-mobile-toolbar-close { display: none; }
        @media (max-width: 42em) {
            .mobile-toolbar.show .rc-mobile-toolbar-close {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                order: -1;
                min-height: 3rem;
                margin-top: .45rem !important;
                border: 1px solid currentColor;
            }
            .rule-header-buttons .btn-edit,
            .rule-header-buttons .btn-activate { flex: 0 0 2.75rem; min-width: 2.75rem; width: 2.75rem; min-height: 2.75rem; }
        }
        @media (max-width: 35em) {
            .rc-rule-group-control,
            .rc-rule-category-filter,
            .rc-quick-config { grid-column: 1 / -1; width: 100%; }
            .rc-rule-group-control select { flex: 1 1 auto; max-width: none; min-height: 2.75rem; }
            .rc-rule-category-filter { min-height: 2.75rem; }
            .rc-command-icon { min-width: 2.75rem; min-height: 2.75rem; }
            .rc-quick-config > button { width: 100%; min-height: 2.75rem; }
            .rc-quick-menu { left: 0; right: 0; }
        }
    `;
    document.head.append(style);
}

function setupMobileSelectedActions() {
    const toolbar = document.querySelector(".mobile-toolbar");
    const trigger = document.getElementById("selectedRules");
    if (!toolbar || !trigger || toolbar.dataset.navigationReady === "true") return;

    toolbar.dataset.navigationReady = "true";
    toolbar.setAttribute("role", "dialog");
    toolbar.setAttribute("aria-modal", "true");
    toolbar.setAttribute("aria-label", message("rule_quick_actions", "Selected rule actions"));

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "btn rc-mobile-toolbar-close";
    closeButton.textContent = message("done", "Done");
    closeButton.addEventListener("click", (event) => {
        event.stopPropagation();
        closeMobileSelectedActions(toolbar, trigger);
    });
    toolbar.append(closeButton);

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || !toolbar.classList.contains("show")) return;
        event.preventDefault();
        closeMobileSelectedActions(toolbar, trigger);
    });

    // options.js historically closes the sheet for every bubbled toolbar click.
    // Register after its DOMContentLoaded handlers so action execution stays intact
    // while the action click no longer doubles as navigation dismissal.
    setTimeout(() => {
        toolbar.querySelectorAll(".btn-selected-action").forEach((button) => {
            button.addEventListener("click", (event) => {
                event.stopPropagation();
                toolbar.classList.remove("show");
            });
        });
    }, 0);
}

function closeMobileSelectedActions(toolbar, trigger) {
    toolbar.classList.remove("show");
    trigger.focus();
}

function hideLegacyQuickActionToggle() {
    const input = document.getElementById("showRuleQuickActions");
    if (input) input.tabIndex = -1;
}

async function normalizeLegacyBehaviorGrouping(settings = {}) {
    const groupBy = document.getElementById("ruleGroupBy");
    if (!groupBy) return;

    Array.from(groupBy.options)
        .filter((option) => option.value === "behavior")
        .forEach((option) => option.remove());

    if (settings.groupBy === "behavior") {
        const normalized = { ...settings, groupBy: "group" };
        groupBy.value = "group";
        await browser.storage.local.set({ ruleViewSettings: normalized });
    }
}

function normalizeCategoryFilter(value) {
    const category = String(value || "all");
    if (category === "all" || category === "local-custom" || CATALOG_CATEGORY_ORDER.includes(category)) {
        return category;
    }
    return "all";
}

function createCategoryControl() {
    const commandbar = document.querySelector(".rules-commandbar");
    const groupBy = document.getElementById("ruleGroupBy");
    if (!commandbar || !groupBy || document.getElementById("ruleCategoryFilter")) return;

    const select = document.createElement("select");
    select.id = "ruleCategoryFilter";
    select.className = "rules-view-select rc-rule-category-filter";
    select.title = message("imports_category_heading", "Category");

    const all = document.createElement("option");
    all.value = "all";
    all.textContent = message("all", "All categories");

    const local = document.createElement("option");
    local.value = "local-custom";
    local.textContent = message("rule_group_local_custom", "Local / custom");

    const categories = CATALOG_CATEGORY_ORDER.map((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = catalogCategoryLabel(category, (key) => browser.i18n.getMessage(key));
        return option;
    });

    select.replaceChildren(all, local, ...categories);
    select.value = Array.from(select.options).some((option) => option.value === selectedCategory)
        ? selectedCategory
        : "all";
    selectedCategory = select.value;
    select.addEventListener("change", async () => {
        selectedCategory = normalizeCategoryFilter(select.value);
        await browser.storage.local.set({ [RULE_CATEGORY_FILTER_KEY]: selectedCategory });
        applyCategoryFilter();
    });

    groupBy.before(select);
}

function applyCategoryFilter() {
    document.querySelectorAll("rule-list").forEach((list) => {
        if (typeof list.setView === "function") {
            list.setView({ ...list.view, category: selectedCategory });
        }
    });
}

function createGroupControls() {
    const commandbar = document.querySelector(".rules-commandbar");
    const groupBy = document.getElementById("ruleGroupBy");
    if (!commandbar || !groupBy || document.getElementById("ruleGroupFilter")) return;

    const wrap = document.createElement("div");
    wrap.className = "rc-rule-group-control";

    const select = document.createElement("select");
    select.id = "ruleGroupFilter";
    select.className = "rules-view-select";
    select.title = message("group", "Group");
    select.addEventListener("change", async () => {
        selectedGroup = normalizeGroupFilter(select.value);
        await browser.storage.local.set({ [RULE_GROUP_FILTER_KEY]: selectedGroup });
        applyGroupFilter();
    });

    const add = document.createElement("button");
    add.type = "button";
    add.className = "btn rc-command-icon";
    add.title = message("add", "Add group");
    add.setAttribute("aria-label", add.title);
    add.textContent = "+";
    add.addEventListener("click", createGroup);

    wrap.append(select, add);
    groupBy.before(wrap);
    refreshGroupControls();
}

async function createGroup() {
    const promptText = message("group_placeholder", "Group name");
    const name = String(window.prompt(promptText) || "").trim();
    if (!name || groups.includes(name)) return;

    groups = normalizeGroups([...groups, name]);
    await browser.storage.local.set({ [RULE_GROUPS_KEY]: groups });
    refreshGroupControls();
}

function refreshGroupControls() {
    const select = document.getElementById("ruleGroupFilter");
    if (!select) return;

    const all = document.createElement("option");
    all.value = "all";
    all.textContent = message("all", "All groups");

    const ungrouped = document.createElement("option");
    ungrouped.value = "ungrouped";
    ungrouped.textContent = message("ungrouped", "Ungrouped");

    const options = groups.map((name) => {
        const option = document.createElement("option");
        option.value = `group:${name}`;
        option.textContent = name;
        return option;
    });

    select.replaceChildren(all, ungrouped, ...options);
    select.value = Array.from(select.options).some((option) => option.value === selectedGroup)
        ? selectedGroup
        : "all";
    selectedGroup = select.value;
    refreshGroupSuggestions();
}

function refreshGroupSuggestions() {
    let datalist = document.getElementById("ruleGroupSuggestions");
    if (!datalist) {
        datalist = document.createElement("datalist");
        datalist.id = "ruleGroupSuggestions";
        document.body.append(datalist);
    }

    datalist.replaceChildren(...groups.map((name) => {
        const option = document.createElement("option");
        option.value = name;
        return option;
    }));

    document.querySelectorAll("input.group-input").forEach((input) => {
        input.setAttribute("list", datalist.id);
    });
}

function applyGroupFilter() {
    document.querySelectorAll("rule-list").forEach((list) => {
        if (typeof list.setView === "function") {
            list.setView({ ...list.view, group: selectedGroup });
        }
    });
}

async function onRulesChanged(e) {
    const group = String(e.detail?.rule?.group || "").trim();
    if (group && !groups.includes(group)) {
        groups = normalizeGroups([...groups, group]);
        await browser.storage.local.set({ [RULE_GROUPS_KEY]: groups });
    }
    refreshGroupControls();
    refreshGroupSuggestions();
}

function createQuickActionControls(storedSelection) {
    const commandbar = document.querySelector(".rules-commandbar");
    if (!commandbar || document.getElementById("ruleQuickActionConfig")) return;

    const selected = new Set(
        (Array.isArray(storedSelection) ? storedSelection : []).filter((command) => QUICK_COMMANDS.includes(command))
    );

    const wrap = document.createElement("div");
    wrap.id = "ruleQuickActionConfig";
    wrap.className = "rc-quick-config";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn";
    button.textContent = message("rule_quick_actions", "Quick actions");
    button.setAttribute("aria-expanded", "false");

    const menu = document.createElement("div");
    menu.className = "rc-quick-menu";
    menu.hidden = true;

    const labels = {
        test: message("test_selected_rules", "Test"),
        export: message("export", "Export"),
        share: message("share_selected_community", "Share"),
        delete: message("remove", "Delete"),
    };

    for (const command of QUICK_COMMANDS) {
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.value = command;
        input.checked = selected.has(command);
        input.dataset.quickActionToggle = command;
        input.addEventListener("change", async () => {
            if (input.checked) selected.add(command);
            else selected.delete(command);
            applyQuickActions(selected);
            await browser.storage.local.set({ [QUICK_ACTION_SELECTION_KEY]: Array.from(selected) });
        });
        const text = document.createElement("span");
        text.textContent = labels[command];
        label.append(input, text);
        menu.append(label);
    }

    button.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.hidden = !menu.hidden;
        button.setAttribute("aria-expanded", String(!menu.hidden));
    });
    menu.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("click", () => {
        menu.hidden = true;
        button.setAttribute("aria-expanded", "false");
    });

    wrap.append(button, menu);
    commandbar.append(wrap);
    applyQuickActions(selected);
}

function applyQuickActions(selected) {
    document.body.classList.toggle("rc-has-quick-actions", selected.size > 0);
    for (const command of QUICK_COMMANDS) {
        document.body.classList.toggle(`rc-show-quick-${command}`, selected.has(command));
    }
}

const RULE_CONTROL_ICON_NS = "http://www.w3.org/2000/svg";

function createRuleControlIcon(kind) {
    const svg = document.createElementNS(RULE_CONTROL_ICON_NS, "svg");
    svg.classList.add("rc-rule-control-icon");
    svg.dataset.ruleControlIcon = kind;
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    const paths = kind === "edit"
        ? ["M4 20h4L19 9l-4-4L4 16v4Z", "m13.5 6.5 4 4"]
        : ["M12 2v10", "M5.64 5.64a9 9 0 1 0 12.72 0"];
    for (const d of paths) {
        const path = document.createElementNS(RULE_CONTROL_ICON_NS, "path");
        path.setAttribute("d", d);
        svg.append(path);
    }
    return svg;
}

function ensureRuleControlIcon(button, kind) {
    const current = button.querySelector(".rc-rule-control-icon");
    if (current?.dataset.ruleControlIcon === kind) return;
    current?.remove();
    button.prepend(createRuleControlIcon(kind));
}

function decorateRuleRows() {
    document.querySelectorAll("rule-input").forEach((input) => {
        const edit = input.querySelector(".btn-edit");
        if (edit) {
            const label = message("edit", "Edit");
            edit.title = label;
            edit.setAttribute("aria-label", label);
            ensureRuleControlIcon(edit, "edit");
        }

        const activate = input.querySelector(".btn-activate");
        if (activate) {
            const label = activate.textContent.trim() || message("disable", "Disable");
            activate.title = label;
            activate.setAttribute("aria-label", label);
            ensureRuleControlIcon(activate, "activate");
        }
    });
    refreshGroupSuggestions();
}

function observeRuleRows() {
    const root = document.getElementById("tab-rules");
    if (!root) return;

    const observer = new MutationObserver(() => decorateRuleRows());
    observer.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
    });
}
