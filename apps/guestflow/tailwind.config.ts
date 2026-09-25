import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f6fb',
          100: '#d9e7f5',
          200: '#b3cfea',
          300: '#80aedd',
          400: '#4d8ad0',
          500: '#0a3775',
          600: '#082e5e',
          700: '#062546',
          800: '#041c2f',
          900: '#021317',
          DEFAULT: '#0a3775',
        },
        secondary: {
          50: '#fef9eb',
          100: '#fdf3d7',
          200: '#fbe7af',
          300: '#f9da87',
          400: '#f7ce5f',
          500: '#fac72e',
          600: '#e0b029',
          700: '#b08a20',
          800: '#806517',
          900: '#50400f',
          DEFAULT: '#fac72e',
        },
        muted: {
          DEFAULT: '#f6f5f3',
          foreground: '#65758b',
        },
        accent: {
          DEFAULT: '#dce8f9',
          foreground: '#0a3775',
        },
        border: '#e0e5eb',
        foreground: '#1d2530',
        whatsapp: '#25d366',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
    },
  },
  plugins: [],
}
export default config
