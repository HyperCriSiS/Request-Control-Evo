/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { catalogCategoryLabel } from "./catalog-groups.js";
import { filterRuleInputs, getRuleBehaviorCategory, getRuleSourceKind, groupRuleInputs } from "./rule-grouping.js";
import "./rule-management-ui.js";
import { newRuleInput } from "./source-scope-editor.js";

const FIXED_RULE_TYPES = new Set(["filter", "redirect", "secure", "block", "whitelist"]);

class RuleList extends HTMLElement {
    constructor() {
        super();
        const template = document.getElementById("rule-list");
        this.appendChild(template.content.cloneNode(true));

        this.list = this.querySelector("#list");
        this.collapsedGroups = new Set();
        this.view = {
            query: "",
            status: "all",
            source: "all",
            groupBy: "group",
            sort: "title",
            manualOrder: {},
        };
        this.uiSequence = 0;
        this.draggedInput = null;
        this.dragPosition = "before";
        this.querySelector("#icon").src = this.getAttribute("icon");
        const title = this.querySelector("#title");
        title.textContent = browser.i18n.getMessage(this.getAttribute("text"));
        title.classList.add("rule-type-title");
        let kind = this.querySelector("#kind");
        if (!kind) {
            kind = document.createElement("span");
            kind.id = "kind";
            kind.className = "rule-type-kind";
            title.before(kind);
        }
        kind.textContent = browser.i18n.getMessage("rule_type_label") || "Rule type";
        kind.classList.toggle("d-none", !this.isFixedRuleType);
        this.querySelector("#collapse").addEventListener("click", () => this.collapse());
        this.querySelector("#select-all").addEventListener("change", (e) => this.onSelectAll(e));

        this.list.addEventListener("dragstart", (e) => this.onDragStart(e));
        this.list.addEventListener("dragover", (e) => this.onDragOver(e));
        this.list.addEventListener("drop", (e) => this.onDrop(e));
        this.list.addEventListener("dragend", () => this.onDragEnd());

        this.addEventListener("rule-selected", () => this.updateHeader());
        this.addEventListener("rule-deleted", (e) => this.onDelete(e));
        this.addEventListener("rule-edit-completed", (e) => this.onEditComplete(e));
        this.addEventListener("rule-action-changed", (e) => this.onActionChange(e));
        this.addEventListener("rule-created", (e) => this.onCreate(e));
        this.addEventListener("rule-changed", (e) => this.onchange(e));
        this.addEventListener("rule-invalid", (e) => this.onInvalid(e));
        this.toggle();
    }

    get isFixedRuleType() {
        return FIXED_RULE_TYPES.has(this.id);
    }

    get ruleInputs() {
        return Array.from(this.list.querySelectorAll(":scope > [data-uuid]"));
    }

    get visibleInputs() {
        if (this.id === "new") {
            return this.ruleInputs;
        }
        return filterRuleInputs(this.ruleInputs, this.view);
    }

    get selected() {
        return this.ruleInputs.filter((input) => input.selected).map((input) => input.rule);
    }

    get size() {
        return this.ruleInputs.length;
    }

    get isEmpty() {
        return this.size === 0;
    }

    setView(view = {}) {
        this.view = {
            ...this.view,
            ...view,
            manualOrder: view.manualOrder || this.view.manualOrder || {},
        };
        this.renderGroups();
        this.updateHeader();
    }

    newRule() {
        const input = newRuleInput();
        this.prepareInput(input);
        this.list.append(input);
        this.updateHeader();
        this.toggle();
        input.setAttribute("new", "new");
        input.toggleEdit();
        input.scrollIntoView();
        input.focus();
    }

    add(rule) {
        const input = newRuleInput(rule);
        this.prepareInput(input);
        this.list.append(input);
        this.renderGroups();
    }

    prepareInput(input) {
        this.uiSequence += 1;
        input.dataset.uiSequence = String(this.uiSequence);
    }

    addCreated(rule) {
        this.add(rule);
        this.updateHeader();
        this.toggle();
    }

    addFrom(input) {
        this.add(input.rule);
        const newInput = this.querySelector(`#rule-${input.rule.uuid}`);
        newInput.selected = input.selected;
        newInput.toggleSaved();
        this.updateHeader();
        this.toggle();
    }

    toggle() {
        if (this.isFixedRuleType) {
            this.classList.remove("d-none");
            this.renderGroups();
            return;
        }
        this.classList.toggle("d-none", this.size === 0);
    }

    collapse() {
        this.querySelector("#collapse").classList.toggle("collapsed");
        this.list.classList.toggle("collapsed");
    }

