#!/usr/bin/env python3
"""Personajes de mapa estilo Pokémon Diamante (marco 32×32, figura de ~26 px).

Cada personaje se describe con parámetros (pelo, ropa, bata, gorra, mochila...) y se
dibuja por capas de material en una rejilla de etiquetas; luego cada material se colorea
con una rampa de 4 tonos (luz arriba-izquierda) y se añade un contorno teñido.
Hoja de salida 96×128: 3 fotogramas (quieto, paso A, paso B) × 4 direcciones
(abajo, arriba, izquierda, derecha). Salida: assets/sprites/characters/<id>_mapa.png
"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "sprites" / "characters"
OUTLINE = (24, 20, 32)

def hx(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
def mix(a, b, t): return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))
def ramp(base):
    """4 tonos: [sombra profunda, sombra, base, luz] con sombras desplazadas hacia el violeta."""
    b = hx(base) if isinstance(base, str) else base
    cool = (60, 40, 110)
    return [mix(mix(b, cool, 0.35), (0, 0, 0), 0.45), mix(mix(b, cool, 0.25), (0, 0, 0), 0.22), b, mix(b, (255, 250, 235), 0.38)]

YY, XX = np.mgrid[0:32, 0:32] + 0.5

def ell(cx, cy, rx, ry): return ((XX - cx) / rx) ** 2 + ((YY - cy) / ry) ** 2 <= 1
def box(x0, y0, x1, y1): return (XX >= x0) & (XX < x1) & (YY >= y0) & (YY < y1)

class Canvas:
    def __init__(self): self.lab = np.full((32, 32), "", dtype=object)
    def paint(self, mask, mat): self.lab[mask] = mat
    def px(self, x, y, mat):
        if 0 <= x < 32 and 0 <= y < 32: self.lab[y, x] = mat

# ------------------------------------------------------------------------- dibujo por vista
def draw(p, view, step):
    """view: 'abajo' | 'arriba' | 'lado' (mirando a la izquierda). step: 0 quieto, 1/2 pasos."""
    c = Canvas()
    bob = 0 if step == 0 else -1          # en los pasos el cuerpo sube un píxel
    hy = 10.5 + bob                         # centro de la cabeza
    ty = 18 + bob                           # arriba del torso
    long_hair = p.get("pelo") in ("melena", "coleta", "larga")
    coat = p.get("bata")
    side = view == "lado"

    # --- piernas y zapatos
    if not side:
        sw = [0, 1, -1][step]               # pierna izquierda (pantalla) adelantada en 1, derecha en 2
        for i, lx in enumerate((12, 17)):
            lift = (1 if (i == 0 and sw < 0) or (i == 1 and sw > 0) else 0)
            y1 = 29 - lift
            c.paint(box(lx, ty + 7, lx + 3, y1), "pantalon")
            c.paint(box(lx - (1 if i == 0 else 0), y1 - 1, lx + 3 + (1 if i == 1 else 0), y1 + 1), "zapato")
    else:
        off = [0, 2, -2][step]
        for k, (lx, d) in enumerate(((14, off), (16, -off))):
            mat = "pantalon" if k == 1 else "pantalon_sombra"
            y1 = 29 - (1 if d < 0 else 0)
            c.paint(box(lx + d, ty + 7, lx + d + 3, y1), mat)
            c.paint(box(lx + d - 1, y1 - 1, lx + d + 3, y1 + 1), "zapato")

    # --- mochila (detrás) y pelo largo por detrás
    if p.get("mochila") and view == "lado":
        c.paint(box(18, ty, 22, ty + 7) | ell(20, ty + 3.5, 2.5, 3.5), "mochila")
    if long_hair and view != "arriba":
        if side: c.paint(box(15, hy, 22, hy + 9) & ell(18.5, hy + 3, 4.5, 8), "pelo")
        else: c.paint(box(8, hy, 24, hy + (9 if p["pelo"] == "larga" else 7)) & ell(16, hy + 2, 8.5, 9), "pelo")

    # --- torso
    if not side:
        c.paint(box(11, ty, 21, ty + 8) | box(10, ty + 1, 22, ty + 7), "camisa")
        if coat:
            c.paint((box(10, ty, 14, ty + 9) | box(18, ty, 22, ty + 9) | box(11, ty + 8, 21, ty + 9)) & ~box(14, ty, 18, ty + 7), "bata")
            if view == "arriba": c.paint(box(10, ty, 22, ty + 9), "bata")
        if p.get("falda") and not coat: c.paint(box(10, ty + 6, 22, ty + 9) | box(9, ty + 8, 23, ty + 9), "falda")
        if view == "abajo" and p.get("detalle"): c.paint(box(15, ty + 2, 17, ty + 4), "detalle")
        if view == "arriba" and p.get("mochila"):
            c.paint(box(11, ty + 1, 21, ty + 7) | ell(16, ty + 2, 5, 2), "mochila")
            c.paint(box(13, ty + 3, 19, ty + 5), "mochila_bolsillo")
        # brazos (balanceo opuesto a las piernas)
        sw = [0, 1, -1][step]
        for i, ax in enumerate((8, 22)):
            dy = (-sw if i == 0 else sw)
            mat = "bata" if coat else p.get("manga", "camisa")
            c.paint(box(ax, ty + 1 + max(0, dy), ax + 2, ty + 6 + dy), mat)
            c.paint(box(ax, ty + 6 + dy, ax + 2, ty + 8 + dy), "piel")
        if view == "abajo" and p.get("mochila"):
            c.paint(box(11, ty, 12, ty + 6) | box(20, ty, 21, ty + 6), "mochila")  # tirantes
    else:
        c.paint(box(13, ty, 20, ty + 8), "camisa")
        if coat: c.paint(box(13, ty, 20, ty + 9) & ~box(13, ty, 15, ty + 6), "bata")
        if p.get("falda") and not coat: c.paint(box(12, ty + 6, 21, ty + 9), "falda")
        if p.get("mochila"): c.paint(box(18, ty, 21, ty + 7), "mochila")
        sw = [0, 2, -2][step]
        mat = "bata" if coat else p.get("manga", "camisa")
        c.paint(box(15 + sw // 2, ty + 1, 18 + sw // 2, ty + 6), mat)
        c.paint(box(15 + sw, ty + 6, 18 + sw, ty + 8) & ~box(0, 0, 32, ty + 6), "piel")

    # --- cabeza
    head = ell(16, hy, 7.6, 7.2)
    c.paint(head, "piel")
    hair = p.get("pelo", "corto")
    if view == "arriba":
        c.paint(head, "pelo")
        if hair in ("melena", "larga"): c.paint(box(8, hy, 24, hy + (10 if hair == "larga" else 8)) & ell(16, hy + 2, 8.5, 9.5), "pelo")
        if hair == "coleta": c.paint(ell(16, hy + 6, 2.5, 3.5), "pelo")
    elif not side:
        fringe = {"corto": 3.0, "melena": 3.0, "coleta": 3.0, "larga": 3.0, "puntas": 2.0, "moño": 3.0}.get(hair, 3)
        c.paint(head & (YY < hy - fringe + 1.5), "pelo")
        c.paint(head & ((XX < 10) | (XX > 22)) & (YY < hy + 3), "pelo")         # patillas
        if hair == "puntas":
            for x in (9, 12, 15, 18, 21): c.paint(ell(x + 1, hy - 7, 1.6, 2.2), "pelo")
        if hair == "moño": c.paint(ell(16, hy - 8, 3.2, 2.6), "pelo")
        if hair == "coleta":
            c.paint(ell(24, hy + 1, 2.2, 3.5), "pelo")
        # flequillo irregular
        for x in range(10, 23, 3): c.px(x, int(hy - fringe + 1.5), "pelo")
        # ojos: 2×3 con brillo
        for ex in (12, 19):
            c.paint(box(ex, hy + 0.5, ex + 2, hy + 3.5), "ojo")
            c.px(ex, int(hy + 0.5), "brillo")
        c.paint(box(11, hy + 3.5, 13, hy + 4.5) | box(20, hy + 3.5, 22, hy + 4.5), "mejilla")
    else:
        c.paint(head & ((YY < hy - 2.5) | ell(20.5, hy - 0.5, 6.2, 7.5)), "pelo")
        if hair == "puntas":
            for x, y in ((10, -7), (14, -8), (18, -7), (22, -4)): c.paint(ell(x, hy + y, 1.8, 2.2), "pelo")
        if hair == "moño": c.paint(ell(20, hy - 7, 3, 2.6), "pelo")
        if hair == "coleta": c.paint(ell(23.5, hy + 2, 2.2, 3.5), "pelo")
        c.paint(box(11, hy + 0.5, 13, hy + 3.5), "ojo"); c.px(11, int(hy + 0.5), "brillo")
        c.px(16, int(hy + 1), "piel_sombra")                                       # oreja
        c.paint(box(11, hy + 3.5, 13, hy + 4.5), "mejilla")
    # gorra / gorro
    hat = p.get("gorra")
    if hat:
        if view == "arriba": c.paint(head & (YY < hy + 1), "gorra")
        elif not side:
            c.paint(head & (YY < hy - 2.5), "gorra")
            c.paint(box(9, hy - 3, 23, hy - 1.5), "visera")
            c.paint(box(15, hy - 6, 17, hy - 4), "logo")
        else:
            c.paint(head & (YY < hy - 2.5), "gorra")
            c.paint(box(5, hy - 3, 12, hy - 1.5), "visera")
    if p.get("gafas") and view != "arriba":
        if side: c.paint(box(10, hy + 0.5, 14, hy + 1.5), "gafas")
        else: c.paint(box(11, hy + 0.5, 14, hy + 1.5) | box(18, hy + 0.5, 21, hy + 1.5) | box(14, hy + 0.5, 18, hy + 1), "gafas")
    return c.lab

# ------------------------------------------------------------------------- color
FIXED = {"ojo": (32, 28, 48), "brillo": (250, 250, 255), "mejilla": None, "piel_sombra": None}

def render(lab, p, mirror=False):
    pal = {
        "piel": ramp(p["piel"]), "pelo": ramp(p["pelo_c"]), "camisa": ramp(p["camisa"]),
        "bata": ramp(p.get("bata") or "#f0f0f4"), "pantalon": ramp(p["pantalon"]), "zapato": ramp(p["zapato"]),
        "gorra": ramp(p.get("gorra") or "#888888"), "visera": ramp(p.get("visera", p.get("gorra") or "#888888")),
        "logo": ramp(p.get("logo", "#ffffff")), "mochila": ramp(p.get("mochila") or "#888888"),
        "falda": ramp(p.get("falda") or "#888888"), "detalle": ramp(p.get("detalle") or "#ffffff"),
        "gafas": ramp("#383848"),
    }
    pal["pantalon_sombra"] = [pal["pantalon"][0]] * 2 + [pal["pantalon"][1], pal["pantalon"][2]]
    pal["mochila_bolsillo"] = [pal["mochila"][0], pal["mochila"][0], pal["mochila"][1], pal["mochila"][2]]
    img = np.zeros((32, 32, 4), np.uint8)
    filled = lab != ""
    for y in range(32):
        for x in range(32):
            m = lab[y, x]
            if not m: continue
            if m == "ojo": col = FIXED["ojo"]
            elif m == "brillo": col = FIXED["brillo"]
            elif m == "mejilla": col = mix(pal["piel"][2], (240, 120, 120), 0.45)
            elif m == "piel_sombra": col = pal["piel"][1]
            else:
                r = pal[m]
                up = y > 0 and lab[y - 1, x] == m
                down = y < 31 and lab[y + 1, x] == m
                left = x > 0 and lab[y, x - 1] == m
                right = x < 31 and lab[y, x + 1] == m
                t = 2
                if not up or not left: t = 3
                if not down or not right: t = 1
                if (not down) and (not right): t = 0
                if m in ("pelo", "gorra") and not up and (x + y) % 3 == 0: t = 3
                if m == "piel" and t == 3: t = 2              # la piel no brilla tanto
                col = r[t]
            img[y, x, :3] = col; img[y, x, 3] = 255
    # contorno: oscuro teñido por el vecino
    out = img.copy()
    for y in range(32):
        for x in range(32):
            if filled[y, x]: continue
            nb = [(y + dy, x + dx) for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)) if 0 <= y + dy < 32 and 0 <= x + dx < 32 and filled[y + dy, x + dx]]
            if nb:
                ny, nx = nb[0]
                out[y, x, :3] = mix(OUTLINE, tuple(int(v) for v in img[ny, nx, :3]), 0.22); out[y, x, 3] = 255
    # líneas internas pelo/piel y bata/camisa en el lado de la sombra
    for y in range(1, 32):
        for x in range(32):
            a, b = lab[y - 1, x], lab[y, x]
            if a == "pelo" and b == "piel": out[y - 1, x, :3] = pal["pelo"][0]
            if a in ("camisa", "bata") and b in ("pantalon", "pantalon_sombra", "falda"): out[y, x, :3] = pal[b if b != "pantalon_sombra" else "pantalon"][0]
    # sombra en el suelo
    im = Image.fromarray(out, "RGBA")
    shadow = Image.new("RGBA", (32, 32))
    sh = np.zeros((32, 32, 4), np.uint8)
    sh[ell(16, 30.2, 6.5, 1.6)] = (0, 0, 0, 70)
    shadow = Image.fromarray(sh, "RGBA"); shadow.alpha_composite(im)
    return shadow.transpose(Image.FLIP_LEFT_RIGHT) if mirror else shadow

# ------------------------------------------------------------------------- reparto
P = {
 "protagonista": dict(pelo="corto", pelo_c="#4a2c1a", piel="#f4c8a0", camisa="#2fa39a", bata="#f2f2f6", pantalon="#34405e",
                      zapato="#c83c2c", gorra="#d84030", visera="#f2f2f6", logo="#f0c040", mochila="#e8782a", detalle="#f0c040"),
 "becario": dict(pelo="melena", pelo_c="#2a2228", piel="#e8b890", camisa="#7a8494", bata="#ecebe4", pantalon="#5c4a3a", zapato="#3a3038"),
 "rival": dict(pelo="puntas", pelo_c="#d04a20", piel="#f0c49c", camisa="#2a2a3a", pantalon="#2a3a6a", zapato="#e8e8f0",
               manga="camisa", detalle="#f0c040"),
 "profesora": dict(pelo="moño", pelo_c="#c8c4d4", piel="#f0c8a8", camisa="#6a3a9a", bata="#f4f4f8", pantalon="#4a4a5a",
                   zapato="#5a3a2a", gafas=True, detalle="#f0c040"),
 "madre": dict(pelo="larga", pelo_c="#8a4a2a", piel="#f2c6a0", camisa="#e87090", pantalon="#4a6aa8", zapato="#5a3a2a", falda="#4a6aa8"),
 "enfermera": dict(pelo="coleta", pelo_c="#e89ab8", piel="#f6d0b0", camisa="#f6c0d4", pantalon="#f6c0d4", zapato="#f2f2f6",
                   gorra="#f8f8fc", visera="#f8f8fc", logo="#e84060", falda="#f6c0d4", detalle="#e84060"),
 "dependiente": dict(pelo="corto", pelo_c="#2a2228", piel="#e8b890", camisa="#3a6ac8", pantalon="#34405e", zapato="#2a2428",
                     gorra="#3a6ac8", visera="#2a4a90", logo="#ffffff", detalle="#ffffff"),
 "chico": dict(pelo="puntas", pelo_c="#2a2228", piel="#f0c49c", camisa="#f0c040", pantalon="#3a6ac8", zapato="#c83c2c",
               detalle="#c83c2c", manga="camisa"),
 "chica": dict(pelo="coleta", pelo_c="#e8b860", piel="#f6d0b0", camisa="#f8f8fc", pantalon="#f05050", zapato="#c83c2c",
               falda="#f05050", detalle="#f05050"),
 "estudiante": dict(pelo="corto", pelo_c="#5a3a24", piel="#e8b890", camisa="#5cb060", pantalon="#4a4a5a", zapato="#3a3038",
                    mochila="#3a6ac8", gafas=True),
}
CHARACTERS = list(P)

def sheet(cid):
    p = P[cid]
    out = Image.new("RGBA", (96, 128))
    views = [("abajo", False), ("arriba", False), ("lado", False), ("lado", True)]
    for row, (v, mir) in enumerate(views):
        for col, st in enumerate((0, 1, 2)):
            out.alpha_composite(render(draw(p, v, st), p, mir), (col * 32, row * 32))
    OUT.mkdir(parents=True, exist_ok=True)
    out.save(OUT / f"{cid}_mapa.png")
    return out

if __name__ == "__main__":
    for c in CHARACTERS: sheet(c)
    print("OK", CHARACTERS)
