from pathlib import Path
import subprocess

BASE = "93b93437238a3efc26e3b5388e47bc460d825fbc"
FILES = [
    "src/options/rule-import-input.js",
    "src/options/rule-import-input.css",
    "src/options/options.js",
    "test/imports-community-ux.test.js",
    "ROADMAP.md",
]

for path in FILES:
    content = subprocess.check_output(["git", "show", f"{BASE}:{path}"])
    Path(path).write_bytes(content)

js_path = Path("src/options/rule-import-input.js")
js = js_path.read_text()
js = js.replace('''        const rating = document.createElement("span");
        rating.id = "rating";
        rating.className = "rating";
        rating.hidden = true;
        const ratingLink = document.createElement("a");
        ratingLink.id = "rating-link";
        ratingLink.className = "rating-link";
        ratingLink.target = "_blank";
        ratingLink.rel = "noopener noreferrer";
        ratingLink.textContent = message("community_review", "Community review");
        rating.append(ratingLink);
        meta.append(rating);
''', '')
js = js.replace('''    set communityReview(value) {
        const rating = this.shadowRoot.getElementById("rating");
        const link = this.shadowRoot.getElementById("rating-link");
        const source = normalizeImportSource(value);
        rating.hidden = !source;
        if (source) link.href = source;
        else link.removeAttribute("href");
    }

''', '')
js_path.write_text(js)

css_path = Path("src/options/rule-import-input.css")
css = css_path.read_text()
css = css.replace(",\n.rating {", " {")
css = css.replace('''.source-link,
.rating-link {
    color: var(--primary-color);
    text-decoration: none;
}

.rating-link {
    display: inline-flex;
    align-items: center;
    min-height: 2.15rem;
}

.source-link:hover,
.rating-link:hover {
    text-decoration: underline;
}
''', '''.source-link {
    color: var(--primary-color);
    text-decoration: none;
}

.source-link:hover {
    text-decoration: underline;
}
''')
css = css.replace('''    .rating-link,
    .selection-toggle,
''', '''    .selection-toggle,
''')
css_path.write_text(css)

options_path = Path("src/options/options.js")
options = options_path.read_text()
options = options.replace('''            if (channel === CATALOG_CHANNEL.COMMUNITY && entry.ratingIssue) {
                const repository = entry.ratingRepository || catalog.ratingRepository || COMMUNITY_REPOSITORY;
                input.communityReview = `https://github.com/${repository}/issues/${entry.ratingIssue}`;
            }
''', '')
options_path.write_text(options)

test_path = Path("test/imports-community-ux.test.js")
test = test_path.read_text()
anchor = '''test("GitHub sharing lives with selected rules and requires explicit review", () => {
    expect(optionsHtml).toContain('id="shareSelectedRulesGitHub"');
    expect(optionsHtml).not.toContain('id="github-community-share"');
    expect(optionsJs).toContain("showCommunityShareDialog");
    expect(optionsJs).toContain("share_rules_public_warning");
    expect(optionsJs).toContain("share_rules_preview");
});
'''
addition = anchor + '''\ntest("import rows keep community review out of per-package actions", () => {
    expect(importJs).not.toContain('rating.id = "rating"');
    expect(importJs).not.toContain('ratingLink.id = "rating-link"');
    expect(importJs).not.toContain("set communityReview");
    expect(optionsJs).not.toContain("input.communityReview");
    expect(importCss).not.toContain(".rating-link");
});\n'''
if anchor not in test:
    raise SystemExit("test anchor missing")
test_path.write_text(test.replace(anchor, addition))

roadmap_path = Path("ROADMAP.md")
roadmap = roadmap_path.read_text()
items = [
    "Remove the standalone URL Analyzer entry point/page from user-facing navigation.",
    "Preserve the reusable URL-analysis engine, but surface useful parameter/redirect findings contextually inside the Inspector for the selected request/navigation.",
    "Keep ambiguous parameters review-only and keep redirect safety checks unchanged.",
    "Remove the visible **Local inspection only** banner; local/explicit/bounded inspection remains a privacy invariant rather than permanent UI chrome.",
    "Remove the Inspector support-diagnostic export surface and dead export-only UI code. Keep internal diagnostics needed for runtime/source explanations.",
    "Treat **Rule Type** as fixed system structure: Filter / Redirect / Secure / Block / Whitelist. These are not user groups.",
    "Keep **Group** as the one first-class user-owned organization primitive, including create/assign/filter.",
    "Remove imported behavior categories from the user-group concept. If behavior/category remains useful, expose it as a separate read-only category filter/metadata dimension, not another kind of Group.",
    "Treat the legacy single-value **Tag** UI as redundant with Groups: remove it from normal UI while preserving existing tag data and migrating it safely into Group only when no explicit Group exists. Never silently discard legacy organization metadata.",
    "Add an explicit Back/Close affordance to the mobile selected-rules action sheet.",
    "Support Escape/backdrop dismissal without triggering an action.",
    "Stop relying on any click inside the toolbar to close it; action execution and navigation dismissal must be separate.",
    "Add regression coverage for select → open actions → cancel/back → return to rule list.",
    "Remove the per-package GitHub/community-review button from the Rule Import row. Community contribution/review remains available only from the dedicated contribution flow where context is explicit.",
    "Compact package rows around **name → short purpose → material scope/risk → primary action**; do not repeat behavior already communicated by the enclosing category.",
    "Re-align package actions/metadata for narrow and desktop layouts after removing the extra link/button.",
]
for item in items:
    old = f"- [ ] {item}"
    new = f"- [x] {item}"
    if old not in roadmap:
        raise SystemExit(f"roadmap item missing: {item}")
    roadmap = roadmap.replace(old, new)
needle = "- [x] Re-align package actions/metadata for narrow and desktop layouts after removing the extra link/button.\n\n### 5. Full Official package audit — second pass against actual rules\n"
replacement = "- [x] Re-align package actions/metadata for narrow and desktop layouts after removing the extra link/button.\n- Validation: per-package community-review UI removed from the import component and catalog binding; dedicated selected-rules GitHub contribution flow remains intact. Regression coverage asserts the separation.\n\n### 5. Full Official package audit — second pass against actual rules\n"
if needle not in roadmap:
    raise SystemExit("roadmap validation anchor missing")
roadmap_path.write_text(roadmap.replace(needle, replacement))
