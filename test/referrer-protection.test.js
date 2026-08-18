import { jest } from "@jest/globals";
import {
    applyReferrerProtection,
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
