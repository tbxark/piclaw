import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  overrides: {
    jsonc: {
      'jsonc/sort-keys': 'off',
    },
  },
  rules: {
    'node/prefer-global/process': 'off',
    'no-console': 'off',
    'unused-imports/no-unused-vars': 'off',
  },
})
