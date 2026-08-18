# Special showcase rulesets

Request Control Evo ships several opt-in showcase rulesets that demonstrate request transformation beyond conventional tracker blocking. The presets are bundled with the add-on and can be imported from the **Special showcase rules** section in Options.

## Privacy Enhanced Embeds

`rules/privacy-enhanced-embeds.json`

Uses privacy-oriented variants or supported privacy parameters for embedded services where the transformation is deterministic. The rules redirect YouTube embed frames to `youtube-nocookie.com` and set Vimeo's `dnt=1` player parameter while preserving the requested media and existing query parameters.

## Original Media / Maximum Quality

`rules/media-original-quality.json`

Requests selected media resources at their original or highest exposed rendition. The rules cover Wikimedia thumbnail URLs and direct X/Twitter media links opened through `pbs.twimg.com`.

## Developer Direct / Raw

`rules/developer-direct-raw.json`

Converts repository file-view URLs to raw file endpoints for GitHub and GitLab. These rules are disabled by default because they intentionally replace the normal repository UI with the file response.

## Search Engine Escape

`rules/search-engine-escape.json`

Can redirect Google or Bing result-page searches to DuckDuckGo while preserving the search terms. Disabled by default because enabling it intentionally changes the user's selected search provider.

## Aggressive Direct Links

`rules/privacy-aggressive-direct-links.json`

Skips selected outbound-link wrappers by extracting their embedded destination URL. The rules cover Google outbound redirects, Facebook's link shim, Microsoft Safe Links, Reddit's `/media` wrapper and Steam Community's link filter. They are disabled by default. In particular, bypassing Microsoft Safe Links or Steam's warning page can also bypass security checks or warnings and should only be enabled deliberately.

## Canonical Desktop Web

`rules/web-canonical-desktop.json`

Normalizes selected mobile-site hosts to their desktop/canonical counterpart while preserving path and query parameters. The initial rules cover English/German Wikipedia and YouTube. Disabled by default because the mobile variant may be intentional.

## Text-First / Low Bandwidth

`rules/special-text-first-low-bandwidth.json`

Provides a deliberately austere browsing mode by blocking images, audio/video and downloadable web fonts. It demonstrates resource-type filtering and can substantially reduce transferred page weight, but visual layout and media-heavy sites may degrade.

## First-Party Firewall

`rules/special-first-party-firewall.json`

Blocks third-party-domain subresource requests while leaving top-level navigation alone. It demonstrates Request Control's origin/domain matcher rather than a static host list. This is intentionally aggressive and can break sites that depend on external CDNs, identity providers, embeds or APIs.

## Activation policy

Importing a preset is always an explicit user action. Within a preset, narrowly scoped rules that preserve the requested content may be active immediately. Rules that change a chosen service, bypass a security/warning wrapper, or materially alter navigation are shipped disabled and require explicit activation after import.
