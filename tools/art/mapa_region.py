#!/usr/bin/env python3
"""Mapa de la región (pantalla MAPA del menú).

Dibuja por código el mapa de la región a 512×384 (2× la pantalla lógica de 256×192): mar, costa,
montañas del Monte Micelio, bosques, islas, rutas y ciudades. Escribe assets/atlas/mapa_region.png
y assets/atlas/mapa_region.json con los lugares (coordenadas lógicas, mapas que abarcan y descripción).
"""
import json, math, random
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
K = 2                      # escala respecto a la pantalla lógica
W, H = 256, 192

# Lugares: id, nombre, tipo, x, y (lógicos), mapas que incluye, descripción
LUGARES = [
  ("pueblo-plaqueta", "Pueblo Plaqueta", "pueblo", 30, 150, ["pueblo-plaqueta", "laboratorio", "casa-jugador", "casa-vecina"], "Donde germinan las grandes cepas. Laboratorio de la Profesora Hesse."),
  ("ruta-1", "Ruta 1", "ruta", 30, 132, ["ruta-1"], "Camino de hierba entre Pueblo Plaqueta y Ciudad Viral."),
  ("ciudad-viral", "Ciudad Viral", "ciudad", 30, 112, ["ciudad-viral", "academia"], "Academia de Infección. Aquí se recuerda la Gran Pandemia Fágica."),
  ("bosque-viral", "Bosque Viral", "bosque", 54, 112, ["bosque-viral"], "Donde empezó la pandemia. Hoy ya no queda ningún virus."),
  ("ciudad-petri", "Ciudad Petri", "ciudad", 78, 112, ["ciudad-petri", "gimnasio-petri"], "Gimnasio de Alimentos del Dr. Antoni Solé."),
  ("ruta-2", "Ruta 2", "ruta", 78, 96, ["ruta-2"], "Sube hacia el Monte Micelio."),
  ("monte-micelio", "Monte Micelio", "cueva", 78, 82, ["monte-micelio"], "Cueva cubierta de hifas luminiscentes."),
  ("ruta-3", "Ruta 3", "ruta", 78, 66, ["ruta-3"], "Ladera norte del Monte Micelio."),
  ("ciudad-cultivo", "Ciudad Cultivo", "ciudad", 78, 50, ["ciudad-cultivo", "gimnasio-cultivo"], "Fotobiorreactores. Gimnasio Ambiental de la Dra. Núria Gajú."),
  ("ruta-4", "Ruta 4", "ruta", 96, 50, ["ruta-4"], "Hacia el este, entre colinas."),
  ("cueva-anaerobica", "Cueva Anaeróbica", "cueva", 98, 34, ["cueva-anaerobica"], "Solo con Máscara de Gases. Hogar de Clostridios y arqueas."),
  ("tunel-endosporico", "Túnel Endospórico", "cueva", 114, 50, ["tunel-endosporico"], "Túnel oscuro: hace falta Quorum Sensing Lux."),
  ("ciudad-gram", "Ciudad Gram", "ciudad", 130, 50, ["ciudad-gram", "gimnasio-gram"], "Violeta o rosa. Gimnasio de Hongos de la Dra. Laia Guàrdia."),
  ("ruta-5", "Ruta 5", "ruta", 146, 50, ["ruta-5"], "Camino al pueblo de los cultivos contaminados."),
  ("pueblo-levadura", "Pueblo Levadura", "pueblo", 162, 50, ["pueblo-levadura"], "Cementerio de cultivos. Al norte, la Torre Prión."),
  ("torre-prion", "Torre Prión", "torre", 162, 34, ["torre-prion-1", "torre-prion-2", "torre-prion-3"], "Niebla de proteínas mal plegadas. Necesitas un Western Blot."),
  ("ruta-6", "Ruta 6", "ruta", 162, 66, ["ruta-6"], "Baja hacia la gran metrópolis."),
  ("ciudad-aerobia", "Ciudad Aerobia", "ciudad", 162, 82, ["ciudad-aerobia", "casino", "guarida-1", "guarida-2", "gimnasio-aerobia"], "Casino Mutagénesis y Gimnasio de Levaduras del Dr. Daniel Yero."),
  ("ruta-7", "Ruta 7", "ruta", 178, 82, ["ruta-7"], "Llanura hacia Ciudad Agar."),
  ("ciudad-agar", "Ciudad Agar", "ciudad", 194, 82, ["ciudad-agar", "gimnasio-agar", "reserva-entrada"], "Gimnasio Industrial del Dr. Jordi Mas."),
  ("reserva-microbiana", "Reserva Microbiana", "bosque", 194, 66, ["reserva-microbiana"], "Extremófilos y protozoos raros. Se captura con Criobolas Verdes."),
  ("ruta-8", "Ruta 8", "ruta", 194, 98, ["ruta-8"], "Camino al Parque Biotecnológico."),
  ("parque-biotec", "Parque Biotecnológico", "ciudad", 194, 114, ["parque-biotec", "instituto-1", "instituto-5", "instituto-11", "gimnasio-biotec"], "Instituto de Biotecnología y Gimnasio Bioinfo del Dr. Òscar Conchillo."),
  ("ruta-9", "Ruta 9", "ruta", 212, 114, ["ruta-9"], "Costa este, junto a la Central Metabólica."),
  ("central", "Central Metabólica", "torre", 212, 100, ["central-1", "central-2"], "Reactor de biogás y pilas microbianas. Algo raro vive arriba."),
  ("ciudad-pili", "Ciudad Pili", "ciudad", 228, 128, ["ciudad-pili", "gimnasio-pili"], "Puerto del ferri. Gimnasio Clínico de la Dra. Marina Luquin."),
  ("isla-conjugada", "Isla Conjugada", "isla", 168, 158, ["isla-conjugada", "carlos-iii", "mansion-1", "mansion-2", "gimnasio-conjugada"], "Instituto Carlos III, Mansión de las Cepas y Gimnasio Fago."),
  ("islas-esporuladas", "Islas Esporuladas", "hielo", 226, 162, ["islas-esporuladas"], "Laberinto de hielo a -80 °C. Aquí aún quedan virus latentes."),
  ("calle-seleccion", "Calle Selección Natural", "ruta", 228, 56, ["calle-seleccion"], "La prueba final: presión selectiva extrema. Solo con 8 medallas."),
  ("uab", "La UAB", "ciudad", 228, 30, ["uab", "uab-vestibulo", "liga-1", "liga-2", "liga-3", "liga-4", "liga-5", "fosa-abisal"], "Facultad de Biociencias y Liga Micromón."),
]
CAMINOS = [("pueblo-plaqueta", "ciudad-viral"), ("ciudad-viral", "ciudad-petri"), ("ciudad-petri", "ciudad-cultivo"),
           ("ciudad-cultivo", "ciudad-gram"), ("ruta-4", "cueva-anaerobica"), ("ciudad-gram", "pueblo-levadura"),
           ("pueblo-levadura", "torre-prion"), ("pueblo-levadura", "ciudad-aerobia"), ("ciudad-aerobia", "ciudad-agar"),
           ("ciudad-agar", "reserva-microbiana"), ("ciudad-agar", "parque-biotec"), ("parque-biotec", "ruta-9"),
           ("ruta-9", "central"), ("ruta-9", "ciudad-pili"), ("calle-seleccion", "uab")]
