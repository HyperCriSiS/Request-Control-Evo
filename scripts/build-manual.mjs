import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));

export async function collectManualSources(directory) {
    const sources = [];
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = join(directory, entry.name);
        if (entry.isDirectory()) {
            sources.push(...await collectManualSources(entryPath));
        } else if (entry.isFile() && entry.name.toLowerCase() === "manual.wiki") {
            sources.push(entryPath);
        }
    }

    return sources.sort();
}

export function manualOutputPath(source) {
    return source.slice(0, -extname(source).length) + ".html";
}

export function buildManual(source, { executable = process.env.PANDOC_PATH || "pandoc", spawn = spawnSync } = {}) {
    const output = manualOutputPath(source);
    const result = spawn(executable, [source, "--from=mediawiki", "--to=html", "--output", output], {
        encoding: "utf8",
        stdio: "inherit",
    });

    if (result.error) {
        if (result.error.code === "ENOENT") {
            throw new Error("Pandoc was not found. Install the pinned CI version or set PANDOC_PATH.", {
                cause: result.error,
            });
        }
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error(`Pandoc failed for ${source} with exit code ${result.status}.`);
    }
    return output;
}

export async function buildManuals(directory = join(PROJECT_ROOT, "_locales"), options) {
    const sources = await collectManualSources(directory);
    for (const source of sources) buildManual(source, options);
    console.log(`Built ${sources.length} localized manuals.`);
    return sources.map(manualOutputPath);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    buildManuals().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
