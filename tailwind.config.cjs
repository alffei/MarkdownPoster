/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './types.ts',
    './components/**/*.{ts,tsx}',
    './config/**/*.{ts,tsx}',
    './constants/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6'
      },
      fontFamily: {
        sans: [
          '"Google Sans Text"',
          '"Google Sans"',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          '"Noto Sans"',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"'
        ],
        serif: [
          '"Noto Serif"',
          'ui-serif',
          'Georgia',
          'Cambria',
          '"Times New Roman"',
          'Times',
          'serif'
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace'
        ]
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.gray.800'),
            maxWidth: 'none',
            a: {
              color: theme('colors.blue.500'),
              '&:hover': {
                color: theme('colors.blue.700')
              }
            },
            code: {
              backgroundColor: 'rgba(135, 131, 120, 0.15)',
              borderRadius: theme('borderRadius.md'),
              paddingTop: theme('spacing.0.5'),
              paddingBottom: theme('spacing.0.5'),
              paddingLeft: theme('spacing.1.5'),
              paddingRight: theme('spacing.1.5'),
              fontWeight: '600'
            },
            'code::before': {
              content: '""'
            },
            'code::after': {
              content: '""'
            },
            'pre code': {
              backgroundColor: 'transparent',
              padding: '0',
              fontWeight: 'inherit'
            }
          }
        }
      })
    }
  },
  plugins: [require('@tailwindcss/typography')]
};

