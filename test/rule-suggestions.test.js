import { analyzeUrl } from "../src/main/analysis/url-analyzer.js";
import { buildSuggestedFilterRule } from "../src/main/analysis/rule-suggestions.js";

test("buildSuggestedFilterRule creates a disabled, scoped parameter filter", () => {
    const analysis = analyzeUrl("https://example.com/article?id=7&utm_source=x");
    const rule = buildSuggestedFilterRule(
        analysis,
        [{ type: "remove-query-parameter", parameter: "utm_source" }],
        "uuid-1"
    );

    expect(rule).toMatchObject({
        uuid: "uuid-1",
        action: "filter",
        active: false,
        pattern: { scheme: "https", host: ["example.com"], path: ["/article*"] },
        paramsFilter: { values: ["utm_source"] },
        skipRedirectionFilter: true,
    });
    expect(rule.group).toBeUndefined();
    expect(rule.tag).toBeUndefined();
});

test("buildSuggestedFilterRule keeps redirect parsing enabled for unwrap suggestions", () => {
    const analysis = analyzeUrl("https://redirect.example/out?url=https%3A%2F%2Fexample.com");
    const rule = buildSuggestedFilterRule(
        analysis,
        [{ type: "unwrap-query-parameter", parameter: "url" }],
        "uuid-2"
    );

    expect(rule.skipRedirectionFilter).toBeUndefined();
    expect(rule.paramsFilter).toBeUndefined();
});
