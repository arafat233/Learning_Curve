const globals = require('globals');
module.exports = [
  { ignores: ['dist/**', 'models/**', 'node_modules/**'] },
  { files: ['**/*.js'], languageOptions: { ecmaVersion: 2023, sourceType: 'commonjs', globals: { ...globals.node, fetch: 'readonly' } },
    rules: { 'no-undef': 'error', 'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }] } },
];
