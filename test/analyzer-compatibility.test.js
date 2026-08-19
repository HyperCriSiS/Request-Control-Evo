import fs from "node:fs";

import { Linter } from "eslint";

const analyzerSource = fs.readFileSync(new URL("../src/analyzer/analyzer.js", import.meta.url), "utf8");

test("analyzer has no runtime dependency on the removed packaged rule corpus", () => {
    expect(analyzerSource).not.toMatch(/\brules\/[^\s"'`]+\.json\b/);
    expect(analyzerSource).not.toMatch(/\bfetch\s*\(/);
});

test("analyzer entry point parses as an ES2020 module without top-level await", () => {
    const messages = new Linter().verify(analyzerSource, [
        { languageOptions: { ecmaVersion: 2020, sourceType: "module" } },
    ]);

    expect(messages.filter(({ fatal }) => fatal)).toEqual([]);
});
