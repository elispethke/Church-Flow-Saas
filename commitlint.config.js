/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'chore', 'docs', 'test', 'refactor', 'perf', 'ci', 'revert'],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'api',
        'web',
        'db',
        'infra',
        'docs',
        'auth',
        'finance',
        'assets',
        'events',
        'departments',
        'users',
        'billing',
        'audit',
        'ui',
        'types',
        'config',
        'ci',
      ],
    ],
    'scope-empty': [1, 'never'],
    'subject-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 100],
  },
}
