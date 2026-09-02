import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const workflowsDir = path.resolve(here, "../.github/workflows");

test("temporary repair and documentation workflows are never committed", () => {
    const workflows = fs.readdirSync(workflowsDir);
    expect(workflows.filter((name) => name.startsWith("tmp-") || name.includes("temporary"))).toEqual([]);
});
