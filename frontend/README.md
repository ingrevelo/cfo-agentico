# Frontend · CFO Agéntico

React + TypeScript. Web app limpia, con estética Belo y sin aspecto de plantilla genérica de IA.

> **Estado:** estructura documentada. Se construye durante el hackathon.

## Las 4 pantallas de la demo (50 segundos)

| Pantalla | Tiempo | Qué se ve |
|---|---|---|
| 1 · Reglas de Sofía | 5 s | Colchón, tope, tolerancia de FX y vencimientos, editables |
| 2 · Plan del ingreso | 15 s | Entra un pago y aparece una tarjeta con 3 movimientos y su explicación |
| 3 · Caso Rojo + aprobación | 20 s | El motor bloquea una conversión que rompe el colchón; luego el OK con los estados visibles |
| 4 · Resumen y MCP Log | 10 s | Qué se hizo, por qué y con cuánto dinero, más cada tool llamada con su ID, estado y badge SIMULATED |

## Estructura prevista

```
src/
├── screens/      Una carpeta por pantalla
├── components/   Tarjeta del plan, badge de estado, badge SIMULATED, tabla del MCP Log
└── api/          Cliente del backend
```

Textos en castellano simple. Se escribe "dinero", no "plata".
