import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import astroParser from 'astro-eslint-parser';
import astroPlugin from 'eslint-plugin-astro';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.astro/**',
      '.cache/**',
      '.agents/**',
      '.claude/**',
      '.lighthouseci/**',
      '.netlify/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...astroPlugin.configs.recommended,
  {
    files: ['src/**/*.{js,jsx,ts,tsx}', 'sentry.client.config.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        console: 'readonly',
        performance: 'readonly',
        PerformanceResourceTiming: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Interdire complètement l'usage d'any
      '@typescript-eslint/no-explicit-any': 'error',

      // Règles de typage strict (moins strictes pour React)
      '@typescript-eslint/explicit-function-return-type': 'off', // Désactivé pour React
      '@typescript-eslint/explicit-module-boundary-types': 'off', // Désactivé pour React
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',

      // Règles générales
      'no-unused-vars': 'off', // Laisser TypeScript gérer cela
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['src/**/*.astro'],
    languageOptions: {
      parser: astroParser,
      parserOptions: {
        parser: tsparser,
        extraFileExtensions: ['.astro'],
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        console: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Même règles pour les fichiers Astro
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['playwright*.config.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.tests.json',
      },
      globals: {
        caches: 'readonly',
        document: 'readonly',
        DOMException: 'readonly',
        History: 'readonly',
        HTMLImageElement: 'readonly',
        HTMLLinkElement: 'readonly',
        navigator: 'readonly',
        process: 'readonly',
        Storage: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        window: 'readonly',
        Window: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['tests/unit/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        structuredClone: 'readonly',
      },
    },
  },
  {
    files: [
      'scripts/**/*.{js,mjs}',
      'astro.config.mjs',
      'eslint.config.js',
      'tailwind.config.js',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
      },
    },
  },
];
