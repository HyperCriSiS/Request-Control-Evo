/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const CATALOG_CATEGORY_ORDER = Object.freeze([
    "url-cleanup",
    "redirect",
    "request-transform",
    "block-allow",
    "privacy-special",
]);

const BEHAVIOR_CATEGORY = Object.freeze({
    "url-cleanup": "url-cleanup",
    "site-cleanup": "url-cleanup",
    "url-normalization": "url-cleanup",
    "media-url-cleanup": "url-cleanup",
    "direct-link": "redirect",
    "provider-override": "redirect",
    "media-quality": "request-transform",
    "request-blocking": "block-allow",
    "privacy-embed": "privacy-special",
    "special-mode": "privacy-special",
});

export const CATALOG_CATEGORY_LABELS = Object.freeze({
    "url-cleanup": Object.freeze({ key: "imports_category_url_cleanup", fallback: "URL cleanup" }),
    redirect: Object.freeze({ key: "imports_category_redirect", fallback: "Redirect" }),
    "request-transform": Object.freeze({ key: "imports_category_request_transform", fallback: "Request transform" }),
    "block-allow": Object.freeze({ key: "imports_category_block_allow", fallback: "Block / allow" }),
    "privacy-special": Object.freeze({ key: "imports_category_privacy_special", fallback: "Privacy / special" }),
});

export function catalogCategoryForEntry(entry = {}) {
    return BEHAVIOR_CATEGORY[entry.behavior] || "privacy-special";
}

export function catalogCategoryLabel(category, getMessage = () => "") {
    const definition = CATALOG_CATEGORY_LABELS[category] || CATALOG_CATEGORY_LABELS["privacy-special"];
    return getMessage(definition.key) || definition.fallback;
}

export function renderCatalogCategoryGroups(root, packages, getMessage = () => "") {
    root.replaceChildren();
    for (const category of CATALOG_CATEGORY_ORDER) {
        const categoryPackages = packages.filter((item) => catalogCategoryForEntry(item.entry) === category);
        if (categoryPackages.length === 0) {
            continue;
        }

        const group = document.createElement("li");
        group.className = "imports-category-group";
        group.dataset.category = category;

        const heading = document.createElement("div");
        heading.className = "imports-category-heading";
        const label = document.createElement("strong");
        label.textContent = catalogCategoryLabel(category, getMessage);
        const count = document.createElement("span");
        count.className = "badge badge-light imports-category-count";
        count.textContent = String(categoryPackages.length);
        heading.append(label, count);

        const packageList = document.createElement("div");
        packageList.className = "imports-category-packages";
        categoryPackages.forEach(({ input }) => packageList.append(input));
        group.append(heading, packageList);
        root.append(group);
    }
}
