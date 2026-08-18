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
