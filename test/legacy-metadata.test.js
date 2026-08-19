import { decodeLegacyMetadata } from "../src/options/legacy-metadata.js";

test("legacy rule metadata decodes valid values and preserves malformed input", () => {
    expect(decodeLegacyMetadata("Privacy%20rule")).toBe("Privacy rule");
    expect(decodeLegacyMetadata("%E2%9C%93")).toBe("✓");
    expect(decodeLegacyMetadata("%")).toBe("%");
    expect(decodeLegacyMetadata("%ZZ")).toBe("%ZZ");
    expect(decodeLegacyMetadata("valid%20prefix%ZZ")).toBe("valid%20prefix%ZZ");
    expect(decodeLegacyMetadata(null)).toBe("");
});
