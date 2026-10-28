# Micromón (juego personal en navegador)

RPG por turnos tipo Pokémon sobre microbiología. Diseño en `docs/gdd.txt`; decisiones y estado en `docs/auditoria.md` y `PROGRESO.md`.

## Reglas
- Idioma del juego y de los comentarios: español.
- Stack: TypeScript ejecutado y empaquetado con Bun; `tsc --noEmit -p .` para tipos; tests con `bun test` (API tipo Jest). En este entorno el registro de npm está bloqueado: no hay dependencias externas, así que no se usan Phaser, Vite, Vitest ni Zod. La validación de datos la hace `tools/validate.py`.
- Motor de combate puro en `src/engine/` (RNG con semilla, sin acceso al DOM); la interfaz solo consume sus eventos.
- Simulador de equilibrio: `bun run tools/simulate.ts [n]`.
- Regenerar todos los datos: `npm run data` (o los scripts de `tools/` por orden).
- Los datos se referencian siempre por `id` (slug), nunca por número de Microdex.
- Los datos de `data/` se generan con los scripts de `tools/`; no editar los JSON a mano sin actualizar el script.
- Antes de cerrar un trabajo: `python3 tools/validate.py` sin errores.
- Arte: píxel art según `docs/estilo.md`. Personaje de mapa en marco de 32×32 (4 direcciones × 3 fotogramas), Microo de combate 64×64, icono 32×32, tiles 16×16, pantalla 240×160. Los sprites de personajes del GDD están en `assets/reference/` y son la referencia de estilo.
- Sprites: rejillas de texto con índices de paleta o generadores por código; un script los convierte a PNG. Revisar siempre con una captura antes de darlos por buenos.
- Al terminar cada lote: actualizar `PROGRESO.md`, hacer commit y push.
