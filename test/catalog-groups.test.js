import {
    CATALOG_CATEGORY_ORDER,
    catalogCategoryForEntry,
} from "../src/options/catalog-groups.js";

test("catalog behavior categories keep the intended user-facing order", () => {
    expect(CATALOG_CATEGORY_ORDER).toEqual([
        "url-cleanup",
        "redirect",
        "request-transform",
        "block-allow",
        "privacy-special",
    ]);
});

test.each([
    ["url-cleanup", "url-cleanup"],
    ["site-cleanup", "url-cleanup"],
    ["url-normalization", "url-cleanup"],
    ["media-url-cleanup", "url-cleanup"],
    ["direct-link", "redirect"],
    ["provider-override", "redirect"],
    ["media-quality", "request-transform"],
    ["request-blocking", "block-allow"],
    ["privacy-embed", "privacy-special"],
    ["special-mode", "privacy-special"],
    ["future-unknown-behavior", "privacy-special"],
])("catalog behavior %s maps to %s", (behavior, expected) => {
    expect(catalogCategoryForEntry({ behavior })).toBe(expected);
});
