import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: ["dist/", "node_modules/", "assets/", "coverage/", ".worktrees/", "**/*.html"],
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
      "react-hooks/exhaustive-deps": "error",
      "react-refresh/only-export-components": ["error", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["src/game/**/*.{ts,tsx}"],
    ignores: ["src/game/**/*.test.{ts,tsx}", "src/game/**/*.spec.{ts,tsx}", "src/game/testing/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "The engine must remain independent of React." },
            { name: "react-dom", message: "The engine must remain independent of React." },
          ],
          patterns: [
            {
              group: [
                "**/client/**",
                "**/components/**",
                "**/dev/**",
                "**/sim/**",
                "node:*",
                "@playwright/*",
              ],
              message:
                "Production engine code cannot import runtime adapters, presentation, development, simulation, or Node modules.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        ...[
          "window",
          "document",
          "localStorage",
          "sessionStorage",
          "navigator",
          "fetch",
          "WebSocket",
        ].map((name) => ({
          name,
          message: "Inject runtime capabilities outside src/game.",
        })),
      ],
    },
  },
  {
    // Node-context config/build files.
    files: ["**/*.{js,cjs,mjs}", "vite.config.ts", "vitest.config.ts", "eslint.config.js"],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
);
