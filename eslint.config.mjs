import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * Flat ESLint configuration.
 *
 * Extends `next/core-web-vitals` and `next/typescript`. The collaborative
 * editor intentionally wires a handful of effects with narrower dependency
 * lists (the Y.Doc / provider objects are stable for the lifetime of the
 * page), so `react-hooks/exhaustive-deps` is relaxed.
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "react-hooks/exhaustive-deps": "off",
      "react/no-unescaped-entities": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
