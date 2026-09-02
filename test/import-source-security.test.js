import fs from "node:fs";
import { normalizeImportSource } from "../src/options/import-source.js";

const optionsJs = fs.readFileSync(new URL("../src/options/options.js", import.meta.url), "utf8");

test("rule import sources allow only network and extension protocols", () => {
    expect(normalizeImportSource("https://example.com/rules.json")).toBe(
        "https://example.com/rules.json"
    );
    expect(normalizeImportSource("http://localhost:8080/rules.json")).toBe(
        "http://localhost:8080/rules.json"
    );
    expect(normalizeImportSource("moz-extension://1234/rules/list.json")).toBe(
        "moz-extension://1234/rules/list.json"
    );
    expect(normalizeImportSource("chrome-extension://abcdefghijkl/rules/list.json")).toBe(
        "chrome-extension://abcdefghijkl/rules/list.json"
    );
});

test("rule import sources reject executable and embedded-document schemes", () => {
    expect(normalizeImportSource("javascript:alert(document.domain)")).toBeNull();
    expect(normalizeImportSource("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(normalizeImportSource("vbscript:msgbox(1)")).toBeNull();
    expect(normalizeImportSource("not a URL")).toBeNull();
});

test("rule import sources reject URLs containing credentials", () => {
    expect(normalizeImportSource("https://user:secret@example.com/rules.json")).toBeNull();
    expect(normalizeImportSource("https://user@example.com/rules.json")).toBeNull();
    expect(normalizeImportSource("https://:secret@example.com/rules.json")).toBeNull();
    expect(normalizeImportSource("https://user%40mail:secret%2Ftoken@example.com/rules.json")).toBeNull();
});

test("dynamic import sources are not interpolated into selectors or src attributes", () => {
    expect(optionsJs).not.toContain('setAttribute("src", src)');
    expect(optionsJs).not.toContain('rule-import-input[src="${');
    expect(optionsJs).toContain("findImportInputBySource");
    expect(optionsJs).toContain("normalizeImportSource");
});
