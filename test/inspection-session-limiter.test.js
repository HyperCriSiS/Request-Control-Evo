import { jest } from "@jest/globals";
import {
    InspectionSessionLimiter,
    MAX_INSPECTION_SESSION_MS,
} from "../src/main/inspection/session-limiter.js";

test("inspection sessions expire after the bounded maximum duration", () => {
    const timers = new Map();
    const onExpire = jest.fn();
    const limiter = new InspectionSessionLimiter({
        setTimer(callback, delay) {
            const id = timers.size + 1;
            timers.set(id, { callback, delay });
            return id;
        },
        clearTimer: (id) => timers.delete(id),
        onExpire,
    });

    limiter.start(7);
    expect([...timers.values()][0].delay).toBe(MAX_INSPECTION_SESSION_MS);
    timers.get(1).callback();

    expect(onExpire).toHaveBeenCalledWith(7);
    expect(limiter.timers.size).toBe(0);
});

test("restarting, stopping, and clearing inspection sessions release timers", () => {
    const timers = new Map();
    let nextId = 0;
    const limiter = new InspectionSessionLimiter({
        maxDurationMs: 100,
        setTimer(callback, delay) {
            const id = ++nextId;
            timers.set(id, { callback, delay });
            return id;
        },
        clearTimer: (id) => timers.delete(id),
    });

    limiter.start(1);
    limiter.start(1);
    expect(timers.size).toBe(1);
    expect(limiter.stop(1)).toBe(true);
    expect(limiter.stop(1)).toBe(false);
    expect(timers.size).toBe(0);

    limiter.start(1);
    limiter.start(2);
    limiter.clear();
    expect(timers.size).toBe(0);
    expect(limiter.timers.size).toBe(0);
});
