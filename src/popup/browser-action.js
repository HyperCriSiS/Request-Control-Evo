/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { normalizeSiteHost } from "../main/site-exceptions.js";
import {
    isRuleSiteHostSuppressed,
    isSiteHostDisabled,
    toggleRuleSiteHost,
    toggleSiteHost,
} from "./site-controls.js";

const REFERRER_MODES = new Set(["browser", "balanced", "same-origin", "no-referrer"]);
let currentSiteHost = null;
let selectedRecord = null;

document.addEventListener("DOMContentLoaded", async () => {
    const settings = await browser.storage.local.get([
        "disabled",
        "referrerProtectionMode",
        "referrerProtectionExceptions",
        "disabledSiteHosts",
        "ruleSiteExceptions",
    ]);
    const { disabled } = settings;

    updateDisabled(disabled === true);
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    currentSiteHost = normalizeSiteHost(tabs[0]?.url || "");
    setupSiteControls(settings);
    setupReferrerControls(settings);

    for (const copyButton of document.getElementsByClassName("copyButton")) {
        copyButton.addEventListener("click", copyText);
        copyButton.addEventListener("mouseleave", copied);
    }

    document.getElementById("showRules").addEventListener("click", openOptionsPage);
    document.getElementById("inspectCurrent").addEventListener("click", openInspector);
    document.getElementById("toggleActive").addEventListener("click", toggleActive);
    document.getElementById("toggleSite").addEventListener("click", toggleCurrentSite);
    document.getElementById("toggleRuleSite").addEventListener("click", toggleSelectedRuleSite);
    document.getElementById("editLink").addEventListener("click", editRule);

    if (disabled !== true) {
        getRecords();
    }
});

function setupReferrerControls(settings) {
    const modeSelect = document.getElementById("referrerMode");
    const mode = REFERRER_MODES.has(settings.referrerProtectionMode)
        ? settings.referrerProtectionMode
        : "browser";
    modeSelect.value = mode;
    modeSelect.addEventListener("change", setReferrerMode);

    const exceptions = normalizeExceptionHosts(settings.referrerProtectionExceptions);
    renderReferrerHostException(exceptions);
    document.getElementById("toggleReferrerHost").addEventListener("click", toggleReferrerHost);
}

async function setReferrerMode(event) {
    const mode = REFERRER_MODES.has(event.currentTarget.value) ? event.currentTarget.value : "browser";
    await browser.storage.local.set({ referrerProtectionMode: mode });
}

async function toggleReferrerHost() {
    if (!currentSiteHost) {
        return;
    }
    const stored = await browser.storage.local.get("referrerProtectionExceptions");
    const exceptions = new Set(normalizeExceptionHosts(stored.referrerProtectionExceptions));
    if (exceptions.has(currentSiteHost)) {
        exceptions.delete(currentSiteHost);
    } else {
        exceptions.add(currentSiteHost);
    }
    const next = [...exceptions].sort();
    await browser.storage.local.set({ referrerProtectionExceptions: next });
    renderReferrerHostException(next);
}

function renderReferrerHostException(exceptions) {
    const row = document.getElementById("referrerHostRow");
    const host = document.getElementById("referrerHost");
    const button = document.getElementById("toggleReferrerHost");
    if (!currentSiteHost) {
        host.textContent = "";
        row.classList.add("hidden");
        return;
    }

    host.textContent = currentSiteHost;
    document.getElementById("referrerHostScope").textContent = currentSiteHost;
    row.classList.remove("hidden");
    const isException = exceptions.includes(currentSiteHost);
    const label = browser.i18n.getMessage(isException ? "remove" : "whitelist");
    button.textContent = label;
    button.title = `${label}: ${currentSiteHost}`;
    button.setAttribute("aria-pressed", String(isException));
}