    removeSelected() {
        this.ruleInputs.filter((input) => input.selected).forEach((ruleInput) => ruleInput.remove());
        this.renderGroups();
        this.updateHeader();
        this.toggle();
    }

    removeAll() {
        this.list.replaceChildren();
        this.uiSequence = 0;
    }

    edit(uuid) {
        const rule = this.querySelector(`#rule-${uuid}`);
        if (rule) {
            rule.toggleEdit();
            rule.scrollIntoView();
        }
    }

    mark(rules, className) {
        rules.forEach((rule) => {
            const input = this.querySelector(`#rule-${rule.uuid}`);
            if (input) {
                input.classList.add(className);
            }
        });
    }

    renderGroups() {
        const inputs = this.ruleInputs;
        this.list.querySelectorAll(":scope > .rule-group-header, :scope > .rule-list-empty-state")
            .forEach((node) => node.remove());

        if (inputs.length === 0) {
            this.classList.remove("view-empty");
            this.renderEmptyState(false);
            return;
        }

        const visible = this.id === "new" ? inputs : filterRuleInputs(inputs, this.view);
        const visibleSet = new Set(visible);
        for (const input of inputs) {
            input.classList.toggle("view-hidden", !visibleSet.has(input));
            const draggable = this.canDrag(input);
            input.draggable = false;
            input.classList.toggle("drag-enabled", draggable);
            const handle = input.querySelector(".rule-drag-handle");
            if (handle) handle.draggable = draggable;
        }
        this.classList.toggle("view-empty", this.id !== "new" && visible.length === 0);
        if (visible.length === 0) {
            this.renderEmptyState(true);
        }

        const effectiveView = this.id === "new"
            ? { ...this.view, groupBy: "none", sort: "manual" }
            : this.view;
        const groups = groupRuleInputs(visible, effectiveView);
        const showHeaders = groups.length > 1 || (groups[0] && groups[0].name !== null);

        for (const { name: group, inputs: rules } of groups) {
            const collapsed = this.collapsedGroups.has(group);
            if (showHeaders) {
                const header = document.createElement("li");
                header.className = "rule-group-header";
                header.dataset.group = group || "";

                const toggle = document.createElement("button");
                toggle.type = "button";
                toggle.className = "rule-group-toggle";
                toggle.setAttribute("aria-expanded", String(!collapsed));
                toggle.textContent = this.groupLabel(group);
                toggle.addEventListener("click", () => this.toggleGroup(group));

                const count = document.createElement("span");
                count.className = "badge badge-light rule-group-count";
                count.textContent = String(rules.length);

                header.append(toggle, count);
                this.list.append(header);
            }

            for (const input of rules) {
                input.classList.toggle("group-hidden", showHeaders && collapsed);
                this.list.append(input);
            }
        }

        for (const input of inputs) {
            if (!visibleSet.has(input)) {
                input.classList.remove("group-hidden");
                this.list.append(input);
            }
        }
    }

    renderEmptyState(filtered) {
        if (!this.isFixedRuleType) {
            return;
        }
        const empty = document.createElement("li");
        empty.className = "rule-list-empty-state";
        empty.setAttribute("role", "status");
        empty.textContent = filtered
            ? (browser.i18n.getMessage("rule_type_no_match") || "No matching rules of this type.")
            : (browser.i18n.getMessage("rule_type_empty") || "No rules of this type yet.");
        this.list.append(empty);
    }

    groupLabel(group) {
        if (this.view.groupBy === "source") {
            const keys = {
                official: "imports_official",
                community: "imports_community",
                custom: "rule_source_custom",
                local: "rule_source_local",
            };
            return browser.i18n.getMessage(keys[group]) || group || "Local";
        }
        if (this.view.groupBy === "behavior") {
            if (group === "local-custom") {
                return browser.i18n.getMessage("rule_group_local_custom") || "Local / custom";
            }
            return catalogCategoryLabel(group, (key) => browser.i18n.getMessage(key));
        }
        return group || browser.i18n.getMessage("ungrouped") || "Ungrouped";
    }

    toggleGroup(group) {
        if (this.collapsedGroups.has(group)) {
            this.collapsedGroups.delete(group);
        } else {
            this.collapsedGroups.add(group);
        }
        this.renderGroups();
    }

    updateHeader() {
        const checkbox = this.querySelector("#select-all");
        const inputs = this.visibleInputs;
        const selectedCount = inputs.filter((input) => input.selected).length;

        checkbox.checked = inputs.length > 0 && selectedCount === inputs.length;
        checkbox.indeterminate = selectedCount > 0 && selectedCount < inputs.length;
        checkbox.disabled = inputs.length === 0;
        this.updateSelectedText();
    }

