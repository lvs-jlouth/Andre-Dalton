import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        aurora: {
          bg: '#0a1628',
          panel: '#0d1f3c',
          border: '#1a3a5c',
          cyan: '#00d4ff',
          blue: '#0080ff',
          teal: '#00b5a5',
          white: '#e8f4ff',
          muted: '#6b8cae',
          danger: '#ff4444',
          warn: '#ffaa00',
          success: '#00cc66',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'spin-reverse-slow': 'spin-reverse 10s linear infinite',
        'waveform': 'waveform 1.2s ease-in-out infinite',
        'scanline': 'scanline 6s linear infinite',
        'float-slow': 'float-slow 5s ease-in-out infinite',
        signal: 'signal 2.4s ease-in-out infinite',
        drift: 'drift 18s linear infinite',
      },
      keyframes: {
        waveform: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
        'spin-reverse': {
          '0%': { transform: 'rotate(360deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        signal: {
          '0%, 100%': { opacity: '0.35', transform: 'scale(0.96)' },
          '50%': { opacity: '1', transform: 'scale(1.03)' },
        },
        drift: {
          '0%': { transform: 'translate3d(-4%, 0%, 0) scale(1)' },
          '50%': { transform: 'translate3d(4%, -3%, 0) scale(1.05)' },
          '100%': { transform: 'translate3d(-4%, 0%, 0) scale(1)' },
        },
      },
      backgroundImage: {
        'grid-hud': 'linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)',
        'panel-grid': 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid-hud': '40px 40px',
        'panel-grid': '18px 18px',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
} satisfies Config;
