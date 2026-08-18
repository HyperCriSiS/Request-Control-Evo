from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"expected block not found in {path}: {old[:80]!r}")
    file.write_text(text.replace(old, new, 1))


def append_once(path, marker, addition):
    file = Path(path)
    text = file.read_text()
    if marker in text:
        return
    file.write_text(text.rstrip() + "\n\n" + addition.strip() + "\n")


append_once(
    "src/options/common.css",
    "@media (max-width: 42em) {\n    .btn {\n        min-height: 2.75rem;",
    r'''
@media (max-width: 42em) {
    .btn {
        min-height: 2.75rem;
        padding: 0.55rem 0.8rem;
        touch-action: manipulation;
    }

    .btn.text {
        min-width: 2.75rem;
        min-height: 2.75rem;
        padding: 0.5rem;
    }

    input[type="text"],
    input[type="url"],
    select,
    textarea {
        min-height: 2.75rem;
        font-size: 1rem;
    }

    summary,
    .collapse-button {
        min-height: 2.75rem;
    }
}
''',
)

replace_once(
    "src/options/options.css",
    "body {\n    min-height: 100vh;\n",
    "body {\n    min-height: 100vh;\n    min-height: 100dvh;\n",
)
replace_once(
    "src/options/options.css",
    r'''    #tabs {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 0 -0.65rem 0.9rem;
        padding: 0.45rem 0.65rem;
    }

    #tabs > .col {
        margin: 0;
    }

    .tab-selector {
        padding: 0.55rem;
    }''',
    r'''    #tabs {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        gap: 0.25rem;
        margin: 0 -0.65rem 0.9rem;
        padding: 0.45rem 0.65rem;
        overflow-x: auto;
        overscroll-behavior-inline: contain;
        scrollbar-width: none;
    }

    #tabs > .col {
        flex: 0 0 auto;
        margin: 0;
    }

    .tab-selector {
        min-width: 2.75rem;
        min-height: 2.75rem;
        padding: 0.55rem;
        touch-action: manipulation;
    }''',
)
replace_once(
    "src/options/options.css",
    r'''    .license-clause {
        max-width: 100%;
        white-space: normal;
    }
}''',
    r'''    .license-clause {
        max-width: 100%;
        white-space: normal;
    }

    .no-rules {
        padding: 2rem 1rem;
    }

    #tab-imports summary {
        display: flex;
        align-items: center;
        min-height: 2.75rem;
    }

    #import-source-form {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 0.5rem;
    }

    #import-source-form .btn {
        width: 100%;
    }

    .manual-content table {
        display: block;
        max-width: 100%;
        overflow-x: auto;
    }
}''',
)
replace_once(
    "src/options/options.css",
    r'''@media (max-width: 42em) {
    #selectedRules {
        z-index: -1;
    }

    .mobile-toolbar {''',
    r'''@media (max-width: 42em) {
    #selectedRules {
        min-height: 2.75rem;
        touch-action: manipulation;
    }

    .mobile-toolbar {''',
)
replace_once(
    "src/options/options.css",
    r'''        height: 20%;
        max-height: 5rem;
        border: none;''',
    r'''        min-height: 3rem;
        height: auto;
        max-height: none;
        border: none;''',
)
replace_once(
    "src/options/options.css",
    r'''        display: flex;
        flex-direction: column-reverse;
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        margin: auto;
        height: 100%;
        width: 100%;
        justify-content: center;''',
    r'''        display: flex;
        flex-direction: column-reverse;
        position: fixed;
        z-index: 20;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        margin: auto;
        min-height: 100vh;
        min-height: 100dvh;
        height: 100dvh;
        width: 100%;
        padding: max(0.75rem, env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right)) max(0.75rem, env(safe-area-inset-bottom)) max(0.75rem, env(safe-area-inset-left));
        box-sizing: border-box;
        justify-content: center;''',
)

replace_once(
    "src/options/rule-input.css",
    r'''    .editing .header-info-wrap,
    .rule-select {
        display: none !important;
    }
''',
    r'''    .editing .header-info-wrap,
    .editing .rule-select {
        display: none !important;
    }

    .rule-header {
        display: grid;
        grid-template-columns: 2.75rem minmax(0, 1fr);
        gap: 0.35rem 0.45rem;
        align-items: start;
        padding: 0.45rem 0;
    }

    .rule-header > .rule-select {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 2.75rem;
        min-height: 2.75rem;
        margin: 0;
    }

    .rule-header > .rule-header-title {
        min-width: 0;
    }

    .rule-header > .header-info-wrap {
        grid-column: 1 / -1;
        gap: 0.45rem;
        flex-wrap: wrap;
    }

    .rule-header .information {
        display: flex;
        flex: 1 1 12rem;
        flex-wrap: wrap;
        gap: 0.25rem;
        text-align: start;
    }

    .rule-header .rule-header-buttons {
        display: flex;
        flex: 1 1 12rem;
        gap: 0.4rem;
    }

    .rule-header .rule-header-buttons > .btn {
        flex: 1 1 0;
    }

    .title:not([contenteditable="true"]) {
        max-width: 100%;
    }
''',
)
replace_once(
    "src/options/rule-input.css",
    r'''    .rule-header {
        line-height: 1.5;
        flex-direction: column;
        align-items: initial;
    }
''',
    r'''    .rule-header {
        line-height: 1.5;
        align-items: initial;
    }

    .editing .rule-header {
        display: flex;
        flex-direction: column;
    }
''',
)

