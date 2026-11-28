/** Tokens de la estética tipo Belo. Se usan como clases: bg-fog, text-ash, bg-mint... */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fog: '#FAFAFA',
        card: '#FFFFFF',
        ink: '#000000',
        // ash es solo decorativo: #999999 sobre blanco da 2,8:1 y no pasa WCAG AA.
        ash: '#999999',
        // Todo texto que haya que leer usa ash-texto: alrededor de 5:1 sobre blanco y sobre fog.
        'ash-texto': '#6B6B6B',
        mint: '#00FFB2',
        violeta: '#5300DA',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
