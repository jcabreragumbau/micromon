# Progreso

Roadmap: 7 fases (0–6). Cada fase termina en una puerta.

| Fase | Estado |
| --- | --- |
| 0 · Auditoría del GDD | Hecha y aprobada (162 Microos; ver `docs/auditoria.md`) |
| 1 · Datos y motor de combate | Hecha: 180 tests en verde, 2000 combates simulados sin errores |
| 2 · Biblia de estilo y prototipo de arte | Aprobada, con el compromiso de mejorar la calidad de los sprites en la fase 4 |
| 3 · Primer tramo jugable | Jugable de Pueblo Plaqueta a la medalla de Ciudad Petri (`dist/index.html`) |
| 4 · Resto del mundo y arte en lote | Hecha |
| 5 · Trama, Liga y equilibrio | Hecha |
| 6 · Pulido y publicación | En curso (publicado como artifact; pulido continuo) |

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

## Tipos en combate y quinto tramo (hecho)
- Los combates muestran los tipos: etiquetas con el nombre completo en individuales y abreviadas (LEV, FOT, G+…) dentro de las cajas en dobles; el menú de movimientos muestra el tipo del movimiento con su color. Nuevo diseño compacto del combate doble.
- Ciudad Aerobia → Ruta 7 → Ciudad Agar (Incubadora, tienda, casa) → Gimnasio Industrial del Dr. Jordi Mas (Medalla Quimiostato).
- Reserva Microbiana (tipo Zona Safari): 500 créditos por 30 Criobolas Verdes y 500 pasos; en los encuentros no se lucha: Criobola Verde, Medio de Enriquecimiento (calma, cuesta más aislar), antibiótico suave (más fácil, pero huye antes) o huir. Contador en pantalla, fin automático. Microos únicos: Kefirgran, Spirogyra, Mixotricha, Tardigrad, Pyrolobus…; el guarda del fondo regala el Plásmido Ti.
- 14 Microos nuevos diseñados a mano (`tools/art/designs6.py`).
- El playtest usa la IA «difícil» del motor para el jugador.

## Sexto tramo (hecho)
- Ciudad Agar (guardas hasta la Medalla Quimiostato) → Ruta 8 → Parque Biotecnológico. El Dr. Yero espera en la puerta, cura al equipo y distrae a los reclutas.
- Asedio al Instituto: Planta 1 (reclutas, doctorandos rebeldes), Planta 5 (sala de servidores: combate doble contra Barbadilla y Casillas; el Dr. Conchillo queda libre y revoca el acceso al clúster), Planta 11 (Martínez-Urtaza con Parahaemolyticus, Vulnificus y Tuberculos: «¡DESGRACIADO SIN FUTURO!», huye a la Isla Conjugada). La directora regala la Criobola Morada.
- Gimnasio Bioinfo del Dr. Òscar Conchillo (Medalla Algoritmo), abierto tras el rescate.
- 14 Microos nuevos (`tools/art/designs7.py`), incluidas las primeras líneas de virus.

## Séptimo tramo (hecho)
- Encuentros fijos con el Microo visible en el mapa (`estatico:especie|nivel|bandera`): Prion-Sc en la cima de la Torre Prión (ya no aparece salvaje), Viroid-Cad en la Central Metabólica y el Tardigrad gigante en estado tun que bloquea la Ruta 9 (se despierta con el Pulverizador de Agua que da la directora del Instituto).
- Parque Biotecnológico → Ruta 9 (costa) → Central Metabólica opcional (dos plantas, encuentros en el suelo técnico) → Ciudad Pili (puerto con ferri) → Gimnasio Clínico de la Dra. Marina Luquin (Medalla Ziehl-Neelsen, que da el Billete de Ferri).
- 4 Microos nuevos (`tools/art/designs8.py`).

## Octavo tramo (hecho)
- Ferri desde Ciudad Pili (Billete de Ferri) a las Islas Esporuladas y la Isla Conjugada; con las 8 medallas, también a la Calle Selección Natural.
- Islas Esporuladas: laberinto de hielo a -80 °C con deslizamiento (se resuelve en 12 movimientos; comprobado con un buscador BFS), dos fósiles a elegir (Estromatolito o Ámbar del Mioceno), Sputnik-V legendario.
- Isla Conjugada: Instituto Carlos III (revive fósiles; regala Lokiarca tras la Mansión), Mansión de las Cepas (diarios sobre el origen de O157, reclutas, laboratorio profundo con el combate final contra Martínez-Urtaza y el legendario E. coli O157:H7 a Nv60) y Gimnasio Fago de la Dra. Susana Campoy (Medalla Lisogenia), cerrado hasta resolver la Mansión.
- 16 Microos nuevos (`tools/art/designs9.py`): virus finales, fósiles, Lokiarca, LUCA, legendarios y evoluciones de Pleomorph. Quedan 20 especies con dibujo de familia (sobre todo del Alto Mando).

