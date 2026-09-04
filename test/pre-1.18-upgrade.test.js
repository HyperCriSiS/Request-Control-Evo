import fs from "node:fs";

import { loadAndRepairStoredState } from "../src/main/storage-state.js";

const fixture = JSON.parse(
    fs.readFileSync(new URL("./fixtures/pre-1.18-storage.json", import.meta.url), "utf8")
);

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

test("real 1.17-style storage upgrades without rule, order, or local-edit loss", async () => {
    const writes = [];
    const storage = {
        async get(keys) {
            expect(keys).toEqual(["rules", "imports", "disabled"]);
            return clone(fixture);
        },
        async set(value) {
            writes.push(clone(value));
        },
    };

    const upgraded = await loadAndRepairStoredState(
        storage,
        ["rules", "imports", "disabled"]
    );

    expect(upgraded.disabled).toBe(true);
    expect(upgraded.imports).toEqual({});
    expect(upgraded.rules.map(({ uuid }) => uuid)).toEqual([
        "5276a290-b21a-4deb-a86e-aa54c3ff1bcc",
        "1123f3fd-fde5-4992-af96-c580c0f69186",
    ]);

    const [filterRule, whitelistRule] = upgraded.rules;
    expect(filterRule.active).toBe(false);
    expect(filterRule.paramsFilter.values).toContain("user_local_parameter");
    expect(filterRule.pattern.excludes).toEqual([
        "https://www.fbsbx.com/captcha/recaptcha/iframe/*",
    ]);
    expect(filterRule.tag).toBe("privacy-tracking-params");
    expect(filterRule.group).toBe("privacy-tracking-params");
    expect(filterRule.source).toBeUndefined();
    expect(filterRule.managed).toBeUndefined();

    expect(whitelistRule.action).toBe("whitelist");
    expect(whitelistRule.tag).toBe("privacy-tracking-params");
    expect(whitelistRule.group).toBe("privacy-tracking-params");
    expect(whitelistRule.source).toBeUndefined();

    expect(writes).toHaveLength(1);
    expect(writes[0].imports).toEqual({});
    expect(writes[0].rules).toEqual(upgraded.rules);
});
