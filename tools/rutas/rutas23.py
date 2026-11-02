from rutas import RUTA1, normaliza, alcanzable
def lienzo(w, h, c="."): return [[c] * w for _ in range(h)]
def fill(g, x, y, w, h, c):
    for j in range(y, y + h):
        for i in range(x, x + w): g[j][i] = c
def put(g, x, y, s):
    for i, c in enumerate(s): g[y][x + i] = c

# ---------------- RUTA 2 (40 x 22): bosque, estanque, risco con la cueva al noreste
g = lienzo(40, 22)
fill(g, 0, 0, 2, 22, "T"); fill(g, 38, 0, 2, 22, "T")
fill(g, 0, 0, 26, 2, "T"); fill(g, 26, 0, 12, 3, "A"); g[2][33] = "O"
fill(g, 0, 20, 40, 2, "T"); fill(g, 8, 20, 2, 2, "p")                 # salida sur (Ciudad Petri)
fill(g, 18, 2, 2, 2, "T")
# camino: sur -> norte por x8, este por y8, norte por x33 hasta la cueva
fill(g, 8, 8, 1, 12, "p"); fill(g, 8, 8, 26, 1, "p"); fill(g, 33, 3, 1, 6, "p")
# hierba alta
fill(g, 8, 2, 8, 4, "g"); fill(g, 2, 6, 3, 4, "g"); fill(g, 18, 6, 4, 2, "g"); fill(g, 18, 9, 4, 3, "g")
fill(g, 30, 9, 5, 4, "g"); fill(g, 11, 15, 6, 4, "g"); fill(g, 32, 15, 5, 4, "g")
# estanque y arena
fill(g, 18, 12, 6, 4, "~"); g[12][23] = "."; g[15][18] = "."; g[15][23] = "."; g[13][17] = "S"
fill(g, 3, 14, 2, 2, "s"); fill(g, 24, 4, 2, 2, "s")
# grupos de árboles (2x2 alineados)
for x, y in ((4, 4), (10, 6), (12, 10), (24, 10), (30, 4), (28, 16), (22, 18), (26, 12)): fill(g, x, y, 2, 2, "T")
fill(g, 2, 17, 2, 1, "l")
for x, y in ((3, 2), (13, 9), (25, 3), (29, 14), (4, 18), (27, 18), (36, 19)): g[y][x] = "f"
R2 = ["".join(r) for r in g]

# ---------------- RUTA 3 (40 x 26): montaña con río y cascada (oeste) y pradera (este)
g = lienzo(40, 26)
fill(g, 0, 0, 24, 26, "%")
fill(g, 12, 0, 2, 3, "*"); fill(g, 12, 3, 2, 23, "~")                  # cascada y río
fill(g, 2, 3, 20, 1, "p"); fill(g, 12, 3, 2, 1, "=")                   # repisa alta con puente
fill(g, 2, 3, 1, 19, "p"); fill(g, 21, 3, 1, 10, "p")                  # sendas laterales
fill(g, 2, 12, 22, 1, "p"); fill(g, 12, 12, 2, 1, "=")                 # repisa media con puente, abierta a la pradera
fill(g, 2, 21, 10, 1, "p"); g[20][6] = "O"                            # repisa baja: salida del Monte Micelio
fill(g, 4, 7, 7, 1, "p"); fill(g, 15, 7, 5, 1, "p"); fill(g, 15, 16, 7, 1, "p"); fill(g, 4, 16, 7, 1, "p")   # terrazas
fill(g, 15, 7, 1, 5, "p"); fill(g, 19, 16, 1, 5, "p"); fill(g, 15, 18, 6, 1, "p")
for x, y in ((2, 8), (2, 16), (21, 8), (15, 9), (19, 18), (4, 16)): g[y][x] = "^"   # escalones
fill(g, 22, 12, 2, 1, "p")
# pradera
fill(g, 24, 0, 16, 2, "T"); fill(g, 34, 0, 2, 2, "p")                  # salida norte (Ciudad Cultivo)
fill(g, 38, 0, 2, 26, "T"); fill(g, 24, 24, 16, 2, "T")
fill(g, 24, 2, 2, 2, "T")
fill(g, 24, 12, 11, 1, "p"); fill(g, 34, 2, 2, 11, "p")                # camino de la pradera
fill(g, 27, 3, 5, 4, "g"); fill(g, 26, 14, 6, 5, "g"); fill(g, 33, 16, 4, 6, "g"); fill(g, 28, 7, 4, 3, "g")
for x, y in ((26, 8), (30, 20), (24, 20), (36, 6)): fill(g, x, y, 2, 2, "T")
g[11][36] = "S"
for x, y in ((25, 13), (32, 13), (36, 14), (27, 22), (35, 10)): g[y][x] = "f"
R3 = ["".join(r) for r in g]

if __name__ == "__main__":
    import sys
    for nombre, rows, ini, fin in (("RUTA2", R2, (8, 21), (33, 3)), ("RUTA3", R3, (6, 21), (34, 0))):
        rr, av = normaliza(rows)
        vis = alcanzable(rr, ini)
        print(nombre, "árboles corregidos:", av, "llega:", fin in vis)
        if "--ver" in sys.argv:
            for y, r in enumerate(rr): print(f"{y:2d} " + r)

# conexiones de las terrazas de la montaña (ruta 3)
def _fix3(rows):
    g = [list(r) for r in rows]
    g[7][3] = "p"; g[16][3] = "p"                         # terrazas oeste unidas a la senda
    for y in (13, 14, 15): g[y][21] = "p"                 # terraza sureste unida a la repisa media
    return ["".join(r) for r in g]
R3 = _fix3(R3)
