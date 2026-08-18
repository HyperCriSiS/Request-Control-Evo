import {
    SOURCE_CAPABILITY,
    SOURCE_INTEGRATION,
    getSource,
    sourcesForCapability,
    validateSourceRegistry,
} from "../src/main/intelligence/source-registry.js";
import {assessRedirectCandidate, shouldAutoSuggestRedirect} from "../src/main/intelligence/redirect-safety.js";
import {
    OBSERVATORY_SCHEMA_VERSION,
    buildObservatorySnapshot,
    validateObservatorySnapshot,
} from "../src/main/intelligence/observatory-contract.js";

test("source registry is internally valid and keeps restricted tracker data out of core", () => {
    expect(validateSourceRegistry()).toEqual([]);
    expect(getSource("ghostery-trackerdb")).toMatchObject({
        integration: SOURCE_INTEGRATION.DEFERRED,
        license: "CC-BY-NC-SA-4.0",
    });
    expect(sourcesForCapability(SOURCE_CAPABILITY.REQUEST_CLASSIFICATION, {
        integrations: [SOURCE_INTEGRATION.BUNDLED_NATIVE],
    })).toEqual([]);
});

test("redirect safety accepts plain web unwraps and blocks dangerous targets", () => {
    const safe = assessRedirectCandidate(
        "https://redirect.example/?url=https%3A%2F%2Ftarget.example%2Farticle",
        "https://target.example/article"
    );
    expect(safe).toEqual({safe: true, level: "safe", reasons: []});
    expect(shouldAutoSuggestRedirect(safe)).toBe(true);

    expect(assessRedirectCandidate("https://redirect.example/", "javascript:alert(1)")).toMatchObject({
        safe: false,
        level: "blocked",
    });
    expect(assessRedirectCandidate("https://redirect.example/", "http://target.example/")).toMatchObject({
        safe: false,
        level: "blocked",
        reasons: ["https-to-http-downgrade"],
    });
});

test("security-looking redirect wrappers require review rather than silent bypass", () => {
    expect(assessRedirectCandidate(
        "https://security.example/redirect?url=https%3A%2F%2Ftarget.example%2F",
        "https://target.example/"
    )).toEqual({
        safe: false,
        level: "review",
        reasons: ["possible-security-wrapper"],
    });
});

test("Observatory snapshot is versioned and privacy-minimized by default", () => {
    const summary = {
        total: 4,
        firstParty: 2,
        thirdParty: 2,
        affected: 1,
        trackingHints: 1,
        dropped: 0,
        types: {script: 2, image: 2},
        domains: [{
            hostname: "Tracker.Example",
            total: 2,
            firstParty: 0,
            thirdParty: 2,
            affected: 1,
            trackingHint: true,
            types: {script: 2},
        }],
    };
    const snapshot = buildObservatorySnapshot(summary);

    expect(snapshot.schemaVersion).toBe(OBSERVATORY_SCHEMA_VERSION);
    expect(snapshot.domainStats[0].hostname).toBeUndefined();
    expect(validateObservatorySnapshot(snapshot)).toEqual([]);

    const explicit = buildObservatorySnapshot(summary, {includeHostnames: true});
    expect(explicit.domainStats[0].hostname).toBe("tracker.example");
});
