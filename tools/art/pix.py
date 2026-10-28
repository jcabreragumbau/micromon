"""Mini librería de píxel art procedural para Micromón.

Las formas se definen en coordenadas normalizadas (0..1), así que el mismo diseño
se dibuja a 64×64 (combate) o a 32×32 (icono). Cada pieza se sombrea por separado
con la técnica de «borde desplazado» (luz arriba-izquierda) y lleva su propio
contorno, de modo que las piezas superpuestas se distinguen.
"""
import math
import numpy as np
from PIL import Image

# ---------------------------------------------------------------- paleta
OUTLINE = (26, 20, 32)
WHITE = (255, 255, 255)
EYE = (32, 24, 42)
MOUTH = (138, 32, 48)
BLUSH = (240, 128, 128)

# Rampas de 4 tonos (oscuro, medio, claro, brillo) por tipo y algunas extra
RAMPS = {
    "Levadura":     ["#6b5a3e", "#a68b5b", "#d9c08c", "#f5ecd0"],
    "Fotótrofo":    ["#2d5a27", "#4f9a3c", "#8ad05a", "#d2f4a0"],
    "Anaerobio":    ["#7a2a14", "#c8522a", "#f08a3c", "#ffd08a"],
    "Protozoo":     ["#1f3f7a", "#3a6fc8", "#6aa8f0", "#c4e4ff"],
    "Espiroqueta":  ["#7a6210", "#d4a91c", "#f5d84a", "#fff6b0"],
    "Gram+":        ["#3d2366", "#6b3fa8", "#9b72d6", "#d8c4f5"],
    "Gram-":        ["#6a1a3c", "#b0306a", "#e06a9a", "#f8c0d6"],
    "Antibiótico":  ["#6e1e1e", "#b23a3a", "#e07060", "#f6c0b0"],
    "Esporulado":   ["#5a3f1e", "#94693a", "#c99e5e", "#ecd6a8"],
    "Alga":         ["#1c5a5a", "#2f9a8a", "#6ad0b8", "#c8f4e8"],
    "Intracelular": ["#6a1f5e", "#b84a9e", "#e88ad0", "#f8d0ee"],
    "Hongo":        ["#4a4a12", "#8a8a22", "#c4c44a", "#eeee9e"],
    "Ácido-Alc.":   ["#2a5a7a", "#5a9ac8", "#9ad0ee", "#e4f6ff"],
    "Archaea":      ["#2e2450", "#54468a", "#8a7ac0", "#c8bef0"],
    "Virus":        ["#2a1a6a", "#4a36b8", "#7a6ef0", "#c4beff"],
    "Biofilm":      ["#3e4652", "#6e7a8a", "#a4aebc", "#e2e8ee"],
    "Extremófilo":  ["#1e1a1a", "#423838", "#6e5e5a", "#a8988e"],
    "Simbionte":    ["#7a3a5a", "#d06a9a", "#f4a6c8", "#ffe4f0"],
    # extra
    "cristal":      ["#5a8a9a", "#a8d8e0", "#dcf4f6", "#ffffff"],
    "esporangio":   ["#14121a", "#2a2634", "#4a4458", "#7a7290"],
    "carotenoide":  ["#8a3a10", "#d8701c", "#f4a83a", "#ffdc8a"],
    "brillo":       ["#a86a10", "#f0b030", "#ffe070", "#fffbd0"],
}
def hex2rgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
RAMPS = {k: [hex2rgb(c) for c in v] for k, v in RAMPS.items()}

# ---------------------------------------------------------------- formas (máscaras)
def grid(S):
    y, x = np.mgrid[0:S, 0:S]
    return (x + 0.5) / S, (y + 0.5) / S

def ellipse(S, cx, cy, rx, ry, rot=0.0):
    x, y = grid(S)
    c, s = math.cos(rot), math.sin(rot)
    dx, dy = x - cx, y - cy
    u, v = dx * c + dy * s, -dx * s + dy * c
    return (u / rx) ** 2 + (v / ry) ** 2 <= 1

