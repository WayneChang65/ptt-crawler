// eslint.config.js
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintJs from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ["dist", "node_modules", "coverage", "benchmarks/", "examples/", "*.cjs"],
  },
  eslintJs.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  }
];