function normalizeExceptionHosts(values) {
    if (!Array.isArray(values)) {
        return [];
    }
    return [...new Set(values.filter((value) => typeof value === "string").map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

function setupSiteControls(settings) {
    const section = document.getElementById("siteControl");
    if (!currentSiteHost) {
        section.classList.add("hidden");
        return;
    }
    document.getElementById("siteHost").textContent = currentSiteHost;
    section.classList.remove("hidden");
    renderSiteControl(settings.disabledSiteHosts);
}

async function toggleCurrentSite() {
    if (!currentSiteHost) {
        return;
    }
    const stored = await browser.storage.local.get("disabledSiteHosts");
    const next = toggleSiteHost(stored.disabledSiteHosts, currentSiteHost);
    await browser.storage.local.set({ disabledSiteHosts: next });
    renderSiteControl(next);
}

function renderSiteControl(values) {
    const button = document.getElementById("toggleSite");
    const disabledForSite = isSiteHostDisabled(values, currentSiteHost);
    const label = browser.i18n.getMessage(disabledForSite ? "site_enable" : "site_disable");
    button.textContent = label;
    button.title = `${label}: ${currentSiteHost}`;
    button.classList.toggle("disabled", disabledForSite);
    button.setAttribute("aria-pressed", String(disabledForSite));
}

async function toggleSelectedRuleSite() {
    const ruleUuid = selectedRecord?.rule?.uuid;
    if (!currentSiteHost || !ruleUuid) {
        return;
    }
    const stored = await browser.storage.local.get("ruleSiteExceptions");
    const next = toggleRuleSiteHost(stored.ruleSiteExceptions, ruleUuid, currentSiteHost);
    await browser.storage.local.set({ ruleSiteExceptions: next });
    renderSelectedRuleSiteControl(next);
}

async function renderSelectedRuleSiteControl(value = undefined) {
    const button = document.getElementById("toggleRuleSite");
    const ruleUuid = selectedRecord?.rule?.uuid;
    if (!currentSiteHost || !ruleUuid) {
        button.classList.add("hidden");
        return;
    }
    const exceptions = value === undefined
        ? (await browser.storage.local.get("ruleSiteExceptions")).ruleSiteExceptions
        : value;
    const suppressed = isRuleSiteHostSuppressed(exceptions, ruleUuid, currentSiteHost);
    const label = browser.i18n.getMessage(suppressed ? "rule_site_enable" : "rule_site_disable");
    button.textContent = label;
    button.title = `${label}: ${currentSiteHost}`;
    button.classList.toggle("disabled", suppressed);
    button.setAttribute("aria-pressed", String(suppressed));
    button.classList.remove("hidden");
}

async function getRecords() {
    const records = await browser.runtime.sendMessage(null);
    renderRecords(records);
}

export function renderRecords(records) {
    const list = document.getElementById("records");
    if (!list) {
        return;
    }

    if (!Array.isArray(records) || records.length === 0) {
        list.classList.add("hidden");
        return;
    }

    records.forEach((record) => list.prepend(newListItem(record)));

    list.querySelector(".entry:first-child .entry-header")?.click();
    list.classList.remove("hidden");
}

function newListItem(record) {
    const item = document.getElementById("entryTemplate").content.cloneNode(true);

    item.querySelector(".type").textContent = browser.i18n.getMessage(record.type);
    item.querySelector(".timestamp").textContent = timestamp(record.timestamp);
    item.querySelector(".icon").src = `/icons/icon-${record.action}.svg`;
    item.querySelector(".action").textContent = browser.i18n.getMessage(`title_${record.action}`);
    item.querySelector(".url").textContent = record.url;

    const tagsNode = item.querySelector(".tags");

    if (record.rule.tag) {
        tagsNode.textContent = decodeURIComponent(record.rule.tag);
    } else {
        tagsNode.remove();
    }

    item.querySelector(".entry-header").addEventListener("click", function () {
        const details = document.getElementById("details");
        this.parentNode.appendChild(details);
        showDetails(record);
    });
    return item;
}

function showDetails(details) {
    selectedRecord = details;
    document.getElementById("details").classList.remove("hidden");
    document.getElementById("url").textContent = details.url;
    if (details.target) {
        document.getElementById("target").textContent = details.target;
        document.getElementById("targetBlock").classList.remove("hidden");
    } else {
        document.getElementById("targetBlock").classList.add("hidden");
    }
    const optionsUrl = browser.runtime.getURL("src/options/options.html");
    document.getElementById("editLink").href = `${optionsUrl}?edit=${details.rule.uuid}`;
    renderSelectedRuleSiteControl();
}

async function openInspector() {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab || typeof tab.id !== "number") {
        return;
    }
    const inspectorUrl = browser.runtime.getURL(`src/inspector/inspector.html?tabId=${encodeURIComponent(tab.id)}`);
    await browser.tabs.create({ url: inspectorUrl });
    window.close();
}

function openOptionsPage() {
    browser.runtime.openOptionsPage();
    window.close();
}

async function toggleActive() {
    const disabled = !this.classList.contains("disabled");
    await browser.storage.local.set({ disabled });
    updateDisabled(disabled);
}

function updateDisabled(disabled) {
    const button = document.getElementById("toggleActive");
    const textId = disabled ? "activate_true" : "activate_false";
    const titleId = disabled ? "enable_rules" : "disable_rules";
    button.classList.toggle("disabled", disabled);
    button.textContent = browser.i18n.getMessage(textId);
    button.title = browser.i18n.getMessage(titleId);
}

function editRule(e) {
    e.preventDefault();
    browser.tabs.create({
        url: this.href,
    });
    window.close();
}

function timestamp(ms) {
    const d = new Date(ms);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    const ss = d.getSeconds().toString().padStart(2, "0");
    const s = d.getMilliseconds().toString().padStart(3, "0");
    return `${hh}:${mm}:${ss}.${s}`;
}

function copyText(e) {
    const range = document.createRange();
    const text = document.getElementById(e.currentTarget.dataset.copyTarget);
    range.selectNodeContents(text);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("Copy");
    e.currentTarget.classList.add("copied");
}

function copied(e) {
    e.currentTarget.classList.remove("copied");
}