def capsule(S, p1, p2, r):
    x, y = grid(S)
    (x1, y1), (x2, y2) = p1, p2
    vx, vy = x2 - x1, y2 - y1
    L2 = vx * vx + vy * vy or 1e-9
    t = np.clip(((x - x1) * vx + (y - y1) * vy) / L2, 0, 1)
    px, py = x1 + t * vx, y1 + t * vy
    return (x - px) ** 2 + (y - py) ** 2 <= r * r

def polygon(S, pts):
    x, y = grid(S)
    inside = np.zeros((S, S), bool)
    n = len(pts)
    for i in range(n):
        (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % n]
        cond = ((y1 > y) != (y2 > y)) & (x < (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-9) + x1)
        inside ^= cond
    return inside

def regular(S, cx, cy, r, n, rot=0.0, sy=1.0):
    return polygon(S, [(cx + r * math.cos(rot + 2 * math.pi * i / n), cy + sy * r * math.sin(rot + 2 * math.pi * i / n)) for i in range(n)])

def bezier(points, steps=60):
    """Curva de Bézier por los puntos de control dados."""
    pts = np.array(points, float)
    out = []
    for t in np.linspace(0, 1, steps):
        p = pts.copy()
        while len(p) > 1:
            p = (1 - t) * p[:-1] + t * p[1:]
        out.append(p[0])
    return out

def stroke(S, pts, width):
    """Trazo grueso a lo largo de una polilínea (coordenadas normalizadas)."""
    m = np.zeros((S, S), bool)
    r = max(width / 2, 0.5 / S)
    for a, b in zip(pts, pts[1:]):
        m |= capsule(S, a, b, r)
    return m

def wave(p1, p2, amp, waves, steps=40):
    (x1, y1), (x2, y2) = p1, p2
    dx, dy = x2 - x1, y2 - y1
    L = math.hypot(dx, dy) or 1
    nx, ny = -dy / L, dx / L
    out = []
    for i in range(steps + 1):
        t = i / steps
        w = math.sin(t * waves * 2 * math.pi) * amp * min(1, t * 3)
        out.append((x1 + dx * t + nx * w, y1 + dy * t + ny * w))
    return out

def shift(m, dx, dy):
    out = np.zeros_like(m)
    S = m.shape[0]
    ys, ye = max(0, dy), S + min(0, dy)
    xs, xe = max(0, dx), S + min(0, dx)
    out[ys:ye, xs:xe] = m[ys - dy:ye - dy, xs - dx:xe - dx]
    return out

def dilate(m):
    return m | shift(m, 1, 0) | shift(m, -1, 0) | shift(m, 0, 1) | shift(m, 0, -1)

