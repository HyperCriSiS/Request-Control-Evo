import { filterEditorState, filterRuleSummaryParts } from "../src/options/filter-rule-ui.js";

test("Filter editor state is explicit and lossless for imported rule fields", () => {
    const rule = {
        paramsFilter: { values: ["utm_source", "fbclid"], invert: true },
        trimAllParams: false,
        skipRedirectionFilter: true,
        skipOnSameDomain: true,
        redirectDocument: true,
    };

    expect(filterEditorState(rule)).toEqual({
        params: ["utm_source", "fbclid"],
        invert: true,
        trimAll: false,
        filterRedirection: false,
        skipSameDomain: true,
        redirectDocument: true,
    });
    expect(rule.paramsFilter.values).toEqual(["utm_source", "fbclid"]);
});

test("Filter editor state resets every optional control when the next rule omits it", () => {
    expect(filterEditorState({})).toEqual({
        params: [],
        invert: false,
        trimAll: false,
        filterRedirection: true,
        skipSameDomain: false,
        redirectDocument: false,
    });
});

test("Filter collapsed summary exposes parameters and all behavior switches", () => {
    const labels = {
        analyzer_parameter_details: "Parameters",
        invert_trim: "Invert",
        filter_url_redirection: "Redirect filtering",
        skip_within_same_domain: "Same-domain skip",
        redirect_document_with_other_types: "Document redirect",
        trim_all: "All parameters",
    };
    const translate = (key, fallback) => labels[key] || fallback;
    const parts = filterRuleSummaryParts({
        paramsFilter: { values: ["utm_source", "fbclid"], invert: true },
        skipOnSameDomain: true,
    }, translate);

    expect(parts).toEqual([
        "Parameters: utm_source, fbclid",
        "Invert: ✓",
        "Redirect filtering: ✓",
        "Same-domain skip: ✓",
        "Document redirect: —",
    ]);
});

test("trim-all remains visible instead of being confused with an empty parameter list", () => {
    const parts = filterRuleSummaryParts({ trimAllParams: true }, (key, fallback) =>
        key === "trim_all" ? "All parameters" : fallback
    );
    expect(parts[0]).toBe("All parameters");
});
