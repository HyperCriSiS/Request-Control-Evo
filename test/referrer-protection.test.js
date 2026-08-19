import { jest } from "@jest/globals";
import {
    applyReferrerProtection,
    effectiveReferrerProtectionMode,
    ReferrerProtection,
} from "../src/main/referrer-protection.js";

function details(referer, url = "https://target.test/resource") {
    return {
        url,
        requestHeaders: [
            { name: "Accept", value: "*/*" },
            { name: "Referer", value: referer },
        ],
    };
}

function referrerValue(result) {
    return result?.requestHeaders?.find((header) => header.name.toLowerCase() === "referer")?.value;
}

test("browser-default mode never changes request headers", () => {
    expect(applyReferrerProtection(details("https://source.test/path?q=1"), "browser")).toBeUndefined();
});

test("global disable always resolves to browser-default referrer behavior", () => {
    expect(effectiveReferrerProtectionMode("balanced", true)).toBe("browser");
    expect(effectiveReferrerProtectionMode("same-origin", true)).toBe("browser");
    expect(effectiveReferrerProtectionMode("no-referrer", true)).toBe("browser");
    expect(effectiveReferrerProtectionMode("balanced", false)).toBe("balanced");
    expect(effectiveReferrerProtectionMode("invalid", false)).toBe("browser");
});

test("balanced mode preserves same-origin detail and reduces cross-origin referrers to origin", () => {
    expect(
        applyReferrerProtection(
            details("https://target.test/page?q=1", "https://target.test/resource"),
            "balanced"
        )
    ).toBeUndefined();

    const crossOrigin = applyReferrerProtection(
        details("https://source.test/page?q=1", "https://target.test/resource"),
        "balanced"
    );
    expect(referrerValue(crossOrigin)).toBe("https://source.test/");
});

test("balanced mode suppresses HTTPS-to-HTTP downgrade referrers", () => {
    const result = applyReferrerProtection(
        details("https://source.test/private", "http://target.test/resource"),
        "balanced"
    );
    expect(referrerValue(result)).toBeUndefined();
    expect(result.requestHeaders).toHaveLength(1);
});

test("same-origin and no-referrer modes remove the expected Referer headers", () => {
    const crossOrigin = applyReferrerProtection(details("https://source.test/path"), "same-origin");
    expect(referrerValue(crossOrigin)).toBeUndefined();

    expect(
        applyReferrerProtection(
            details("https://target.test/page", "https://target.test/resource"),
            "same-origin"
        )
    ).toBeUndefined();

    const none = applyReferrerProtection(
        details("https://target.test/page", "https://target.test/resource"),
        "no-referrer"
    );
    expect(referrerValue(none)).toBeUndefined();
});

test("restrictive modes remove duplicate and malformed Referer headers", () => {
    const duplicateHeaders = {
        url: "https://target.test/resource",
        requestHeaders: [
            { name: "Referer", value: "https://source.test/private" },
            { name: "referer", value: "https://other.test/private" },
            { name: "Accept", value: "*/*" },
        ],
    };
    const none = applyReferrerProtection(duplicateHeaders, "no-referrer");
    expect(none.requestHeaders).toEqual([{ name: "Accept", value: "*/*" }]);

    const malformed = applyReferrerProtection(details("not a valid URL"), "same-origin");
    expect(referrerValue(malformed)).toBeUndefined();
    expect(malformed.requestHeaders).toHaveLength(1);
});

test("browser-default mode registers no header listener and switching back removes it", () => {
    const listeners = new Set();
    const onBeforeSendHeaders = {
        addListener: jest.fn((listener) => listeners.add(listener)),
        removeListener: jest.fn((listener) => listeners.delete(listener)),
    };
    const protection = new ReferrerProtection({ onBeforeSendHeaders });

    protection.configure("browser");
    expect(onBeforeSendHeaders.addListener).not.toHaveBeenCalled();

    protection.configure("balanced");
    expect(onBeforeSendHeaders.addListener).toHaveBeenCalledTimes(1);
    expect(listeners.size).toBe(1);

    protection.configure("same-origin");
    expect(onBeforeSendHeaders.addListener).toHaveBeenCalledTimes(1);

    protection.configure("browser");
    expect(onBeforeSendHeaders.removeListener).toHaveBeenCalledTimes(1);
    expect(listeners.size).toBe(0);
});
