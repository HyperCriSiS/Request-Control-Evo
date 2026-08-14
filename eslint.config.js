import js from "@eslint/js";
import globals from "globals";

export default [
    {
        ignores: ["coverage/**", "lib/**", "node_modules/**", "web-ext-artifacts/**"],
    },
    js.configs.recommended,
    {
        files: ["src/**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.webextensions,
            },
        },
        rules: {
            "no-prototype-builtins": "off",
            "no-unused-vars": ["error", {"argsIgnorePattern": "^_", "caughtErrors": "none"}],
        },
    },
    {
        files: ["test/**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.jest,
            },
        },
        rules: {
            "no-prototype-builtins": "off"
        }
    }
];
