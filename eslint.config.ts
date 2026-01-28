import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";


export default tseslint.config(
  { ignores: ["dist", "coverage", "node_modules", "ecosystem.config.cjs", "jest.config.cjs"] },
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], plugins: { js }, extends: [js.configs.recommended], languageOptions: { globals: globals.browser } },
  tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_" }]
    }
  },
);
