# Progreso

Roadmap: 7 fases (0–6). Cada fase termina en una puerta.

| Fase | Estado |
| --- | --- |
| 0 · Auditoría del GDD | Hecha y aprobada (162 Microos; ver `docs/auditoria.md`) |
| 1 · Datos y motor de combate | Hecha: 180 tests en verde, 2000 combates simulados sin errores |
| 2 · Biblia de estilo y prototipo de arte | Hecha, pendiente de aprobación del usuario (`docs/prototipo_estilo.png`) |
| 3 · Primer tramo jugable | Pendiente |
| 4 · Resto del mundo y arte en lote | Pendiente |
| 5 · Trama, Liga y equilibrio | Pendiente |
| 6 · Pulido y publicación | Pendiente |

## Fase 1 (hecha)
- `data/moves.json`: 165 movimientos. Nombre, tipo, categoría, potencia y probabilidades del GDD; precisión, PP, prioridad, objetivo y mecánica de Pokémon Showdown (MIT) para el movimiento original del mismo número.
- `data/species.json`: estadísticas base (por fase evolutiva, tipo y forma de línea), crecimiento, ratio de captura, experiencia, tamaño celular, compatibilidad con MO y movimientos por nivel. Incluye los movimientos que el GDD da a los equipos.
- `data/trainers.json`: 14 jefes con niveles y movimientos del GDD. `data/items.json`: Criobolas, Plásmidos, medios curativos y objetos clave.
- `src/engine/`: combate 1v1 y 2v2 (movimientos de área ×0,75), daño de 5.ª gen. con división físico/especial, críticos ×2, estados y sus inmunidades por tipo, los 37 movimientos con lógica especial (Mutagénesis al Azar, Resistencia Persister, Mimetismo Molecular, Señuelo, cargas, recargas, atrapamientos…), captura de 4.ª gen. con las 5 Criobolas, Difusión de Nutrientes (100 % / 50 %), evolución por nivel, Plásmido y Conjugación, IA por dificultad (Fácil aleatoria, Normal con 2 medios curativos, Difícil con cambios e IV perfectos) y ajuste de niveles −3 / +4.
- Equilibrio inicial (simulador, equipo del jugador con un Microo más que el jefe y al mismo nivel): gimnasios 58–98 % de victorias del jugador; Alto Mando 20–72 %; Campeón 63 %. A ajustar en la fase 5: Llagostera (20 %) demasiado difícil y Urtaza (98 %) demasiado fácil.

## Pendiente de decidir
- Renderizado (fase 3): sin acceso a npm no se puede instalar Phaser. Propuesta: motor 2D propio sobre Canvas (tilemaps, sprites, cámara, entrada), sin dependencias.
- Movimientos característicos del GDD fuera de los 165: «Tormenta Verotoxina» (E. coli O157:H7) e «Inyector Tipo III que ignora la defensa» (Salmonella). Sin definir.
- Modo RandomLocke, Level Cap y modo Torneo: reglas de partida, se implementan con la capa de juego (fase 3).

## Fase 2 (hecha, falta aprobación)
- `docs/estilo.md`: tamaños, reglas de dibujo y herramientas.
- 5 Microos de muestra generados por código (Synechoc, Butyricum, Paramec, T4-Titan, Pilobolus): frontal, trasera e icono.
- 15 personajes del GDD convertidos automáticamente (mapa en 4 direcciones, retrato de combate y busto).
- Protagonista y becario genérico dibujados en rejilla con animación de paso.
- Maqueta de combate 240×160 (`assets/mock_combate.png`).

## Siguiente tarea
Tras la aprobación del estilo: fase 3, primer tramo jugable (Pueblo Plaqueta → Ciudad Petri) con motor 2D propio sobre Canvas, fuente de píxeles propia y unos 40 Microos.
