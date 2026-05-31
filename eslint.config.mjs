import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import security from "eslint-plugin-security";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    ...security.configs.recommended,
    rules: {
      ...security.configs.recommended.rules,
      // High false-positive rules — obj[key] is idiomatic TS, not a real injection risk
      "security/detect-object-injection": "off",
      // Non-literal fs paths are unavoidable in upload handlers; paths are sanitised before use
      "security/detect-non-literal-fs-filename": "off",
      // Non-literal RegExp: low value, many legitimate uses
      "security/detect-non-literal-regexp": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Pragmatic overrides:
  // - Route handlers deal with dynamic JSON and external inputs; strict "no any"
  //   makes lint noisy and non-actionable here.
  // - Keep stricter typing for UI/components by scoping this override to `app/api/**`.
  {
    files: ["app/api/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Global tweaks to keep lint actionable in this repo.
  {
    rules: {
      // The repo currently contains dynamic parsing/integration code (OpenAI, Google Maps, etc.).
      // Treat explicit `any` as a warning rather than a hard error.
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow unused args/vars when intentionally prefixed with `_`.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Prefer-const is useful but shouldn't block CI.
      "prefer-const": "warn",
      // These rules are too strict/noisy for current patterns.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/error-boundaries": "off",
    },
  },
  // Scripts are maintenance utilities; allow common Node patterns.
  {
    files: ["scripts/**/*.{js,ts}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Prettier must come last — disables all ESLint rules that conflict with formatting
  prettierConfig,
]);

export default eslintConfig;
