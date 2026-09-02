/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const WEB_PROTOCOLS = new Set(["http:", "https:"]);
const SECURITY_WRAPPER_TOKENS = /(^|[.-])(safelinks|protection|security|verify|warning)([.-]|$)/i;

function parseWebUrl(value) {
    try {
        const url = new URL(value);
        return WEB_PROTOCOLS.has(url.protocol) ? url : null;
    } catch {
        return null;
    }
}

export function assessRedirectCandidate(wrapperUrl, targetUrl) {
    const wrapper = parseWebUrl(wrapperUrl);
    const target = parseWebUrl(targetUrl);
    const reasons = [];

    if (!wrapper) {
        return {safe: false, level: "blocked", reasons: ["invalid-wrapper-url"]};
    }
    if (!target) {
        return {safe: false, level: "blocked", reasons: ["invalid-or-non-web-target"]};
    }
    if (target.username || target.password) {
        reasons.push("target-contains-credentials");
    }
    if (wrapper.href === target.href) {
        reasons.push("redirect-loop");
    }
    if (target.protocol === "http:" && wrapper.protocol === "https:") {
        reasons.push("https-to-http-downgrade");
    }
    if (SECURITY_WRAPPER_TOKENS.test(wrapper.hostname)) {
        reasons.push("possible-security-wrapper");
    }

    const blocked = reasons.some((reason) =>
        ["target-contains-credentials", "redirect-loop", "https-to-http-downgrade"].includes(reason)
    );
    if (blocked) {
        return {safe: false, level: "blocked", reasons};
    }
    if (reasons.length > 0) {
        return {safe: false, level: "review", reasons};
    }
    return {safe: true, level: "safe", reasons: []};
}

export function shouldAutoSuggestRedirect(assessment) {
    return Boolean(assessment?.safe && assessment.level === "safe");
}