# ---------------------------------------------------------------- lienzo
class Sprite:
    def __init__(self, S):
        self.S = S
        self.rgba = np.zeros((S, S, 4), np.uint8)
        self.k = max(1, round(S / 32))   # grosor del sombreado

    @property
    def filled(self):
        return self.rgba[..., 3] > 0

    def put(self, mask, color):
        self.rgba[mask] = (*color, 255)

    def part(self, mask, ramp, outline=True, highlight=True, flat=False):
        """Pinta una pieza sombreada con su propio contorno."""
        r = RAMPS[ramp] if isinstance(ramp, str) else ramp
        if not mask.any():
            return
        if outline:
            self.put(dilate(mask) & ~mask, OUTLINE)
        if flat:
            self.put(mask, r[1]); return
        k = self.k
        self.put(mask, r[1])
        light = mask & ~shift(mask, k, k)            # cerca del borde superior izquierdo
        dark = mask & ~shift(mask, -k, -k)           # cerca del borde inferior derecho
        self.put(light, r[2])
        self.put(dark, r[0])
        if highlight:
            ys, xs = np.where(mask)
            cy, cx = ys.mean(), xs.mean()
            h, w = ys.max() - ys.min() + 1, xs.max() - xs.min() + 1
            spot = ellipse(self.S, (cx - w * 0.22) / self.S, (cy - h * 0.24) / self.S,
                           max(0.6, w * 0.10) / self.S, max(0.6, h * 0.07) / self.S, -0.6) & mask & ~dark
            self.put(spot, r[3])

    def lines(self, mask, color):
        self.put(mask, color)

    def outline_all(self):
        """Contorno exterior final para que la silueta se lea sobre cualquier fondo."""
        f = self.filled
        self.put(dilate(f) & ~f, OUTLINE)

    def eyes(self, cx, cy, gap, size=0.07, mood="happy", look=(0.0, 0.0)):
        """Ojos grandes estilo Micromón con brillo blanco. A 32 px usa un patrón fijo legible."""
        S = self.S
        for side in (-1, 1):
            ex = cx + side * gap / 2
            if S <= 32:
                x0, y0 = int(ex * S) - 1, int(cy * S) - 1
                self.rgba[y0:y0 + 3, x0:x0 + 2] = (*EYE, 255)
                self.rgba[y0, x0] = (*WHITE, 255)
                if mood == "fierce":
                    bx = x0 - 1 if side < 0 else x0
                    self.rgba[y0 - 2, bx:bx + 3] = (*OUTLINE, 255)
                continue
            m = ellipse(S, ex, cy, size * 0.62, size)
            self.put(dilate(m) & ~m, OUTLINE)
            self.put(m, EYE)
            hl = ellipse(S, ex - size * 0.22 + look[0], cy - size * 0.38 + look[1], max(0.55 / S, size * 0.22), max(0.55 / S, size * 0.26))
            self.put(hl & m, WHITE)
            if mood == "fierce":
                outer = (ex + side * size * 0.95, cy - size * 1.55)
                inner = (ex - side * size * 0.55, cy - size * 0.95)
                self.put(stroke(S, [outer, inner], max(1.6 / S, size * 0.28)), OUTLINE)

    def filled_eye_safe(self):
        return np.zeros((self.S, self.S), bool)

    def mouth(self, cx, cy, w=0.06, kind="smile"):
        S = self.S
        if S <= 32:
            x, y = int(cx * S), int(cy * S)
            if kind == "smile":
                self.rgba[y, x - 1] = self.rgba[y, x + 1] = (*OUTLINE, 255); self.rgba[y + 1, x] = (*OUTLINE, 255)
            else:
                self.rgba[y:y + 2, x - 1:x + 1] = (*MOUTH, 255)
            return
        if kind == "smile":
            pts = bezier([(cx - w, cy - w * 0.2), (cx, cy + w * 0.9), (cx + w, cy - w * 0.2)], 20)
            self.put(stroke(S, pts, max(1.0 / S, 0.016)), OUTLINE)
        elif kind == "open":
            m = ellipse(S, cx, cy, w * 0.75, w * 0.55)
            self.put(dilate(m) & ~m, OUTLINE); self.put(m, MOUTH)
            self.put(ellipse(S, cx, cy + w * 0.25, w * 0.4, w * 0.2) & m, (232, 110, 120))
        elif kind == "grin":
            m = polygon(S, [(cx - w, cy - w * 0.25), (cx + w, cy - w * 0.25), (cx + w * 0.4, cy + w * 0.5), (cx - w * 0.4, cy + w * 0.5)])
            self.put(dilate(m) & ~m, OUTLINE); self.put(m, WHITE)
            self.put(stroke(S, [(cx - w * 0.8, cy + w * 0.1), (cx + w * 0.8, cy + w * 0.1)], 0.8 / S), OUTLINE)

    def blush(self, cx, cy, gap):
        for side in (-1, 1):
            self.put(ellipse(self.S, cx + side * gap / 2, cy, 0.035, 0.016) & self.filled, BLUSH)

    def image(self):
        return Image.fromarray(self.rgba)


def back_view(front: Image.Image, scale=1.2) -> Image.Image:
    """Vista trasera aproximada: espejo, más grande y recortada por abajo (como en combate)."""
    S = front.width
    im = front.transpose(Image.FLIP_LEFT_RIGHT)
    big = im.resize((round(S * scale), round(S * scale)), Image.NEAREST)
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    out.alpha_composite(big, ((S - big.width) // 2, S - big.height + round(S * 0.18)))
    return out
