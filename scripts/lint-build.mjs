import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const ALLOWED_COMPATIBILITY_CODES = new Set([
    "KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION",
    "KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION",
]);

export function isAllowedCompatibilityWarning(warning) {
    return Boolean(
        warning &&
        ALLOWED_COMPATIBILITY_CODES.has(warning.code) &&
        warning.file === "manifest.json" &&
        typeof warning.description === "string" &&
        warning.description.includes("data_collection_permissions")
    );
}

export function evaluateReport(report) {
    const errors = Array.isArray(report && report.errors) ? report.errors : [];
    const warnings = Array.isArray(report && report.warnings) ? report.warnings : [];
    const allowedWarnings = warnings.filter(isAllowedCompatibilityWarning);
    const unexpectedWarnings = warnings.filter((warning) => !isAllowedCompatibilityWarning(warning));

    return {
        errors,
        warnings,
        allowedWarnings,
        unexpectedWarnings,
        ok: errors.length === 0 && unexpectedWarnings.length === 0,
    };
}

function printMessages(label, messages) {
    if (messages.length === 0) {
        return;
    }
    console.error(`${label}:`);
    for (const message of messages) {
        console.error(`- ${message.code}: ${message.message || message.description || ""}`);
    }
}

function main() {
    const archive = process.argv[2];
    if (!archive) {
        console.error("Usage: node scripts/lint-build.mjs <extension.zip>");
        process.exit(2);
    }

    const executable = process.platform === "win32" ? "addons-linter.cmd" : "addons-linter";
    const result = spawnSync(executable, ["--output", "json", archive], {
        encoding: "utf8",
        shell: process.platform === "win32",
    });

    if (result.error) {
        console.error(result.error.message);
        process.exit(2);
    }
    if (!result.stdout) {
        process.stderr.write(result.stderr || "addons-linter produced no JSON output\n");
        process.exit(result.status || 2);
    }

    let report;
    try {
        report = JSON.parse(result.stdout);
    } catch (error) {
        process.stderr.write(result.stdout);
        process.stderr.write(result.stderr || "");
        console.error(`Unable to parse addons-linter JSON output: ${error.message}`);
        process.exit(2);
    }

    const evaluation = evaluateReport(report);
    const summary = report.summary || {};
    console.log(
        `addons-linter: ${summary.errors || 0} errors, ${summary.warnings || 0} warnings, ${summary.notices || 0} notices`
    );

    if (evaluation.allowedWarnings.length > 0) {
        console.log(
            "Accepted compatibility warning: data_collection_permissions is required by current Firefox/AMO, " +
            "but older supported Firefox versions predate that manifest key."
        );
        for (const warning of evaluation.allowedWarnings) {
            console.log(`- ${warning.code}: ${warning.description}`);
        }
    }

    printMessages("Unexpected add-on linter errors", evaluation.errors);
    printMessages("Unexpected add-on linter warnings", evaluation.unexpectedWarnings);

    if (!evaluation.ok || (result.status !== 0 && evaluation.errors.length > 0)) {
        process.exit(1);
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}
