#!/usr/bin/env python3
"""Tileset 16×16 estilo Pokémon Diamante, dibujado por código.

Incluye variantes de borde (autotile de 4 vecinos) para caminos y agua, de modo que
las transiciones con la hierba son suaves. Salida: assets/atlas/tiles.png (16 columnas)
y assets/atlas/tiles.json {nombre: índice}.
"""
import json, hashlib
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
def H(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)] + [255], np.uint8)
O = H("#1e2a24")
def rnd(s, n): return int(hashlib.md5(f"{s}{n}".encode()).hexdigest()[:6], 16) / 0xFFFFFF

class T:
    def __init__(self, base=None):
        self.a = np.zeros((16, 16, 4), np.uint8)
        if base is not None: self.a[:] = base
    def px(self, x, y, c):
        if 0 <= x < 16 and 0 <= y < 16: self.a[y, x] = c
    def rect(self, x0, y0, x1, y1, c): self.a[max(0, y0):min(16, y1 + 1), max(0, x0):min(16, x1 + 1)] = c
    def hline(self, x0, x1, y, c): self.rect(x0, y, x1, y, c)
    def vline(self, x, y0, y1, c): self.rect(x, y0, x, y1, c)
    def mask(self, m, c): self.a[m] = c
    def img(self): return Image.fromarray(self.a)

YY, XX = np.mgrid[0:16, 0:16]
def circ(cx, cy, r): return (XX + 0.5 - cx) ** 2 + (YY + 0.5 - cy) ** 2 <= r * r

# ---------------------------------------------------------------- hierba
G = {k: H(v) for k, v in {"d": "#3f8f3a", "m": "#62b84a", "l": "#84d062", "h": "#a8e47c", "s": "#4fa040"}.items()}
def grass(seed=1, flowers=False):
    t = T(G["m"])
    # manchas suaves de luz y sombra
    for i in range(5):
        cx, cy = rnd(seed, i) * 16, rnd(seed, i + 50) * 16
        t.mask(circ(cx, cy, 2.2 + rnd(seed, i + 9) * 1.5) | circ(cx - 16, cy, 3) | circ(cx, cy - 16, 3), G["l"] if i % 2 else G["s"])
    t.a[:] = np.where((((XX + YY * 3 + seed) % 7) == 0)[..., None], G["s"], t.a) if False else t.a
    # matas de hierba en forma de V
    for i in range(6):
        x, y = int(rnd(seed, i + 20) * 13) + 1, int(rnd(seed, i + 30) * 12) + 3
        t.px(x, y, G["d"]); t.px(x + 2, y, G["d"]); t.px(x + 1, y + 1, G["d"]); t.px(x, y - 1, G["h"]); t.px(x + 2, y - 1, G["l"])
    return t
