import { clearRuntimeState, reconcileListener } from "../src/main/background-lifecycle.js";

function permissiveEvent() {
    const listeners = [];
    return {
        addListener(listener) {
            listeners.push(listener);
        },
        removeListener(listener) {
            let index;
            while ((index = listeners.indexOf(listener)) !== -1) {
                listeners.splice(index, 1);
            }
        },
        count(listener) {
            return listeners.filter((entry) => entry === listener).length;
        },
    };
}

test("listener reconciliation stays idempotent across repeated enable and disable cycles", () => {
    const event = permissiveEvent();
    const listener = () => {};

    reconcileListener(event, listener, true);
    reconcileListener(event, listener, true);
    expect(event.count(listener)).toBe(1);

    reconcileListener(event, listener, false);
    expect(event.count(listener)).toBe(0);

    reconcileListener(event, listener, true);
    expect(event.count(listener)).toBe(1);
});

test("disabling clears all mutable background runtime state", () => {
    const cleared = [];
    clearRuntimeState({
        records: { clear: () => cleared.push("records") },
        controller: { requests: { clear: () => cleared.push("requests") } },
        navigation: { clear: () => cleared.push("navigation") },
        topLevelUrls: { clear: () => cleared.push("top-level-urls") },
    });

    expect(cleared).toEqual(["records", "requests", "navigation", "top-level-urls"]);
});
