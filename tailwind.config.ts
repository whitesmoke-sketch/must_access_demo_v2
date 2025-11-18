import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // MUST Access 브랜드 컬러
        primary: {
          DEFAULT: '#635BFF',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#16CDC7',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#F8C653',
          foreground: '#29363D',
        },
        success: {
          DEFAULT: '#4CD471',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#F8C653',
          foreground: '#29363D',
        },
        error: {
          DEFAULT: '#FF6B6B',
          foreground: '#FFFFFF',
        },
        info: {
          DEFAULT: '#1F99FF',
          foreground: '#FFFFFF',
        },
        border: '#E5E8EB',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        gray: {
          100: '#F6F8F9',
          300: '#D3D9DC',
          500: '#A0ACB3',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        button: '8px',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
    },
  },
  plugins: [],
}

export default config
