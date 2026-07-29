import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname
});

const config = [
  {
    ignores: ['**/.next/**', '**/node_modules/**', 'public/**']
  },
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      '@next/next/no-page-custom-font': 'off'
    }
  }
];

export default config;
