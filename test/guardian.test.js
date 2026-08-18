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
