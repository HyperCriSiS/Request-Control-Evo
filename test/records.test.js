import * as records from "../src/util/records.js";

beforeEach(() => {
    records.clear();
    globalThis.browser = {
        tabs: {
            query: async () => [{ id: 1 }],
        },
    };
});

afterEach(() => {
    delete globalThis.browser;
});

test("tab records retain only the newest bounded entries while preserving the total count", async () => {
    let count = 0;
    for (let index = 0; index < records.MAX_TAB_RECORDS + 3; index++) {
        count = records.add(1, { index });
    }

    const stored = await records.getTabRecords();
    expect(count).toBe(records.MAX_TAB_RECORDS + 3);
    expect(stored).toHaveLength(records.MAX_TAB_RECORDS);
    expect(stored[0]).toEqual({ index: 3 });
    expect(stored.at(-1)).toEqual({ index: records.MAX_TAB_RECORDS + 2 });
});

test("redirect-chain lookup works across the bounded buffer", () => {
    records.add(1, { url: "https://a.example/", target: "https://b.example/" });
    records.add(1, { url: "https://b.example/", target: "https://c.example/" });
    records.add(1, { url: "https://noise.example/", target: null });

    expect(records.getLastRedirectRecords(1, "https://c.example/")).toEqual([
        { url: "https://a.example/", target: "https://b.example/" },
        { url: "https://b.example/", target: "https://c.example/" },
    ]);
});

test("clearing and removing tab records release their buffers", async () => {
    records.add(1, { index: 1 });
    expect(records.has(1)).toBe(true);
    records.removeTabRecords(1);
    expect(records.has(1)).toBe(false);
    expect(await records.getTabRecords()).toBeUndefined();

    records.add(1, { index: 2 });
    records.clear();
    expect(records.has(1)).toBe(false);
});
