import { readFileSync } from "node:fs";

const releaseWorkflow = readFileSync(".github/workflows/release.yml", "utf8");
const buildWorkflow = readFileSync(".github/workflows/main.yml", "utf8");
const dependabotConfig = readFileSync(".github/dependabot.yml", "utf8");

test("release publication is manual-only and master-bound", () => {
    expect(releaseWorkflow).toMatch(/^on:\n  workflow_dispatch:/m);
    expect(releaseWorkflow).not.toMatch(/^  push:/m);
    expect(releaseWorkflow).toContain('if [[ "$GITHUB_REF_NAME" != "master" ]]');
    expect(releaseWorkflow).toContain("CHANGELOG.md still marks $VERSION as Unreleased");
});

test("CI and dependency updates use master as the only long-lived branch", () => {
    expect(buildWorkflow).toMatch(/branches:\n      - master/);
    expect(buildWorkflow).not.toMatch(/^      - dev$/m);
    expect(dependabotConfig).toContain('target-branch: "master"');
    expect(dependabotConfig).not.toContain('target-branch: "dev"');
});
