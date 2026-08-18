# Special showcase rulesets

Request Control Evo ships several opt-in showcase rulesets that demonstrate request transformation beyond conventional tracker blocking.

## Privacy Enhanced Embeds

`rules/privacy-enhanced-embeds.json`

Uses privacy-oriented variants of embedded services where the transformation is deterministic. The initial rule redirects YouTube embed frames to `youtube-nocookie.com` while preserving the video path and query string.

## Original Media / Maximum Quality

`rules/media-original-quality.json`

Attempts to bypass selected thumbnail/proxy layers and request the original media resource instead. The initial rules cover Wikimedia thumbnails and Reddit preview wrappers.

## Developer Direct / Raw

`rules/developer-direct-raw.json`

Converts repository file-view URLs to raw file endpoints for GitHub and GitLab. These rules are disabled by default because they intentionally replace the normal repository UI with the file response.

## Search Engine Escape

`rules/search-engine-escape.json`

Can redirect Google or Bing result-page searches to DuckDuckGo while preserving the search terms. Disabled by default because enabling it intentionally changes the user's selected search provider.

## Aggressive Direct Links

`rules/privacy-aggressive-direct-links.json`

Skips selected outbound-link wrappers by extracting their embedded destination URL. The initial rules cover Google outbound redirects, Facebook's link shim and Microsoft Safe Links. They are disabled by default. In particular, bypassing Microsoft Safe Links can also bypass organization-level security scanning and should only be enabled deliberately.

## Canonical Desktop Web

`rules/web-canonical-desktop.json`

Normalizes selected mobile-site hosts to their desktop/canonical counterpart while preserving path and query parameters. The initial rules cover English/German Wikipedia and YouTube. Disabled by default because the mobile variant may be intentional.

## Activation policy

Rules that are narrowly scoped and preserve the requested content may be active by default. Rules that change a user's chosen service, bypass security wrappers, or materially alter navigation are shipped disabled and require explicit activation.
