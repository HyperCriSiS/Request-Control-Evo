import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

async function collectJsonFiles(path) {
    const entries = await readdir(path, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = join(path, entry.name);
        if (entry.isDirectory()) {
            files.push(...await collectJsonFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith(".json")) {
            files.push(fullPath);
        }
    }
    return files;
}

const files = [
    "manifest.json",
    ...await collectJsonFiles("rules"),
    ...await collectJsonFiles("_locales")
];

for (const file of files) {
    JSON.parse(await readFile(file, "utf8"));
}

console.log(`Validated ${files.length} JSON files.`);
