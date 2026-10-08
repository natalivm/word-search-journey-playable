import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist/**", "node_modules/**", "_site/**", "playable-ad/**"] },

  {
    files: ["app/src/**/*.{js,jsx}"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    settings: { react: { version: "detect" } },
    plugins: { react, "react-hooks": reactHooks },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // The JSX transform makes the React import unnecessary.
      "react/react-in-jsx-scope": "off",
      // Props are documented by the components themselves; prop-types would
      // be ceremony without a type checker.
      "react/prop-types": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-unused-vars": ["error", { args: "after-used", argsIgnorePattern: "^_" }]
    }
  },

  {
    files: ["app/public/sw.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "script",
      globals: { ...globals.serviceworker, ...globals.browser }
    },
    rules: { ...js.configs.recommended.rules }
  },

  {
    files: ["scripts/**/*.mjs", "vite.config.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node }
    },
    rules: { ...js.configs.recommended.rules }
  }
];
