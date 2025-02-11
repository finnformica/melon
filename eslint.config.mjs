import globals from "globals";
import tseslint from "typescript-eslint";
import migratedRules from "./react-native-eslint.config.mjs";

export default tseslint.config(
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...migratedRules,
  {
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname, // use `__dirname` if cjs module
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        React: true,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-require-imports": 0,
      "@typescript-eslint/no-misused-promises": 1,
      "@typescript-eslint/no-floating-promises": 1,
      "@typescript-eslint/no-unsafe-assignment": 1,
      "@typescript-eslint/no-duplicate-type-constituents": 1,
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-shadow": 1,
    },
  },
  {
    ignores: [
      "eslint.config.mjs",
      "metro.config.js",
      "babel.config.js",
      "tailwind.config.js",
      "react-native-eslint.config.mjs",
      "**/__tests__/**",
      "expo-env.d.ts",
      ".expo/**/*.d.ts",
      "nativewind-env.d.ts",
    ],
  },
);
