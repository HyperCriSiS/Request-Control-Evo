import { evaluateReport, isAllowedCompatibilityWarning } from "../scripts/lint-build.mjs";

const dataPermissionWarning = {
    code: "KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION",
    message: "Manifest key not supported by the specified minimum Firefox version",
    description:
        '"strict_min_version" requires Firefox 79.0, which was released before version 140 introduced support for "browser_specific_settings.gecko.data_collection_permissions".',
    file: "manifest.json",
};

test("allows only the known data_collection_permissions minimum-version warning", () => {
    expect(isAllowedCompatibilityWarning(dataPermissionWarning)).toBe(true);
    expect(
        isAllowedCompatibilityWarning({
            ...dataPermissionWarning,
            description: dataPermissionWarning.description.replace("data_collection_permissions", "action"),
        })
    ).toBe(false);
});

test("allows the Android variant only for data_collection_permissions", () => {
    expect(
        isAllowedCompatibilityWarning({
            ...dataPermissionWarning,
            code: "KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION",
        })
    ).toBe(true);
});

test("fails the gate for any unrelated warning or error", () => {
    const unexpected = {
        code: "DANGEROUS_EVAL",
        message: "Dangerous eval",
        description: "Unexpected executable code",
        file: "src/example.js",
    };

    expect(evaluateReport({ errors: [], warnings: [dataPermissionWarning] })).toMatchObject({
        ok: true,
        allowedWarnings: [dataPermissionWarning],
        unexpectedWarnings: [],
    });
    expect(evaluateReport({ errors: [], warnings: [dataPermissionWarning, unexpected] }).ok).toBe(false);
    expect(evaluateReport({ errors: [unexpected], warnings: [] }).ok).toBe(false);
});
