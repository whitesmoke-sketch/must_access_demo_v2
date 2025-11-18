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
        // MUST Access 브랜드 컬러 (Figma Guidelines)
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
        // Dashboard 추가 컬러
        purple: {
          DEFAULT: '#9B51E0',
          light: '#F3E8FF',
        },
        orange: {
          DEFAULT: '#FF8A5C',
          light: '#FFF4EF',
        },
        cyan: {
          DEFAULT: '#16CDC7',
          light: '#E0F7F6',
        },
        pink: {
          DEFAULT: '#FF6BA9',
          light: '#FFE8F3',
        },
        green: {
          DEFAULT: '#4CD471',
          light: '#E8F9ED',
        },
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'h1': ['22px', { lineHeight: '1.25', fontWeight: '500' }],
        'h2': ['20px', { lineHeight: '1.3', fontWeight: '500' }],
        'body': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['14px', { lineHeight: '1.4', fontWeight: '400' }],
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
      maxWidth: {
        container: '1280px',
      },
      transitionDuration: {
        'fast': '150ms',
        'modal': '200ms',
      },
      transitionTimingFunction: {
        'smooth': 'ease-in-out',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
}

export default config
