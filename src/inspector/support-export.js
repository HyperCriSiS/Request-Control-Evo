/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { buildSupportDiagnostic } from "../main/analysis/support-diagnostic.js";
import { getInspectionMessage } from "./strings.js";

export function initializeSupportExport() {
    const container = document.querySelector(".privacy-note");
    if (!container || document.getElementById("export-support-diagnostic")) {
        return;
    }

    const button = document.createElement("button");
    button.id = "export-support-diagnostic";
    button.type = "button";
    button.className = "link-button";
    button.textContent = getInspectionMessage("inspection_export_diagnostic");
    button.title = "Exports aggregate support data without full URLs, hostnames or custom source URLs.";
    button.addEventListener("click", () => exportDiagnostic(button));
    container.append(button);
}

async function exportDiagnostic(button) {
    const original = button.textContent;
    button.disabled = true;
    try {
        const tabId = Number(new URLSearchParams(location.search).get("tabId"));
        const [session, stored] = await Promise.all([
            Number.isInteger(tabId) && tabId >= 0
                ? browser.runtime.sendMessage({namespace: "inspection", action: "get", tabId})
                : Promise.resolve(null),
            browser.storage.local.get(["rules", "imports"]),
        ]);
        const diagnostic = buildSupportDiagnostic(session, {
            rules: stored.rules || [],
            imports: stored.imports || {},
            extensionVersion: browser.runtime.getManifest().version,
        });
        downloadJson(diagnostic);
        button.textContent = getInspectionMessage("inspection_diagnostic_saved");
    } catch {
        button.textContent = getInspectionMessage("inspection_diagnostic_failed");
    } finally {
        window.setTimeout(() => {
            button.textContent = original;
            button.disabled = false;
        }, 1800);
    }
}

function downloadJson(value) {
    const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "request-control-evo-support.json";
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
