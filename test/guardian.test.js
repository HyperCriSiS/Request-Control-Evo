import { jest } from "@jest/globals";
import { CompatibilityGuardian, MAX_GUARDIAN_EVENTS } from "../src/main/guardian.js";

function fakeEvent() {
    const listeners = new Set();
    return {
        listeners,
        addListener: jest.fn((listener) => listeners.add(listener)),
        removeListener: jest.fn((listener) => listeners.delete(listener)),
    };
}

function fakeWebRequest() {
    return {
        onErrorOccurred: fakeEvent(),
        onCompleted: fakeEvent(),
    };
}

test("guardian listeners exist only while an on-demand session is active", () => {
    const webRequest = fakeWebRequest();
    const guardian = new CompatibilityGuardian({ webRequest });

    expect(webRequest.onErrorOccurred.addListener).not.toHaveBeenCalled();
    expect(webRequest.onCompleted.addListener).not.toHaveBeenCalled();

    guardian.start(7);
    expect(webRequest.onErrorOccurred.addListener).toHaveBeenCalledTimes(1);
    expect(webRequest.onCompleted.addListener).toHaveBeenCalledTimes(1);

    guardian.stop(7);
    expect(webRequest.onErrorOccurred.removeListener).toHaveBeenCalledTimes(1);
    expect(webRequest.onCompleted.removeListener).toHaveBeenCalledTimes(1);
    expect(guardian.status(7)).toBeNull();
});

test("guardian scores request and HTTP failures for only the selected tab", () => {
    const webRequest = fakeWebRequest();
    let now = 1000;
    const guardian = new CompatibilityGuardian({ webRequest, now: () => now });
    guardian.start(12);

    guardian.onError({ tabId: 12, type: "main_frame", url: "https://example.test/", error: "NS_ERROR_FAILURE", timeStamp: 1 });
    guardian.onError({ tabId: 12, type: "script", url: "https://cdn.test/app.js", error: "NS_ERROR_FAILURE", timeStamp: 2 });
    guardian.onCompleted({ tabId: 12, type: "xmlhttprequest", url: "https://api.test/a", statusCode: 503, timeStamp: 3 });
    guardian.onCompleted({ tabId: 12, type: "image", url: "https://img.test/missing", statusCode: 404, timeStamp: 4 });
    guardian.onError({ tabId: 99, type: "main_frame", url: "https://other.test/", error: "ignored", timeStamp: 5 });

    now = 2000;
    expect(guardian.status(12)).toMatchObject({
        active: true,
        durationMs: 1000,
        score: 66,
        counts: {
            mainFrameErrors: 1,
            subresourceErrors: 1,
            serverFailures: 1,
            clientFailures: 1,
        },
    });
});

test("guardian bounds retained diagnostic events and auto-expires sessions", () => {
    const webRequest = fakeWebRequest();
    let expire;
    const guardian = new CompatibilityGuardian({
        webRequest,
        setTimer: (callback) => {
            expire = callback;
            return 1;
        },
        clearTimer: jest.fn(),
    });
    guardian.start(3);

    for (let index = 0; index < MAX_GUARDIAN_EVENTS + 20; index += 1) {
        guardian.onError({ tabId: 3, type: "script", url: `https://example.test/${index}`, timeStamp: index });
    }
    expect(guardian.sessions.get(3).errors).toHaveLength(MAX_GUARDIAN_EVENTS);

    expire();
    expect(guardian.status(3)).toBeNull();
    expect(webRequest.onErrorOccurred.listeners.size).toBe(0);
    expect(webRequest.onCompleted.listeners.size).toBe(0);
});

test("guardian message API validates tabs and keeps unrelated runtime messages untouched", async () => {
    const guardian = new CompatibilityGuardian({ webRequest: fakeWebRequest() });
    expect(guardian.handleMessage({ namespace: "inspection", action: "start", tabId: 1 })).toBeUndefined();
    await expect(guardian.handleMessage({ namespace: "guardian", action: "start", tabId: -1 })).resolves.toEqual({ error: "invalid-tab" });
});

test("guardian only flags rule breakage when the exact affected request also fails", () => {
    const guardian = new CompatibilityGuardian({ webRequest: fakeWebRequest() });
    guardian.start(21);

    guardian.recordRuleEffect(
        { tabId: 21, requestId: "req-1", url: "https://cdn.example.test/app.js", timeStamp: 10 },
        { action: "block", rule: { uuid: "rule-1", title: "Block app" } }
    );
    guardian.recordRuleEffect(
        { tabId: 21, requestId: "req-2", url: "https://img.example.test/logo.png", timeStamp: 11 },
        { action: "filter", rule: { uuid: "rule-2", title: "Filter logo" } }
    );
    guardian.onError({
        tabId: 21,
        requestId: "req-1",
        type: "script",
        url: "https://cdn.example.test/app.js",
        error: "NS_ERROR_FAILURE",
        timeStamp: 12,
    });
    guardian.onError({
        tabId: 21,
        requestId: "unrelated",
        type: "image",
        url: "https://img.example.test/other.png",
        error: "NS_ERROR_FAILURE",
        timeStamp: 13,
    });

    const report = guardian.status(21);
    expect(report.counts.ruleModified).toBe(2);
    expect(report.ruleSuspects).toEqual([
        expect.objectContaining({
            requestId: "req-1",
            action: "block",
            failures: 1,
            rule: expect.objectContaining({ uuid: "rule-1" }),
        }),
    ]);
});

test("guardian correlates Referer changes with failures on the same target host only", () => {
    const guardian = new CompatibilityGuardian({ webRequest: fakeWebRequest() });
    guardian.start(22);
    guardian.recordReferrerEffect(
        { tabId: 22, requestId: "ref-1", timeStamp: 20 },
        { kind: "referrer-protection", targetHost: "login.example.test", effect: "removed", mode: "no-referrer" }
    );
    guardian.onCompleted({
        tabId: 22,
        requestId: "ref-1",
        type: "xmlhttprequest",
        url: "https://login.example.test/session",
        statusCode: 403,
        timeStamp: 21,
    });
    guardian.onCompleted({
        tabId: 22,
        requestId: "other",
        type: "image",
        url: "https://unrelated.test/missing",
        statusCode: 404,
        timeStamp: 22,
    });

    expect(guardian.status(22).referrerSuspects).toEqual([
        expect.objectContaining({
            targetHost: "login.example.test",
            referrerRemoved: 1,
            failures: 1,
        }),
    ]);
});