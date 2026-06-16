/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ['@church-flow/eslint-config/react'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'vite.config.ts',
    'tailwind.config.ts',
    'postcss.config.js',
  ],
}
