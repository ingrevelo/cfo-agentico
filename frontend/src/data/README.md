# Datos de la demo

**Todo acá es sintético.** No corresponde a ninguna persona ni empresa real.

Estos archivos existen solo para que las pantallas funcionen mientras la API no está. Los importa
**un solo archivo**, `src/api/mock/MockCfoApi.ts`. Ninguna pantalla lee un JSON.

| Archivo | Qué es |
|---|---|
| `sofia-demo.json` | Copia de `data/sofia-demo.json` de la raíz del repositorio |
| `pyme-demo.json` | Perfil consultora/pyme, con el mismo esquema y las mismas claves |
| `perfiles.ts` | Lo que cambia entre un perfil y otro: etiqueta del login, descripción y textos |
| `perfilado.ts` | Las propuestas del perfilado y la frase contrafáctica, por perfil |

## Los dos perfiles

| | Sofía | Nodo Consultora |
|---|---|---|
| Quién es | Diseñadora freelance | Consultora de datos, clientes en 3 países |
| Ingreso | USD 1.500 | USD 6.000 |
| Colchón mínimo | USD 500 | USD 2.000 |
| Tope por conversión | USD 400 | USD 4.000 |
| Impuestos | 8% | 15% |
| Vencimientos de la semana | Alquiler, jueves | Sueldos y proveedores, viernes |

Son el **mismo agente, las mismas pantallas y el mismo juez**: solo cambian los datos y los textos.

## Por qué la pyme cobra en dólares

La consultora factura a clientes de EE. UU., Brasil y Europa, pero sus cobros llegan a Belo **ya
convertidos a dólares digitales** (USDT o USDC), que es como funciona Belo. Por eso el saldo está en
USD y `allowed_currencies` queda igual que el de Sofía.

D12 dice que cada obligación se convierte a la moneda en que vence (ARS, BRL, COP, CLP o MXN), pero
**el juez de hoy solo admite USD, USDT, USDC y ARS** (`docs/arquitectura.md` §4, paso 3): cualquier
otra moneda se bloquea. Por eso no inventamos monedas nuevas en este perfil.

## Pendiente de acordar con el backend

`pyme-demo.json` **debería moverse a `data/` en la raíz**, al lado de `sofia-demo.json`, si Vanessa y
Juan Carlos están de acuerdo (`data/` es de Vanessa). Hoy vive acá porque Vite solo puede importar
archivos de dentro de `frontend/`.

Si cambian los datos en la raíz, hay que copiarlos de nuevo acá. Cuando la API esté lista, esta
carpeta se borra entera.
