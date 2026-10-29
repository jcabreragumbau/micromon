#!/usr/bin/env python3
"""Diseños de Microos (generadores por morfología) y exportación de sprites.

Cada diseño es una función (S, face) -> Sprite. Se exportan:
  assets/sprites/microos/<id>_frente.png  (64×64)
  assets/sprites/microos/<id>_espalda.png (64×64)
  assets/sprites/microos/<id>_icono.png   (32×32, 2 fotogramas en tira de 64×32)
"""
import math, sys
from pathlib import Path
from PIL import Image
from pix import (Sprite, ellipse, capsule, polygon, regular, bezier, stroke, wave, shift, dilate,
                 back_view, RAMPS, OUTLINE, WHITE)

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "sprites" / "microos"

# ---------------------------------------------------------------- familias

def synechoc(S, face=True):
    """Cianobacteria cocobacilar con tilacoides concéntricos (Fotótrofo)."""
    sp = Sprite(S)
    # pili cortos en el polo izquierdo
    for a in (-0.5, -0.1, 0.3):
        p0 = (0.26, 0.6 + a * 0.08); p1 = (0.12, 0.6 + a * 0.22)
        sp.lines(stroke(S, wave(p0, p1, 0.015, 1.5), 1.6 / S), RAMPS["Fotótrofo"][0])
    body = capsule(S, (0.34, 0.6), (0.66, 0.56), 0.21)
    sp.part(body, "Fotótrofo")
    # tilacoides: dos arcos claros paralelos al borde superior
    for off in (0.07, 0.12):
        arc = bezier([(0.24, 0.62 - off * 0.2), (0.5, 0.36 + off), (0.76, 0.58 - off * 0.2)], 40)
        sp.put(stroke(S, arc, 1.0 / S) & body & ~dilate(~body), RAMPS["Fotótrofo"][2])
    # carboxisomas
    for cx, cy in ((0.40, 0.70), (0.52, 0.73), (0.62, 0.70)):
        sp.put(regular(S, cx, cy, 0.026, 6), RAMPS["Fotótrofo"][0])
    if face:
        sp.eyes(0.53, 0.52, 0.17, 0.065)
        sp.mouth(0.53, 0.63, 0.04, "smile")
        sp.blush(0.53, 0.6, 0.27)
    sp.outline_all()
    return sp

def butyricum(S, face=True):
    """Clostridio en «palillo de tambor»: bacilo con espora terminal brillante (Anaerobio)."""
    sp = Sprite(S)
    # flagelos perítricos: largos, finos y ondulados, en tono claro para que no parezcan patas
    for (x, y, dx, dy) in ((0.22, 0.62, -0.18, 0.06), (0.24, 0.72, -0.12, 0.18), (0.44, 0.48, -0.10, -0.24), (0.30, 0.55, -0.20, -0.14)):
        sp.lines(stroke(S, wave((x, y), (x + dx, y + dy), 0.022, 2.2), 1.0 / S), RAMPS["Anaerobio"][2])
    body = capsule(S, (0.26, 0.66), (0.58, 0.55), 0.135)
    sp.part(body, "Anaerobio")
    spore = ellipse(S, 0.70, 0.47, 0.17, 0.18, -0.3)
    sp.part(spore, "brillo")
    # llamita de fermentación
    flame = polygon(S, [(0.62, 0.30), (0.66, 0.18), (0.70, 0.27), (0.75, 0.13), (0.79, 0.29)]) & ~spore
    sp.part(flame, "Anaerobio", highlight=False)
    if face:
        sp.eyes(0.70, 0.46, 0.13, 0.055)
        sp.mouth(0.71, 0.56, 0.035, "open")
    sp.outline_all()
    return sp