replace_once(
    "src/options/rule-list.css",
    r'''    rule-list .select-all {
        display: none;
    }''',
    r'''    rule-list .select-all {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 2.75rem;
        min-height: 2.75rem;
        margin: 0 0.25rem 0 0;
    }''',
)
replace_once(
    "src/options/rule-list.css",
    r'''    rule-list .rule-group-header {
        padding-left: 0.55rem;
        padding-right: 0.55rem;
    }''',
    r'''    rule-list .rule-group-header {
        min-height: 2.75rem;
        padding-left: 0.55rem;
        padding-right: 0.55rem;
    }

    rule-list .rule-group-toggle {
        min-height: 2.75rem;
    }''',
)

replace_once(
    "src/options/modal-dialog.css",
    r'''    width: 100%;
    height: 100%;
    overflow: auto;''',
    r'''    width: 100%;
    min-height: 100vh;
    min-height: 100dvh;
    height: 100dvh;
    overflow: auto;''',
)
replace_once(
    "src/options/modal-dialog.css",
    r'''    margin: 1em auto;
    padding: 1em;
    border: 1px solid var(--border-color-strong);
    border-radius: var(--radius-md);
    box-shadow: 0 8px 30px var(--shadow-color);
    max-width: max-content;''',
    r'''    box-sizing: border-box;
    width: min(48rem, calc(100% - 1rem));
    max-width: calc(100% - 1rem);
    max-height: calc(100dvh - 1rem);
    overflow: auto;
    margin: 0.5rem auto;
    padding: 1rem;
    border: 1px solid var(--border-color-strong);
    border-radius: var(--radius-md);
    box-shadow: 0 8px 30px var(--shadow-color);''',
)
replace_once(
    "src/options/modal-dialog.css",
    r'''#close {
    color: var(--text-color);
    font-size: 1.3em;
    font-weight: bold;
    margin: 0 0 0 0.8em;
}''',
    r'''#close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2.75rem;
    min-height: 2.75rem;
    color: var(--text-color);
    font-size: 1.3em;
    font-weight: bold;
    margin: -0.45rem -0.45rem 0 0.35rem;
    touch-action: manipulation;
}''',
)

replace_once(
    "src/options/alert-popup.css",
    "    right: 0;\n    margin: 0.5em;\n",
    "    right: 0;\n    max-width: calc(100% - 1rem);\n    box-sizing: border-box;\n    margin: 0.5rem;\n",
)
replace_once(
    "src/options/alert-popup.css",
    r'''#close {
    font-size: 1.5em;
    margin: 0;
    padding: 0 0.3em;
}''',
    r'''#close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2.75rem;
    min-height: 2.75rem;
    font-size: 1.5em;
    margin: -0.6rem -0.6rem -0.6rem 0.25rem;
    padding: 0;
    touch-action: manipulation;
}''',
)

replace_once(
    "src/popup/browser-action.css",
    "    min-width: 22rem;\n    max-width: 32rem;\n",
    "    min-width: min(22rem, 100vw);\n    max-width: min(32rem, 100vw);\n",
)
append_once(
    "src/popup/browser-action.css",
    "@media (max-width: 28rem)",
    r'''
@media (max-width: 28rem) {
    body {
        width: 100vw;
        min-width: 0;
        max-width: 100vw;
        font-size: 0.88rem;
    }

    .header {
        flex-wrap: wrap;
        padding: 0.5rem;
    }

    .header > .btn {
        min-height: 2.75rem;
        padding: 0.6rem 0.7rem;
        touch-action: manipulation;
    }

    #showRules {
        flex: 1 0 100%;
    }

    #inspectCurrent,
    #analyzeCurrent,
    #toggleActive {
        flex: 1 1 0;
        max-width: none;
    }

    #records {
        max-height: calc(100dvh - 7rem);
    }

    #details {
        padding: 0.5rem;
    }

    .copyButton {
        width: 2.75rem;
        height: 2.75rem;
        margin: 0.25rem;
        touch-action: manipulation;
    }

    .tooltip .tooltiptext {
        right: 0;
        top: calc(100% + 0.25rem);
    }

    .tooltip .tooltiptext::after {
        display: none;
    }
}
''',
)

