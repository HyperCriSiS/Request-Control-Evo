import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { INSPECTION_FALLBACK_MESSAGES } from "../src/inspector/strings.js";
import { IMPORT_SELECTION_FALLBACK_MESSAGES } from "../src/options/import-selection.js";

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

async function collectSourceFiles(path) {
    const entries = await readdir(path, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = join(path, entry.name);
        if (entry.isDirectory()) {
            files.push(...await collectSourceFiles(fullPath));
        } else if (entry.isFile() && [".html", ".js"].some((extension) => entry.name.endsWith(extension))) {
            files.push(fullPath);
        }
    }
    return files;
}

function collectStaticMessageKeys(source) {
    const keys = new Set();
    const patterns = [
        /data-i18n(?:-title|-placeholder|-aria-label)?=["']([^"']+)["']/g,
        /\b(?:browser\.i18n\.getMessage|getInspectionMessage|message|msg)\(\s*["']([^"']+)["']/g,
    ];
    for (const pattern of patterns) {
        for (const match of source.matchAll(pattern)) keys.add(match[1]);
    }
    return keys;
}

function collectExplicitFallbackKeys(source) {
    const keys = new Set();
    const pattern = /\b(?:message|msg)\(\s*["']([^"']+)["']\s*,\s*(?:["'`])/g;
    for (const match of source.matchAll(pattern)) keys.add(match[1]);
    return keys;
}

const files = [
    "manifest.json",
    ...await collectJsonFiles("_locales"),
];

for (const file of files) {
    JSON.parse(await readFile(file, "utf8"));
}

const defaultMessages = JSON.parse(await readFile("_locales/en/messages.json", "utf8"));
const referencedKeys = new Set();
const fallbackKeys = new Set([
    ...Object.keys(INSPECTION_FALLBACK_MESSAGES),
    ...Object.keys(IMPORT_SELECTION_FALLBACK_MESSAGES),
]);
for (const file of await collectSourceFiles("src")) {
    const source = await readFile(file, "utf8");
    for (const key of collectStaticMessageKeys(source)) referencedKeys.add(key);
    for (const key of collectExplicitFallbackKeys(source)) fallbackKeys.add(key);
}

const missingKeys = [...referencedKeys]
    .filter((key) => !defaultMessages[key] && !fallbackKeys.has(key))
    .sort();
if (missingKeys.length > 0) {
    throw new Error(`Default locale is missing referenced message keys without an explicit fallback: ${missingKeys.join(", ")}`);
}

const fallbackReferenceCount = [...referencedKeys].filter((key) => !defaultMessages[key] && fallbackKeys.has(key)).length;
console.log(`Validated ${files.length} JSON files and ${referencedKeys.size} static localization references (${fallbackReferenceCount} covered by explicit fallbacks).`);
