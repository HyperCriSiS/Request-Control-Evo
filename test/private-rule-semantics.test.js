import { privateWindowEditorValue } from "../src/options/rule-editor-state.js";

test("private-window-only rules remain explicitly selected", () => {
    expect(privateWindowEditorValue({ incognito: true })).toBe("true");
});

test("normal-window-only rules preserve explicit private-window exclusion", () => {
    expect(privateWindowEditorValue({ incognito: false })).toBe("false");
});

test("rules without a private-window constraint reset the editor to both contexts", () => {
    expect(privateWindowEditorValue({})).toBe("");
    expect(privateWindowEditorValue()).toBe("");
});