    updateSelectedText() {
        const count = this.ruleInputs.filter((input) => input.selected).length;
        const selectedText = this.querySelector("#selected-text");
        selectedText.classList.toggle("d-none", count === 0);
        selectedText.textContent = browser.i18n.getMessage("selected_rules_count", [count, this.size]);
    }

    onSelectAll(e) {
        const { checked } = e.target;
        this.visibleInputs.forEach((rule) => {
            rule.selected = checked;
        });
        this.updateSelectedText();
        this.dispatchEvent(
            new CustomEvent("rule-selected", {
                bubbles: true,
                composed: true,
            })
        );
    }

    canDrag(input) {
        return this.id !== "new" &&
            this.view.sort === "manual" &&
            !String(this.view.query || "").trim() &&
            (this.view.status || "all") === "all" &&
            (this.view.source || "all") === "all" &&
            !input.classList.contains("editing");
    }

    groupKey(input) {
        if (this.view.groupBy === "source") {
            return getRuleSourceKind(input.rule);
        }
        if (this.view.groupBy === "group") {
            return input.rule?.group || "";
        }
        if (this.view.groupBy === "behavior") {
            return getRuleBehaviorCategory(input.rule);
        }
        return "";
    }

    onDragStart(e) {
        const handle = e.target.closest?.(".rule-drag-handle");
        const input = handle?.closest?.("[data-uuid]");
        if (!handle || !input || input.parentNode !== this.list || !this.canDrag(input)) {
            e.preventDefault();
            return;
        }
        this.draggedInput = input;
        input.classList.add("dragging");
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", input.dataset.uuid || "");
        }
    }

    onDragOver(e) {
        if (!this.draggedInput) return;
        const target = e.target.closest?.("[data-uuid]");
        if (!target || target === this.draggedInput || target.parentNode !== this.list) return;
        if (this.groupKey(target) !== this.groupKey(this.draggedInput)) return;
        e.preventDefault();
        this.clearDragTargets();
        const rect = target.getBoundingClientRect();
        this.dragPosition = e.clientY >= rect.top + rect.height / 2 ? "after" : "before";
        target.classList.add(this.dragPosition === "after" ? "drag-target-after" : "drag-target-before");
    }

    onDrop(e) {
        if (!this.draggedInput) return;
        const target = e.target.closest?.("[data-uuid]");
        if (!target || target === this.draggedInput || target.parentNode !== this.list) {
            this.onDragEnd();
            return;
        }
        if (this.groupKey(target) !== this.groupKey(this.draggedInput)) {
            this.onDragEnd();
            return;
        }
        e.preventDefault();
        if (this.dragPosition === "after") {
            target.after(this.draggedInput);
        } else {
            target.before(this.draggedInput);
        }

        const manualOrder = { ...(this.view.manualOrder || {}) };
        this.ruleInputs.forEach((input, index) => {
            if (input.rule?.uuid) manualOrder[input.rule.uuid] = index;
        });
        this.view.manualOrder = manualOrder;
        this.dispatchEvent(new CustomEvent("rule-ui-order-changed", {
            bubbles: true,
            composed: true,
            detail: { manualOrder },
        }));
        this.onDragEnd();
        this.renderGroups();
    }

    clearDragTargets() {
        this.list.querySelectorAll(".drag-target-before, .drag-target-after").forEach((input) => {
            input.classList.remove("drag-target-before", "drag-target-after");
        });
    }

    onDragEnd() {
        this.draggedInput?.classList.remove("dragging");
        this.draggedInput = null;
        this.clearDragTargets();
    }

    onCreate(e) {
        e.target.remove();
        this.renderGroups();
        this.updateHeader();
        this.toggle();
    }

    onDelete(e) {
        e.target.remove();
        this.renderGroups();
        this.updateHeader();
        this.toggle();
    }

    onEditComplete(e) {
        const { action } = e.detail;
        if (action !== this.id) {
            e.target.remove();
            this.renderGroups();
            this.updateHeader();
            this.toggle();
        } else {
            this.renderGroups();
        }
    }

    onchange(e) {
        if (this.id === "new") {
            e.stopPropagation();
        } else {
            this.renderGroups();
        }
    }

    onActionChange(e) {
        const { input } = e.detail;
        const newInput = newRuleInput(input.rule);
        this.prepareInput(newInput);

        if (this.id === "new") {
            newInput.setAttribute("new", "new");
        }

        input.replaceWith(newInput);
        newInput.selected = input.selected;
        newInput.toggleEdit();
        newInput.notifyChangedIfValid();
    }

    onInvalid(e) {
        const { input } = e.detail;
        if (this.id !== "new") {
            input.reportValidity();
        }
    }
}

customElements.define("rule-list", RuleList);
