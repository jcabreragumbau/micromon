# Biblia de estilo de Micromón (fase 2)

Prototipo visual: `docs/prototipo_estilo.png`. Herramientas en `tools/art/`.

## Resolución y tamaños
| Elemento | Tamaño | Notas |
| --- | --- | --- |
| Pantalla | 240×160 px | Resolución de GBA; se escala ×2, ×3 o ×4 sin suavizado |
| Tiles de mapa | 16×16 px | |
| Personaje de mapa | marco de 32×32 px, figura de unos 24–26 px | 3 fotogramas × 4 direcciones (abajo, arriba, izquierda, derecha) |
| Microo de combate | 64×64 px | Frontal (rival) y trasera (propio, recortada por abajo) |
| Icono de Microo | 32×32 px | 2 fotogramas (menú del equipo) |
| Retrato de combate de personaje | 64×96 px | Entrada de combate contra entrenador |
| Busto de diálogo | 64×64 px | |

## Reglas de dibujo
- Contorno exterior de 1 px en `#1a1420` y contorno propio en cada pieza para separar las partes.
- Luz desde arriba a la izquierda: borde claro arriba-izquierda, borde oscuro abajo-derecha y un brillo pequeño.
- Cada tipo tiene una rampa de 4 tonos (oscuro, medio, claro, brillo) en `tools/art/pix.py`. Un Microo usa la rampa de su tipo principal en el cuerpo y la del secundario en los detalles.
- Ojos grandes con brillo blanco para que los Microos sean simpáticos; las fases finales y los jefes pueden tener cejas fieras. A 32 px los ojos son un patrón fijo de 2×3 px.
- Rasgos biológicos reales como seña de identidad: flagelos, pili, cilios, esporas, cápsides, tilacoides, vacuolas.

## Cómo se hace cada cosa
- **Microos**: `tools/art/microos.py`. Cada especie es una función de diseño con formas normalizadas (elipses, cápsulas, polígonos, trazos ondulados), así que el mismo diseño sale a 64 px y a 32 px. Las líneas evolutivas compartirán familia morfológica y añadirán rasgos.
- **Tus personajes**: `tools/art/convert_ref.py` recorta las hojas de `assets/reference/`, quita el fondo (relleno desde los bordes para el mapa y GrabCut para el retrato), reduce y cuantiza.
- **Personajes nuevos**: `tools/art/characters.py`, rejillas de texto de 16 px de ancho con cabeza, cuerpo y paleta intercambiables; los pasos se generan moviendo las piernas.

## Problemas conocidos
- Algunos retratos de combate convertidos arrastran trozos del fondo (pantallas, estanterías). Se corregirán uno a uno en la fase 4.
- Las hojas de referencia traen 1 fotograma por dirección: los fotogramas de paso se generarán por código.
- La correspondencia entre imágenes y personajes del Alto Mando no está clara en el GDD (images 14–21): pendiente de confirmar.
- La fuente de la maqueta es provisional; en la fase 3 se dibuja una fuente de píxeles propia con tildes, ñ, ¿ y ¡.
