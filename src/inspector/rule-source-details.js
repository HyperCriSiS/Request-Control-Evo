/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {summarizeRuleRuntimeState} from "../main/analysis/support-diagnostic.js";

let snapshotPromise = null;
let renderToken = 0;

browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes.rules || changes.imports)) {
        snapshotPromise = null;
    }
});

async function snapshot() {
    if (!snapshotPromise) {
        snapshotPromise = browser.storage.local.get(["rules", "imports"])
            .then((stored) => ({
                rules: stored.rules || [],
                imports: stored.imports || {},
            }))
            .catch(() => ({rules: [], imports: {}}));
    }
    return snapshotPromise;
}

function label(channel) {
    switch (channel) {
        case "official": return "Official";
        case "community": return "Community";
        case "custom": return "Custom";
        case "local": return "Local";
        default: return "Unknown source";
    }
}

function statusText(runtime) {
    const parts = [label(runtime.channel)];
    if (runtime.packageId) parts.push(runtime.packageId);
    if (runtime.version) parts.push(`v${runtime.version}`);

    if (runtime.integrityStatus === "verified-at-import" || runtime.integrityStatus === "verified") {
        parts.push("integrity verified");
    } else if (runtime.integrityStatus === "failed") {
        parts.push("integrity check failed");
    }
    if (runtime.updateAvailable) {
        parts.push(runtime.availableVersion ? `update ${runtime.availableVersion} available` : "update available");
    }
    if (runtime.conflictReason) {
        parts.push(`conflict: ${runtime.conflictReason}`);
    }
    if (runtime.lastCheckStatus === "unavailable") {
        parts.push("update check unavailable");
    }
    return parts.join(" · ");
}

function ensureNode(ruleWrap) {
    const value = ruleWrap.querySelector("dd");
    if (!value) return null;

    let node = value.querySelector(".rule-source-detail");
    if (!node) {
        node = document.createElement("div");
        node.className = "rule-source-detail request-meta";
        value.append(node);
    }
    return node;
}

export async function renderRuleSourceDetails(ruleWrap, uuid) {
    const token = ++renderToken;
    const node = ensureNode(ruleWrap);
    if (!node) return;
    if (!uuid) {
        node.textContent = "";
        node.hidden = true;
        return;
    }

    node.hidden = false;
    node.textContent = "Checking rule source…";
    const stored = await snapshot();
    if (token !== renderToken) return;

    const rule = stored.rules.find((candidate) => candidate?.uuid === uuid);
    if (!rule) {
        node.textContent = "Rule source unavailable";
        node.dataset.state = "warning";
        return;
    }

    const runtime = summarizeRuleRuntimeState(rule, stored.imports);
    node.textContent = statusText(runtime);
    node.dataset.state = runtime.conflictReason || runtime.integrityStatus === "failed"
        ? "warning"
        : (runtime.updateAvailable ? "update" : "normal");
}
