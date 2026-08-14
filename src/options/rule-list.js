/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { groupRuleInputs } from "./rule-grouping.js";
import { newRuleInput } from "./rule-input.js";

class RuleList extends HTMLElement {
    constructor() {
        super();
        const template = document.getElementById("rule-list");
        this.appendChild(template.content.cloneNode(true));

        this.list = this.querySelector("#list");
        this.collapsedGroups = new Set();
        this.querySelector("#icon").src = this.getAttribute("icon");
        this.querySelector("#title").textContent = browser.i18n.getMessage(this.getAttribute("text"));
        this.querySelector("#collapse").addEventListener("click", () => this.collapse());
        this.querySelector("#select-all").addEventListener("change", (e) => this.onSelectAll(e));

        this.addEventListener("rule-selected", () => this.updateHeader());
        this.addEventListener("rule-deleted", (e) => this.onDelete(e));
        this.addEventListener("rule-edit-completed", (e) => this.onEditComplete(e));
        this.addEventListener("rule-action-changed", (e) => this.onActionChange(e));
        this.addEventListener("rule-created", (e) => this.onCreate(e));
        this.addEventListener("rule-changed", (e) => this.onchange(e));
        this.addEventListener("rule-invalid", (e) => this.onInvalid(e));
    }

    get ruleInputs() {
        return Array.from(this.list.querySelectorAll(":scope > [data-uuid]"));
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

    newRule() {
        const input = newRuleInput();
        this.list.append(input);
        this.updateHeader();
        this.toggle();
        input.setAttribute("new", "new");
        input.toggleEdit();
        input.scrollIntoView();
        input.focus();
    }

    add(rule) {
        this.list.append(newRuleInput(rule));
        this.renderGroups();
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
        this.list.querySelectorAll(":scope > .rule-group-header").forEach((header) => header.remove());

        if (inputs.length === 0) {
            return;
        }

        const groups = groupRuleInputs(inputs);
        if (this.id === "new" || groups[0].name === null) {
            for (const input of groups[0].inputs) {
                input.classList.remove("group-hidden");
                this.list.append(input);
            }
            return;
        }

        for (const { name: group, inputs: rules } of groups) {
            const collapsed = this.collapsedGroups.has(group);
            const header = document.createElement("li");
            header.className = "rule-group-header";
            header.dataset.group = group;

            const toggle = document.createElement("button");
            toggle.type = "button";
            toggle.className = "rule-group-toggle";
            toggle.setAttribute("aria-expanded", String(!collapsed));
            toggle.textContent = group || browser.i18n.getMessage("ungrouped") || "Ungrouped";
            toggle.addEventListener("click", () => this.toggleGroup(group));

            const count = document.createElement("span");
            count.className = "badge badge-light rule-group-count";
            count.textContent = String(rules.length);

            header.append(toggle, count);
            this.list.append(header);

            for (const input of rules) {
                input.classList.toggle("group-hidden", collapsed);
                this.list.append(input);
            }
        }
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
        const inputs = this.ruleInputs;
        const selectedCount = inputs.filter((input) => input.selected).length;

        checkbox.checked = selectedCount > 0 && selectedCount === inputs.length;
        checkbox.indeterminate = selectedCount > 0 && selectedCount < inputs.length;
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
        this.ruleInputs.forEach((rule) => {
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
        }
    }

    onActionChange(e) {
        const { input } = e.detail;
        const newInput = newRuleInput(input.rule);

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
