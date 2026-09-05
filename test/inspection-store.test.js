import { InspectionStore } from "../src/main/inspection/store.js";

test("inspection store records requests and correlates rule effects", () => {
    const store = new InspectionStore();
    store.start(12, { pageUrl: "https://example.com/", title: "Example" });
    store.markEffect(12, "request-1", {
        action: "block",
        rule: { uuid: "rule-1", title: "Block tracker" },
    });
    store.capture({
        tabId: 12,
        requestId: "request-1",
        url: "https://tracker.test/pixel",
        method: "GET",
        type: "image",
        frameId: 0,
        timeStamp: 10,
    });
    store.markFinished(12, "request-1", { status: "completed", statusCode: 204 });

    const snapshot = store.snapshot(12);
    expect(snapshot.active).toBe(true);
    expect(snapshot.requests).toHaveLength(1);
    expect(snapshot.requests[0]).toMatchObject({
        requestId: "request-1",
        status: "completed",
        statusCode: 204,
        effect: {
            action: "block",
            rule: { uuid: "rule-1", title: "Block tracker" },
        },
    });
});

test("inspection store enforces a bounded in-memory request snapshot", () => {
    const store = new InspectionStore(1);
    store.start(3, { pageUrl: "https://example.com/" });
    store.capture({ tabId: 3, requestId: "1", url: "https://example.com/a", type: "script" });
    store.capture({ tabId: 3, requestId: "2", url: "https://example.com/b", type: "script" });

    expect(store.snapshot(3)).toMatchObject({
        dropped: 1,
        requests: [{ requestId: "1" }],
    });
});

test("stopping a session prevents new requests while preserving the snapshot", () => {
    const store = new InspectionStore();
    store.start(5, { pageUrl: "https://example.com/" });
    store.capture({ tabId: 5, requestId: "1", url: "https://example.com/a", type: "script" });
    store.stop(5);
    store.capture({ tabId: 5, requestId: "2", url: "https://example.com/b", type: "script" });

    expect(store.snapshot(5)).toMatchObject({
        active: false,
        requests: [{ requestId: "1" }],
    });
});

test("stopping a session clears and rejects pending rule effects", () => {
    const store = new InspectionStore(2);
    store.start(5, { pageUrl: "https://example.com/" });
    store.markEffect(5, "pending-before-stop", { action: "block" });
    expect(store.sessions.get(5).pendingEffects.size).toBe(1);

    store.stop(5);
    store.markEffect(5, "pending-after-stop", { action: "redirect" });

    expect(store.sessions.get(5).pendingEffects.size).toBe(0);
});

test("pending effects cannot exceed or outlive the request cap", () => {
    const store = new InspectionStore(1);
    store.start(8, { pageUrl: "https://example.com/" });
    store.markEffect(8, "request-1", { action: "block" });
    store.markEffect(8, "request-2", { action: "redirect" });

    expect([...store.sessions.get(8).pendingEffects.keys()]).toEqual(["request-1"]);

    store.capture({ tabId: 8, requestId: "request-1", url: "https://example.com/a", type: "script" });
    store.markEffect(8, "request-2", { action: "redirect" });
    store.capture({ tabId: 8, requestId: "request-2", url: "https://example.com/b", type: "script" });

    expect(store.sessions.get(8).pendingEffects.size).toBe(0);
    expect(store.snapshot(8)).toMatchObject({
        dropped: 1,
        requests: [{ requestId: "request-1", effect: { action: "block" } }],
    });
});

test("pending diagnostics stay bounded per request and are released by capture or stop", () => {
    const store = new InspectionStore(2);
    store.start(21, { pageUrl: "https://example.com/" });

    for (let i = 0; i < 32; i += 1) {
        store.markDiagnostic(21, "request-1", {
            kind: "referer",
            effect: "trimmed",
            mode: "balanced",
            targetHost: `target-${i}.example`,
        });
    }

    const pending = store.sessions.get(21).pendingDiagnostics.get("request-1");
    expect(pending).toHaveLength(16);

    store.capture({
        tabId: 21,
        requestId: "request-1",
        url: "https://example.com/a",
        type: "script",
    });

    expect(store.sessions.get(21).pendingDiagnostics.size).toBe(0);
    expect(store.snapshot(21).requests[0].diagnostics).toHaveLength(16);

    store.markDiagnostic(21, "request-2", {
        kind: "referer",
        effect: "removed",
        mode: "same-origin",
        targetHost: "other.example",
    });
    expect(store.sessions.get(21).pendingDiagnostics.size).toBe(1);

    store.stop(21);
    store.markDiagnostic(21, "request-3", {
        kind: "referer",
        effect: "removed",
        mode: "no-referrer",
        targetHost: "ignored.example",
    });

    expect(store.sessions.get(21).pendingDiagnostics.size).toBe(0);
});