def paramec(S, face=True):
    """Paramecio con cilios, surco oral y vacuola contráctil (Protozoo)."""
    sp = Sprite(S)
    body = ellipse(S, 0.5, 0.56, 0.22, 0.34, 0.35)
    groove = ellipse(S, 0.67, 0.6, 0.06, 0.12, 0.35)
    body = body & ~groove
    # cilios: trazos cortos perpendiculares al borde
    edge = dilate(body) & ~body
    import numpy as np
    ys, xs = np.where(edge)
    cx, cy = xs.mean(), ys.mean()
    cil = np.zeros_like(body)
    for y, x in list(zip(ys, xs))[:: max(1, int(3 * 64 / S) if S >= 48 else 2)]:
        vx, vy = x - cx, y - cy
        L = math.hypot(vx, vy) or 1
        p0 = ((x + 0.5) / S, (y + 0.5) / S)
        p1 = ((x + 0.5 + vx / L * 3.2 * S / 64) / S, (y + 0.5 + vy / L * 3.2 * S / 64) / S)
        cil |= stroke(S, [p0, p1], 1.0 / S)
    sp.lines(cil, RAMPS["Protozoo"][2])
    sp.part(body, "Protozoo")
    # macronúcleo y vacuola contráctil en estrella
    sp.put(ellipse(S, 0.46, 0.66, 0.07, 0.05, 0.3), RAMPS["Protozoo"][0])
    star = regular(S, 0.40, 0.36, 0.05, 5) | ellipse(S, 0.40, 0.36, 0.025, 0.025)
    sp.put(star & body, RAMPS["Protozoo"][3])
    if face:
        sp.eyes(0.48, 0.48, 0.14, 0.06)
        sp.mouth(0.50, 0.58, 0.035, "smile")
    sp.outline_all()
    return sp

def t4_titan(S, face=True):
    """Bacteriófago T4: cápside icosaédrica, vaina contráctil y fibras de la cola (Virus/Biofilm)."""
    sp = Sprite(S)
    import numpy as np
    # fibras de la cola (patas)
    for side in (-1, 1):
        for j, (kx, ky, fx, fy) in enumerate(((0.10, 0.04, 0.20, 0.17), (0.17, -0.02, 0.29, 0.10), (0.06, 0.07, 0.10, 0.21))):
            knee = (0.5 + side * kx * 1.4, 0.78 + ky)
            foot = (0.5 + side * fx * 1.35, 0.78 + fy)
            leg = stroke(S, [(0.5 + side * 0.04, 0.80), knee, foot], 2.2 / S)
            sp.part(leg, "Biofilm", highlight=False, flat=True)
    # vaina de la cola con anillos
    sheath = polygon(S, [(0.44, 0.52), (0.56, 0.52), (0.56, 0.78), (0.44, 0.78)])
    sp.part(sheath, "Biofilm", highlight=False)
    for y in np.arange(0.56, 0.78, 0.045):
        sp.put(stroke(S, [(0.44, y), (0.56, y)], 0.9 / S) & sheath, RAMPS["Biofilm"][0])
    plate = regular(S, 0.5, 0.80, 0.09, 6, 0, 0.35)
    sp.part(plate, "Biofilm", highlight=False)
    collar = polygon(S, [(0.40, 0.49), (0.60, 0.49), (0.57, 0.54), (0.43, 0.54)])
    sp.part(collar, "Biofilm", highlight=False)
    # cápside alargada (prisma hexagonal) con caras
    head = polygon(S, [(0.5, 0.04), (0.69, 0.14), (0.69, 0.40), (0.5, 0.50), (0.31, 0.40), (0.31, 0.14)])
    sp.part(head, "Virus", highlight=False)
    v = RAMPS["Virus"]
    left = polygon(S, [(0.5, 0.04), (0.31, 0.14), (0.31, 0.40), (0.5, 0.50)]) & head
    sp.put(left & ~shift(dilate(~head), 0, 0), v[2])
    sp.put(polygon(S, [(0.5, 0.04), (0.69, 0.14), (0.69, 0.40), (0.5, 0.50)]) & head & ~dilate(~head), v[1])
    sp.put(stroke(S, [(0.5, 0.06), (0.5, 0.48)], 0.9 / S) & head, v[0])
    sp.put(stroke(S, [(0.33, 0.15), (0.5, 0.24), (0.67, 0.15)], 0.9 / S) & head, v[0])
    sp.put(ellipse(S, 0.40, 0.17, 0.03, 0.02, -0.5) & head, v[3])
    if face:
        sp.eyes(0.5, 0.33, 0.15, 0.055, mood="fierce")
        sp.mouth(0.5, 0.43, 0.045, "grin")
    sp.outline_all()
    return sp

