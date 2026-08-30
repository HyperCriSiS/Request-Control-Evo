import fs from "node:fs";

const files = [
    "../src/options/rule-management-ui.js",
    "../src/options/rule-input.css",
    "./rule-management-ux.test.js",
    "./mobile-ui-regression.test.js",
];

test("rule management UI sources never ship placeholder content", () => {
    for (const relativePath of files) {
        const content = fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");
        expect(content).not.toContain("__REPLACE__");
    }
});