## Noveno tramo: Calle Selección Natural y Liga (hecho)
- Ferri a la Calle Selección Natural con 8 medallas: combate final contra el rival Koch (6 Microos, inicial en su última fase) y contra la Dra. Alba Hernández, que por fin lucha y se rinde.
- La UAB: vestíbulo con Incubadora, tienda y bedel (exige 8 medallas). Alto Mando en salas seguidas (Tusell, Martí, Barbé, Llagostera) y Campeón Dr. Louis Pasteur en el Rectorado; si pierdes, vuelves a empezar la Liga. Al ganar: Registro de Cepas Tipo (salón de la fama), créditos, vuelta a casa con guardado automático y acceso a la Fosa Abisal con LUCA (Nv70).
- Sprites nuevos para Martí, Barbé y Llagostera. Los 162 Microos tienen ya diseño propio (`designs10.py` con las 20 últimas especies).

## Pulido (hecho)
- Congelador de cepas (PC) en las Incubadoras: retirar y depositar Microos, con lista, iconos y ficha.
- Música y efectos sintetizados con WebAudio (`src/game/audio.ts`): tema por zona, combate salvaje/entrenador/líder, fanfarria de victoria, efectos de menú, choque, golpe, debilitamiento, captura, subida de nivel y curación. Opciones para quitar música o efectos (se guardan).
- Fuente: À È Ò à è ò, raya (—), subíndice ₂, guion bajo, +, * y &.
- Retratos de Guàrdia, Campoy, Yero, Gajú, Solé y Tusell recortados de nuevo con GrabCut guiado (`tools/art/ports_fix.py`).
- Pasos visibles para los personajes convertidos del GDD (una pierna se levanta, rebote del cuerpo).
- Equilibrio: Conchillo y Llagostera más asequibles; Luquin y Urtaza final más duros (simulador: gimnasios 57–93 %, Alto Mando 58–85 %, Campeón 65 %).
- Playtest dividido: `PART=early` (hasta la 4.ª medalla) y `PART=late` (de la 5.ª al final, con estado preparado); cada mitad tarda menos de 10 minutos.
- Estación de Conjugación en Isla Conjugada (técnica junto a la Incubadora): activa las evoluciones por conjugación. Plásmidos a la venta en las tiendas de Parque Biotec e Isla Conjugada.
- Microdex con ficha por especie (A en la lista): nombre científico real, entrada divulgativa (`tools/dex_text.py` → `scientific`/`entry` en `microdex.json`), tipos, preevolución y página de hábitat calculada de las tablas de encuentros.
- Misiones secundarias: examen sorpresa del catedrático jubilado (casa de Ciudad Gram, 5 preguntas), intercambios con vecinos (Sacchari→Pastorian «Lager» en Pueblo Levadura, Albicans→Auris «Aurita» en Ciudad Agar) y premios del ayudante de la Profesora a las 15/40/80/120/150 especies. Nuevo sprite: jubilado.
- Curiosidades de microbiología (`src/game/curiosidades.ts`, ~120 datos verificados de historia, cuerpo humano, alimentos, extremófilos, virus y biotecnología): los PNJ sin papel en la historia dicen su frase la primera vez y después una curiosidad distinta en cada charla; los entrenadores ya derrotados alternan su frase con una curiosidad. Nuevo divulgador en cada Incubadora y cada Tienda.
- Sprites HD fieles a las ilustraciones del GDD: el lienzo se dibuja a 4× (1024×768 internos, coordenadas lógicas 256×192). Los 18 personajes de las hojas de referencia usan sus sprites de mapa y retratos originales solo redimensionados (sin reducir colores ni redibujar): `assets/sprites/characters_hd/` → `personajes_hd.png` (celdas 128×128) y `retratos_hd.png` (256×384). Llagostera (imagen 14), Martí (15) y Barbé (19) pasan a usar sus hojas del GDD. Recortes de retrato guiados en `ports_fix.py`.
- Nuevas hojas del usuario (imágenes 24–27): protagonista chico y chica, Profesora Fanny Hesse (sprite propio `hesse`; el resto de PNJ «profesora» siguen igual) y el rival Koch, en HD. `convert_ref.py` admite hojas con distribución propia (`MANUAL`, con espejo para la vista que falta). Corregido: en todas las hojas del GDD los perfiles izquierdo y derecho estaban intercambiados. La intro muestra el retrato de Hesse.
- Edificios y árboles HD con las ilustraciones del usuario (`assets/reference/props/` → `tools/art/props_hd.py` → `props_hd.png/json`): casa del protagonista (techo rojo; casas «rojo/naranja»), casa vecina (techo azul; resto de casas), laboratorio de Hesse (también la mansión de Isla Conjugada), Incubadora (centro) y Tienda. El edificio se dibuja sobre su planta (casillas `@bloque` sólidas y `@puerta_hd` como entrada), alineando la puerta de la ilustración con la casilla de la puerta y ordenado por profundidad con los personajes. Los árboles T/V de 2×2 usan la ilustración (V más oscuro). Gimnasios (los 8), Casino de Ciudad Aerobia (IBB) y Facultad de La UAB también con sus ilustraciones; el resto de laboratorios siguen con tiles.
- Velocidad ×2: Tab o V en el teclado, RB en el mando (Y abre el menú, como START), botón «x2» en la pantalla táctil; se guarda en la partida (`flags.x2`) y se indica con «▶▶ x2» en la esquina.
- Captura: la Criobola cae en la placa, el Microo se encoge dentro de ella con un destello rojo y desaparece mientras se agita; si se escapa, reaparece (también en la Reserva).
- Medallero con las medallas del usuario (`tools/art/badges_hd.py` → `medallas_hd.png`, con fila de siluetas): estuche 4×2 en el menú (MEDALLERO), medallas en la ficha y animación al ganar cada una (gira, destellos y rótulo).
- Portada del usuario en la pantalla de título (`tools/art/portada.py` → `portada.jpg` y `portada_fondo.jpg` desenfocada para los laterales), con fundido de entrada y ascuas animadas; el build admite atlas .jpg.
- Transiciones al combate (`scenes/transiciones.ts`): entrenadores → hileras de placas de Petri (agar sangre, chocolate, MacConkey…) que barren la pantalla y luego la destapan; salvajes → parpadeo y cortinilla de persianas que se cierra y se abre. La música del combate empieza con la transición.
- Música: tema de combate contra entrenador del usuario (`assets/audio/combate_entrenador.mp3`, incrustado en `assets_audio.ts` y en bucle; se descodifica con atob + decodeAudioData, sin fetch, porque la página publicada no permite pedir data URL). De momento suena en todos los combates contra investigadores: entrenadores, rival, líderes, Alto Mando, Pasteur y la Unidad de Genética. Arreglado el solapamiento: cada tema suena en su propio bus de WebAudio, que se apaga entero (también las notas ya programadas) al cambiar de pantalla.
- Ciudades reescaladas y reorganizadas (Pueblo Plaqueta, Viral, Petri, Cultivo, Gram, Levadura, Aerobia, Agar, Parque Biotec, Pili, Isla Conjugada y La UAB): cada edificio ilustrado ocupa una planta acorde a su dibujo (`SPRITE_DIMS`: casas 5×6, laboratorio 7×6, Incubadora/Tienda 7×5, gimnasio/casino 13×7, UAB 15×8) con la puerta en el centro, y se coloca con `onRoad` sobre calles de 2 casillas. Las llegadas se enlazan solas (`linkWarps`): salida de cada interior bajo su puerta y bordes entre mapas exteriores alineados.
- Motes: se preguntan al capturar, al elegir inicial y al recibir un Microo; opción MOTE en el equipo (no en Microos de otros investigadores). Teclado en `scenes/nombre.ts`.
- Combate: contra investigadores cada mensaje espera a pulsar A; «¡Un golpe crítico!» y la eficacia salen después del golpe y de la bajada de PS (y antes del debilitamiento). Animación por movimiento (`scenes/anim_ataques.ts`, evento `anim` del motor): 13 estilos según nombre, tipo y categoría (golpe con embestida, corte, rayo, eléctrico, esporas, burbujas, explosión, espiral, agujas, red, orbes, mejora y ondas) con color del tipo y variación propia por movimiento; al impactar, el Microo parpadea y baja la barra.
- Plásmidos de movimiento (las MT): uno por cada uno de los 165 movimientos (`plasmido-<mov>`, «P001 …», no se gastan), generados en `build_items.py` con fase 1–5 según potencia. `repartirPlasmidos` (maps.ts): solo 3 por fase tirados por el mapa (15 en total); el resto se vende en las dos tiendas de su fase (la primera con los más flojos), con un vendedor de plásmidos junto al dependiente de Criobolas y medios (2 vendedores por tienda).
- Virus: la Gran Pandemia Fágica empezó hace 50 años en el Bosque Viral; ya no quedan virus allí ni en zonas tempranas (Bosque, Monte Micelio, Guarida, Ruta 8, Parque Biotec, Urtaza 1). Los primeros estadios viven latentes en el hielo de las Islas Esporuladas y los demás en Isla Conjugada, la Mansión, Calle Selección y los jefes finales. Lore nuevo: anciano del Bosque Viral, cartel, vecinos de Ciudad Viral y la viróloga Ona.
- Obediencia por medallas (como en Pokémon): `OBEY_CAPS` en `state.ts` → 0 medallas Nv15, 1→22, 2→28, 3→34, 4→42, 5→46, 6→51, 7→56, 8→todos. Por encima, con la fórmula de 4.ª gen., el Microo puede dormirse la siesta, herirse, usar otro movimiento o no hacer nada (`obeyCap` en el motor; test en `engine.test.ts`). Lo explica la Profesora al dar la Microdex, se avisa al ganar cada medalla y el medallero muestra el tope.
- Level Cap estricto en Difícil (`levelCap` en `state.ts`): tus Microos no pasan del nivel del Microo más fuerte del siguiente líder ajustado a Difícil (+4); con 8 medallas, el del Campeón; tras ser Campeón, sin límite. En el tope no ganan experiencia y se avisa una vez por combate. Se explica al elegir la dificultad, se anuncia al ganar cada medalla y el medallero muestra el tope. También: en los golpes múltiples, «¡Ha golpeado N veces!» y la eficacia salen antes del debilitamiento.
- Información de movimientos (`scenes/movinfo.ts`): descripción completa generada de la mecánica (categoría, potencia, precisión, PP, prioridad, efectos, probabilidades, objetivo y nota del GDD) e icono de categoría (físico, especial, estado). Al olvidar un movimiento (subida de nivel o plásmido) se ven los cuatro y el nuevo con la ficha del seleccionado. En combate, START muestra la ficha del ataque sin usarlo. En el resumen, A en MOVIMIENTOS abre las fichas (▲▼ entre ellas).
- Menú de ataques en combate: 4 celdas coloreadas por tipo con icono de categoría; a la derecha, PP, tipo, categoría y potencia del seleccionado.
- ▲▼ cambia de Microo en el resumen del equipo y de especie (vistas) en la ficha de la Microdex.
- PNJ genéricos con hojas del usuario (`assets/reference/npcs/`, 12 fotogramas propios): becario, recluta, recluta-b, enfermera (microbióloga), chica, chico, dependiente, estudiante, madre y jubilado. `tools/art/npc_sheets.py` quita el fondo verde y las sombras y los encaja en celdas HD de 128×128 con escala común; `char_atlas.py` los añade al atlas HD. Los entrenadores sin retrato usan su fotograma de frente HD en combate. Los reclutas (chico y chica) tienen retrato de combate propio del usuario (`reclutas_combate.png`).
- Escenarios de combate del usuario (`assets/reference/props/fondos_combate.png` → `tools/art/fondos_combate.py` → `fondo_<entorno>.jpg`, 512×288): hierba, bosque, interior, laboratorio, gimnasio, cueva, invernadero, casino, torre y hielo, con sus propias plataformas (subidos 14 px para que la plataforma rival quede bajo el Microo). Los fondos dibujados por código quedan de reserva.
- Mapa de la región (MAPA en el menú, tras recibir la Microdex): `tools/art/mapa_region.py` dibuja el continente, el canal y las tierras de La UAB, montañas, bosques, islas, rutas y líneas del ferri, y define 30 lugares con sus mapas y descripción (`mapa_region.json`). La pantalla (`scenes/mapa.ts`) marca ciudades, rutas y mazmorras (grises si no se han visitado, `flags["visitado:<mapa>"]`), indica «Estás aquí» (los interiores se resuelven por su puerta) y se recorre con las flechas.
- Introducción cinemática de 90 s antes del título (`scenes/intro.ts`), sincronizada con tres temas nuevos (`intro_brillo`, `tema` —fanfarria principal, también en el título— y `oscuro`): avisos legales, logotipo de Jordi Freak con destellos, logotipo de Micromón en relieve, panorámicas en el motor (Ruta 1, Ciudad Petri con el Centro y habitantes paseando, Ruta 2 hacia el Monte; `Overworld.vista` sin jugador), protagonistas e iniciales (Synechoc en el prado, Butyricum entre brasas, Paramec entre burbujas, con siluetas), el Monte al atardecer con nubes en espiral, el rayo en la cima con zoom y el destello blanco. Antes pide pulsar un botón para poder sonar; START la salta en cualquier momento.
- Las 162 especies son obtenibles: Mirabilis (Ruta 2), Pelagibac (Ruta 3), Listeria (Ruta 8), Pyrococcus (Central Metabólica), Plasmodium y Toxoplasma (Calle Selección Natural); Salmonella legendaria en los jardines de La UAB tras ser Campeón; la Profesora regala los otros dos iniciales tras la Liga.
- Repelentes: Virkon (100 pasos, desde Ciudad Petri) y Virkon Concentrado (250 pasos, desde Ciudad Gram); clase `repel`, contador `flags.repelSteps`; evitan salvajes de menor nivel que el primer Microo sano.
- El plan de Urtaza se llama «Proyecto Pandemia Global» (PPG). Quitados los avisos de «fin del tramo».
- Pasteur como Cintia (Platino): equipo Pyrolobus 61 (=Spiritomb, curiosidad), Alexandrium 61 (=Roserade, servicio), Pichiamax 62 (=Togekiss, cuidado), Tuberculos 62 (=Lucario, colaboración: el bacilo de Koch), Volvox 61 (=Milotic, asombro), Pandoravir 67 (=Garchomp, constancia); movimientos en `MOVES_FIJOS` de `build_trainers.py`. Simulador: el jugador gana un 33 % (Alto Mando 58–85 %). Al sacar cada Microo dice qué cualidad representa (`trainer.sendOut` en la batalla). Sin motes: los Microos rivales nunca llevan mote.
- Louis, mentor de incógnito: 5 encuentros (`ponerLouis` en maps.ts; scripts `pasteur1..5`) tras cada golpe de la Unidad: Ciudad Petri (medalla 1), Ciudad Cultivo (Salazar), Ciudad Aerobia (Urtaza 1), puerto de Ciudad Pili (Urtaza 2) e Isla Conjugada (antes de la Mansión). Preguntas filosóficas guardadas en `flags.pasteurQ1..Q6`; en la Liga se revela («Mira dónde nos trae la vida… ¿sabes ya qué es ser un buen científico?») y recuerda tus respuestas (`pasteurLiga`). Contrapunto: Urtaza (4 h de sueño, «un paper en Nature vale más que cien becarios», el revisor 2 y la función de su hija).

