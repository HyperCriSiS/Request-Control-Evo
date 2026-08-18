import { createRequestFilters } from "../src/main/api.js";

function matcher() {
    const [filter] = createRequestFilters({
        uuid: "source-rule",
        action: "block",
        pattern: {
            allUrls: true,
            source: ["*://news.example.com/*"],
        },
    });
    return filter.matcher;
}

test("source matcher prefers the tracked top-level URL", () => {
    expect(
        matcher().test({
            topLevelUrl: "https://news.example.com/article",
            documentUrl: "https://iframe.other.test/frame",
            originUrl: "https://iframe.other.test/frame",
            url: "https://tracker.test/pixel",
        })
    ).toBe(true);
});

test("source matcher rejects a different top-level site", () => {
    expect(
        matcher().test({
            topLevelUrl: "https://other.example.com/article",
            originUrl: "https://news.example.com/article",
            url: "https://tracker.test/pixel",
        })
    ).toBe(false);
});

test("source matcher falls back to document/origin URL when top-level context is unavailable", () => {
    expect(
        matcher().test({
            documentUrl: "https://news.example.com/article",
            url: "https://tracker.test/pixel",
        })
    ).toBe(true);
});
