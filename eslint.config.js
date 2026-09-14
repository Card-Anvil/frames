import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["**/dist", "attic", "**/*.tsbuildinfo"]),
  {
    files: ["**/*.ts"],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: {
          // Tooling config that lives outside the packages tsconfig covers.
          allowDefaultProject: ["vitest.config.ts"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      curly: ["error", "all"],
    },
  },
  // The studio is a React app. Same strictness, plus the hooks rules —
  // `exhaustive-deps` is what keeps its imperative Konva effects honest.
  {
    files: ["packages/frame-studio/**/*.tsx"],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      curly: ["error", "all"],
    },
  },
]);
