# Micromón (juego personal en navegador)

RPG por turnos tipo Pokémon sobre microbiología. Diseño en `docs/gdd.txt`; decisiones y estado en `docs/auditoria.md` y `PROGRESO.md`.

## Reglas
- Idioma del juego y de los comentarios: español.
- Stack previsto: TypeScript + Vite + Phaser 3; combate en módulo puro con RNG con semilla y tests con Vitest; datos en JSON validados con Zod.
- Los datos se referencian siempre por `id` (slug), nunca por número de Microdex.
- Los datos de `data/` se generan con los scripts de `tools/`; no editar los JSON a mano sin actualizar el script.
- Antes de cerrar un trabajo: `python3 tools/validate.py` sin errores.
- Arte: píxel art. Mapa 16×24 px (4 direcciones × 3 fotogramas), combate de Microo 64×64 px, tiles 16×16 px. Los sprites de personajes del GDD están en `assets/reference/` y son la referencia de estilo.
- Sprites: rejillas de texto con índices de paleta o generadores por código; un script los convierte a PNG. Revisar siempre con una captura antes de darlos por buenos.
- Al terminar cada lote: actualizar `PROGRESO.md`, hacer commit y push.
