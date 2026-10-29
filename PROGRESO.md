# Progreso

Roadmap: 7 fases (0–6). Cada fase termina en una puerta.

| Fase | Estado |
| --- | --- |
| 0 · Auditoría del GDD | Hecha y aprobada (162 Microos; ver `docs/auditoria.md`) |
| 1 · Datos y motor de combate | Hecha: 180 tests en verde, 2000 combates simulados sin errores |
| 2 · Biblia de estilo y prototipo de arte | Aprobada, con el compromiso de mejorar la calidad de los sprites en la fase 4 |
| 3 · Primer tramo jugable | Jugable de Pueblo Plaqueta a la medalla de Ciudad Petri (`dist/index.html`) |
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

## Fase 2 (aprobada)
- El usuario aprueba el estilo a condición de subir la calidad de los sprites más adelante (fase 4: Microos diseñados a mano por especie, retratos limpios, fotogramas de paso).
- `docs/estilo.md`: tamaños, reglas de dibujo y herramientas.
- 5 Microos de muestra generados por código (Synechoc, Butyricum, Paramec, T4-Titan, Pilobolus): frontal, trasera e icono.
- 15 personajes del GDD convertidos automáticamente (mapa en 4 direcciones, retrato de combate y busto).
- Protagonista y becario genérico dibujados en rejilla con animación de paso.
- Maqueta de combate 240×160 (`assets/mock_combate.png`).

## Fase 3 (jugable)
- Motor 2D propio sin dependencias (`src/game/`): bucle a 60 fps, lienzo 240×160, teclado y mando táctil, escenas y capas de diálogo/menú, fundidos.
- Fuente de píxeles propia con tildes, ñ, ü, ¿ y ¡ (`tools/art/font.py`); tileset de 88 tiles (`tools/art/tiles.py`); atlas de personajes y de los 162 Microos (sprites provisionales por familia morfológica, `tools/art/families.py`).
- Mapas: Pueblo Plaqueta, casa, casa vecina, laboratorio, Ruta 1, Ciudad Viral (Incubadora, tienda, Academia, casa), Bosque Viral, Ciudad Petri (Incubadora, tienda, casa) y Gimnasio de Ciudad Petri. Test de alcanzabilidad de salidas, PNJ y objetos (`tests/maps.test.ts`).
- Historia: presentación de la Profesora Fanny Hesse, nombre y dificultad, elección de inicial, rival Koch (laboratorio y Bosque Viral), Microscopio Óptico y Criobolas, Academia de Infección, entrenadores con línea de visión, Dr. Solé y Medalla Probiótico.
- Combate con interfaz completa: menús, barras de PS y experiencia, captura con sacudidas, aprendizaje de movimientos, evolución con opción de cancelar, cambio de Microo, objetos, huida y derrota con vuelta a la Incubadora.
- Menús: equipo, resumen, mochila por bolsillos, Microdex, ficha, opciones (velocidad del texto y dificultad), tienda con cantidades. Guardado en el navegador.
- Movimientos por nivel rehechos para que cada línea reciba un ataque nuevo cada 4–6 niveles.
- Pruebas: `bun test` (motor y mapas) y partida automática con Chromium (`tools/playtest.cjs`) que recorre el tramo entero y guarda capturas.

## Mejora gráfica hacia Pokémon Diamante (en curso)
- El usuario pide calidad de Nintendo DS y que todo el arte lo haga Opus en código.
- Pantalla a 256×192 (DS). Microos a 80×80 con sombreado volumétrico (normales desde la forma, 6 tonos, contorno teñido, luz reflejada), ojos con iris y brillos, colmillos en fases finales, patitas y bracitos.
- Tileset nuevo de 152 tiles: autotile de caminos, arena y agua con orillas, árboles con volumen y sombra, tejados con tejas, muros con ventanas enmarcadas.
- Combate: fondos con cielo, suelo y plataformas con relieve; cajas de PS estilo DS.
- Diseños a mano por especie (`tools/art/designs1.py`, `designs2.py`): las 3 líneas iniciales y los 29 Microos del primer tramo (Ruta 1, Bosque Viral, Gimnasio 1 y evoluciones). Cada uno con concepto de criatura propio (brote de hojas, cola de llama, campana con cilios, cápside icosaédrica...).
- Personajes de mapa nuevos (`tools/art/characters_ds.py`): figura de ~26 px con cabeza grande, sombreado de 4 tonos por material, brillo en los ojos, contorno teñido, sombra en el suelo y animación de paso real (piernas alternas, balanceo de brazos, rebote).
- Menús estilo DS (kit en `gfx.ts`: paneles con degradado, fondos con motivo animado, etiquetas de tipo, barras): menú de inicio, equipo en 2 columnas, resumen con pestañas INFO/MOVIMIENTOS, mochila con bolsa por bolsillo, Microdex rojo con pantalla y lista, ficha con medallas y tienda.
- Elección de personaje al empezar: chico, chica o helicóptero de combate Apache (sprite propio con rotor que gira y vuelo estacionario, frases propias de la Profesora y la madre). Los textos usan {o} para el género.
- Pendiente: pasos de los líderes convertidos del GDD; diseños a mano del resto de especies (124); textos de «Organismo» en el Microdex.

