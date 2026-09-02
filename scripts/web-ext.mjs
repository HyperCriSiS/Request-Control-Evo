import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT_URL = new URL("../", import.meta.url);
const WEB_EXT_CLI = fileURLToPath(new URL("node_modules/web-ext/bin/web-ext.js", PROJECT_ROOT_URL));

export function parseIgnoreFiles(value) {
    if (typeof value !== "string") return [];
    return value.trim().split(/\s+/).filter(Boolean);
}

export function createWebExtArguments(command, args, ignoreFiles) {
    const cliArguments = [WEB_EXT_CLI, command, ...args];
    if (ignoreFiles.length > 0) cliArguments.push("--ignore-files", ...ignoreFiles);
    return cliArguments;
}

export function runWebExt(command, args = [], { spawn = spawnSync } = {}) {
    if (!command) throw new TypeError("A web-ext command is required.");

    const packageJson = JSON.parse(readFileSync(new URL("package.json", PROJECT_ROOT_URL), "utf8"));
    const ignoreFiles = parseIgnoreFiles(packageJson.config?.ignore);
    const result = spawn(process.execPath, createWebExtArguments(command, args, ignoreFiles), {
        cwd: fileURLToPath(PROJECT_ROOT_URL),
        stdio: "inherit",
    });

    if (result.error) throw result.error;
    if (result.status !== 0) process.exitCode = result.status ?? 1;
    return result.status;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    runWebExt(process.argv[2], process.argv.slice(3));
}
