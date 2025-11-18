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
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))'
  			},
  			error: {
  				DEFAULT: 'hsl(var(--error))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontFamily: {
  			sans: [
  				'Pretendard',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'system-ui',
  				'sans-serif'
  			]
  		},
  		fontSize: {
  			h1: [
  				'22px',
  				{
  					lineHeight: '1.25',
  					fontWeight: '500'
  				}
  			],
  			h2: [
  				'20px',
  				{
  					lineHeight: '1.3',
  					fontWeight: '500'
  				}
  			],
  			body: [
  				'16px',
  				{
  					lineHeight: '1.5',
  					fontWeight: '400'
  				}
  			],
  			caption: [
  				'14px',
  				{
  					lineHeight: '1.4',
  					fontWeight: '400'
  				}
  			]
  		},
		borderRadius: {
			lg: 'var(--radius)',
			md: 'calc(var(--radius) - 2px)',
			sm: 'calc(var(--radius) - 4px)',
			card: '16px',
			button: '8px'
		},
  		spacing: {
  			xs: '4px',
  			sm: '8px',
  			md: '16px',
  			lg: '24px',
  			xl: '32px',
  			'2xl': '48px',
  			'3xl': '64px'
  		},
  		maxWidth: {
  			container: '1280px'
  		},
  		transitionDuration: {
  			fast: '150ms',
  			modal: '200ms'
  		},
  		transitionTimingFunction: {
  			smooth: 'ease-in-out'
  		},
  		boxShadow: {
  			card: '0 2px 8px rgba(0, 0, 0, 0.08)'
  		}
  	}
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