- Torre Prión exterior: ilustración vertical del usuario (`assets/reference/props/torre_prion.png`, fondo verde recortado en `props_hd.py`), planta 5×8 en Pueblo Levadura; la cámara sube al acercarse a edificios de 8+ filas para verlos enteros.

- Intro: el tramo final (01:16–01:30) ya no es el Monte: sala de servidores de la Unidad con LED verdes y amarillos; siluetas negras de Urtaza, Barbadilla y Casillas que el parpadeo va iluminando, fogonazo verde y fundido a negro. Música nueva `tetrico` (drones desafinados con tritono, latido, pitidos de servidor y caja de música aguda).

- Retratos de combate nuevos del usuario para Urtaza, Barbadilla y Casillas (`assets/reference/retratos/`, `tools/art/retratos_usuario.py` → `ref1-3_combate.png`, luego `char_atlas.py`); los sprites de mapa no cambian.

- Tema principal nuevo (`T.tema` en audio.ts): fanfarria heroica en Do mayor de 16 compases con segunda voz de acordes, bajo en octavas y batería de marcha (`epic`: bombo, caja, charles, platillos y redobles). Dura 27 s exactos: en la intro suena dos veces (00:22–01:16) y acaba en Si♭–La♭ para enlazar con la sala de servidores, que entra con un golpe grave (`golpe`).

