const sharedRules = {
  "no-constant-condition": "error",
  "no-undef": "error",
  "no-unreachable": "error",
  "no-unused-vars": "error",
};

export default [
  {
    ignores: ["coverage/**", "dist/**", "node_modules/**"],
  },
  {
    files: ["script.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        crypto: "readonly",
        document: "readonly",
        Intl: "readonly",
        localStorage: "readonly",
        Set: "readonly",
        window: "readonly",
      },
    },
    rules: sharedRules,
  },
  {
    files: ["**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        URL: "readonly",
      },
    },
    rules: sharedRules,
  },
];
