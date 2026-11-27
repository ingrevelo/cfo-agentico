## Qué cambia

## Caso de seguridad relacionado
<!-- T01–T11, si aplica -->

## Checklist
- [ ] Los montos y límites viven en código (`domain/`), no en prompts.
- [ ] Toda llamada a Belo pasa por `BeloPort`.
- [ ] Lo que no es live se marca como SIMULATED.
- [ ] Los tests pasan.