- Terreno HD del usuario (`assets/reference/props/terreno.png` → `tools/art/terreno_hd.py` → `assets/atlas/terreno_hd.png/json`): hierba alta, hierba alta oscura, césped (2 variantes), camino, arena y agua (2 fotogramas), repetibles sin costuras con periodo de 2×2 casillas. Bordes de camino/arena/agua con la forma de los autotiles viejos; objetos sobre césped (flores, setos, vallas, carteles, rocas…) dibujados sobre el césped nuevo. `Gfx.tile(nombre, x, y, cx, cy)` usa el HD cuando se le pasa la casilla.

- Bug corregido: el contador de `uid` de los Microos volvía a 1 al abrir el juego, así que tras cargar una partida un Microo nuevo podía compartir uid con otro del equipo y heredar su evolución (Giardia → Spirulmax). `repararUids` (state.ts) renumera repetidos al cargar y `reservarUids` (microo.ts) sigue después del mayor; además la evolución tras el combate comprueba que la especie destino evoluciona de la del Microo.

- Modo «Cambio» (como en Pokémon): en combates individuales contra entrenadores, al debilitar a su Microo se anuncia «X va a sacar a Y. ¿Quieres cambiar de Microo?» y puedes cambiar sin perder turno (`ofrecerCambio` en battle.ts, `Battle.freeSwitch`).

