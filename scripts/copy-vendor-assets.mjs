import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));

export const VENDOR_ASSETS = [
    {
        source: "node_modules/tldts-experimental/dist/index.esm.min.js",
        target: "lib/tldts/index.esm.min.js",
    },
    {
        source: "node_modules/@ajusa/lit/src/lit.css",
        target: "lib/lit/lit.css",
    },
];

export async function copyVendorAssets(root = PROJECT_ROOT, assets = VENDOR_ASSETS) {
    for (const asset of assets) {
        const source = join(root, asset.source);
        const target = join(root, asset.target);

        await mkdir(dirname(target), { recursive: true });
        await copyFile(source, target);
        console.log(`Copied ${relative(root, source)} -> ${relative(root, target)}`);
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    copyVendorAssets().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