def pilobolus(S, face=True):
    """Pilobolus: esporangio negro sobre una vesícula transparente que dispara esporas (Hongo/Alga)."""
    sp = Sprite(S)
    # rizoides
    for dx in (-0.12, -0.04, 0.05, 0.13):
        sp.lines(stroke(S, wave((0.5, 0.9), (0.5 + dx, 0.97), 0.01, 1), 1.4 / S), RAMPS["Hongo"][0])
    troph = ellipse(S, 0.5, 0.88, 0.13, 0.06)
    sp.part(troph, "Hongo", highlight=False)
    stalk = capsule(S, (0.5, 0.86), (0.5, 0.56), 0.05)
    sp.part(stalk, "Hongo", highlight=False)
    ves = ellipse(S, 0.5, 0.45, 0.21, 0.19)
    sp.part(ves, "cristal")
    # anillo de carotenoides en la base de la vesícula
    sp.put(ellipse(S, 0.5, 0.58, 0.12, 0.04) & ves, RAMPS["carotenoide"][1])
    cap = ellipse(S, 0.5, 0.25, 0.15, 0.10)
    sp.part(cap, "esporangio")
    # esporas disparadas (gotas de tipo Alga)
    for cx, cy, r in ((0.80, 0.14, 0.03), (0.86, 0.06, 0.02), (0.20, 0.12, 0.025)):
        sp.part(ellipse(S, cx, cy, r, r), "Alga", highlight=False)
    if face:
        sp.eyes(0.5, 0.45, 0.16, 0.06, look=(0, -0.01))
        sp.mouth(0.5, 0.54, 0.035, "open")
    sp.outline_all()
    return sp

DESIGNS = {"synechoc": synechoc, "butyricum": butyricum, "paramec": paramec,
           "t4-titan": t4_titan, "pilobolus": pilobolus}

def export(mid):
    OUT.mkdir(parents=True, exist_ok=True)
    f = DESIGNS[mid]
    f(64).image().save(OUT / f"{mid}_frente.png")
    back_view(f(64, face=False).image()).save(OUT / f"{mid}_espalda.png")
    # icono: 2 fotogramas (el segundo un píxel más arriba) para la animación del menú
    ic = f(32).image()
    strip = Image.new("RGBA", (64, 32), (0, 0, 0, 0))
    strip.alpha_composite(ic, (0, 0))
    strip.alpha_composite(ic.crop((0, 1, 32, 32)), (32, 0))
    strip.save(OUT / f"{mid}_icono.png")

if __name__ == "__main__":
    for mid in (sys.argv[1:] or DESIGNS):
        export(mid)
    print("OK", list(sys.argv[1:] or DESIGNS))

from designs1 import DESIGNS1
DESIGNS.update(DESIGNS1)
from designs2 import DESIGNS2
DESIGNS.update(DESIGNS2)
from designs3 import DESIGNS3
DESIGNS.update(DESIGNS3)
from designs4 import DESIGNS4
DESIGNS.update(DESIGNS4)
from designs5 import DESIGNS5
DESIGNS.update(DESIGNS5)
from designs6 import DESIGNS6
DESIGNS.update(DESIGNS6)
from designs7 import DESIGNS7
DESIGNS.update(DESIGNS7)
from designs8 import DESIGNS8
DESIGNS.update(DESIGNS8)
from designs9 import DESIGNS9
DESIGNS.update(DESIGNS9)
from designs10 import DESIGNS10
DESIGNS.update(DESIGNS10)
