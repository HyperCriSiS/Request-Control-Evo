import fs from "fs";
import path from "path";

import { ALL_URLS, createMatchPatterns, createRequestMatcher } from "../src/main/api";
import { RedirectRule } from "../src/main/rules/redirect";

function getRule(file, uuid) {
    const rules = JSON.parse(fs.readFileSync(path.join("./rules", file), "utf8"));
    const rule = rules.find((item) => item.uuid === uuid);
    expect(rule).toBeDefined();
    return rule;
}

function apply(file, uuid, requestUrl) {
    return new RedirectRule(getRule(file, uuid)).apply(requestUrl);
}

describe("bundled showcase redirect rules", () => {
    test("YouTube embeds use the privacy-enhanced host", () => {
        expect(
            apply(
                "privacy-enhanced-embeds.json",
                "0e96a9c8-0a07-4d28-8a4b-4ea4a6e8db01",
                "https://www.youtube.com/embed/dQw4w9WgXcQ?start=42"
            )
        ).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=42");
    });

    test("Vimeo embeds preserve parameters and add dnt=1", () => {
        expect(
            apply(
                "privacy-enhanced-embeds.json",
                "0e96a9c8-0a07-4d28-8a4b-4ea4a6e8db02",
                "https://player.vimeo.com/video/76979871?h=abc123&autoplay=1"
            )
        ).toBe("https://player.vimeo.com/video/76979871?h=abc123&autoplay=1&dnt=1");
    });

    test("GitHub blob URLs become raw.githubusercontent.com URLs", () => {
        expect(
            apply(
                "developer-direct-raw.json",
                "aa3c7f92-b55f-4ca8-bf95-0a566667a101",
                "https://github.com/user/repo/blob/main/config/settings.json"
            )
        ).toBe("https://raw.githubusercontent.com/user/repo/main/config/settings.json");
    });

    test("GitLab blob URLs become raw URLs", () => {
        expect(
            apply(
                "developer-direct-raw.json",
                "aa3c7f92-b55f-4ca8-bf95-0a566667a102",
                "https://gitlab.com/user/repo/-/blob/main/config/settings.json"
            )
        ).toBe("https://gitlab.com/user/repo/-/raw/main/config/settings.json");
    });

    test("Wikimedia thumbnails become original media URLs", () => {
        expect(
            apply(
                "media-original-quality.json",
                "5e638b8f-b217-4753-84a7-e124c4e5b201",
                "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Example.jpg/320px-Example.jpg"
            )
        ).toBe("https://upload.wikimedia.org/wikipedia/commons/a/a9/Example.jpg");
    });

    test("X/Twitter direct media URLs request name=orig", () => {
        expect(
            apply(
                "media-original-quality.json",
                "5e638b8f-b217-4753-84a7-e124c4e5b203",
                "https://pbs.twimg.com/media/FMLs7T9akAIadL_?format=jpg&name=small"
            )
        ).toBe("https://pbs.twimg.com/media/FMLs7T9akAIadL_?format=jpg&name=orig");
    });

    test.each([
        [
            "Google",
            "6ae5eac8-1c44-4a6f-ac2c-7d8a4ac90301",
            "https://www.google.com/search?q=request%20control&source=hp",
        ],
        [
            "Bing",
            "6ae5eac8-1c44-4a6f-ac2c-7d8a4ac90302",
            "https://www.bing.com/search?q=request%20control&form=QBLH",
        ],
    ])("%s search escapes to DuckDuckGo", (_name, uuid, requestUrl) => {
        expect(apply("search-engine-escape.json", uuid, requestUrl)).toBe(
            "https://duckduckgo.com/?q=request%20control"
        );
    });

    test("Google outbound wrapper extracts the destination", () => {
        expect(
            apply(
                "privacy-aggressive-direct-links.json",
                "d15b7761-ad89-41b5-aa86-a525a9af0401",
                "https://www.google.com/url?q=https%3A%2F%2Fexample.com%2Fa%3Fx%3D1&sa=D"
            )
        ).toBe("https://example.com/a?x=1");
    });

    test("Facebook link shim extracts the destination", () => {
        expect(
            apply(
                "privacy-aggressive-direct-links.json",
                "d15b7761-ad89-41b5-aa86-a525a9af0402",
                "https://www.facebook.com/l.php?u=https%3A%2F%2Fexample.com%2Ffoo&h=abc"
            )
        ).toBe("https://example.com/foo");
    });

    test("Microsoft Safe Links extracts the destination", () => {
        expect(
            apply(
                "privacy-aggressive-direct-links.json",
                "d15b7761-ad89-41b5-aa86-a525a9af0403",
                "https://nam01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fexample.com%2Fa%3Fx%3D1%26y%3D2&data=abc"
            )
        ).toBe("https://example.com/a?x=1&y=2");
    });

    test("Reddit media wrapper extracts the destination", () => {
        expect(
            apply(
                "privacy-aggressive-direct-links.json",
                "d15b7761-ad89-41b5-aa86-a525a9af0404",
                "https://www.reddit.com/media?url=https%3A%2F%2Fpreview.redd.it%2Fabc.jpg%3Fwidth%3D1080%26format%3Dpjpg&rdt=123"
            )
        ).toBe("https://preview.redd.it/abc.jpg?width=1080&format=pjpg");
    });

    test("Steam Community link filter extracts the destination", () => {
        expect(
            apply(
                "privacy-aggressive-direct-links.json",
                "d15b7761-ad89-41b5-aa86-a525a9af0405",
                "https://steamcommunity.com/linkfilter/?url=https%3A%2F%2Fexample.com%2Ffoo%3Fx%3D1"
            )
        ).toBe("https://example.com/foo?x=1");
    });

    test.each([
        [
            "81275835-2604-42f3-a7a2-1c4e67230501",
            "https://en.m.wikipedia.org/wiki/Request_Control?oldformat=true",
            "https://en.wikipedia.org/wiki/Request_Control?oldformat=true",
        ],
        [
            "81275835-2604-42f3-a7a2-1c4e67230502",
            "https://de.m.wikipedia.org/wiki/Firefox",
            "https://de.wikipedia.org/wiki/Firefox",
        ],
        [
            "81275835-2604-42f3-a7a2-1c4e67230503",
            "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        ],
    ])("canonical desktop rule %s preserves the requested path", (uuid, requestUrl, expected) => {
        expect(apply("web-canonical-desktop.json", uuid, requestUrl)).toBe(expected);
    });
});

describe("bundled showcase matcher rules", () => {
    test("Strict First-Party Mode ships disabled and only matches third-party registrable domains", () => {
        const rule = getRule(
            "special-first-party-firewall.json",
            "64c0f201-4871-48cb-9681-5d64bcaa0701"
        );
        expect(rule.active).toBe(false);
        expect(rule.title).toBe("Strict First-Party Mode");
        expect(rule.description).toMatch(/^WARNING:/);
        const matcher = createRequestMatcher(rule.pattern);

        expect(
            matcher.test({
                originUrl: "https://www.example.com/page",
                url: "https://cdn.example.com/app.js",
            })
        ).toBe(false);
        expect(
            matcher.test({
                originUrl: "https://www.example.com/page",
                url: "https://cdn.other.net/app.js",
            })
        ).toBe(true);
        expect(matcher.test({ url: "https://other.net/" })).toBe(false);
    });

    test("Text-First rules use the all-URLs matcher and distinct resource types", () => {
        const rules = JSON.parse(
            fs.readFileSync(path.join("./rules", "special-text-first-low-bandwidth.json"), "utf8")
        );
        expect(rules.map((rule) => createMatchPatterns(rule.pattern))).toEqual([
            [ALL_URLS],
            [ALL_URLS],
            [ALL_URLS],
        ]);
        expect(rules.map((rule) => rule.types)).toEqual([["image"], ["media"], ["font"]]);
    });
});