def tall_grass(dark=False, frame=0):
    base = grass(5)
    c = [H("#1f5a2c"), H("#2f7a38"), H("#46a046"), H("#78c860"), H("#a8e080")] if not dark else [H("#1c2c40"), H("#2c4a5c"), H("#3e6a74"), H("#5c9490"), H("#8cc0b4")]
    t = base
    for row, oy in enumerate((1, 9)):
        for k in range(4):
            ox = k * 4 + (2 if row else 0) + (frame if k % 2 else 0)
            # hoja triangular con volumen
            for j in range(7):
                w = max(0, 3 - j // 2)
                for i in range(-w, w + 1):
                    x, y = ox + 2 + i, oy + 6 - j
                    tone = 4 if (j > 4 and i <= 0) else 3 if i < 0 else 2 if i == 0 else 1
                    t.px(x % 16, y, c[tone])
            t.px((ox + 2) % 16, oy + 7, c[0]); t.px((ox + 1) % 16, oy + 7, c[0]); t.px((ox + 3) % 16, oy + 7, c[0])
    return t
FLOWER = [("#f85a5a", "#ffd0d0"), ("#ffffff", "#f8e070"), ("#f8d040", "#fff8c0"), ("#f070c0", "#ffd0f0")]
def flowers(frame):
    t = grass(9)
    for k, (x, y) in enumerate(((3, 4), (11, 3), (7, 10), (13, 12))):
        c, ce = FLOWER[k % 4]
        dy = frame if k % 2 else 0
        for dx, dyy in ((0, -1), (-1, 0), (1, 0), (0, 1)): t.px(x + dx, y + dyy + dy, H(c))
        t.px(x, y + dy, H("#f8c830")); t.px(x, y + 2 + dy, G["d"])
    return t

# ---------------------------------------------------------------- camino y arena con bordes
P = {"m": H("#e6d2a0"), "l": H("#f2e4ba"), "d": H("#cdb47e"), "e": H("#b8995e")}
def path_tile(mask, sand=False):
    """mask: bits 1=N, 2=E, 4=S, 8=O indican vecino que NO es camino (borde con hierba)."""
    pal = P if not sand else {"m": H("#f2e6b4"), "l": H("#fbf3d2"), "d": H("#dccb94"), "e": H("#c6b07a")}
    t = T(pal["m"])
    for i in range(10):
        t.px(int(rnd("p", i) * 16), int(rnd("q", i) * 16), pal["d"] if i % 3 else pal["l"])
    g = grass(7)
    def edge(dist):  # distancia al borde con hierba (con ruido)
        return dist
    for bit, side in ((1, "n"), (2, "e"), (4, "s"), (8, "w")):
        if not mask & bit: continue
        for k in range(16):
            n = 2 + int(rnd(side, k) * 2.2)      # anchura irregular de la hierba invasora
            for d in range(n):
                x, y = {"n": (k, d), "s": (k, 15 - d), "w": (d, k), "e": (15 - d, k)}[side]
                t.a[y, x] = g.a[y, x]
            x, y = {"n": (k, n), "s": (k, 15 - n), "w": (n, k), "e": (15 - n, k)}[side]
            t.a[y, x] = pal["e"]
            x2, y2 = {"n": (k, n - 1), "s": (k, 16 - n), "w": (n - 1, k), "e": (16 - n, k)}[side]
            t.a[y2, x2] = G["d"]
    return t

# ---------------------------------------------------------------- agua con orillas
W = {"d": H("#3a72c8"), "m": H("#5296e4"), "l": H("#82bcf6"), "h": H("#d0ecff")}
def water_tile(mask, frame):
    t = T(W["m"])
    for y in range(16):
        for x in range(16):
            v = np.sin((x + frame * 3) * 0.8 + y * 0.35) + np.sin(y * 1.1 - frame)
            if v > 1.4: t.a[y, x] = W["l"]
            elif v < -1.5: t.a[y, x] = W["d"]
    for k in range(3):
        x, y = int(rnd("w", k + frame * 7) * 13), int(rnd("v", k) * 14)
        t.hline(x, x + 2, y, W["h"])
    g = grass(3)
    for bit, side in ((1, "n"), (2, "e"), (4, "s"), (8, "w")):
        if not mask & bit: continue
        for k in range(16):
            n = 3 + int(rnd(side + "a", k) * 1.6)
            for d in range(n):
                x, y = {"n": (k, d), "s": (k, 15 - d), "w": (d, k), "e": (15 - d, k)}[side]
                t.a[y, x] = g.a[y, x]
            for j, col in ((n, G["d"]), (n + 1, W["h"] if (k + frame) % 3 else W["l"]), (n + 2, W["l"])):
                x, y = {"n": (k, j), "s": (k, 15 - j), "w": (j, k), "e": (15 - j, k)}[side]
                t.a[y, x] = col
    return t

# ---------------------------------------------------------------- árboles 2×2 con sombra
def tree_big(dark=False):
    big = np.zeros((32, 32, 4), np.uint8)
    gr = grass(11).a
    for oy in (0, 16):
        for ox in (0, 16): big[oy:oy + 16, ox:ox + 16] = gr
    yy, xx = np.mgrid[0:32, 0:32]
    leaf = ([H("#1d4a2a"), H("#2a6a34"), H("#3e8c40"), H("#5cae50"), H("#88d070")] if not dark
            else [H("#211a3c"), H("#352a5e"), H("#4c3e84"), H("#6a5aaa"), H("#9a8ad0")])
    shadow = ((xx - 16) / 13) ** 2 + ((yy - 29) / 3.2) ** 2 <= 1
    big[shadow] = (big[shadow].astype(int) * [0.62, 0.7, 0.62, 1]).astype(np.uint8)
    trunk = (abs(xx - 15.5) < 3.2) & (yy > 19) & (yy < 30)
    big[trunk] = H("#6a4024"); big[trunk & (xx < 15)] = H("#8a5a32"); big[trunk & (xx < 13.5)] = H("#a87444")
    can = np.zeros((32, 32), bool)
    blobs = [(16, 9, 9.5), (9, 13, 7), (23, 13, 7), (16, 16, 8)]
    L = np.array([-0.6, -0.7, 0.6]); L /= np.linalg.norm(L)
    tone = np.full((32, 32), -1)
    for cx, cy, r in blobs:
        d2 = (xx + 0.5 - cx) ** 2 + (yy + 0.5 - cy) ** 2
        inside = d2 <= r * r
        nz = np.sqrt(np.clip(1 - d2 / (r * r), 0, 1))
        nx, ny = (xx + 0.5 - cx) / r, (yy + 0.5 - cy) / r
        I = nx * L[0] + ny * L[1] + nz * L[2]
        tt = np.digitize(I, [0.0, 0.35, 0.65, 0.88])
        tone = np.where(inside, tt, tone)
        can |= inside
    for i in range(40):  # textura de hojas
        x, y = int(rnd("hx", i) * 30) + 1, int(rnd("hy", i) * 24) + 1
        if can[y, x] and tone[y, x] >= 1: tone[y, x] = tone[y, x] - 1 if i % 2 else min(4, tone[y, x] + 1)
    for k in range(5): big[(tone == k) & can] = leaf[k]
    body = can | trunk
    edge = (np.roll(body, 1, 0) | np.roll(body, -1, 0) | np.roll(body, 1, 1) | np.roll(body, -1, 1)) & ~body
    big[edge & ~shadow] = O; big[edge & shadow] = O
    return {p: T(big[oy:oy + 16, ox:ox + 16]) for p, (ox, oy) in {"tl": (0, 0), "tr": (16, 0), "bl": (0, 16), "br": (16, 16)}.items()}

def bush():
    t = grass(12)
    base = circ(8, 9, 6.8)
    t.mask(circ(8, 14, 6) & ~base, (t.a[circ(8, 14, 6) & ~base].astype(int) * [0.7, 0.75, 0.7, 1]).astype(np.uint8))
    ring = circ(8, 9, 7.6) & ~base
    t.mask(ring, O); t.mask(base, H("#2f7a38")); t.mask(circ(6.5, 7.5, 4.2) & base, H("#46a046")); t.mask(circ(5.5, 6, 2) & base, H("#78c860"))
    t.px(5, 5, H("#a8e080")); t.mask(circ(11, 12, 2.5) & base, H("#1f5a2c"))
    return t
def fence():
    t = grass(13)
    for x in (3, 12):
        t.rect(x - 1, 3, x + 1, 14, O); t.rect(x, 4, x, 13, H("#ffffff")); t.px(x, 13, H("#c8ccd4"))
    for y in (5, 9):
        t.hline(0, 15, y - 1, O); t.hline(0, 15, y, H("#f8f8f8")); t.hline(0, 15, y + 1, H("#c8ccd4")); t.hline(0, 15, y + 2, O)
    return t
def sign():
    t = grass(14)
    t.rect(7, 9, 8, 15, H("#6a4024")); t.vline(7, 9, 15, H("#8a5a32"))
    t.rect(1, 2, 14, 10, O); t.rect(2, 3, 13, 9, H("#c8945a")); t.hline(2, 13, 3, H("#e4b47a")); t.hline(2, 13, 9, H("#9a6a3a"))
    for y in (5, 7): t.hline(4, 11 if y == 5 else 9, y, H("#7a4a24"))
    t.rect(4, 14, 11, 15, (t.a[14:16, 4:12].astype(int)[0, 0] * [0.7, 0.75, 0.7, 1]).astype(np.uint8))
    return t
def rock():
    t = grass(15)
    t.mask(circ(8, 13, 6) & ~circ(8, 9, 6.5), (np.array(G["m"]).astype(int) * [0.7, 0.72, 0.7, 1]).astype(np.uint8))
    t.mask(circ(8, 9, 7), O); t.mask(circ(8, 9, 6), H("#7c808e")); t.mask(circ(7, 8, 4.5), H("#9ea2b0")); t.mask(circ(6, 6.5, 2.2), H("#c8ccd6")); t.px(5, 5, H("#ffffff"))
    return t
def ledge():
    t = grass(16)
    t.hline(0, 15, 9, H("#4f9e3a")); t.hline(0, 15, 10, O); t.rect(0, 11, 15, 12, H("#c49a5a")); t.rect(0, 13, 15, 13, H("#9a723e")); t.hline(0, 15, 14, O)
    return t

# ---------------------------------------------------------------- edificios
ROOFS = {"rojo": ("#7a1e24", "#b83234", "#e05a50", "#f89a84"), "azul": ("#1a3270", "#2f58b0", "#4f84e0", "#94c0ff"),
         "verde": ("#18503a", "#26805a", "#3caa78", "#86dcae"), "naranja": ("#8a3c10", "#d0661c", "#f0904a", "#ffc890"),
         "gris": ("#323642", "#525a6c", "#767e92", "#b0b8c8"), "morado": ("#341a56", "#5a3290", "#8058c0", "#b89ce8")}
def roof(color, pos, row):
    d, m, l, h = map(H, ROOFS[color])
    t = T(m)
    for y in range(16):
        r = (y + row * 16) % 5
        off = ((y + row * 16) // 5) % 2 * 4
        for x in range(16):
            if r == 4: t.a[y, x] = d
            elif r == 0: t.a[y, x] = l
            elif (x + off) % 8 == 0: t.a[y, x] = d
    if row == 0:
        t.hline(0, 15, 0, O); t.hline(0, 15, 1, h); t.hline(0, 15, 2, l)
    if row == 1:
        t.rect(0, 13, 15, 13, O); t.rect(0, 14, 15, 15, H("#3a2e34"))
    if pos == "l": t.vline(0, 0, 15, O); t.vline(1, 2, 12, l)
    if pos == "r": t.vline(15, 0, 15, O); t.vline(14, 2, 12, d)
    return t
WALL = [H("#c4b8a4"), H("#e2d8c4"), H("#f4ecdc"), H("#fffaf0")]
def wall(pos, kind="muro"):
    t = T(WALL[2])
    for y in (3, 7, 11): t.hline(0, 15, y, WALL[1])
    t.hline(0, 15, 0, WALL[0]); t.hline(0, 15, 1, WALL[1])        # sombra del alero
    t.hline(0, 15, 15, WALL[0])
    if pos == "l": t.vline(0, 0, 15, O); t.vline(1, 0, 15, WALL[3])
    if pos == "r": t.vline(15, 0, 15, O); t.vline(14, 0, 15, WALL[1])
    if kind == "ventana":
        t.rect(2, 3, 13, 12, O); t.rect(3, 4, 12, 11, H("#f8f8f8"))
        t.rect(4, 5, 11, 10, H("#5a9ae0")); t.rect(4, 5, 11, 6, H("#8cc4f4")); t.rect(4, 5, 6, 7, H("#d8f0ff"))
        t.vline(7, 5, 10, H("#f8f8f8")); t.vline(8, 5, 10, H("#c8ccd4")); t.hline(4, 11, 8, H("#f8f8f8"))
        t.rect(2, 13, 13, 13, H("#a89c88"))
    if kind == "puerta":
        t.rect(3, 2, 12, 15, O); t.rect(4, 3, 11, 15, H("#8a5230")); t.rect(5, 4, 10, 8, H("#a86a3e")); t.rect(5, 10, 10, 14, H("#a86a3e"))
        t.vline(4, 3, 15, H("#b07a48")); t.px(10, 10, H("#f8d040")); t.px(10, 9, H("#fff0a0"))
    if kind == "puerta_cristal":
        t.rect(2, 2, 13, 15, O); t.rect(3, 3, 12, 15, H("#9ad0e8")); t.rect(3, 3, 12, 4, H("#d8f4ff"))
        t.vline(7, 3, 15, O); t.vline(8, 3, 15, H("#5a8aa0")); t.rect(4, 5, 5, 9, H("#e8faff")); t.rect(9, 5, 10, 9, H("#e8faff"))
    if kind == "placa":
        t.mask(circ(8, 8, 7), O); t.mask(circ(8, 8, 6), H("#f8f0d0")); t.mask(circ(8, 8, 5), H("#f4e2a0"))
        for (x, y) in ((6, 7), (10, 9.5), (9, 5.5), (5.5, 10)): t.mask(circ(x, y, 1.3), H("#e04848"))
        t.px(5, 5, H("#ffffff"))
    if kind == "tienda":
        t.mask(circ(8, 8, 7), O); t.mask(circ(8, 8, 6), H("#2f58b0")); t.mask(circ(7, 7, 4), H("#4f84e0"))
        t.rect(6, 5, 10, 11, H("#ffffff")); t.hline(6, 10, 8, H("#2f58b0"))
    if kind == "gimnasio":
        t.rect(1, 3, 14, 12, O); t.rect(2, 4, 13, 11, H("#f0c040")); t.rect(2, 4, 13, 5, H("#ffe890"))
        t.mask(circ(8, 8, 3.2), H("#c83c3c")); t.mask(circ(7.5, 7.5, 1.4), H("#ff9090"))
    return t

# ---------------------------------------------------------------- interiores
def floor_wood():
    t = T(H("#c88a52"))
    for y in range(16):
        if y % 4 == 3: t.hline(0, 15, y, H("#a06838"))
        elif y % 4 == 0: t.hline(0, 15, y, H("#dca06a"))
    for i, y in enumerate((0, 4, 8, 12)): t.vline((i * 5 + 3) % 16, y, y + 2, H("#a06838"))
    return t
def floor_lab():
    t = T(H("#eef2f6"))
    t.rect(0, 0, 7, 7, H("#d8e2ec")); t.rect(8, 8, 15, 15, H("#d8e2ec"))
    t.hline(0, 15, 15, H("#c4d0dc")); t.vline(15, 0, 15, H("#c4d0dc")); t.px(2, 2, H("#ffffff")); t.px(10, 10, H("#ffffff"))
    return t
def floor_gym():
    t = T(H("#f4dc94"))
    t.hline(0, 15, 0, H("#d8b864")); t.vline(0, 0, 15, H("#d8b864")); t.hline(1, 15, 1, H("#fff0c0"))
    for (x, y, r) in ((5, 6, 1.5), (11, 11, 2)): t.mask(circ(x, y, r), H("#e8c870"))
    return t
def wall_in(base=False):
    t = T(H("#b8c8dc"))
    for y in range(0, 16, 4): t.hline(0, 15, y, H("#a4b6cc"))
    t.hline(0, 15, 1, H("#ccdaec"))
    if base: t.rect(0, 11, 15, 15, H("#6a7a92")); t.hline(0, 15, 11, O); t.hline(0, 15, 12, H("#8c9cb4"))
    return t
def table():
    t = floor_wood(); t.rect(0, 2, 15, 13, O); t.rect(1, 3, 14, 9, H("#e4b47a")); t.hline(1, 14, 3, H("#f4d0a0")); t.rect(1, 10, 14, 12, H("#a06838")); t.rect(2, 13, 3, 15, O); t.rect(12, 13, 13, 15, O); return t
def counter():
    t = floor_lab(); t.rect(0, 1, 15, 14, O); t.rect(0, 2, 15, 7, H("#f8f8fc")); t.hline(0, 15, 2, H("#ffffff")); t.rect(0, 8, 15, 13, H("#d84848")); t.hline(0, 15, 8, O); t.hline(0, 15, 9, H("#f07070")); return t
def pc():
    t = floor_lab(); t.rect(2, 0, 13, 14, O); t.rect(3, 1, 12, 9, H("#344456")); t.rect(4, 2, 11, 8, H("#52c8a0")); t.rect(4, 2, 11, 3, H("#a8f0d8"))
    t.rect(3, 10, 12, 13, H("#c8ccd4")); t.hline(3, 12, 10, H("#e8ecf0")); t.px(10, 12, H("#40d060")); return t
def shelf():
    t = wall_in(); t.rect(0, 0, 15, 15, O); t.rect(1, 1, 14, 14, H("#8a5230")); t.vline(1, 1, 14, H("#a86a3e"))
    for y in (4, 9, 14): t.hline(1, 14, y, O)
    cols = ["#d84848", "#2f58b0", "#f0c040", "#2e8a5a", "#9a6ac8", "#f08040"]
    for r, y in enumerate((1, 6, 11)):
        for k in range(6):
            x = 2 + k * 2
            t.rect(x, y + (k % 2), x, y + 2, H(cols[(k + r) % 6])); t.px(x, y + (k % 2), H("#ffffff"))
    return t
def bed():
    t = floor_wood(); t.rect(1, 0, 14, 15, O); t.rect(2, 1, 13, 4, H("#ffffff")); t.rect(2, 1, 13, 1, H("#e8ecf0")); t.rect(2, 5, 13, 14, H("#4f84e0")); t.hline(2, 13, 5, H("#94c0ff")); t.rect(2, 12, 13, 14, H("#2f58b0")); return t
def plant():
    t = floor_lab(); t.rect(5, 10, 10, 15, O); t.rect(6, 11, 9, 14, H("#d0703a")); t.hline(6, 9, 11, H("#f09a60"))
    t.mask(circ(8, 6, 5.5), O); t.mask(circ(8, 6, 4.5), H("#2f7a38")); t.mask(circ(6.5, 4.5, 2.5), H("#46a046")); t.px(6, 3, H("#a8e080")); return t
def mat():
    t = floor_lab(); t.rect(1, 3, 14, 15, H("#b83234")); t.rect(2, 4, 13, 14, H("#e05a50")); t.rect(4, 6, 11, 12, H("#f89a84")); return t
def incubator():
    t = floor_lab(); t.rect(1, 0, 14, 15, O); t.rect(2, 1, 13, 14, H("#e4e8f0")); t.hline(2, 13, 1, H("#ffffff")); t.rect(3, 2, 12, 9, H("#2a3a4a"))
    t.rect(4, 3, 11, 8, H("#f4a83a")); t.rect(4, 3, 11, 4, H("#ffd890"))
    for x in (5, 8, 10): t.mask(circ(x + 0.5, 6, 1.2), H("#fff0c0"))
    t.rect(3, 11, 6, 12, H("#52c8a0")); t.rect(9, 11, 12, 12, H("#d84848")); return t
def bench():
    t = floor_lab(); t.rect(0, 3, 15, 13, O); t.rect(0, 4, 15, 8, H("#2a2e3a")); t.hline(0, 15, 4, H("#4a5060")); t.rect(0, 9, 15, 12, H("#c8ccd4"))
    t.rect(2, 0, 4, 4, O); t.rect(3, 1, 3, 3, H("#8cc4f4")); t.rect(10, 0, 12, 4, O); t.rect(11, 1, 11, 3, H("#f05050")); return t
def microscope():
    t = bench(); t.rect(6, 0, 9, 6, O); t.rect(7, 0, 8, 5, H("#e4e8f0")); t.px(7, 0, H("#ffffff")); t.rect(5, 6, 10, 7, O); return t
def cheese():
    t = floor_gym(); t.rect(1, 4, 14, 13, O); t.rect(2, 5, 13, 12, H("#f8d040")); t.hline(2, 13, 5, H("#fff090")); t.rect(2, 11, 13, 12, H("#d8a820"))
    for (x, y, r) in ((5, 8, 1.4), (10, 7, 1), (9, 10, 0.9)): t.mask(circ(x, y, r), H("#c89418"))
    return t
def can():
    t = floor_gym(); t.rect(3, 1, 12, 14, O); t.rect(4, 2, 11, 13, H("#c8ccd4")); t.rect(4, 5, 11, 10, H("#d84848")); t.rect(4, 5, 5, 10, H("#f07070"))
    t.hline(4, 11, 2, H("#ffffff")); t.vline(4, 2, 13, H("#e8ecf0")); return t
def tank():
    t = floor_gym(); t.mask(circ(8, 8, 7.2), O); t.mask(circ(8, 8, 6.2), H("#d8dee8")); t.mask(circ(6.5, 6.5, 3.5), H("#f4f8fc")); t.mask(circ(8, 8, 2.2), H("#8cc4f4")); return t
def stairs():
    t = floor_lab()
    for k in range(4): t.rect(0, k * 4, 15, k * 4 + 3, H("#a8b0bc") if k % 2 else H("#c8ccd4")); t.hline(0, 15, k * 4, H("#e8ecf0")); t.hline(0, 15, k * 4 + 3, O)
    return t
def black(): return T(H("#000000"))

def build():
    tiles = {"vacio": black(), "hierba": grass(1), "hierba2": grass(2), "hierba_alta": tall_grass(), "hierba_oscura": tall_grass(True),
             "flores0": flowers(0), "flores1": flowers(1), "seto": bush(), "valla": fence(), "cartel": sign(), "roca": rock(), "bordillo": ledge()}
    for m in range(16):
        tiles[f"camino_{m}"] = path_tile(m)
        tiles[f"arena_{m}"] = path_tile(m, sand=True)
        tiles[f"agua_{m}_0"] = water_tile(m, 0); tiles[f"agua_{m}_1"] = water_tile(m, 1)
    tiles["camino"] = tiles["camino_0"]; tiles["arena"] = tiles["arena_0"]; tiles["agua0"] = tiles["agua_0_0"]; tiles["agua1"] = tiles["agua_0_1"]
    for dark, pre in ((False, "arbol"), (True, "arbolv")):
        for p, t in tree_big(dark).items(): tiles[f"{pre}_{p}"] = t
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
    for i, n in enumerate(names): atlas.alpha_composite(tiles[n].img(), ((i % cols) * 16, (i // cols) * 16))
    out = ROOT / "assets/atlas"; out.mkdir(parents=True, exist_ok=True)
    atlas.save(out / "tiles.png")
    json.dump({n: i for i, n in enumerate(names)}, open(out / "tiles.json", "w"))
    print("OK", len(names), "tiles")

if __name__ == "__main__":
    build()
