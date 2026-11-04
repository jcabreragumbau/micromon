"""Rutas 1-3 (versión 2) según la descripción detallada del usuario. Genera las filas de texto de cada mapa
y comprueba que los árboles van en bloques de 2×2 alineados y que se puede recorrer cada ruta.
Uso: python3 tools/rutas/rutas_v2.py [--ver] > /dev/null  (escribe tools/rutas/rutas_v2.json)"""
import json, sys
from pathlib import Path
from collections import deque

SOLIDO = set("T%A~*klrSvO!") | {"#"}

def lienzo(w, h, c="."): return [[c] * w for _ in range(h)]
def fill(g, x, y, w, h, c):
    for j in range(y, y + h):
        for i in range(x, x + w): g[j][i] = c

# ---------------------------------------------------------------- RUTA 1 (22 x 34): pasillo tutorial vertical
def ruta1():
    g = lienzo(22, 34)
    fill(g, 0, 0, 4, 34, "T"); fill(g, 18, 0, 4, 34, "T")                # muros de árboles este y oeste
    fill(g, 0, 0, 22, 2, "T"); fill(g, 10, 0, 2, 2, ".")                  # salida norte (Ciudad Viral)
    fill(g, 0, 32, 22, 2, "T"); fill(g, 10, 32, 2, 2, "p")                # salida sur (Pueblo Plaqueta)
    fill(g, 10, 27, 2, 5, "p")                                            # camino de tierra desde el pueblo
    fill(g, 4, 29, 5, 1, "l")                                             # valla blanca en la esquina suroeste
    # tres cornisas casi de lado a lado: se saltan hacia el sur, pero no se sube en línea recta
    fill(g, 4, 24, 12, 1, "v")                                            # 1.ª: hueco al este (x16-17)
    fill(g, 6, 16, 12, 1, "v")                                            # 2.ª: hueco al oeste (x4-5)
    fill(g, 4, 9, 6, 1, "v"); fill(g, 12, 9, 6, 1, "v")                   # 3.ª: hueco en el centro (x10-11)
    # hierba alta: 1) sureste, delante del hueco de la 1.ª cornisa; 2) flanco este, más arriba;
    # 3 y 4) pasillo gemelo en el tercio norte (hay que cruzar uno para llegar a la ciudad)
    fill(g, 13, 25, 5, 4, "g")
    fill(g, 14, 18, 4, 5, "g")
    fill(g, 6, 2, 4, 7, "g"); fill(g, 12, 2, 4, 7, "g")
    fill(g, 10, 4, 2, 4, "T"); fill(g, 4, 2, 2, 6, "T"); fill(g, 16, 2, 2, 6, "T")
    for x, y in ((5, 11), (15, 13), (6, 20), (11, 22), (5, 26), (8, 31), (13, 30)): g[y][x] = "f"
    for x, y in ((7, 19), (16, 11)): g[y][x] = "r"
    return g

# ---------------------------------------------------------------- RUTA 2 (44 x 24): dos niveles, estanque y cueva al este
def ruta2():
    g = lienzo(44, 24)
    # límites norte y sur: acantilados con pinos intercalados
    fill(g, 0, 0, 44, 3, "A")
    for x in (0, 8, 16, 26, 34): fill(g, x, 0, 4, 2, "T")
    fill(g, 0, 21, 44, 3, "A")
    for x in (4, 12, 22, 30): fill(g, x, 22, 4, 2, "T")
    fill(g, 40, 0, 4, 24, "A")                                            # pared rocosa del este
    # cornisa que divide los dos niveles (arriba, la meseta del estanque)
    fill(g, 0, 10, 40, 1, "A")
    fill(g, 4, 10, 2, 1, "|")                                             # escalera de madera (2 de ancho) al oeste
    fill(g, 18, 10, 6, 1, "v")                                            # saliente: solo se salta hacia el sur
    fill(g, 0, 3, 1, 7, "A")
    # estanque rectangular en la meseta y hierba en su orilla norte
    fill(g, 14, 5, 10, 3, "~")
    fill(g, 12, 3, 14, 1, "g")
    # camino de tierra por el nivel bajo, de la entrada oeste a la cueva
    fill(g, 0, 15, 40, 2, "p"); fill(g, 36, 11, 2, 4, "p")
    # gran bloque de hierba al sureste
    fill(g, 28, 17, 8, 4, "g")
    # callejón sin salida al sur (se llega rodeando el saliente)
    fill(g, 16, 18, 2, 2, "T"); fill(g, 24, 18, 2, 2, "T"); fill(g, 16, 20, 10, 1, "k"); fill(g, 18, 18, 6, 2, ".")
    fill(g, 0, 11, 1, 4, "k"); fill(g, 0, 17, 1, 4, "k")
    # árboles y flores
    for x, y in ((6, 4), (30, 4), (34, 6), (8, 12), (12, 18)): fill(g, x, y, 2, 2, "T")
    for x, y in ((3, 5), (27, 8), (10, 7), (2, 18), (26, 13), (14, 12)): g[y][x] = "f"
    # dos pasos estrechos en el nivel bajo (setos): el camino pasa por delante de los entrenadores
    for x in (20, 29):
        fill(g, x, 11, 1, 4, "k"); fill(g, x, 17, 1, 4, "k")
    # cueva del Monte Micelio en la pared del este
    g[11][38] = "O"; g[11][39] = "A"; fill(g, 38, 3, 2, 8, "A"); fill(g, 38, 12, 2, 3, "p")
    return g

