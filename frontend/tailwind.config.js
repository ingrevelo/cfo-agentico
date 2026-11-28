/** Tokens de la estética tipo Belo. Se usan como clases: bg-fog, text-ash, bg-mint... */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fog: '#FAFAFA',
        card: '#FFFFFF',
        ink: '#000000',
        ash: '#999999',
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
