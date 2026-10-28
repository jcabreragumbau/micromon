#!/usr/bin/env python3
"""Tileset 16×16 de Micromón (exteriores, edificios e interiores), dibujado por código.

Salida: assets/atlas/tiles.png (16 columnas) y assets/atlas/tiles.json {nombre: índice}.
Las propiedades (sólido, hierba alta, agua…) las define el juego por nombre.
"""
import json, hashlib
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
def H(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
O = H("#1a1420")
def rnd(s, n): return int(hashlib.md5(f"{s}{n}".encode()).hexdigest()[:6], 16) / 0xFFFFFF

class T:
    def __init__(self, base=None):
        self.a = np.zeros((16, 16, 4), np.uint8)
        if base: self.a[:] = base
    def px(self, x, y, c):
        if 0 <= x < 16 and 0 <= y < 16: self.a[y, x] = c
    def rect(self, x0, y0, x1, y1, c):
        self.a[max(0, y0):min(16, y1 + 1), max(0, x0):min(16, x1 + 1)] = c
    def hline(self, x0, x1, y, c): self.rect(x0, y, x1, y, c)
    def vline(self, x, y0, y1, c): self.rect(x, y0, x, y1, c)
    def circle(self, cx, cy, r, c, fill=True):
        for y in range(16):
            for x in range(16):
                d = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2
                if (fill and d <= r * r) or (not fill and r * r - 2 * r <= d <= r * r): self.a[y, x] = c
    def speckle(self, seed, colors, n):
        for i in range(n):
            self.px(int(rnd(seed, i) * 16), int(rnd(seed, i + 99) * 16), colors[i % len(colors)])
    def img(self): return Image.fromarray(self.a)

G1, G2, G3, G4 = H("#5aa848"), H("#78c860"), H("#98dc78"), H("#3e7c34")
def grass(seed=1):
    t = T(G2); t.speckle(seed, [G1, G3], 14)
    for i in range(3):
        x, y = int(rnd(seed, i + 7) * 13) + 1, int(rnd(seed, i + 17) * 12) + 2
        t.px(x, y, G1); t.px(x + 2, y, G1); t.px(x + 1, y - 1, G1)
    return t
def tall_grass(dark=False):
    t = grass(5)
    a, b, c = (H("#2e6a3a"), H("#3e8a48"), H("#5cb060")) if not dark else (H("#2a3a4a"), H("#3c5a6a"), H("#5a8a8a"))
    for ox, oy in ((0, 0), (8, 0), (4, 8), (12, 8), (0, 8)):
        for k in range(4):
            x = ox + 1 + k * 2
            t.vline(x, oy + 2, oy + 7, b); t.px(x, oy + 1, c); t.px(x + 1, oy + 3, a)
        t.hline(ox, ox + 8, oy + 7, a)
    return t
def path():
    t = T(H("#e0c88c")); t.speckle(3, [H("#c8ac70"), H("#f0dcaa")], 12); return t
def sand():
    t = T(H("#f0e0a8")); t.speckle(4, [H("#dcc888")], 8); return t
def water(frame):
    t = T(H("#4a90d8"))
    for y in range(2, 16, 5):
        x0 = (y * 3 + frame * 4) % 16
        t.hline(x0, x0 + 4, y, H("#8cc4f4")); t.hline((x0 + 9) % 16, (x0 + 11) % 16, y + 2, H("#2e6ab0"))
    return t
def flowers(frame):
    t = grass(9)
    for (x, y, c) in ((3, 4, "#f05050"), (11, 3, "#ffffff"), (7, 10, "#f0d040"), (13, 12, "#f05050")):
        dy = frame
        t.px(x, y + dy, H(c)); t.px(x - 1, y + dy, H(c)); t.px(x + 1, y + dy, H(c)); t.px(x, y - 1 + dy, H(c)); t.px(x, y + 1 + dy, H(c))
        t.px(x, y + dy, H("#f8e070"))
    return t
def tree(part, dark=False):
    """Árbol de 2×2 tiles."""
    big = np.zeros((32, 32, 4), np.uint8)
    leaf = [H("#2e6a3a"), H("#3e8a48"), H("#5cb060"), H("#8ad078")] if not dark else [H("#2a2440"), H("#463a6a"), H("#6a5a9a"), H("#9a8ac8")]
    gr = grass(11).a
    for oy in (0, 16):
        for ox in (0, 16): big[oy:oy + 16, ox:ox + 16] = gr
    yy, xx = np.mgrid[0:32, 0:32]
    trunk = (abs(xx - 15.5) < 3.5) & (yy > 18) & (yy < 30)
    big[trunk] = H("#7a4a2a"); big[trunk & (xx < 14)] = H("#9a6438")
    can = ((xx - 15.5) / 14.5) ** 2 + ((yy - 12) / 11.5) ** 2 <= 1
    big[can] = leaf[1]
    lit = can & (((xx - 11) / 9) ** 2 + ((yy - 8) / 7) ** 2 <= 1); big[lit] = leaf[2]
    for i in range(14):
        x, y = int(rnd("t", i) * 26) + 3, int(rnd("u", i) * 18) + 3
        if can[y, x]: big[y, x] = leaf[3] if y < 10 else leaf[0]
    sh = can & ~np.roll(can, -2, 0); big[sh & (yy > 12)] = leaf[0]
    edge = (np.roll(can | trunk, 1, 0) | np.roll(can | trunk, -1, 0) | np.roll(can | trunk, 1, 1) | np.roll(can | trunk, -1, 1)) & ~(can | trunk)
    big[edge] = O
    t = T(); ox, oy = {"tl": (0, 0), "tr": (16, 0), "bl": (0, 16), "br": (16, 16)}[part]
    t.a[:] = big[oy:oy + 16, ox:ox + 16]; return t
def bush():
    t = grass(12); t.circle(8, 9, 7, O); t.circle(8, 9, 6, H("#3e8a48")); t.circle(6.5, 7.5, 3.5, H("#5cb060")); t.px(5, 6, H("#8ad078")); return t
def fence():
    t = grass(13)
    t.hline(0, 15, 5, O); t.hline(0, 15, 6, H("#f0f0f0")); t.hline(0, 15, 7, O)
    for x in (2, 12):
        t.rect(x - 1, 2, x + 1, 13, O); t.rect(x, 3, x, 12, H("#ffffff"))
    return t
def sign():
    t = grass(14); t.rect(7, 9, 8, 14, H("#7a4a2a")); t.rect(2, 2, 13, 9, O); t.rect(3, 3, 12, 8, H("#c8945a")); t.hline(4, 11, 5, H("#8a5a30")); t.hline(4, 9, 7, H("#8a5a30")); return t
def rock():
    t = grass(15); t.circle(8, 9, 6.5, O); t.circle(8, 9, 5.5, H("#8a8a96")); t.circle(6.5, 7.5, 2.5, H("#b4b4c0")); return t
def ledge():
    t = grass(16); t.hline(0, 15, 11, O); t.rect(0, 12, 15, 13, H("#3e7c34")); t.hline(0, 15, 14, O); return t

ROOFS = {"rojo": ("#7a2020", "#c83c3c", "#e87060"), "azul": ("#1c3a7a", "#3a6ac8", "#6a9ae8"), "verde": ("#1c5a3a", "#2e8a5a", "#5ab884"),
         "naranja": ("#8a4210", "#d8701c", "#f4a050"), "gris": ("#3a3e4a", "#5e6474", "#8a90a0"), "morado": ("#3a1c5a", "#6a3a9a", "#9a6ac8")}
def roof(color, pos, row):
    d, m, l = map(H, ROOFS[color])
    t = T(m)
    for y in range(0, 16, 4): t.hline(0, 15, y + 3, d)
    for y in range(0, 16, 4):
        for x in range((y // 4 % 2) * 4, 16, 8): t.vline(x, y, y + 3, d)
    if row == 0: t.hline(0, 15, 0, O); t.hline(0, 15, 1, l)
    if row == 1: t.hline(0, 15, 14, O); t.hline(0, 15, 15, H("#2a2028"))
    if pos == "l": t.vline(0, 0, 15, O)
    if pos == "r": t.vline(15, 0, 15, O)
    return t
WALL = H("#f0e8d8"); WALLD = H("#c8bca8")
def wall(pos, kind="muro"):
    t = T(WALL); t.hline(0, 15, 15, WALLD)
    if pos == "l": t.vline(0, 0, 15, O)
    if pos == "r": t.vline(15, 0, 15, O)
    if kind == "ventana":
        t.rect(3, 3, 12, 11, O); t.rect(4, 4, 11, 10, H("#8cc4f4")); t.rect(4, 4, 6, 6, H("#e4f6ff")); t.vline(7, 4, 10, O); t.hline(4, 11, 7, O)
    if kind == "puerta":
        t.rect(3, 2, 12, 15, O); t.rect(4, 3, 11, 15, H("#7a4a2a")); t.rect(5, 4, 10, 8, H("#9a6438")); t.px(10, 10, H("#f0d040"))
    if kind == "puerta_cristal":
        t.rect(2, 2, 13, 15, O); t.rect(3, 3, 12, 15, H("#a8d8e8")); t.vline(7, 3, 15, O); t.vline(8, 3, 15, O); t.rect(3, 3, 5, 6, H("#e4f6ff"))
    if kind == "placa":   # icono de la Incubadora: placa de Petri
        t.circle(8, 8, 6.5, O); t.circle(8, 8, 5.5, H("#f4e8a8")); t.circle(6, 7, 1.5, H("#e05050")); t.circle(10, 9.5, 1.5, H("#e05050")); t.px(9, 6, H("#e05050"))
    if kind == "tienda":
        t.circle(8, 8, 6.5, O); t.circle(8, 8, 5.5, H("#3a6ac8")); t.rect(6, 5, 10, 11, H("#ffffff")); t.hline(6, 10, 8, H("#3a6ac8"))
    if kind == "gimnasio":
        t.rect(2, 3, 13, 12, O); t.rect(3, 4, 12, 11, H("#f0c040")); t.circle(8, 8, 3, H("#c83c3c"))
    return t

def floor_wood():
    t = T(H("#c8945a"))
    for y in (3, 7, 11, 15): t.hline(0, 15, y, H("#a8743e"))
    for i, y in enumerate((0, 4, 8, 12)): t.vline((i * 5 + 3) % 16, y, y + 2, H("#a8743e"))
    return t
def floor_lab():
    t = T(H("#e8eef4"))
    t.rect(0, 0, 7, 7, H("#d0dce8")); t.rect(8, 8, 15, 15, H("#d0dce8")); return t
def floor_gym():
    t = T(H("#f4e0a0")); t.rect(0, 0, 15, 0, H("#d8c070")); t.rect(0, 0, 0, 15, H("#d8c070")); t.circle(5, 5, 1.2, H("#e8c870")); t.circle(11, 10, 1.5, H("#e8c870")); return t
def wall_in(base=False):
    t = T(H("#b8c8d8"))
    for y in range(0, 16, 4): t.hline(0, 15, y, H("#a4b4c8"))
    if base: t.rect(0, 12, 15, 15, H("#6a7a90")); t.hline(0, 15, 12, O)
    return t
def table():
    t = floor_wood(); t.rect(1, 3, 14, 12, O); t.rect(2, 4, 13, 9, H("#e4b47a")); t.rect(2, 10, 13, 11, H("#a8743e")); return t
def counter():
    t = floor_lab(); t.rect(0, 2, 15, 14, O); t.rect(0, 3, 15, 8, H("#f4f4f8")); t.rect(0, 9, 15, 13, H("#c84040")); t.hline(0, 15, 9, O); return t
def pc():
    t = floor_lab(); t.rect(2, 1, 13, 14, O); t.rect(3, 2, 12, 9, H("#3a4a5a")); t.rect(4, 3, 11, 8, H("#5ac8a0")); t.rect(3, 10, 12, 13, H("#c8ccd4")); t.hline(5, 10, 5, H("#e4fff0")); return t
def shelf():
    t = wall_in(); t.rect(1, 0, 14, 15, O); t.rect(2, 1, 13, 14, H("#8a5a30"))
    for y in (4, 9, 14): t.hline(2, 13, y, O)
    cols = ["#c83c3c", "#3a6ac8", "#f0c040", "#2e8a5a", "#9a6ac8"]
    for r, y in enumerate((1, 6, 11)):
        for k in range(5): t.rect(2 + k * 2 + (r % 2), y, 3 + k * 2 + (r % 2), y + 2, H(cols[(k + r) % 5]))
    return t
def bed():
    t = floor_wood(); t.rect(2, 0, 13, 15, O); t.rect(3, 1, 12, 4, H("#ffffff")); t.rect(3, 5, 12, 14, H("#3a6ac8")); t.hline(3, 12, 5, H("#2a4a9a")); return t
def plant():
    t = floor_lab(); t.rect(5, 10, 10, 15, O); t.rect(6, 11, 9, 14, H("#c86a3a")); t.circle(8, 6, 5, O); t.circle(8, 6, 4, H("#3e8a48")); t.circle(6.5, 4.5, 1.5, H("#5cb060")); return t
def mat():
    t = floor_lab(); t.rect(1, 4, 14, 15, H("#c84040")); t.rect(3, 6, 12, 13, H("#e87060")); return t
def incubator():
    t = floor_lab(); t.rect(1, 0, 14, 15, O); t.rect(2, 1, 13, 14, H("#e4e8f0")); t.rect(3, 2, 12, 9, H("#2a3a4a")); t.rect(4, 3, 11, 8, H("#f4a83a"))
    for x in (5, 8, 10): t.circle(x + 0.5, 6, 1.2, H("#fff0c0"))
    t.rect(3, 11, 6, 12, H("#5ac8a0")); t.rect(9, 11, 12, 12, H("#c83c3c")); return t
def bench():
    t = floor_lab(); t.rect(0, 3, 15, 13, O); t.rect(0, 4, 15, 8, H("#2a2e3a")); t.rect(0, 9, 15, 12, H("#c8ccd4")); t.rect(3, 1, 5, 4, O); t.rect(4, 2, 4, 3, H("#8cc4f4")); t.rect(10, 1, 11, 4, H("#f05050")); return t
def microscope():
    t = bench(); t.rect(6, 0, 9, 6, O); t.rect(7, 0, 8, 5, H("#e4e8f0")); t.rect(5, 6, 10, 7, O); return t
def cheese():
    t = floor_gym(); t.rect(2, 5, 13, 13, O); t.rect(3, 6, 12, 12, H("#f8d850")); t.circle(6, 9, 1.4, H("#d8b030")); t.circle(10, 8, 1, H("#d8b030")); t.hline(3, 12, 6, H("#fff0a0")); return t
def can():
    t = floor_gym(); t.rect(4, 2, 11, 14, O); t.rect(5, 3, 10, 13, H("#c8ccd4")); t.rect(5, 6, 10, 10, H("#c83c3c")); t.hline(5, 10, 3, H("#ffffff")); return t
def tank():
    t = floor_gym(); t.circle(8, 8, 7, O); t.circle(8, 8, 6, H("#e4e8f0")); t.circle(6, 6, 2, H("#ffffff")); t.circle(8, 8, 2, H("#8cc4f4")); return t
def stairs():
    t = floor_lab()
    for k in range(4): t.rect(0, k * 4, 15, k * 4 + 3, H("#a8b0bc") if k % 2 else H("#c8ccd4")); t.hline(0, 15, k * 4 + 3, O)
    return t
def black(): return T(H("#000000"))

def build():
    tiles = {
        "vacio": black(), "hierba": grass(1), "hierba2": grass(2), "hierba_alta": tall_grass(), "hierba_oscura": tall_grass(True),
        "camino": path(), "arena": sand(), "agua0": water(0), "agua1": water(1), "flores0": flowers(0), "flores1": flowers(1),
        "seto": bush(), "valla": fence(), "cartel": sign(), "roca": rock(), "bordillo": ledge(),
    }
    for p in ("tl", "tr", "bl", "br"):
        tiles[f"arbol_{p}"] = tree(p); tiles[f"arbolv_{p}"] = tree(p, True)
    for col in ROOFS:
        for pos in ("l", "m", "r"):
            for row in (0, 1): tiles[f"tejado_{col}_{pos}{row}"] = roof(col, pos, row)
    for pos in ("l", "m", "r"): tiles[f"muro_{pos}"] = wall(pos)
    for k in ("ventana", "puerta", "puerta_cristal", "placa", "tienda", "gimnasio"): tiles[f"muro_{k}"] = wall("m", k)
    tiles.update({"suelo_madera": floor_wood(), "suelo_lab": floor_lab(), "suelo_gimnasio": floor_gym(), "pared": wall_in(), "pared_base": wall_in(True),
                  "mesa": table(), "mostrador": counter(), "pc": pc(), "estanteria": shelf(), "cama": bed(), "planta": plant(), "alfombra": mat(),
                  "incubadora": incubator(), "poyata": bench(), "microscopio": microscope(), "queso": cheese(), "lata": can(), "tanque": tank(),
                  "escaleras": stairs()})
    names = list(tiles)
    cols = 16; rows = (len(names) + cols - 1) // cols
    atlas = Image.new("RGBA", (cols * 16, rows * 16))
    for i, n in enumerate(names):
        atlas.alpha_composite(tiles[n].img(), ((i % cols) * 16, (i // cols) * 16))
    out = ROOT / "assets/atlas"; out.mkdir(parents=True, exist_ok=True)
    atlas.save(out / "tiles.png")
    json.dump({n: i for i, n in enumerate(names)}, open(out / "tiles.json", "w"))
    print("OK", len(names), "tiles")

if __name__ == "__main__":
    build()
