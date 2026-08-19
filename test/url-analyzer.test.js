import {
    analyzeUrl,
    analyzeUrlSamples,
    CONSERVATIVE_PARAMETER_PATTERNS,
    matchParameterPattern,
    suggestParameterActions,
    suggestSafeRedirectActions,
} from "../src/main/analysis/url-analyzer.js";

test("analyzeUrl splits URL components and query parameters", () => {
    const result = analyzeUrl("https://example.com:8443/path?q=test&utm_source=news#section");

    expect(result.valid).toBe(true);
    expect(result.hostname).toBe("example.com");
    expect(result.port).toBe("8443");
    expect(result.pathname).toBe("/path");
    expect(result.hash).toBe("#section");
    expect(result.queryParameters.map(({name}) => name)).toEqual(["q", "utm_source"]);
});

test("analyzeUrl identifies an encoded nested URL without changing the input", () => {
    const target = "https://destination.example/article?id=42";
    const input = `https://redirect.example/?url=${encodeURIComponent(target)}&source=mail`;
    const result = analyzeUrl(input);

    expect(result.href).toBe(input);
    expect(result.queryParameters[0].nestedUrl).toBe(target);
});

test("analyzeUrl handles invalid input as analyzer data instead of throwing", () => {
    expect(analyzeUrl("not a URL")).toEqual({
        input: "not a URL",
        valid: false,
        error: "invalid-url",
    });
});

test("analyzeUrlSamples reports varying and constant query parameters", () => {
    const result = analyzeUrlSamples([
        "https://example.com/item?id=1&utm_source=a",
        "https://example.com/item?id=2&utm_source=a",
    ]);

    expect(result.sameHostname).toBe(true);
    expect(result.samePathname).toBe(true);
    expect(result.parameters.find(({name}) => name === "id")).toMatchObject({
        presentInAll: true,
        distinctValues: 2,
        constant: false,
    });
    expect(result.parameters.find(({name}) => name === "utm_source")).toMatchObject({
        presentInAll: true,
        distinctValues: 1,
        constant: true,
    });
});

test("matchParameterPattern supports current wildcard-style parameter patterns", () => {
    expect(matchParameterPattern("utm_source", "utm_*")).toBe(true);
    expect(matchParameterPattern("ref_campaign", "ref_*")).toBe(true);
    expect(matchParameterPattern("reference", "ref_*")).toBe(false);
});

test("suggestParameterActions combines catalog matches and nested URL detection", () => {
    const target = "https://destination.example/article";
    const result = analyzeUrl(
        `https://redirect.example/?url=${encodeURIComponent(target)}&utm_campaign=test&id=42`
    );

    expect(suggestParameterActions(result, ["utm_*"])).toEqual([
        {
            type: "unwrap-query-parameter",
            parameter: "url",
            targetUrl: target,
            confidence: "structural",
        },
        {
            type: "remove-query-parameter",
            parameter: "utm_campaign",
            matchedPattern: "utm_*",
            confidence: "catalog",
        },
    ]);
});

test("local analyzer heuristics suggest only unambiguous tracking parameters", () => {
    const result = analyzeUrl(
        "https://example.com/article?utm_source=news&fbclid=facebook&gclid=google&yclid=yandex" +
        "&ref_id=needed&referrer=needed&id=42"
    );

    expect(suggestParameterActions(result, CONSERVATIVE_PARAMETER_PATTERNS).map(({ parameter }) => parameter)).toEqual([
        "utm_source",
        "fbclid",
        "gclid",
        "yclid",
    ]);
});

test("suggestSafeRedirectActions separates structural detection from redirect safety", () => {
    const safe = analyzeUrl(
        `https://redirect.example/?url=${encodeURIComponent("https://destination.example/article")}`
    );
    expect(suggestSafeRedirectActions(safe)[0]).toMatchObject({
        type: "unwrap-query-parameter",
        autoSuggest: true,
        safety: {safe: true, level: "safe"},
    });

    const downgrade = analyzeUrl(
        `https://redirect.example/?url=${encodeURIComponent("http://destination.example/article")}`
    );
    expect(suggestSafeRedirectActions(downgrade)[0]).toMatchObject({
        autoSuggest: false,
        safety: {safe: false, level: "blocked", reasons: ["https-to-http-downgrade"]},
    });
});
