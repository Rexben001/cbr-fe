import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

export default [
  { ignores: ['dist', 'coverage'] },
  {
    ...js.configs.recommended,
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser, parser: tsParser },
    plugins: { '@typescript-eslint': tseslint, 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
]
