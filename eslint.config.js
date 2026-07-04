import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "dist/",
      "node_modules/",
      "assets/",
      "coverage/",
      "**/*.html",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // Correctness rules stay as errors.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // Start these as warnings so the gate is green on the current
      // codebase; ratchet up to "error" as the refactor lands.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // Node-context config/build files.
    files: [
      "**/*.{js,cjs,mjs}",
      "vite.config.ts",
      "vitest.config.ts",
      "eslint.config.js",
    ],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
);
