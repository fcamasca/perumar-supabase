import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', '.cache/**', 'supabase/.temp/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'], languageOptions: { globals: globals.browser } },
  { files: ['*.{js,ts}'], languageOptions: { globals: globals.node } },
)
