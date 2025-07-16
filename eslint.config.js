export default [
  {
    files: ['app/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {},
    rules: {
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
    },
  },
];
