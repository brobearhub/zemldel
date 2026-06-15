// @ts-check
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...nextCoreWebVitals,
  {
    ignores: ['coverage/**', 'shared/api/generated/**'],
  },
  {
    rules: {
      // These rules are overly strict for our current codebase
      // and require broad refactors without improving correctness.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/error-boundaries': 'off',
    },
  },
];

export default config;

