/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const SOURCE_INTEGRATION = Object.freeze({
    BUNDLED_NATIVE: "bundled-native",
    SEPARATE_PACK: "separate-pack",
    REVIEW_ONLY: "review-only",
    INSPIRATION_ONLY: "inspiration-only",
    DEFERRED: "deferred",
});

export const SOURCE_CAPABILITY = Object.freeze({
    URL_CLEANUP: "url-cleanup",
    REDIRECT: "redirect",
    REQUEST_CLASSIFICATION: "request-classification",
    HEURISTICS: "heuristics",
    RESOURCE_REPLACEMENT: "resource-replacement",
});

const SOURCES = Object.freeze([
    {
        id: "evo-native",
        name: "Request Control Evo curated rules",
        license: "MPL-2.0",
        integration: SOURCE_INTEGRATION.BUNDLED_NATIVE,
        capabilities: [SOURCE_CAPABILITY.URL_CLEANUP, SOURCE_CAPABILITY.REDIRECT],
        runtimeNetwork: false,
        notes: "Canonical production rules. Every rule is reviewed, tested and represented in Evo's native rule model.",
    },
    {
        id: "clearurls-rules",
        name: "ClearURLs Rules",
        license: "LGPL-3.0",
        integration: SOURCE_INTEGRATION.SEPARATE_PACK,
        capabilities: [SOURCE_CAPABILITY.URL_CLEANUP, SOURCE_CAPABILITY.REDIRECT],
        runtimeNetwork: false,
        notes: "Strong URL-cleaning reference. Import only through a separately attributed/licensed generated pack after compatibility review; never execute upstream data directly at runtime.",
    },
    {
        id: "legitimate-url-shortener",
        name: "Actually Legitimate URL Shortener Tool",
        license: "Dandelicence",
        integration: SOURCE_INTEGRATION.REVIEW_ONLY,
        capabilities: [SOURCE_CAPABILITY.URL_CLEANUP],
        runtimeNetwork: false,
        notes: "Useful high-coverage research corpus, but license and upstream MV3 policy make direct bundling inappropriate. Use only to discover candidates that are independently verified and re-authored.",
    },
    {
        id: "redirector",
        name: "Redirector",
        license: "MIT",
        integration: SOURCE_INTEGRATION.INSPIRATION_ONLY,
        capabilities: [SOURCE_CAPABILITY.REDIRECT],
        runtimeNetwork: false,
        notes: "Use redirect concepts and test cases as design inspiration. Evo keeps its own redirect semantics and conservative safety policy.",
    },
    {
        id: "fastforward",
        name: "FastForward",
        license: "Unlicense",
        integration: SOURCE_INTEGRATION.REVIEW_ONLY,
        capabilities: [SOURCE_CAPABILITY.REDIRECT],
        runtimeNetwork: false,
        notes: "Candidate source for deterministic URL-only bypass patterns. DOM automation, timers, crowdsourced resolution and site-specific scripting are outside Evo's safe redirect subset.",
    },
    {
        id: "ghostery-trackerdb",
        name: "Ghostery Tracker Database",
        license: "CC-BY-NC-SA-4.0",
        integration: SOURCE_INTEGRATION.DEFERRED,
        capabilities: [SOURCE_CAPABILITY.REQUEST_CLASSIFICATION],
        runtimeNetwork: false,
        notes: "Excellent organization/category model, but the non-commercial share-alike license is unsuitable for unconditional core bundling. Keep the provider boundary ready for a separately licensed future source.",
    },
    {
        id: "privacy-badger",
        name: "Privacy Badger",
        license: "GPL-3.0",
        integration: SOURCE_INTEGRATION.INSPIRATION_ONLY,
        capabilities: [SOURCE_CAPABILITY.HEURISTICS],
        runtimeNetwork: false,
        notes: "Behavioral-learning concepts inform passive diagnostics only. Evo must not silently become a persistent learning blocker or browsing-history collector.",
    },
    {
        id: "localcdn",
        name: "LocalCDN",
        license: "MPL-2.0",
        integration: SOURCE_INTEGRATION.DEFERRED,
        capabilities: [SOURCE_CAPABILITY.RESOURCE_REPLACEMENT],
        runtimeNetwork: false,
        notes: "Resource replacement has a large versioning and breakage surface. Keep outside the current rule/inspection core unless a dedicated subsystem is justified later.",
    },
]);

export function getSourceRegistry() {
    return SOURCES.map((source) => ({...source, capabilities: [...source.capabilities]}));
}

export function getSource(id) {
    const source = SOURCES.find((candidate) => candidate.id === id);
    return source ? {...source, capabilities: [...source.capabilities]} : null;
}

export function sourcesForCapability(capability, {integrations} = {}) {
    const allowed = integrations ? new Set(integrations) : null;
    return getSourceRegistry().filter((source) =>
        source.capabilities.includes(capability) && (!allowed || allowed.has(source.integration))
    );
}

export function validateSourceRegistry(sources = SOURCES) {
    const errors = [];
    const ids = new Set();
    const integrationValues = new Set(Object.values(SOURCE_INTEGRATION));
    const capabilityValues = new Set(Object.values(SOURCE_CAPABILITY));

    for (const source of sources) {
        if (!source.id || ids.has(source.id)) {
            errors.push({id: source.id || null, reason: "missing-or-duplicate-id"});
        }
        ids.add(source.id);
        if (!source.name || !source.license) {
            errors.push({id: source.id, reason: "missing-attribution-metadata"});
        }
        if (!integrationValues.has(source.integration)) {
            errors.push({id: source.id, reason: "unknown-integration-policy"});
        }
        if (!Array.isArray(source.capabilities) || source.capabilities.some((item) => !capabilityValues.has(item))) {
            errors.push({id: source.id, reason: "unknown-capability"});
        }
        if (source.runtimeNetwork !== false) {
            errors.push({id: source.id, reason: "unexpected-runtime-network-dependency"});
        }
    }

    return errors;
}
