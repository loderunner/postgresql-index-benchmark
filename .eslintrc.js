/**
 * @type {import("eslint").Linter.Config}
 */
module.exports = {
  extends: ['eslint:recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  env: {
    node: true,
    es6: true,
  },
};
