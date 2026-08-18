import { compileRuleToDnr } from "../src/main/backends/dnr/compiler.js";

test("top-level source scoping remains explicit instead of being approximated in DNR", () => {
    const result = compileRuleToDnr({
        uuid: "source-scoped",
        active: true,
        action: "block",
        pattern: {
            scheme: "*",
            host: ["tracker.test"],
            path: ["*"],
            source: ["*://example.com/*"],
        },
    });

    expect(result.status).toBe("unsupported");
    expect(result.rules).toEqual([]);
    expect(result.diagnostics.map(({ code }) => code)).toContain("source-matcher-unsupported");
});
