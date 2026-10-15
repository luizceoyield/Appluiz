/** Paleta institucional Sicoob Centro (extraída da logo). */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sicoob: {
          escuro: '#003641', // verde-petróleo (texto "SICOOB")
          'escuro-2': '#0b4a56',
          turquesa: '#00AE9D', // "Centro" / triângulo superior direito
          'turquesa-claro': '#e0f5f3',
          verde: '#7DB61C', // triângulo superior esquerdo
          lima: '#C9D200', // triângulo inferior
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
