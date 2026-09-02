/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { placeCatalogPackage } from "./catalog-groups.js";

const ALLOWED_IMPORT_PROTOCOLS = new Set([
    "http:",
    "https:",
    "moz-extension:",
    "chrome-extension:",
]);

export function normalizeImportSource(value) {
    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    try {
        const url = new URL(value.trim());
        if (!ALLOWED_IMPORT_PROTOCOLS.has(url.protocol)) {
            return null;
        }
        if (url.username || url.password) {
            return null;
        }
        return url.href;
    } catch {
        return null;
    }
}

if (typeof document !== "undefined" && typeof browser !== "undefined") {
    installCatalogPresentation();
}

function installCatalogPresentation() {
    ensureCatalogStylesheet();

    const place = (input) => {
        const parent = input?.parentElement;
        if (input?.catalogEntry && parent?.classList.contains("imports-package-list")) {
            placeCatalogPackage(parent, input, input.catalogEntry, (key) => browser.i18n.getMessage(key));
            simplifyPackageRow(input);
        }
    };

    document.querySelectorAll(".imports-package-list > rule-import-input").forEach(place);

    const observer = new MutationObserver((records) => {
        for (const record of records) {
            for (const node of record.addedNodes) {
                if (!(node instanceof Element)) continue;
                if (node.localName === "rule-import-input") place(node);
                node.querySelectorAll?.(".imports-package-list > rule-import-input").forEach(place);
            }
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
}

function ensureCatalogStylesheet() {
    if (document.getElementById("request-control-imports-catalog-styles")) return;
    const link = document.createElement("link");
    link.id = "request-control-imports-catalog-styles";
    link.rel = "stylesheet";
    link.href = new URL("./imports-catalog.css", import.meta.url).href;
    document.head.append(link);
}

function simplifyPackageRow(input) {
    const root = input?.shadowRoot;
    if (!root) return;

    // Community review/rating belongs to the dedicated contribution flow, not to each import row.
    root.getElementById("rating")?.remove();

    const meta = root.querySelector(".import-meta");
    const actions = root.querySelector(".import-actions");
    if (!meta || !actions) return;

    let status = root.querySelector(".import-status");
    if (!status) {
        status = document.createElement("span");
        status.className = "import-status";
        const selectionToggle = root.getElementById("selection-toggle");
        meta.insertBefore(status, selectionToggle || null);
    }

    for (const id of ["count", "imported", "update", "integrity", "error"]) {
        const element = root.getElementById(id);
        if (element && element.parentElement !== status) status.append(element);
    }
}
