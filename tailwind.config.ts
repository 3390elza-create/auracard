import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background:        '#0B0B10',
        surface:           '#131318',
        'surface-low':     '#1B1B20',
        'surface-mid':     '#1F1F24',
        'text-primary':    '#F7F9FA',
        'text-secondary':  '#A0A9BE',
        'aurora-violet':   '#7C5CFF',
        'aurora-blue':     '#4F8CFF',
        'aurora-teal':     '#2DD4BF',
        'glass-fill':      'rgba(255,255,255,0.07)',
        'glass-border':    'rgba(255,255,255,0.12)',
        'error':           '#FF6B6B',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg':  ['64px', { lineHeight: '1.1', letterSpacing: '-0.04em', fontWeight: '600' }],
        'headline-lg': ['40px', { lineHeight: '1.2', letterSpacing: '-0.03em', fontWeight: '600' }],
        'headline-md': ['24px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '500' }],
        'body-lg':     ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md':     ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'label-md':    ['14px', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }],
        'label-sm':    ['12px', { lineHeight: '1.2', letterSpacing: '0.05em', fontWeight: '600' }],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
      },
      spacing: {
        gutter:          '24px',
        'stack-sm':      '8px',
        'stack-md':      '16px',
        'stack-lg':      '32px',
        'margin-mobile': '20px',
        'margin-desktop':'40px',
      },
      maxWidth: {
        'container-max': '1280px',
      },
      backgroundImage: {
        'aurora-gradient': 'linear-gradient(135deg, #7C5CFF 0%, #4F8CFF 50%, #2DD4BF 100%)',
      },
      backdropBlur: {
        glass: '20px',
      },
      boxShadow: {
        'glow-violet': '0 0 20px rgba(124,92,255,0.4)',
        'glow-teal':   '0 0 8px rgba(45,212,191,0.6)',
      },
    },
  },
  plugins: [],
}

export default config
