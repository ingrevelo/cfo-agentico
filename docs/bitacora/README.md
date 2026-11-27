# Bitácora

Un corte cada **6 horas** durante el hackathon. Sirve para retomar el hilo cuando alguien vuelve después de dormir y para tener material del pitch del domingo.

Un archivo por corte:

```
YYYYMMDD-HHMM.md
```

Por ejemplo: `20261127-2200.md`, `20261128-0400.md`, `20261128-1000.md`.

Lo escribe quien esté despierto en ese momento, con lo que vea en [`../estado.md`](../estado.md), en `mensajes/` y en los commits de las últimas 6 horas.

## Plantilla

```markdown
# Corte YYYY-MM-DD HH:MM

**Escribe:** <quien>

## Qué se cerró
- <área>: <qué quedó andando, con la rama o el Pull Request>

## Qué quedó abierto
- <área>: <qué falta y quién sigue>

## Bloqueos
- <bloqueo y a quién le toca desbloquearlo> · o "ninguno"

## Decisiones
- <decisión tomada en estas 6 horas> · o "ninguna"
  <!-- Si cierra algo, se agrega también a ../decisiones.md -->

## Riesgo del próximo tramo
- <lo que más puede salir mal en las próximas 6 horas>
```

## Reglas

1. **Corto:** una pantalla, con viñetas. No es un informe.
2. **No se edita un corte ya escrito.** Si hay que corregir algo, se dice en el corte siguiente.
3. **Lo que se decide se eleva** a `../decisiones.md`; el detalle de quién hace qué vive en `../estado.md`.
4. **Cero secretos y solo datos sintéticos.**
5. **Castellano simple.** Se escribe "dinero", nunca "plata".
