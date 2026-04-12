import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
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
]);

export default eslintConfig;
