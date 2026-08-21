import fs from "node:fs";
import { renderRecords } from "../src/popup/browser-action.js";

const popupHtml = fs.readFileSync(new URL("../src/popup/browser-action.html", import.meta.url), "utf8");
const popupCss = fs.readFileSync(new URL("../src/popup/browser-action.css", import.meta.url), "utf8");
const inspectorCss = fs.readFileSync(new URL("../src/inspector/inspector.css", import.meta.url), "utf8");
const optionsCss = fs.readFileSync(new URL("../src/options/options.css", import.meta.url), "utf8");
const commonCss = fs.readFileSync(new URL("../src/options/common.css", import.meta.url), "utf8");

test("popup controls and request entries use native button semantics", () => {
    const popup = new DOMParser().parseFromString(popupHtml, "text/html");

    for (const id of ["showRules", "inspectCurrent", "toggleActive"]) {
        const control = popup.getElementById(id);
        expect(control.tagName).toBe("BUTTON");
        expect(control.type).toBe("button");
    }

    expect(popup.getElementById("analyzeCurrent")).toBeNull();

    const inspectButton = popup.getElementById("inspectCurrent");
    expect(inspectButton.dataset.i18nTitle).toBe("inspection_title");
    expect(inspectButton.dataset.i18nAriaLabel).toBe("inspection_title");
    expect(inspectButton.querySelector("span").dataset.i18n).toBe("inspection_title");

    const entryButton = popup.querySelector("#entryTemplate").content.querySelector(".entry-header");
    expect(entryButton.tagName).toBe("BUTTON");
    expect(entryButton.type).toBe("button");
    expect(popupCss).toContain(".entry-header:focus,");
});

test("popup record rendering accepts an empty record array", () => {
    document.body.innerHTML = '<div id="records"></div>';

    expect(() => renderRecords([])).not.toThrow();
    expect(document.getElementById("records").classList.contains("hidden")).toBe(true);
});

test("mobile inspector link buttons expose a real touch-sized box", () => {
    expect(inspectorCss).toMatch(/\.link-button,\s*\n\s*select[\s\S]*?min-height:\s*2\.75rem/);
    expect(inspectorCss).toMatch(/\.link-button\s*\{[\s\S]*?display:\s*inline-flex;[\s\S]*?padding:\s*0\.5rem;/);
});

test("sticky options surfaces retain a solid background without color-mix support", () => {
    expect(optionsCss).toMatch(/#tabs\s*\{[\s\S]*?background:\s*var\(--background\);\s*background:\s*color-mix\(/);
    expect(optionsCss).toMatch(/\.toolbar\s*\{[\s\S]*?background:\s*var\(--background\);\s*background:\s*color-mix\(/);
});

test("tags input uses project theme tokens and touch-sized mobile chips", () => {
    expect(commonCss).toMatch(/\.tags-input \.tag\s*\{[\s\S]*?background:\s*var\(--surface-subtle\);[\s\S]*?color:\s*var\(--text-color\);/);
    expect(commonCss).toMatch(/\.tags-input \.selected\s*\{[\s\S]*?color:\s*var\(--on-primary-color\);/);
    expect(commonCss).toMatch(/\.tags-input \.tag\.error\s*\{[\s\S]*?color:\s*var\(--on-danger-color\);/);
    expect(commonCss).toMatch(/\.tags-input \.tag\s*\{[\s\S]*?min-height:\s*2\.75rem;[\s\S]*?touch-action:\s*manipulation;/);
});
