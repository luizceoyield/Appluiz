/**
 * Identidade: paleta institucional Sicoob Centro (extraída da logo).
 * Tipografia: Sora (títulos, geométrica como os triângulos da marca),
 * IBM Plex Sans (texto) e IBM Plex Mono (placas, KM e horários).
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sicoob: {
          escuro: '#003641', // verde-petróleo (texto "SICOOB")
          'escuro-2': '#0b4a56',
          noite: '#00262e', // fundo do menu lateral
          turquesa: '#00AE9D',
          'turquesa-claro': '#e0f5f3',
          verde: '#7DB61C',
          lima: '#C9D200',
        },
        nevoa: {
          50: '#f4f7f7', // fundo da página (cinza com leve viés petróleo)
          100: '#e9efef',
          200: '#d7e0e1',
          300: '#b9c7c9',
          400: '#8a9ea1',
          500: '#61777b',
          600: '#4a5e62',
          700: '#33464a',
          800: '#22363a',
          900: '#14262a',
        },
        placa: { azul: '#003399' },
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        cartao: '0 1px 2px rgba(0,38,46,.06), 0 4px 16px -8px rgba(0,38,46,.12)',
        elevado: '0 2px 4px rgba(0,38,46,.06), 0 16px 32px -12px rgba(0,38,46,.25)',
      },
      keyframes: {
        'subir': { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } },
        'surgir': { from: { opacity: '0', transform: 'scale(.96)' }, to: { opacity: '1', transform: 'none' } },
        'revelar': { from: { clipPath: 'inset(0 100% 0 0)' }, to: { clipPath: 'inset(0 0 0 0)' } },
        'estrada': { from: { backgroundPosition: '0 0' }, to: { backgroundPosition: '48px 0' } },
        'pulsar': { '0%,100%': { opacity: '1' }, '50%': { opacity: '.35' } },
        'gaveta': { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
        'carregar': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
      },
      animation: {
        subir: 'subir .45s cubic-bezier(.2,.7,.2,1) both',
        surgir: 'surgir .25s cubic-bezier(.2,.7,.2,1) both',
        revelar: 'revelar .9s cubic-bezier(.65,0,.35,1) both',
        estrada: 'estrada .6s linear infinite',
        pulsar: 'pulsar 1.6s ease-in-out infinite',
        gaveta: 'gaveta .3s cubic-bezier(.2,.7,.2,1) both',
        carregar: 'carregar 1.6s cubic-bezier(.65,0,.35,1) both',
      },
    },
  },
  plugins: [],
};
