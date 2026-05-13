const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: ['coverage/**', 'android/**', 'ios/**', 'node_modules/**'],
  },
  {
    files: ['jest.setup.js'],
    languageOptions: {
      globals: {
        jest: 'readonly',
      },
    },
  },
  {
    files: ['tailwind.config.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
