import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    ignores: [".claude/**", ".next/**", "node_modules/**", "tsconfig.tsbuildinfo"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "prefer-const": "warn",
    },
  },
];

export default eslintConfig;