# ---------------------------------------------------------------- RUTA 3 (44 x 28): desfiladero, río y cascada al oeste; granja al este
def ruta3():
    """Ruta 3 (52 × 28) al estilo de la referencia del usuario: montaña escalonada con el río que baja desde arriba,
    cascada, lago con un islote y dos puentes largos, escaleras en las paredes; al este, prado con la granja."""
    W, H = 52, 28
    g = lienzo(W, H, ".")
    fill(g, 0, 0, 34, H, "%")                                              # toda la montaña es roca de entrada
    # río: entra por arriba a la izquierda, corre hacia el este y baja por el canal central hasta el borde sur
    fill(g, 2, 1, 21, 2, "~")
    fill(g, 20, 1, 3, H - 1, "~")
    fill(g, 20, 6, 3, 2, "*")                                              # cascada en la pared alta
    # terraza alta oeste (orilla del río) y terraza media oeste, con una escalera entre ambas
    fill(g, 2, 3, 18, 3, "p")
    fill(g, 4, 8, 15, 2, "p")
    fill(g, 10, 6, 1, 2, "^")
    # meseta alta este y terraza media este, con escaleras
    fill(g, 24, 1, 8, 5, "p")
    fill(g, 23, 8, 9, 2, "p")
    fill(g, 28, 6, 1, 2, "^")
    # lago bajo con islote; el puente vertical baja de la terraza media al islote
    fill(g, 7, 10, 13, 7, "~")
    fill(g, 11, 13, 5, 3, "p")
    fill(g, 13, 10, 1, 3, "|")
    # orilla oeste baja (x 2-6 junto al lago) y franja bajo el lago, con escalera desde la terraza media
    fill(g, 2, 12, 5, 9, "p")
    fill(g, 7, 17, 13, 4, "p")
    fill(g, 4, 10, 1, 2, "^")
    # dos puentes largos a la altura del islote: orilla oeste ⇄ islote ⇄ orilla este (cruza lago y río)
    fill(g, 7, 14, 4, 1, "=")
    fill(g, 16, 14, 7, 1, "=")
    # orilla este baja, con escalera desde la terraza media este
    fill(g, 23, 12, 10, 14, "p")
    fill(g, 30, 10, 1, 2, "^")
    # piso más bajo al suroeste: la boca de la cueva del Monte Micelio está en su pared norte
    fill(g, 2, 23, 17, 3, "p")
    g[22][4] = "O"
    fill(g, 8, 21, 1, 2, "^")
    # escalón bajo en la orilla este (otra terraza más abajo, con escalera) y peñascos sueltos sobre las terrazas
    fill(g, 23, 19, 10, 2, "%"); fill(g, 27, 19, 1, 2, "^")
    for x, y in ((25, 16), (29, 23), (16, 3), (26, 1), (14, 18)): fill(g, x, y, 2, 2, "%")
    # paso a nivel entre la orilla este y el prado
    fill(g, 33, 14, 1, 2, "p")
    # ---- prado del este con la granja
    fill(g, 34, 0, 18, 2, "T"); fill(g, 50, 0, 2, H, "T"); fill(g, 34, 26, 18, 2, "T")
    fill(g, 34, 2, 2, 10, "T"); fill(g, 34, 18, 2, 8, "T")
    fill(g, 34, 14, 18, 2, "p")                                            # camino hasta la salida este
    fill(g, 42, 8, 2, 6, "p")                                              # desvío a la puerta de la granja
    fill(g, 37, 8, 5, 1, "l"); fill(g, 44, 8, 5, 1, "l")                    # valla del jardín
    fill(g, 37, 2, 1, 6, "k"); fill(g, 48, 2, 1, 6, "k")
    fill(g, 37, 17, 8, 5, "g"); fill(g, 45, 10, 4, 3, "g"); fill(g, 37, 10, 4, 3, "g")
    for x, y in ((46, 18), (44, 22), (38, 24)): fill(g, x, y, 2, 2, "T")
    for x, y in ((39, 4), (46, 4), (41, 12), (48, 16), (36, 16), (43, 24)): g[y][x] = "f"
    return g

def normaliza(g):
    w, h = len(g[0]), len(g)
    av = []
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            cel = [(x + i, y + j) for j in (0, 1) for i in (0, 1) if x + i < w and y + j < h]
            n = sum(g[yy][xx] == "T" for xx, yy in cel)
            if 0 < n < len(cel): av.append((x, y, n))
    return av

def alcanzable(g, ini, solidos_extra=()):
    w, h = len(g[0]), len(g)
    sol = SOLIDO | set(solidos_extra)
    vis = {ini}; q = deque([ini])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < w and 0 <= ny < h): continue
            c = g[ny][nx]
            if c == "v":
                if dy == 1 and ny + 1 < h and g[ny + 1][nx] not in sol: ny += 1
                else: continue
            elif c in sol: continue
            if (nx, ny) not in vis: vis.add((nx, ny)); q.append((nx, ny))
    return vis

if __name__ == "__main__":
    out = {}
    for nombre, f, ini, fin in (("R1", ruta1, (10, 33), (10, 0)), ("R2", ruta2, (1, 15), (38, 12)), ("R3", ruta3, (4, 23), (51, 14))):
        g = f(); av = normaliza(g); vis = alcanzable(g, ini)
        print(nombre, len(g[0]), "x", len(g), "árboles desalineados:", av, "llega:", fin in vis, file=sys.stderr)
        if "--ver" in sys.argv:
            for y, r in enumerate(g): print(f"{y:2d} " + "".join(r), file=sys.stderr)
        out[nombre] = ["".join(r) for r in g]
    json.dump(out, open(Path(__file__).with_name("rutas_v2.json"), "w"), indent=0)
