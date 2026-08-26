import { InspectionCaptureRuntime } from "../src/main/inspection/runtime.js";
import { InspectionStore } from "../src/main/inspection/store.js";

function event() {
    const listeners = new Set();
    return {
        addListener(fn) { listeners.add(fn); },
        removeListener(fn) { listeners.delete(fn); },
        emit(payload) { for (const fn of [...listeners]) fn(payload); },
        get size() { return listeners.size; },
    };
}

test("Inspection runtime performs a real start -> capture -> finish -> stop lifecycle", () => {
    const before = event();
    const completed = event();
    const failed = event();
    const store = new InspectionStore();
    const runtime = new InspectionCaptureRuntime({
        store,
        webRequest: { onBeforeRequest: before, onCompleted: completed, onErrorOccurred: failed },
    });

    const started = runtime.start(7, { pageUrl: "https://example.test/", title: "Example" });
    expect(started.active).toBe(true);
    expect(before.size).toBe(1);
    expect(completed.size).toBe(1);
    expect(failed.size).toBe(1);

    before.emit({
        tabId: 7, requestId: "request-1", url: "https://cdn.example.test/app.js",
        method: "GET", type: "script", frameId: 0, timeStamp: 10,
    });
    completed.emit({ tabId: 7, requestId: "request-1", statusCode: 200 });

    const captured = runtime.get(7);
    expect(captured.requests).toHaveLength(1);
    expect(captured.requests[0]).toMatchObject({
        requestId: "request-1", status: "completed", statusCode: 200,
    });

    const stopped = runtime.stop(7);
    expect(stopped.active).toBe(false);
    expect(before.size).toBe(0);
    expect(completed.size).toBe(0);
    expect(failed.size).toBe(0);
});

test("Inspection runtime records request errors and keeps listeners while another session is active", () => {
    const before = event();
    const completed = event();
    const failed = event();
    const runtime = new InspectionCaptureRuntime({
        store: new InspectionStore(),
        webRequest: { onBeforeRequest: before, onCompleted: completed, onErrorOccurred: failed },
    });
    runtime.start(1, { pageUrl: "https://one.test/" });
    runtime.start(2, { pageUrl: "https://two.test/" });
    before.emit({ tabId: 2, requestId: "broken", url: "https://two.test/api", type: "xmlhttprequest" });
    failed.emit({ tabId: 2, requestId: "broken", error: "NS_ERROR_FAILURE" });
    expect(runtime.get(2).requests[0]).toMatchObject({ status: "error", error: "NS_ERROR_FAILURE" });
    runtime.stop(1);
    expect(before.size).toBe(1);
    runtime.stop(2);
    expect(before.size).toBe(0);
});
