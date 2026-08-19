import { fetchWithTimeout } from "../src/main/remote-fetch.js";

test("remote fetch preserves options and clears its timeout after success", async () => {
    const response = { ok: true };
    const fetchImpl = jest.fn(async (_input, init) => {
        expect(init.cache).toBe("no-store");
        expect(init.signal).toBeInstanceOf(AbortSignal);
        return response;
    });
    const clearTimer = jest.fn();

    await expect(fetchWithTimeout("https://example.test/catalog.json", { cache: "no-store" }, {
        fetchImpl,
        setTimer: () => 42,
        clearTimer,
    })).resolves.toBe(response);
    expect(clearTimer).toHaveBeenCalledWith(42);
});

test("remote fetch aborts and reports a bounded timeout", async () => {
    const fetchImpl = jest.fn(async (_input, { signal }) => {
        expect(signal.aborted).toBe(true);
        const error = new Error("aborted");
        error.name = "AbortError";
        throw error;
    });

    await expect(fetchWithTimeout("https://example.test/rules.json", {}, {
        timeoutMs: 25,
        fetchImpl,
        setTimer: (callback) => {
            callback();
            return 7;
        },
        clearTimer: jest.fn(),
    })).rejects.toMatchObject({
        name: "TimeoutError",
        message: "Remote request timed out after 25 ms.",
    });
});
