import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  rules: {
    'jsonc/sort-keys': 'off',
    'node/prefer-global/process': 'off',
    'no-console': 'off',
    'unused-imports/no-unused-vars': 'off',
  },
})
