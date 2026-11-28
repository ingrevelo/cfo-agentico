# Frontend · CFO Agéntico

React 18 + TypeScript con Vite y Tailwind CSS. Web app limpia, con estética Belo y sin aspecto
de plantilla genérica de IA.

> **Estado:** esqueleto con las 4 pantallas. Las pantallas 1 y 2 funcionan con datos sintéticos;
> las 3 y 4 son placeholder.

## Cómo correrlo

```bash
cd frontend
npm install     # la primera vez, o cuando cambien las dependencias
npm run dev     # servidor de desarrollo en http://localhost:5173/
```

Para revisar que todo compile antes de abrir un PR:

```bash
npm run build   # chequea los tipos y compila a frontend/dist/
npm run preview # sirve lo compilado, para verlo como va a quedar
```

No hace falta el backend: hoy las pantallas leen `src/data/sofia-demo.json`.

## Las 4 pantallas de la demo (50 segundos)

| Pantalla | Tiempo | Qué se ve | Estado |
|---|---|---|---|
| 1 · Reglas de Sofía | 5 s | Colchón, tope, tolerancia de FX y vencimientos, editables | Lista |
| 2 · Plan del ingreso | 15 s | Entra un pago y aparece una tarjeta con 3 movimientos y su explicación | Lista |
| 3 · Caso Rojo + aprobación | 20 s | El motor bloquea una conversión que rompe el colchón; luego el OK con los estados visibles | Placeholder |
| 4 · Resumen y MCP Log | 10 s | Qué se hizo, por qué y con cuánto dinero, más cada tool llamada con su ID, estado y badge SIMULATED | Placeholder |

La navegación entre pantallas es un `useState` en `src/App.tsx`: no usamos router.

## Estructura

```
frontend/
├── index.html              Página base; carga la tipografía Inter
├── package.json            Dependencias y los comandos dev/build/preview
├── vite.config.ts          Configuración de Vite
├── tailwind.config.js      Tokens de color de Belo (fog, ink, ash, mint, violeta)
├── postcss.config.js       Conecta Tailwind con Vite
├── tsconfig.json           Reglas de TypeScript
└── src/
    ├── main.tsx            Punto de entrada
    ├── App.tsx             Navegación de las 4 pantallas y estado de las reglas
    ├── index.css           Estilos base y clases reutilizables (boton-primario, tarjeta, campo)
    ├── api/cliente.ts      Tipos del JSON y funciones de datos (después pasa a fetch('/api/...'))
    ├── data/               Copia de data/sofia-demo.json (datos sintéticos)
    ├── components/         SimulatedBadge, EstadoBadge, TarjetaPlan, Figura3D
    └── screens/            Una carpeta por pantalla: reglas, plan, aprobacion, resumen
```

## Estética

| Token | Color | Uso |
|---|---|---|
| `fog` | `#FAFAFA` | Fondo de la página |
| `card` | `#FFFFFF` | Tarjetas |
| `ink` | `#000000` | Texto principal y botón primario |
| `ash` | `#999999` | Texto secundario y explicaciones |
| `mint` | `#00FFB2` | Estados completados |
| `violeta` | `#5300DA` | Badge SIMULATED y foco del teclado |

Inter. Títulos en 700, `letter-spacing: -0.04em`, `line-height: 1`. Botón primario: pastilla negra
de 40 px de alto y radio 100 px. Sombras casi nulas. Montos grandes y explicaciones en gris.
Una sola acción primaria por pantalla.

Textos en castellano simple y voseo rioplatense. Se escribe "dinero", no "plata". Sin jerga cripto:
"rindiendo", "apartar", "cambiar a pesos". Lo que no corre en vivo lleva el badge SIMULATED.
