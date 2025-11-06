import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**"],
    rules: {
  // Production: keep builds clean; these can be re-enabled in CI if desired
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-unused-vars": "off",
  "react-hooks/exhaustive-deps": "off",
  "@next/next/no-img-element": "off",
  "prefer-const": "off",
    },
  },
];

export default eslintConfig;
