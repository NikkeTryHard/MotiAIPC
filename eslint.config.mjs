import js from '@eslint/js';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // Global ignores
  {
    ignores: ['node_modules/', 'dist/', 'build/'],
  },

  // Main configuration for all JavaScript files
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      // Inherit all rules from ESLint's recommended configuration
      ...js.configs.recommended.rules,

      // Add/override custom rules
      'no-var': 'error',
      'no-console': 'warn',
    },
  },

  // This must be the LAST configuration in the array to properly
  // override any conflicting formatting rules from other configs.
  eslintConfigPrettier,
];