/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const INSPECTION_FALLBACK_MESSAGES = Object.freeze({
    inspection_mode: "Inspection Mode",
    inspection_title: "Inspect current page",
    inspection_reload_start: "Reload & inspect",
    inspection_stop: "Stop recording",
    inspection_clear: "Clear snapshot",
    inspection_ready: "Ready to inspect",
    inspection_ready_detail: "Reload the target page to record its network requests and see rule opportunities.",
    inspection_recording: "Recording requests",
    inspection_recording_detail: "Use the target page normally. Dynamic requests are added until you stop recording.",
    inspection_stopped: "Inspection snapshot",
    inspection_stopped_detail: "Recording is stopped. Inspect the captured requests or start a fresh reload.",
    inspection_requests: "Requests",
    inspection_first_party: "First-party",
    inspection_third_party: "Third-party",
    inspection_tracking_hints: "Tracking hints",
    inspection_rule_affected: "Rule-affected",
    inspection_dropped: "$1 additional requests were not retained because the safety limit was reached.",
    inspection_domains: "Domains",
    inspection_show_all: "Show all",
    inspection_request_list: "Requests",
    inspection_filter_all: "All requests",
    inspection_filter_third_party: "Third-party only",
    inspection_filter_affected: "Affected by rules",
    inspection_filter_tracking: "Tracking hints",
    inspection_search_placeholder: "Filter URL or host",
    inspection_no_data: "Start an inspection to see request data.",
    inspection_no_matching_requests: "No requests match the current filters.",
    inspection_selected_request: "Selected request",
    inspection_request_url: "Request URL",
    inspection_request_type: "Type",
    inspection_request_method: "Method",
    inspection_party: "Party",
    inspection_request_status: "Status",
    inspection_matched_rule: "Matched rule",
    inspection_quick_rule: "Create a rule from this request",
    inspection_rule_disabled_note: "Generated rules are disabled drafts. Review them in the expert editor before enabling them.",
    inspection_block_request: "Block this request",
    inspection_block_host: "Block this host",
    inspection_block_host_here: "Block host on this site",
    inspection_block_type_here: "Block this type on this site",
    inspection_block_third_party_host: "Block when third-party",
    inspection_guided_rule: "Guided rule…",
    inspection_assistant_optional: "Optional assistant",
    inspection_assistant_question: "How broadly should this block apply?",
    inspection_assistant_scope: "Scope",
    inspection_scope_exact: "Only this request pattern",
    inspection_scope_host: "This host everywhere",
    inspection_scope_host_type: "This host + request type",
    inspection_scope_site: "This host only on this site",
    inspection_scope_site_type: "This host + type only on this site",
    inspection_scope_third_party: "This host only when third-party",
    inspection_assistant_preview: "Rule preview",
    inspection_create_draft: "Create disabled draft",
    inspection_assistant_context: "Target $1 · request type $2",
    inspection_preview_exact: "Block the inspected request pattern to $1.",
    inspection_preview_host: "Block requests to $1 on every site.",
    inspection_preview_host_type: "Block $1 requests to $2 on every site.",
    inspection_preview_site: "Block requests to $1 only while the inspected top-level site is open.",
    inspection_preview_site_type: "Block $1 requests to $2 only on the inspected site.",
    inspection_preview_third_party: "Block $1 only when it is a third-party domain relative to the page.",
    inspection_rule_created: "Disabled rule draft created. The expert editor was opened for review.",
    inspection_invalid_tab: "The requested tab is invalid.",
    inspection_tab_missing: "The target tab is no longer available.",
    inspection_untitled_tab: "Untitled tab",
    inspection_unsupported_page: "Inspection is available for normal http/https pages.",
    inspection_unavailable_detail: "Open a normal website and start Inspection Mode again from the Request Control popup.",
    inspection_domain_count: "$1 domain(s)",
    inspection_request_count: "$1 request(s)",
    inspection_third_party_count: "$1 third-party",
    inspection_affected_count: "$1 affected",
    inspection_tracking_hint: "tracking hint",
    inspection_showing_requests: "Showing $1 of $2 requests",
    inspection_status_blocked: "Blocked by Request Control",
    inspection_status_redirected: "Redirected by Request Control",
    inspection_status_redirected_to: "Redirected to $1",
    inspection_status_modified: "Changed by Request Control ($1)",
    inspection_status_error: "Request error",
    inspection_status_pending: "Pending",
    inspection_unknown_type: "Unknown",
    inspection_url_analysis: "URL analysis",
    inspection_url_findings: "Relevant URL findings",
    inspection_url_tracking: "$1 looks like a high-confidence tracking parameter and can be removed in a disabled cleanup draft.",
    inspection_url_redirect: "$1 contains a nested destination that passed the redirect safety check.",
    inspection_url_review: "$1 may carry referral/tracking state but is ambiguous. Review only; no automatic change is suggested.",
    inspection_url_redirect_review: "$1 contains a nested destination, but the redirect safety check blocks automatic unwrapping.",
    inspection_url_cleanup_draft: "Create cleanup draft",
    inspection_url_cleanup_created: "Disabled URL cleanup draft created for review.",
    inspection_url_cleanup_failed: "Could not create URL cleanup draft.",
    inspection_referrer_changed: "Referer protection changed this request",
    inspection_referrer_trimmed: "Cross-site Referer was reduced before the request to $1.",
    inspection_referrer_removed: "Referer was removed before the request to $1.",
    inspection_referrer_breakage_hint: "This request also failed. Referer protection may be involved.",
    inspection_referrer_allow_host: "Allow Referer for this host",
    inspection_referrer_allowed: "Referer allowed for this host",
    inspection_referrer_badge_trimmed: "Referer trimmed",
    inspection_referrer_badge_removed: "Referer removed",
    inspection_compatibility_active: "Breakage check is watching Request Control changes for related errors during the first 30 seconds.",
    inspection_compatibility_suspects: "Breakage check found $1 plausible Request Control-related issue(s).",
    inspection_rule_breakage_hint: "This exact request was changed by a rule and then failed. The matched rule may be involved.",
});

export function getInspectionMessage(key, substitutions = []) {
    const localized = browser.i18n.getMessage(key, substitutions);
    if (localized) {
        return localized;
    }

    let text = INSPECTION_FALLBACK_MESSAGES[key] || key;
    const values = Array.isArray(substitutions) ? substitutions : [substitutions];
    values.forEach((value, index) => {
        text = text.replaceAll(`$${index + 1}`, String(value));
    });
    return text;
}

export function localizeInspectionDocument(documentNode) {
    documentNode.querySelectorAll("[data-i18n]").forEach((node) => {
        node.textContent = getInspectionMessage(node.dataset.i18n);
    });
    documentNode.querySelectorAll("[data-i18n-title]").forEach((node) => {
        node.title = getInspectionMessage(node.dataset.i18nTitle);
    });
    documentNode.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
        node.placeholder = getInspectionMessage(node.dataset.i18nPlaceholder);
    });
    documentNode.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
        node.setAttribute("aria-label", getInspectionMessage(node.dataset.i18nAriaLabel));
    });
}