- Tabla de tipos en combate con SELECT (teclado Q o Mayús; Vista del mando de Xbox; botón táctil SELECT): `scenes/tipos.ts`. Primera opción «RIVAL»: daño que recibe el Microo rival según sus dos tipos (×4/×2/×0,5/×0,25/×0); después cada tipo al atacar y al defender. `Game.onSelect` lo fija la batalla y se borra al terminar.

- Entrenadores: miran a su alrededor cada pocos segundos (`vigilar` en overworld.ts; vuelven a menudo a su dirección original) y ven al menos 4 casillas (`alcance`); si al girarse te ven, van a por ti.
- Acompañante (`flags.seguidor` = sprite; `colocarSeguidor`/`seguir` en overworld.ts): el Dr. Yero te sigue por el Parque Biotecnológico y el Instituto desde que habla contigo hasta liberar a Conchillo; se puede hablar con él (`hablarSeguidor`).
- Combate en equipo (`BattleOptions.ally` en el motor): Yero lleva la casilla 1 con sus levaduras (IA, relevos automáticos, sin experiencia ni obediencia) contra Barbadilla y Casillas; los dos se giran hacia ti y salen sus dos retratos (`trainer.portrait2`).

- Rutas 1, 2 y 3 (versión 2, según la descripción detallada del usuario; planos en `tools/rutas/rutas_v2.py`): Ruta 1 pasillo tutorial sin entrenadores (3 cornisas, 4 parches de hierba, dependiente quieto que regala un Medio LB); Ruta 2 de oeste a este con dos niveles (escalera de madera, saliente que se salta), estanque con hierba al norte, árbol que se sacude, rival a la entrada, 5 entrenadores con patrones y 2 objetos ocultos; Ruta 3 desfiladero con río y cascada, rocas calizas que se disuelven (Medalla Probiótico), grieta para trepar (un Microo con Pili tipo IV), árbol de miel, casa con jardín (`casa-ruta3`), 4 parcelas con bayas, arqueólogo que regala la Placa de Koch. Patrones de PNJ (`move`): reloj, mirar:a,b, patrulla:h|v:N[:mira]. El combate con el rival (flag rival3) pasa a la entrada de la Ruta 2.

- Quitados el árbol sacudible, el árbol de miel, las rocas agrietadas, la grieta escalable, las parcelas y las bayas (todos los árboles son normales). Montaña con relieve (referencia en `assets/reference/rutas/montana_referencia.png`): las casillas «%» eligen pieza en `tileAt` según sus vecinos (cima con bordes, pared de 1 o 2 casillas con labio y sombra, laderas este/oeste, boca de cueva); las piezas HD se generan por código en `terreno_hd.py` (`montana`). La Ruta 3 oeste es ahora un desfiladero de tres terrazas con escaleras talladas y el río en cascada en cada pared.

