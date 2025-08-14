// // eslint.config.mjs
// // @ts-check
// import js from '@eslint/js';
// import tseslint from 'typescript-eslint';
// import globals from 'globals';
// import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

// export default tseslint.config(
//   // 0) Ignore early so project service never touches these
//   {
//     ignores: ['dist', 'node_modules', 'eslint.config.mjs'],
//   },

//   // 1) Base JS rules
//   js.configs.recommended,

//   // 2) TS rules with type-checking (needs tsconfig.json)
//   ...tseslint.configs.recommendedTypeChecked,

//   // 3) Prettier integration
//   eslintPluginPrettierRecommended,

//   // 4) Project wiring + custom rules
//   {
//     languageOptions: {
//       parserOptions: {
//         project: ['./tsconfig.json'],
//         tsconfigRootDir: import.meta.dirname,
//         ecmaVersion: 'latest',
//         sourceType: 'commonjs', // <- matches your tsconfig.module
//       },
//       globals: {
//         ...globals.node,
//       },
//     },
//     rules: {
//       '@typescript-eslint/no-unsafe-assignment': 'off',
//       '@typescript-eslint/no-explicit-any': 'error',
//       '@typescript-eslint/naming-convention': [
//         'error',
//         { selector: 'interface', format: ['PascalCase'], prefix: ['I'] },
//         { selector: 'enum', format: ['PascalCase'], prefix: ['E'] },
//       ],
//       '@typescript-eslint/no-floating-promises': 'error',
//     },
//   },

//   // 5) Jest files (optional)
//   {
//     files: ['**/*.spec.ts', '**/*.test.ts'],
//     languageOptions: {
//       globals: { ...globals.jest },
//     },
//   },
// );

import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      //Enforce "I" prefix for interface names
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: {
            regex: '^I[A-Z]',
            match: true,
          },
        },
        {
          selector: 'enum',
          format: ['PascalCase'],
          custom: {
            regex: '^E[A-Z]',
            match: true,
          },
        },
      ],
      // Disallow unused variables
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error'],

      // Keep these if needed
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  },
);
