import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { collectManualSources, manualOutputPath } from "../scripts/build-manual.mjs";
import { copyVendorAssets } from "../scripts/copy-vendor-assets.mjs";
import { defaultArchivePath } from "../scripts/lint-build.mjs";
import { createWebExtArguments, parseIgnoreFiles } from "../scripts/web-ext.mjs";

test("vendor assets are copied without platform-specific shell commands", async () => {
    const root = await mkdtemp(join(tmpdir(), "requestcontrol-vendor-"));
    const source = join(root, "fixtures", "vendor.js");
    await mkdir(join(root, "fixtures"), { recursive: true });
    await writeFile(source, "export const ready = true;\n");

    await copyVendorAssets(root, [{ source: "fixtures/vendor.js", target: "lib/vendor.js" }]);

    await expect(readFile(join(root, "lib", "vendor.js"), "utf8")).resolves.toBe("export const ready = true;\n");
});

test("localized manual discovery and output paths are platform-neutral", async () => {
    const root = await mkdtemp(join(tmpdir(), "requestcontrol-manual-"));
    await mkdir(join(root, "en"), { recursive: true });
    await mkdir(join(root, "nested", "de"), { recursive: true });
    await writeFile(join(root, "en", "manual.wiki"), "English");
    await writeFile(join(root, "nested", "de", "MANUAL.WIKI"), "Deutsch");
    await writeFile(join(root, "nested", "ignored.wiki"), "Ignored");

    const sources = await collectManualSources(root);

    expect(sources).toHaveLength(2);
    expect(sources.map(manualOutputPath)).toEqual(sources.map((source) => source.slice(0, -5) + ".html"));
});

test("web-ext ignore patterns are passed as distinct arguments", () => {
    const ignores = parseIgnoreFiles("test/ coverage/ **/manual.wiki");
    const args = createWebExtArguments("build", ["--verbose"], ignores);

    expect(ignores).toEqual(["test/", "coverage/", "**/manual.wiki"]);
    expect(args.slice(-4)).toEqual(["--ignore-files", "test/", "coverage/", "**/manual.wiki"]);
});

test("build lint resolves the manifest-versioned archive without shell substitution", async () => {
    const manifest = JSON.parse(await readFile(join(process.cwd(), "manifest.json"), "utf8"));
    const expected = join(
        process.cwd(),
        "web-ext-artifacts",
        `request_control-${manifest.version}.zip`
    ).replaceAll("\\", "/");

    expect(defaultArchivePath().replaceAll("\\", "/")).toBe(expected);
});
