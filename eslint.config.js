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
  // Chakra snippets, added by `@chakra-ui/cli snippet add` and meant to be
  // replaced by re-running it. Holding generated code to the repo's own style
  // just means re-editing it after every regeneration, so the type-aware
  // rules it trips are off here and nowhere else.
  {
    files: ["packages/frame-studio/src/components/ui/**/*"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      curly: "off",
    },
  },
]);