## Segundo tramo (hecho)
- Ciudad Petri → Ruta 2 → Monte Micelio → Ruta 3 → Ciudad Cultivo (Incubadora, tienda, casa) → Gimnasio Ambiental de la Dra. Núria Gajú (Medalla Tapete).
- Monte Micelio: cueva con tiles propios (suelo, roca, hifas luminosas animadas, setas), encuentros en el suelo de la cueva, maraña de hifas que se corta con Celulasa tras la Medalla Probiótico, reclutas de la Unidad de Genética (sprites nuevos), becarios secuestrados, Dr. Isaac Salazar (Niger, Fragilis, Desulfovib) y el Disco Duro Externo.
- Rival Koch en la Ruta 3 con tres Microos (su inicial evolucionado). Gimnasio-invernadero con columnas de Winogradsky y estanques.
- 15 Microos nuevos diseñados a mano (`tools/art/designs3.py`).
- Arreglos: la boca de la cueva lleva dentro al pisarla; el aviso de eficacia sale antes del debilitamiento; consejo de tipos erróneo en Ciudad Petri corregido. El playtest elige bien el Microo de reemplazo (en la pantalla de 2 columnas) y espera a que acaben los diálogos.

## Mando de Xbox (hecho)
- API Gamepad sondeada cada fotograma: botón B = A (aceptar), botón A = B (cancelar / mantener para correr), Menú = START, cruceta o joystick izquierdo (solo el eje dominante) para moverse. La ayuda bajo la pantalla cambia al conectar el mando.

## Tercer tramo (hecho)
- Ciudad Cultivo → Ruta 4 → Cueva Anaeróbica (lateral, con la Máscara de Gases que da la Dra. Gajú y un guarda en la entrada) y Túnel Endospórico (mapa oscuro: círculo de luz pequeño, grande tras usar Quorum Sensing Lux con la Medalla Tapete) → Ciudad Gram → Gimnasio de la Dra. Laia Guàrdia (Hongo, laberinto de hifas, Medalla Micelio).
- 14 Microos nuevos diseñados a mano (`tools/art/designs4.py`).

## Cuarto tramo (hecho)
- Combates dobles en la interfaz: una acción por Microo, elección de objetivo con parpadeo, B vuelve al primer Microo, dos sprites y dos cajas de PS por lado.
- Ciudad Gram → Ruta 5 → Pueblo Levadura (Torre Prión con niebla de priones) → Ruta 6 → Ciudad Aerobia: Casino Mutagénesis (fichas, tragaperras con rodillos de Microos y premios: Myxococcus, Pleomorph, Plásmido F), póster de Nature que abre la guarida de la Unidad de Genética (Barbadilla; Casillas en combate doble; Martínez-Urtaza, que huye y deja el Western Blot), Torre Prión de tres plantas (la Dra. Alba Hernández te sermonea; un investigador jubilado da el Plásmido Vir) y Gimnasio de Levaduras del Dr. Daniel Yero (Medalla Catalasa).
- 25 Microos nuevos diseñados a mano (`tools/art/designs5.py`). Tiles nuevos: moqueta de casino, tragaperras y servidores animados, suelo técnico, suelo de la torre, placas contaminadas y póster.

## Siguiente tarea
Fase 4: Ciudad Agar e Instituto de Biotecnología en adelante (gimnasios 5–8, Liga y mazmorras), mejorar la calidad de los sprites (Microos diseñados por especie, retratos limpios, pasos), música y efectos.
