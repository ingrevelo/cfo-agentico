/**
 * Paleta de CFO Agéntico.
 *
 * El violeta de Belo (#5300DA) manda en todo lo interactivo: botones, enlaces y foco.
 * Los colores de la propuesta de identidad (Inteligencia, Cercanía, Profesionalismo,
 * Calma, Progreso) van en superficies, ilustración y estados.
 *
 * Todo texto llega a 4,5:1 de contraste. Los colores que NO pasan como texto están
 * marcados: se usan solo en rellenos, íconos y barras.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fondo: '#F5F3ED', // Calma: el fondo de la app
        tarjeta: '#FFFFFF',
        tinta: '#202127', // Profesionalismo: texto y encabezados
        'tinta-suave': '#5F6068', // texto secundario (6,25:1 sobre blanco)
        violeta: {
          DEFAULT: '#5300DA', // Belo: botones, enlaces, foco (blanco encima: 8,8:1)
          hover: '#43009F',
          medio: '#6944D4', // Inteligencia: encabezados de tarjeta y acentos
          claro: '#BBA9F4', // Cercanía: chips, bordes, ilustración. NUNCA texto sobre blanco
          suave: '#EDE8FD', // fondos de burbujas, chips y hoja
        },
        exito: {
          DEFAULT: '#34A87B', // Progreso: SOLO rellenos, íconos y barras (2,7:1: no es texto)
          texto: '#1F7A57', // el verde que sí se puede leer
          suave: '#E3F4EC',
        },
        peligro: {
          DEFAULT: '#B3261E',
          suave: '#FDECEA',
        },
        aviso: {
          texto: '#7A4E00',
          suave: '#FFF1CC',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
