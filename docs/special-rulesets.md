# Special showcase rulesets

Request Control Evo ships opt-in showcase rulesets that demonstrate request transformation beyond conventional tracker blocking.

## Privacy Enhanced Embeds

`rules/privacy-enhanced-embeds.json`

Redirects YouTube embed frames to `youtube-nocookie.com` and enables Vimeo's supported `dnt=1` player parameter while preserving the requested media and existing query parameters.

## Original Media / Maximum Quality

`rules/media-original-quality.json`

Requests selected media resources at their original or highest exposed rendition. The initial rules cover Wikimedia thumbnail URLs and direct X/Twitter media links on `pbs.twimg.com`.

## Developer Direct / Raw

`rules/developer-direct-raw.json`

Converts GitHub and GitLab file-view URLs to raw file endpoints. Disabled by default because the repository UI is intentionally replaced by the file response.

## Search Engine Escape

`rules/search-engine-escape.json`

Redirects Google or Bing result-page searches to DuckDuckGo while preserving the search terms. Disabled by default because it changes the selected search provider.

## Aggressive Direct Links

`rules/privacy-aggressive-direct-links.json`

Skips selected outbound-link wrappers. The initial set covers Google outbound redirects, Facebook's link shim, Microsoft Safe Links, Reddit's `/media` wrapper and Steam Community's link filter. All are disabled by default. Bypassing security or warning wrappers should only be enabled deliberately.

## Canonical Desktop Web

`rules/web-canonical-desktop.json`

Normalizes selected mobile hosts to desktop/canonical counterparts while preserving path and query parameters. The initial rules cover English/German Wikipedia and YouTube. Disabled by default.

## Text-First / Low Bandwidth

`rules/special-text-first-low-bandwidth.json`

Blocks images, audio/video and web fonts for a deliberately austere low-bandwidth browsing mode. Importing the preset is opt-in; its rules are active once imported.

## First-Party Firewall

`rules/special-first-party-firewall.json`

Blocks third-party-domain subresources while leaving top-level navigation alone. It demonstrates Request Control's domain matcher rather than a static host list and can break sites that depend on external CDNs, authentication, embeds or APIs.

## Activation policy

Importing a preset is always an explicit user action. Within a preset, narrowly scoped rules that preserve the requested content may be active immediately. Rules that change a chosen service, bypass a security/warning wrapper, or materially alter navigation are shipped disabled and require explicit activation after import.
