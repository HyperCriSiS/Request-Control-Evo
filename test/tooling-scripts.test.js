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

test("manual master release dispatch advances the RC and keeps prereleases off Mozilla", async () => {
    const workflow = await readFile(
        join(process.cwd(), ".github", "workflows", "release.yml"),
        "utf8"
    );

    expect(workflow).toContain('if [[ "$GITHUB_REF_NAME" != "master" ]]');
    expect(workflow).toContain('git tag --list "$VERSION-rc.*"');
    expect(workflow).toContain('RC_NUMBER=$((MAX_RC + 1))');
    expect(workflow).toContain('TAG="$VERSION-rc.$RC_NUMBER"');
    expect(workflow).toContain("tag_name: ${{ steps.version.outputs.tag }}");
    expect(workflow).toContain("prerelease: ${{ steps.version.outputs.prerelease }}");
    expect(workflow).toContain("steps.version.outputs.prerelease == 'false'");
    expect(workflow).toContain(
        "GitHub prerelease only; Mozilla signing and publishing intentionally skipped."
    );
});
