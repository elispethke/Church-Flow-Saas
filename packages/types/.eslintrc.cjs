/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ['@church-flow/eslint-config'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['dist/', 'node_modules/'],
}
