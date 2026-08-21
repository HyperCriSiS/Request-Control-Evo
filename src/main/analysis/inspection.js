/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { libTld } from "../url.js";

const TRACKING_HOST_TOKEN = /(^|[.-])(analytics?|beacons?|metrics?|pixels?|telemetry|track(?:er|ing)?)([.-]|$)/i;
const AD_HOST_TOKEN = /(^|[.-])(adservice|adsystem|doubleclick)([.-]|$)/i;

export const INSPECTION_RULE_SCOPES = Object.freeze([
    "exact-request",
    "host",
    "host-type",
    "site-host",
    "site-host-type",
    "third-party-host",
]);

export function classifyInspectionRequest(pageUrl, requestUrl) {
    const page = parseUrl(pageUrl);
    const request = parseUrl(requestUrl);
    if (!request) {
        return {
            hostname: "",
            firstParty: false,
            thirdParty: false,
            trackingHint: false,
        };
    }

    const pageDomain = page ? libTld.getDomain(page.href) : null;
    const requestDomain = libTld.getDomain(request.href);
    const sameDomain = page
        ? pageDomain && requestDomain
            ? pageDomain === requestDomain
            : page.hostname === request.hostname
        : false;

    return {
        hostname: request.hostname,
        firstParty: sameDomain,
        thirdParty: page !== null && !sameDomain,
        trackingHint: hasTrackingHint(request.hostname),
    };
}

export function hasTrackingHint(hostname) {
    return TRACKING_HOST_TOKEN.test(hostname) || AD_HOST_TOKEN.test(hostname);
}

export function summarizeInspection(session) {
    const requests = session?.requests || [];
    const summary = {
        total: requests.length,
        firstParty: 0,
        thirdParty: 0,
        trackingHints: 0,
        affected: 0,
        dropped: session?.dropped || 0,
        domains: [],
        types: {},
    };
    const domains = new Map();
    const trackingDomains = new Set();

    for (const request of requests) {
        const classification = request.classification || classifyInspectionRequest(session?.pageUrl, request.url);
        if (classification.firstParty) {
            summary.firstParty += 1;
        }
        if (classification.thirdParty) {
            summary.thirdParty += 1;
        }
        if (classification.trackingHint && classification.hostname) {
            trackingDomains.add(classification.hostname);
        }
        const affected = Boolean(request.effect || request.diagnostics?.length);
        if (affected) {
            summary.affected += 1;
        }

        summary.types[request.type] = (summary.types[request.type] || 0) + 1;

        const hostname = classification.hostname || "(unknown)";
        let domain = domains.get(hostname);
        if (!domain) {
            domain = {
                hostname,
                total: 0,
                firstParty: 0,
                thirdParty: 0,
                affected: 0,
                trackingHint: false,
                types: {},
            };
            domains.set(hostname, domain);
        }
        domain.total += 1;
        domain.firstParty += classification.firstParty ? 1 : 0;
        domain.thirdParty += classification.thirdParty ? 1 : 0;
        domain.affected += affected ? 1 : 0;
        domain.trackingHint ||= classification.trackingHint;
        domain.types[request.type] = (domain.types[request.type] || 0) + 1;
    }

    summary.trackingHints = trackingDomains.size;
    summary.domains = [...domains.values()].sort((a, b) => b.total - a.total || a.hostname.localeCompare(b.hostname));
    return summary;
}

export function buildInspectionBlockRule({ pageUrl, request, scope }, uuid) {
    if (!uuid || !request?.url || !INSPECTION_RULE_SCOPES.includes(scope)) {
        throw new Error("A request, supported scope and UUID are required");
    }

    const target = parseUrl(request.url);
    if (!target || !["http:", "https:", "ws:", "wss:"].includes(target.protocol)) {
        throw new Error("Only network requests with a supported URL can become rules");
    }

    const pattern = {
        scheme: "*",
        host: [target.hostname],
        path: ["*"],
    };
    const rule = {
        uuid,
        pattern,
        action: "block",
        active: false,
        title: `Inspection draft: ${target.hostname}`,
        description: describeScope(scope, target.hostname, request.type),
        tag: "inspection",
        group: "Inspection",
    };

    switch (scope) {
        case "exact-request":
            pattern.scheme = target.protocol.slice(0, -1);
            pattern.path = [`${target.pathname}${target.search}` || "/"];
            rule.title = `Block request: ${target.hostname}`;
            break;
        case "host-type":
            rule.types = [request.type];
            rule.title = `Block ${request.type}: ${target.hostname}`;
            break;
        case "site-host":
            pattern.source = [sourcePattern(pageUrl)];
            rule.title = `Block ${target.hostname} on this site`;
            break;
        case "site-host-type":
            pattern.source = [sourcePattern(pageUrl)];
            rule.types = [request.type];
            rule.title = `Block ${request.type} from ${target.hostname} on this site`;
            break;
        case "third-party-host":
            pattern.origin = "third-party-domain";
            rule.title = `Block third-party ${target.hostname}`;
            break;
        case "host":
            break;
    }

    return rule;
}

function sourcePattern(pageUrl) {
    const page = parseUrl(pageUrl);
    if (!page || !["http:", "https:"].includes(page.protocol)) {
        throw new Error("A normal web page is required for a site-scoped rule");
    }
    return `*://${page.hostname}/*`;
}

function describeScope(scope, hostname, type) {
    switch (scope) {
        case "exact-request":
            return `Generated locally from Inspection Mode. Blocks this inspected request pattern for ${hostname}. Review before enabling.`;
        case "host-type":
            return `Generated locally from Inspection Mode. Blocks ${type} requests to ${hostname} everywhere. Review before enabling.`;
        case "site-host":
            return `Generated locally from Inspection Mode. Blocks requests to ${hostname} only when the current top-level site matches. Review before enabling.`;
        case "site-host-type":
            return `Generated locally from Inspection Mode. Blocks ${type} requests to ${hostname} only on the inspected site. Review before enabling.`;
        case "third-party-host":
            return `Generated locally from Inspection Mode. Blocks requests to ${hostname} when it is a third-party domain. Review before enabling.`;
        default:
            return `Generated locally from Inspection Mode. Blocks requests to ${hostname} everywhere. Review before enabling.`;
    }
}

function parseUrl(value) {
    try {
        return new URL(value);
    } catch {
        return null;
    }
}