- Rutas 2 y 3: sin senderos de arena en la montaña (suelo de un solo color). Entrenadores recolocados para vigilar el paso obligado (comprobado con el camino más corto): en la Ruta 2 dos pasos estrechos con setos (micóloga y biólogo) y la excursionista patrullando de arriba abajo antes de la cueva; en la Ruta 3 el recorrido empieza en la boca de la cueva (terraza baja → escalera → terraza media → puente → prado), con el montañero vigilando la salida de la cueva, la pescadora la salida del puente y el culturista el camino al este.

- Ruta 3: las tres terrazas ocupan todo el ancho del desfiladero y entre ellas solo hay la pared (2 casillas: labio y base), que cruza de lado a lado como un escalón; árboles separan las terrazas alta y baja del prado (que está al nivel de la media). Por debajo del mapa se considera terreno más bajo (el borde inferior es una pared que cae). La boca de la cueva va integrada en la pared.

- Ruta 3: deshechas las laderas laterales. Vallas verticales (`!`, `valla_v`, sobre la tierra de la terraza) en el borde este de las terrazas alta y baja, junto a los árboles; bajo el camino del prado, un desnivel (acantilado de hierba) con dos escaleras para bajar al césped de abajo, que está al nivel de la terraza baja (en lugar de los setos redondos).

- Ruta 3: la zona de la casa también está más alta que el camino: desnivel (acantilado de hierba) con escaleras en sus dos accesos y cerrada con árboles por el lado de la terraza media.

- Entrenadores difíciles de esquivar: `tools/entrenadores.ts` mide, en cada mapa con entrada y salida (o entrada y líder en los gimnasios), qué entrenadores no se pueden esquivar (su línea de visión corta todos los caminos) y con `--colocar` busca, cerca de cada uno, una casilla y una dirección que corten el paso sin taparlo, lejos de puertas, objetos, carteles y otros PNJ. Recolocados 35 entrenadores: ahora son inesquivables al menos 2/3 de los de cada ruta, cueva y guarida y al menos uno de cada gimnasio (Rutas 2 y 3 conservan el diseño del usuario: 2/5 y 3/5). Los entrenadores sin patrón vigilan casi siempre en su dirección y solo echan vistazos breves a los lados (colarse exige calcular el momento).
- Experiencia de entrenadores ×1,2 (antes ×1,5, la de 5.ª gen.): con todos los entrenadores vencidos y sin combates salvajes, el Microo principal llega a cada líder al nivel de su as o 1–4 niveles por encima (antes hasta +6), y el banquillo (50 %) unos 5 por debajo.

- **Micromón V2** (archivo aparte, `dist/micromonV2.html`, con un sello «V2» en el título): mismo juego con el tileset de 4.ª generación del usuario (`assets/reference/tileset_v2/`, exterior e interior, de akizakura16) a tamaño nativo ×4 sin suavizar. `tools/art/tileset_v2.py` genera `assets/atlas_v2/` (terreno y edificios) a partir de los atlas de la V1: césped, hierba alta, flores, camino, arena y agua (autotiles 3×3 por cuartos), acantilados como mesetas, setos, vallas y cornisas según sus vecinos, carteles y rocas, árboles y las dos casas normales; en los interiores, suelos de madera y de laboratorio, paredes según el ambiente, alfombras, mesas, mostradores, escaleras, y camas, plantas, estanterías y ordenadores altos dibujados por profundidad. No cambian los edificios propios (Incubadora, tiendas, gimnasios, laboratorio, UAB, casino, Torre Prión), la montaña, las cuevas ni los objetos científicos. Construir con `bun run tools/build_game.ts --v2`.

- V2, uniones de los tiles: esquinas interiores en caminos, arena, agua y acantilados (las de la lámina en caminos y arena; sintetizadas desde el borde en agua y acantilados), con la máscara de diagonales que calcula el juego (`esquinas` en builder.ts, «nombre^diag» en el atlas); bordes de camino y arena más finos y desplazados solo en perpendicular, de modo que los tramos de una casilla de ancho y sus recodos quedan continuos; el camino ya no se abre bajo las fachadas (borde recto); el agua tiene orilla junto al camino; el agua que toca arena es de playa en toda su masa («aguap_») y la arena junto al camino lleva el camino en lugar del césped («arenac_»); boca de cueva integrada en la pared del acantilado; carteles y objetos de PNJ sobre el suelo HD. Ruta 2: la pared junto a la cueva se ensancha una casilla.

