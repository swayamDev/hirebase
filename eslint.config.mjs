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
    // Not our app code: agent tooling, worktrees, skills, generated output.
    ".claude/**",
    ".agents/**",
    "agent/**",
    "dist/**",
    ".sanity/**",
  ]),
  {
    rules: {
      // Date.now() in Server Component render is per-request, not per-re-render -
      // the purity rule can't see the server/client split. Keep visible as warnings.
      "react-hooks/purity": "warn",
      // Init-from-browser-state effects (typewriters, matchMedia, event bridges) -
      // shadcn's own use-mobile ships this pattern.
      "react-hooks/set-state-in-effect": "warn",
      // Underscore convention for intentionally-unused destructures (e.g. _omit).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
