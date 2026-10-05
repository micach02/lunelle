import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'public/sw.js'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          // Context modules export their provider plus its hook; shared UI helpers.
          allowExportNames: ['useAuth', 'useTracking', 'usePartnerAccess', 'useToast', 'useRecordDialogs', 'buttonClasses', 'routes', 'createAppRouter'],
        },
      ],
      // Sensitive reproductive data must never reach the console.
      // The only permitted console usage lives in src/lib/logger.ts.
      'no-console': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Edge Functions log only status codes / error names, never user data.
    files: ['src/lib/logger.ts', 'supabase/functions/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['tests/**/*.ts', 'src/test/**/*.ts', '**/*.test.{ts,tsx}', 'vite.config.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
);
