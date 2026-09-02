import fs from "fs";
import path from "path";

const TEXT_EXTENSIONS = new Set([".js", ".json", ".md", ".html", ".css", ".yml", ".yaml"]);
const SKIP_DIRECTORIES = new Set([".git", "build", "coverage", "dist", "node_modules"]);
const RETIRED_HOST = ["tumpio", "github", "io"].join(".");

function collectTextFiles(directory, files = []) {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
        if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) continue;
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            collectTextFiles(target, files);
        } else if (TEXT_EXTENSIONS.has(path.extname(entry.name))) {
            files.push(target);
        }
    }
    return files;
}

test("extension ships no built-in Official rule corpus", () => {
    expect(fs.existsSync(path.resolve("rules"))).toBe(false);
});

test("retired upstream hostname is absent from extension source and project metadata", () => {
    const matches = [];
    for (const file of collectTextFiles(".")) {
        const text = fs.readFileSync(file, "utf8");
        if (text.includes(RETIRED_HOST)) matches.push(file);
    }
    expect(matches).toEqual([]);
});