- V2, relieve: segunda lámina del usuario (`assets/reference/tileset_v2/terreno2.png` y `edificios2.png`, pasadas a tiras nativas de 128 px). Los acantilados («A») son ahora desniveles con la plantilla de meseta de césped (el terreno del norte está más alto: la cara mira al sur, a casilla entera); la montaña («%») usa la plantilla de roca marrón (borde, laterales y cara), con boca de cueva y escaleras talladas de la lámina. El borde de las «saltillas» (cornisas «v») sigue siendo la pieza fina de la primera lámina.
- V2, ciudades nuevas (`src/game/world/ciudades_v2.ts`, solo en la V2): ciudades de unas 50×38 casillas y pueblos de unas 30×24, con calles en cuadrícula, avenida central y bandas de edificios que dan a las calles. Conservan los edificios propios, sus interiores, los PNJ con historia (los guardias en su salida o puerta), carteles (junto a su edificio o salida) y objetos; añaden casas nuevas con interior y un vecino, comercios y bloques del tileset sin repetir, arboledas, farolas, macetas, paseantes con frases, estanque en los pueblos y muelle con velero en Ciudad Pili e Isla Conjugada (el ferri llega al embarcadero, `puntos.ferri`). Comprobación: `bun run tools/v2_check.ts` (accesos, warps de ida y vuelta, PNJ y objetos) y `node tools/playtest_v2.cjs` (entra y sale por las 81 puertas).

- V2, montaña (Ruta 3 y demás «%»): las paredes usan las piezas de pared de la lámina terreno2 (filas 550-557): la de dos alturas repartida entre la casilla alta y la baja, la de una altura en una casilla, con extremos redondeados a los lados abiertos; la boca de cueva es la de la lámina (2 casillas de ancho), dibujada encima de la pared (también en los desniveles de césped).

- V2, laterales de la montaña: los bordes de las terrazas usan el canto del anillo de meseta (terreno2, filas 545-546): junto a los árboles (en lugar de la valla) y junto al río, que queda encajado entre cantos sin orilla (`esTerraza` en builder.ts). Da la sensación de que cada terraza está más alta que lo que tiene al lado.

- V2, cuevas: suelo de tierra de cueva (terreno2, filas 113-114, columnas 4-5, bloque 2×2) y paredes de roca gris con relieve (plantilla de las filas 378-381: canto, laterales y cara según qué lados dan a suelo, «pared_cueva~m»); setas, hifas y el disco duro de la V1 se dibujan sin su suelo viejo encima del nuevo. Afecta a Monte Micelio, Cueva Anaeróbica, Túnel Endospórico, Fosa Abisal y el suelo del Gimnasio Gram.

- V2, escaleras: peldaños de piedra gris entre barandillas según la muestra del usuario (`assets/reference/tileset_v2/escaleras.png`), en la montaña y en los desniveles de césped.

- Cámara fija sobre el jugador (se quita el desplazamiento junto a edificios altos, que hacía parpadear la imagen) y árboles dibujados por profundidad con los personajes (lo que está más abajo tapa lo de arriba). V2: solo son casas en las que se entra las que tienen puerta visible (fuera la entrada de metro y dos edificios sin puerta, que pasan a decorado); las calles y la avenida ya no siguen hasta el borde si por ahí no hay salida.

- Equipo: al usar un plásmido (u objeto de evolución) cada Microo muestra «APTO», «NO APTO» o «YA LO SABE» en lugar de la barra de PS; el Microo seleccionado se resalta siempre con un marco parpadeante, también si está debilitado (al usar un revivir).

- Encuentros del tramo final: los virus se reparten (Lambda y Lentivir en la Ruta 8, Marburg y Mimivir en la Ruta 9, los básicos en las Islas Esporuladas) y la Isla Conjugada pasa a ser sobre todo de bacterias que intercambian genes (E. coli BL21, Bdellovibrio, Agrobacterium, Pseudomonas, Chlamydia, Pleomorph) con un 36 % de virus (antes 68 %); en la Mansión entra Pleomorph.

- Protagonistas nuevos (chico y chica) con las hojas del usuario (`assets/reference/protagonistas/`, 4 direcciones × 5 fotogramas; se usan el 1.º, 2.º y 4.º): `python3 tools/art/protagonistas.py` → `<id>_hoja.png`, que `char_atlas.py` prefiere a la conversión del GDD. El retrato de combate no cambia.

- Intro: la elección de personaje muestra las figuras grandes del chico y la chica dibujadas por el usuario (`assets/reference/protagonistas/intro-*.png`), que caminan (4 fotogramas) al estar elegidas: `python3 tools/art/protagonistas_intro.py` → `assets/atlas/protas_intro.png`.

- Combate: al empezar, el protagonista (chico o chica) aparece de espaldas y lanza la Criobola con los 5 fotogramas del usuario antes de salir de escena (`python3 tools/art/protagonistas_espalda.py` → `assets/atlas/protas_espalda.png`, celdas 512×384). Los atlas nuevos de protagonistas van en WebP; el HTML de la V1 ocupa ~15,7 MB (límite 16 MB).

- Vídeo de introducción: las escenas de los protagonistas usan sus figuras de cuerpo entero (atlas protas_intro), que caminan con sus 4 fotogramas al presentarse la chica y en la escena de la pareja; también en las siluetas de los iniciales.

- Sprites de los iniciales y sus evoluciones dibujados por el usuario (`assets/reference/microos/iniciales.png`): `python3 tools/art/microos_usuario.py` → `assets/sprites/microos_usuario/`, que `species_art.py` usa en lugar de los generados (frente, espalda e icono). Para más láminas, añadirlas a `LAMINAS`.

