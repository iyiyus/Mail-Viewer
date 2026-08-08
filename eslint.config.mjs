import path from 'path'
import { fileURLToPath } from 'url'
import pluginJs from '@eslint/js'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let autoImportGlobals = {}
try {
  autoImportGlobals = JSON.parse(
    (await import('fs')).readFileSync(path.resolve(__dirname, '.auto-import.json'), 'utf-8')
  ).globals
} catch {
  // .auto-import.json 不存在时跳过
}

export default [
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,vue}']
  },
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    }
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,vue}'],
    languageOptions: {
      globals: { ...autoImportGlobals, Api: 'readonly' }
    },
    rules: {
      quotes: ['error', 'single'],
      semi: ['error', 'never'],
      'no-var': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      'vue/multi-word-component-names': 'off',
      'no-multiple-empty-lines': ['warn', { max: 1 }],
      'no-unexpected-multiline': 'error'
    }
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser }
    }
  },
  {
    ignores: ['node_modules', 'dist', 'public', 'src/assets/**']
  },
  eslintPluginPrettierRecommended
]