FERRI = [("ciudad-pili", "isla-conjugada"), ("ciudad-pili", "islas-esporuladas"), ("ciudad-pili", "calle-seleccion")]

def main():
    rnd = random.Random(7)
    P = {l[0]: (l[3] * K, l[4] * K) for l in LUGARES}
    # --- tierra: continente principal y tierras del norte (La UAB), islas
    yy, xx = np.mgrid[0:H * K, 0:W * K].astype(float)
    def ruido(esc, semilla):
        r = np.random.RandomState(semilla).rand(H * K // esc + 2, W * K // esc + 2)
        im = Image.fromarray((r * 255).astype(np.uint8)).resize((W * K + esc, H * K + esc), Image.BICUBIC)
        return np.array(im)[: H * K, : W * K] / 255.0
    n = ruido(24, 1) * 0.6 + ruido(8, 2) * 0.4
    tierra = np.zeros((H * K, W * K), bool)
    def blob(cx, cy, rx, ry, amp=0.35):
        return (((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2) < 1 + amp * (n - 0.5) * 2
    # continente: una franja ancha de oeste a este, más estrecha al sur del este
    tierra |= blob(110 * K, 82 * K, 104 * K, 84 * K, 0.5)
    tierra |= blob(196 * K, 96 * K, 40 * K, 40 * K, 0.4)
    tierra |= blob(30 * K, 140 * K, 26 * K, 40 * K, 0.3)
    tierra &= ~blob(236 * K, 40 * K, 30 * K, 60 * K, 0.2)      # canal del norte
    tierra |= blob(228 * K, 40 * K, 20 * K, 30 * K, 0.3)       # tierras de La UAB
    tierra &= ~blob(140 * K, 186 * K, 120 * K, 40 * K, 0.3)    # mar del sur
    tierra |= blob(30 * K, 150 * K, 20 * K, 22 * K, 0.2)
    tierra |= blob(228 * K, 124 * K, 18 * K, 14 * K, 0.2)
    tierra |= blob(168 * K, 158 * K, 18 * K, 11 * K, 0.4)      # Isla Conjugada
    hielo = blob(226 * K, 164 * K, 15 * K, 10 * K, 0.5)        # Islas Esporuladas
    hielo |= blob(244 * K, 176 * K, 7 * K, 5 * K, 0.5)
    tierra |= hielo
    img = np.zeros((H * K, W * K, 3), np.uint8)
    # mar con ondas
    mar = np.stack([40 + 30 * n, 104 + 40 * n, 176 + 40 * n], -1)
    img[:] = mar.astype(np.uint8)
    for k in range(260):
        x, y = rnd.randrange(W * K), rnd.randrange(H * K)
        img[y, x:x + 4] = (150, 200, 240)
    # costa: arena y orilla clara
    from scipy.ndimage import binary_dilation, binary_erosion
    orilla = binary_dilation(tierra, iterations=3) & ~tierra
    img[orilla] = (110, 170, 220)
    arena = tierra & ~binary_erosion(tierra, iterations=3)
    verde = np.stack([92 + 40 * n, 168 + 30 * n, 84 + 20 * n], -1).astype(np.uint8)
    img[tierra] = verde[tierra]
    img[arena] = (226, 206, 150)
    img[hielo & ~arena] = (232, 244, 252)
    img[hielo & arena] = (190, 220, 240)
    im = Image.fromarray(img)
    d = ImageDraw.Draw(im)
    # montañas (Monte Micelio, Cueva Anaeróbica y la cordillera central)
    def monte(x, y, s, nieve=True):
        d.polygon([(x - s, y + s * 0.7), (x, y - s), (x + s, y + s * 0.7)], fill=(124, 104, 86), outline=(70, 56, 48))
        d.polygon([(x, y - s), (x + s, y + s * 0.7), (x + s * 0.2, y + s * 0.7)], fill=(98, 80, 66))
        if nieve: d.polygon([(x - s * 0.35, y - s * 0.3), (x, y - s), (x + s * 0.35, y - s * 0.3)], fill=(240, 240, 248))
    for (x, y, s) in [(60, 84, 9), (94, 80, 10), (66, 66, 7), (92, 98, 7), (112, 30, 8), (84, 30, 7), (124, 70, 8), (140, 76, 6), (108, 66, 6)]:
        monte(x * K, y * K, s * K)
    # bosques
    def arbol(x, y, oscuro=False):
        c = (40, 104, 60) if oscuro else (54, 130, 66)
        d.ellipse([x - 5, y - 6, x + 5, y + 4], fill=c, outline=(26, 70, 40)); d.rectangle([x - 1, y + 3, x + 1, y + 6], fill=(96, 64, 40))
    for _ in range(26):
        arbol(P["bosque-viral"][0] + rnd.randint(-22, 22), P["bosque-viral"][1] + rnd.randint(-16, 14), True)
    for _ in range(22):
        arbol(P["reserva-microbiana"][0] + rnd.randint(-22, 22), P["reserva-microbiana"][1] + rnd.randint(-14, 8))
    for _ in range(40):
        x, y = rnd.randrange(10, W * K - 10), rnd.randrange(10, H * K - 10)
        if tierra[y, x] and not hielo[y, x] and all(math.hypot(x - px, y - py) > 22 for px, py in P.values()): arbol(x, y)
    # caminos (ruta: tierra clara con borde) y líneas de ferri
    for a, b in FERRI:
        (x0, y0), (x1, y1) = P[a], P[b]
        L = int(math.hypot(x1 - x0, y1 - y0) / 8)
        for i in range(L):
            if i % 2 == 0: d.line([(x0 + (x1 - x0) * i / L, y0 + (y1 - y0) * i / L), (x0 + (x1 - x0) * (i + 1) / L, y0 + (y1 - y0) * (i + 1) / L)], fill=(240, 248, 255), width=2)
    for a, b in CAMINOS:
        (x0, y0), (x1, y1) = P[a], P[b]
        pts = [(x0, y0), (x1, y0), (x1, y1)] if abs(x1 - x0) > 2 and abs(y1 - y0) > 2 else [(x0, y0), (x1, y1)]
        d.line(pts, fill=(96, 70, 44), width=9, joint="curve")
        d.line(pts, fill=(236, 210, 150), width=5, joint="curve")
    im.save(ROOT / "assets/atlas/mapa_region.png", optimize=True)
    meta = [{"id": l[0], "nombre": l[1], "tipo": l[2], "x": l[3], "y": l[4], "mapas": l[5], "desc": l[6]} for l in LUGARES]
    json.dump({"escala": K, "lugares": meta}, open(ROOT / "assets/atlas/mapa_region.json", "w"), ensure_ascii=False)
    print("OK mapa", im.size, len(meta), "lugares")

if __name__ == "__main__":
    main()