- Sprites del usuario para las líneas 4-8 (Mucorín, Griseus, Sacchari, Epidermi, Navicula y evoluciones; `assets/reference/microos/lineas_4_8.png`). Los atlas de Microos pasan a WebP sin pérdida para seguir por debajo de 16 MB (V1 ~15,7 MB).

- Sprites del usuario para las líneas 9-13 (Mirabilis, Leptospir, Micrococ, Subtilis, Cereus y evoluciones; `assets/reference/microos/lineas_9_13.png`). Música de combate contra entrenadores recodificada a 112 kbps (original en `assets/reference/audio/`) para dejar margen bajo los 16 MB: V1 ~14,9 MB.

- Sprites del usuario para las líneas 14-18 (Casei, Thermus, Bifidum, Serratia, Rhizobi y evoluciones; `assets/reference/microos/lineas_14_18.png`); `microos_usuario.py` admite filas con distinto número de especies.

- Sprites del usuario para las líneas 19-23 (Roqueforti, Niger, Bacteroid, Albicans, Euglena y evoluciones; `assets/reference/microos/lineas_19_23.png`).

- Publicación con archivos aparte: `build_game.ts` genera la versión local (`dist/index.html`, todo incrustado; para pruebas) y la publicada (`dist/micromon.html` de ~0,7 MB + imágenes y música en `dist/pub/a/`; V2 en `dist/pub_v2/a/`), que se publica con `files` {"a/<archivo>": "dist/pub/a/<archivo>"}. Sin límite práctico de tamaño. Microos del usuario en HD: `microos_usuario.py` guarda también celdas de 320 px (`assets/sprites/microos_usuario_hd/`, sin binarizar el borde y conservando los adornos pequeños) y `species_art.py` crea `microos_hd_frente/espalda/iconos`; el juego los dibuja a resolución real. Música de entrenador de nuevo a calidad original.

- Koch sale del laboratorio andando hasta la puerta (baja, va a la alfombra y sale) en lugar de quedarse en una esquina; en el vídeo de introducción el chico también avanza caminando.

- Vídeo de introducción: las panorámicas calculan el encuadre con la planta actual de cada mapa (V1 o V2): Ruta 1 centrada en el camino de sur a norte, Ciudad Petri a lo largo de la calle del gimnasio y Ruta 2 de la entrada oeste a la cueva.

- Introducción sincronizada con la canción del título del usuario (`assets/audio/titulo.mp3`; original en `assets/reference/audio/`): la imagen sigue a la posición de la canción (`audio.filePos`), cortes en 7, 22 (golpe y logotipo), 33-73 (mapas, protagonistas e iniciales), 73-81,5 (servidores, durante el puente) y 81,5-94 (final con los protagonistas, los iniciales y el logotipo); a los 94 s, pantalla de título, donde la canción sigue y al acabar repite su tramo tranquilo (104,4-155,4 s). START salta al segundo 94 de la canción.

- Logotipo del usuario (`assets/reference/logo_micromon.png` → `assets/atlas/logo_micromon.png`, sin fondo) en la intro: entra creciendo con rebote al golpe del segundo 22, con un brillo que recorre solo las letras, y vuelve en el final.

## Sprites del usuario: líneas 24–28

- Láminas `assets/reference/microos/lineas_24_28{a,b,c}.png` (Zymomonas→Mobilis, Cholerae→Parahaemolyticus, Proteus-Am→Entamoeba→Naegleria, Mycoplas→Genitalium→Pneumoniae, Mutans→Pyogenes→Agalactiae) añadidas a `microos_usuario.py`.
- Filtro de rótulos ampliado para letras grandes o suavizadas (azul marino, r≈g); las láminas anteriores no cambian.

## Sprites del usuario: líneas 29–33

- Lámina `assets/reference/microos/lineas_29_33.png` (Noctiluca→Ceratium→Alexandrium, Pelagibac→Prochloron, Smegmatis→Bovis→Tuberculos, Borrelia→Treponema, Klebsi→Pneumonia-K).
- `microos_usuario.py`: `CORTES` permite cortes en x por fila cuando las figuras no ocupan columnas iguales; filtro extra para letras finas (píxeles oscuros azul marino con r≈g).

## Sprites del usuario: líneas 34–38

- Lámina `assets/reference/microos/lineas_34_38.png` (Geobacter→Sulfurreduc, Perfringens→Tetani, Psychrobac→Colwellia, Putida→Aeruginosa, Giardia→Cryptospor) con cortes por fila en `CORTES`.

## Sprites del usuario: líneas 39–43

- Lámina `assets/reference/microos/lineas_39_43.png` (Methanococ→Methanosar→Pyrolobus, Rickettsia→Prowazekii, Halobacter→Salinarum, Neisseria→Meningitid, Cryptococ→Neoformans).
- Filtro de letras: no descarta garabatos morados (r > g); recupera motas del dibujo en Tuberculos y Aquaticus.

## Siguiente tarea
Pendiente del GDD: Modo Torneo y mochila bloqueada en Difícil, objetos equipados, variocolor y RandomLocke. Posibles mejoras: más diálogos y misiones secundarias, mejorar la calidad de los sprites (Microos diseñados por especie, retratos limpios, pasos), música y efectos.