replace_once(
    "src/inspector/inspector.css",
    "    min-height: 100%;\n",
    "    min-height: 100vh;\n    min-height: 100dvh;\n",
)
replace_once(
    "src/inspector/inspector.css",
    r'''@media (max-width: 38rem) {
    .stats {
        grid-template-columns: 1fr;
    }''',
    r'''@media (max-width: 38rem) {
    body {
        padding: max(0.5rem, env(safe-area-inset-top)) max(0.5rem, env(safe-area-inset-right)) max(0.75rem, env(safe-area-inset-bottom)) max(0.5rem, env(safe-area-inset-left));
    }

    .stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .button,
    select,
    input[type="search"] {
        min-height: 2.75rem;
        font-size: 1rem;
        touch-action: manipulation;
    }

    .header-actions {
        width: 100%;
    }

    .header-actions .button,
    .quick-buttons .button,
    .assistant-actions .button {
        flex: 1 1 10rem;
    }''',
)
append_once(
    "src/inspector/inspector.css",
    "@media (max-width: 24rem)",
    r'''
@media (max-width: 24rem) {
    .stats {
        grid-template-columns: 1fr;
    }

    .request-row {
        grid-template-columns: 1fr;
    }

    .request-url,
    .request-badges {
        grid-column: auto;
    }
}
''',
)

replace_once(
    "src/analyzer/analyzer.css",
    '@media (max-width: 42rem) { .input-row, header { align-items: stretch; flex-direction: column; } dl { grid-template-columns: 1fr; } }',
    r'''@media (max-width: 42rem) {
  main { width: calc(100% - 1rem); margin: .5rem auto 1rem; }
  .input-row, header { align-items: stretch; flex-direction: column; }
  dl { grid-template-columns: 1fr; }
  button, input[type="url"], select { min-height: 2.75rem; font-size: 1rem; }
  button, .suggestion { touch-action: manipulation; }
  .row-actions > button { flex: 1 1 10rem; }
}''',
)

append_once(
    "src/options/rule-import-input.css",
    "@media (max-width: 35em)",
    r'''
@media (max-width: 35em) {
    .import-name {
        min-width: 0;
        flex-basis: 100%;
    }

    .import-heading,
    .import-actions {
        width: 100%;
        justify-content: flex-start;
    }

    .source-link,
    .rating-link {
        min-height: 2.75rem;
        align-items: center;
    }
}
''',
)

replace_once(
    "src/options/options.html",
    r'''                <div class="rule-select">
                    <input id="select" type="checkbox" autocomplete="off" />
                </div>''',
    r'''                <label class="rule-select">
                    <input id="select" type="checkbox" autocomplete="off" />
                </label>''',
)

Path("test/mobile-ui-regression.test.js").write_text(r'''import fs from "node:fs";

const optionsCss = fs.readFileSync(new URL("../src/options/options.css", import.meta.url), "utf8");
const optionsHtml = fs.readFileSync(new URL("../src/options/options.html", import.meta.url), "utf8");
const commonCss = fs.readFileSync(new URL("../src/options/common.css", import.meta.url), "utf8");
const ruleInputCss = fs.readFileSync(new URL("../src/options/rule-input.css", import.meta.url), "utf8");
const ruleListCss = fs.readFileSync(new URL("../src/options/rule-list.css", import.meta.url), "utf8");
const modalCss = fs.readFileSync(new URL("../src/options/modal-dialog.css", import.meta.url), "utf8");
const popupCss = fs.readFileSync(new URL("../src/popup/browser-action.css", import.meta.url), "utf8");
const inspectorCss = fs.readFileSync(new URL("../src/inspector/inspector.css", import.meta.url), "utf8");
const analyzerCss = fs.readFileSync(new URL("../src/analyzer/analyzer.css", import.meta.url), "utf8");

test("mobile rule selection remains reachable instead of being hidden", () => {
    expect(ruleInputCss).toContain(".editing .rule-select");
    expect(ruleInputCss).not.toMatch(/\n\s*\.rule-select\s*\{\s*display:\s*none\s*!important/);
    expect(ruleListCss).not.toMatch(/rule-list \.select-all \{\s*display:\s*none/);
    expect(ruleListCss).toContain("min-height: 2.75rem");
    expect(optionsHtml).toContain('<label class="rule-select">');
});

test("Android-sized touch targets are provided across interactive surfaces", () => {
    expect(commonCss).toContain("min-height: 2.75rem");
    expect(popupCss).toContain("min-height: 2.75rem");
    expect(inspectorCss).toContain("min-height: 2.75rem");
    expect(analyzerCss).toContain("min-height: 2.75rem");
});

test("narrow Firefox viewports can scroll tabs and keep popups inside the viewport", () => {
    expect(optionsCss).toContain("overflow-x: auto");
    expect(optionsCss).toContain("100dvh");
    expect(optionsCss).not.toContain("z-index: -1");
    expect(optionsCss).toContain("z-index: 20");
    expect(popupCss).toContain("min-width: min(22rem, 100vw)");
    expect(popupCss).toContain("max-width: min(32rem, 100vw)");
});

test("mobile dialogs use the dynamic viewport and cannot exceed screen width", () => {
    expect(modalCss).toContain("height: 100dvh");
    expect(modalCss).toContain("max-width: calc(100% - 1rem)");
    expect(modalCss).toContain("max-height: calc(100dvh - 1rem)");
});
''')
