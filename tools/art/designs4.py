"""Diseños a mano del tercer tramo: Ruta 4, Cueva Anaeróbica, Túnel Endospórico y Gimnasio 3."""
import math
import numpy as np
from pix import Sprite, ellipse, capsule, polygon, regular, bezier, stroke, wave, shift, dilate, RAMPS
from designs1 import leaf, flame, feet, arms, put_face, stripes, _cilia, R
from designs2 import done, spikes, spots

# ================================================================ Ruta 4
def perfringens(S, face=True):
    """Clostridium perfringens: bastón grueso y cuadrado, con burbujas de gas (gangrena gaseosa)."""
    sp = Sprite(S)
    for x, y, r in ((0.2, 0.3, 0.05), (0.3, 0.2, 0.035), (0.78, 0.26, 0.045), (0.86, 0.38, 0.03)):
        sp.part(ellipse(S, x, y, r, r), "Biofilm", highlight=False)
    body = polygon(S, [(0.24, 0.4), (0.76, 0.4), (0.8, 0.46), (0.8, 0.8), (0.76, 0.84), (0.24, 0.84), (0.2, 0.8), (0.2, 0.46)])
    sp.part(body, "Anaerobio")
    sp.put(stroke(S, [(0.22, 0.62), (0.78, 0.62)], 1.4 / S) & body, R("Anaerobio", 0))
    arms(sp, [((0.22, 0.6), (0.1, 0.7)), ((0.78, 0.6), (0.9, 0.7))], 0.04, "Anaerobio")
    feet(sp, (0.36, 0.64), 0.9, 0.08, 0.045, "Anaerobio")
    if face: put_face(sp, 0.5, 0.52, 0.18, 0.06, mood="fierce", iris=(220, 80, 40), mouth="grin", mw=0.06)
    return done(sp)

def klebsi(S, face=True):
    """Klebsiella: bastón envuelto en una cápsula mucosa enorme y brillante, como una gominola."""
    sp = Sprite(S)
    caps = ellipse(S, 0.5, 0.58, 0.36, 0.3)
    sp.part(caps, "cristal")
    body = capsule(S, (0.36, 0.6), (0.64, 0.56), 0.13)
    sp.part(body, "Gram-")
    sp.put(ellipse(S, 0.34, 0.42, 0.08, 0.05) & caps & ~body, (255, 255, 255))
    if face: put_face(sp, 0.5, 0.56, 0.13, 0.055, iris=(80, 110, 200), blush=True)
    return done(sp)

def putida(S, face=True):
    """Pseudomonas putida: bastón verde biorremediador que se come una gota de petróleo."""
    sp = Sprite(S)
    for k in range(4):
        sp.lines(stroke(S, wave((0.7, 0.5 + k * 0.03), (0.96, 0.36 + k * 0.08), 0.02, 2.5), 1.3 / S), R("Biofilm", 1))
    sp.part(ellipse(S, 0.2, 0.74, 0.11, 0.1), "Extremófilo")      # gota de crudo
    sp.put(ellipse(S, 0.17, 0.7, 0.03, 0.025), (200, 200, 220))
    body = capsule(S, (0.36, 0.62), (0.66, 0.5), 0.16)
    sp.part(body, "Simbionte")
    sp.put(stroke(S, bezier([(0.3, 0.64), (0.5, 0.7), (0.7, 0.54)], 20), 1.4 / S) & body, R("Biofilm", 3))
    arms(sp, [((0.36, 0.66), (0.26, 0.74))], 0.035, "Simbionte")
    feet(sp, (0.42, 0.62), 0.8, 0.06, 0.04, "Simbionte")
    if face: put_face(sp, 0.56, 0.52, 0.15, 0.06, iris=(80, 170, 120), mouth="open")
    return done(sp)

def giardia(S, face=True):
    """Giardia: pera con dos núcleos que parecen ojos enormes y ocho flagelos."""
    sp = Sprite(S)
    for k, (a, l) in enumerate(((2.0, 0.3), (1.6, 0.36), (1.2, 0.3), (2.4, 0.26))):
        for side in (-1, 1):
            x0 = 0.5 + side * 0.1
            sp.lines(stroke(S, wave((x0, 0.74), (0.5 + side * math.cos(a) * l * 1.2, 0.74 + math.sin(a) * l * 0.6), 0.02, 2), 1.3 / S), R("Protozoo", 1))
    body = polygon(S, bezier([(0.5, 0.86), (0.2, 0.7), (0.2, 0.26), (0.5, 0.18), (0.8, 0.26), (0.8, 0.7), (0.5, 0.86)], 60))
    sp.part(body, "Protozoo")
    sp.put(ellipse(S, 0.5, 0.6, 0.12, 0.08) & body, R("Protozoo", 3))   # disco adhesivo
    if face:
        sp.iris = (40, 60, 120)
        sp.eyes(0.5, 0.4, 0.2, 0.09, mood="happy")
        sp.mouth(0.5, 0.6, 0.04, "smile")
    sp.outline_all()
    return sp

def neisseria(S, face=True):
    """Neisseria: diplococo en forma de dos granos de café enfrentados."""
    sp = Sprite(S)
    for x, s in ((0.32, -1), (0.68, 1)):
        bean = ellipse(S, x, 0.6, 0.18, 0.24) & ~ellipse(S, 0.5, 0.6, 0.05, 0.3)
        sp.part(bean, "Gram-")
        sp.put(ellipse(S, x + s * 0.12, 0.6, 0.03, 0.14) & bean, R("Gram-", 0))
    feet(sp, (0.32, 0.68), 0.87, 0.07, 0.04, "Gram-")
    if face:
        sp.iris = (80, 110, 200)
        sp.eyes(0.32, 0.56, 0.0, 0.06); sp.eyes(0.68, 0.56, 0.0, 0.06)
        sp.mouth(0.5, 0.68, 0.04, "smile")
    sp.outline_all()
    return sp

def spirogyra(S, face=True):
    """Spirogyra: alga filamentosa con su cloroplasto en espiral, como una serpentina verde."""
    sp = Sprite(S)
    body = capsule(S, (0.14, 0.7), (0.86, 0.5), 0.13)
    sp.part(body, "Alga")
    for k in range(9):
        x = 0.16 + k * 0.08
        sp.put(stroke(S, [(x, 0.72 - k * 0.022 + 0.1), (x + 0.06, 0.72 - k * 0.022 - 0.1)], 2.0 / S) & body, R("Fotótrofo", 1))
    for x in (0.34, 0.6):                                       # tabiques entre células
        sp.put(stroke(S, [(x, 0.5), (x - 0.02, 0.8)], 1.2 / S) & body, R("Alga", 0))
    sp.part(ellipse(S, 0.84, 0.48, 0.14, 0.13), "Alga")
    if face: put_face(sp, 0.84, 0.46, 0.12, 0.05, iris=(60, 150, 120))
    return done(sp)

def caulobac(S, face=True):
    """Caulobacter: célula en forma de coma sobre un pedúnculo con ventosa."""
    sp = Sprite(S)
    sp.part(stroke(S, bezier([(0.5, 0.6), (0.42, 0.78), (0.5, 0.92)], 20), 0.03), "Gram-", highlight=False)
    sp.part(ellipse(S, 0.5, 0.93, 0.1, 0.035), "Biofilm", highlight=False)
    body = stroke(S, bezier([(0.3, 0.32), (0.5, 0.62), (0.74, 0.4)], 30), 0.17)
    sp.part(body, "Gram-")
    sp.lines(stroke(S, wave((0.74, 0.32), (0.92, 0.14), 0.02, 2), 1.3 / S), R("Gram-", 1))
    if face: put_face(sp, 0.5, 0.46, 0.14, 0.055, iris=(80, 110, 200))
    return done(sp)

def kefirgran(S, face=True):
    """Gránulo de kéfir: coliflor blanca con levaduras y lactobacilos dentro (consorcio simbiótico)."""
    sp = Sprite(S)
    blob = ellipse(S, 0.5, 0.62, 0.26, 0.22)
    for a in np.linspace(math.pi * 0.95, math.pi * 2.05, 7):
        blob |= ellipse(S, 0.5 + math.cos(a) * 0.22, 0.58 + math.sin(a) * 0.18, 0.1, 0.09)
    sp.part(blob, "cristal")
    spots(sp, blob, [(0.3, 0.5), (0.7, 0.52), (0.42, 0.78)], 0.03, R("Levadura", 2))
    for x, y in ((0.62, 0.76), (0.28, 0.66)):
        sp.put(capsule(S, (x - 0.03, y), (x + 0.03, y - 0.02), 0.012) & blob, R("Simbionte", 1))
    feet(sp, (0.38, 0.62), 0.86, 0.06, 0.04, "Levadura")
    if face: put_face(sp, 0.5, 0.6, 0.16, 0.06, iris=(200, 140, 80), blush=True)
    return done(sp)

# ================================================================ Cueva Anaeróbica
def methanococ(S, face=True):
    """Methanococcus: coco irregular de arquea con un mechón de flagelos y burbujas de metano."""
    sp = Sprite(S)
    for k in range(5):
        sp.lines(stroke(S, wave((0.64, 0.36), (0.9 - k * 0.02, 0.14 + k * 0.05), 0.02, 2), 1.3 / S), R("Archaea", 1))
    for x, y, r in ((0.18, 0.28, 0.05), (0.26, 0.16, 0.035)):
        sp.part(ellipse(S, x, y, r, r), "cristal", highlight=False)
    body = ellipse(S, 0.48, 0.6, 0.26, 0.24) | ellipse(S, 0.32, 0.5, 0.1, 0.1) | ellipse(S, 0.66, 0.74, 0.09, 0.08)
    sp.part(body, "Archaea")
    spots(sp, body, [(0.36, 0.72), (0.62, 0.48)], 0.03, R("Archaea", 3))
    feet(sp, (0.38, 0.6), 0.86, 0.06, 0.04, "Archaea")
    if face: put_face(sp, 0.48, 0.58, 0.16, 0.06, iris=(150, 120, 220))
    return done(sp)

def thiomargar(S, face=True):
    """Thiomargarita: perla gigante con gránulos de azufre brillantes, enorme para ser bacteria."""
    sp = Sprite(S)
    body = ellipse(S, 0.5, 0.54, 0.38, 0.36)
    sp.part(body, "Biofilm")
    for x, y in ((0.28, 0.4), (0.4, 0.3), (0.66, 0.34), (0.74, 0.5), (0.3, 0.66), (0.62, 0.74), (0.46, 0.8)):
        sp.put(ellipse(S, x, y, 0.035, 0.035) & body, R("Espiroqueta", 2))
        sp.put(ellipse(S, x - 0.01, y - 0.01, 0.012, 0.012) & body, (255, 250, 210))
    if face: put_face(sp, 0.5, 0.52, 0.18, 0.075, mood="fierce", iris=(220, 200, 60), mouth="grin", mw=0.06)
    return done(sp)

# ================================================================ Túnel Endospórico
def mycoides(S, face=True):
    """Bacillus mycoides: cadena de bastones que se enrosca como un remolino de raíces."""
    sp = Sprite(S)
    off = -math.pi / 2 - 7.5
    path = [(0.5 + math.cos(t + off) * (0.04 + t * 0.035), 0.6 + math.sin(t + off) * (0.04 + t * 0.03)) for t in np.linspace(0, 7.5, 10)]
    for (x0, y0), (x1, y1) in zip(path, path[1:]):
        sp.part(capsule(S, (x0, y0), (x1, y1), 0.055), "Esporulado")
    head = ellipse(S, *path[-1], 0.14, 0.13)
    sp.part(head, "Gram+")
    if face: put_face(sp, path[-1][0], path[-1][1], 0.12, 0.05, iris=(130, 80, 200))
    return done(sp)

def amberspor(S, face=True):
    """Espora fósil atrapada en ámbar: gota dorada traslúcida con un bastón dormido dentro."""
    sp = Sprite(S)
    amber = polygon(S, bezier([(0.5, 0.94), (0.14, 0.76), (0.2, 0.3), (0.5, 0.14), (0.8, 0.3), (0.86, 0.76), (0.5, 0.94)], 60))
    sp.part(amber, "brillo")
    sp.put(capsule(S, (0.4, 0.62), (0.6, 0.52), 0.08) & amber, R("Esporulado", 1))
    sp.put(ellipse(S, 0.36, 0.34, 0.06, 0.1, 0.4) & amber, (255, 248, 210))
    if face: put_face(sp, 0.5, 0.56, 0.1, 0.045, mood="happy", iris=(140, 90, 40))
    return done(sp)

# ================================================================ Gimnasio 3
def flavus(S, face=True):
    """Aspergillus flavus: cabeza conidial amarillo-verdosa con humo tóxico (aflatoxina)."""
    sp = Sprite(S)
    for x, y, r in ((0.18, 0.2, 0.06), (0.82, 0.16, 0.05), (0.88, 0.32, 0.04)):
        sp.part(ellipse(S, x, y, r, r * 0.8), "Intracelular", highlight=False)
    sp.part(capsule(S, (0.5, 0.94), (0.5, 0.56), 0.07), "Hongo")
    arms(sp, [((0.46, 0.72), (0.28, 0.62)), ((0.54, 0.74), (0.72, 0.64))], 0.03, "Hongo")
    sp.part(spikes(S, 0.5, 0.38, 0.25, 16, 0.07, 0.03), "Hongo", highlight=False)
    head = ellipse(S, 0.5, 0.38, 0.26, 0.25)
    sp.part(head, "Fotótrofo")
    spots(sp, head, [(0.32, 0.28), (0.68, 0.26), (0.34, 0.52), (0.66, 0.5)], 0.03, R("Hongo", 1))
    if face: put_face(sp, 0.5, 0.38, 0.16, 0.065, mood="fierce", iris=(200, 60, 160), mouth="fangs")
    return done(sp)

def chrysogenum(S, face=True):
    """Penicillium chrysogenum: pincel de conidióforos verdeazules y gotas doradas de penicilina."""
    sp = Sprite(S)
    for cx in (0.3, 0.7):
        sp.part(stroke(S, [(cx, 0.9), (cx, 0.46)], 0.035), "Hongo", highlight=False)
        for dx in (-0.08, 0, 0.08):
            sp.part(capsule(S, (cx + dx * 0.5, 0.42), (cx + dx, 0.2), 0.035), "Ácido-Alc.", highlight=False)
            sp.part(ellipse(S, cx + dx, 0.17, 0.04, 0.04), "Alga")
    body = ellipse(S, 0.5, 0.64, 0.2, 0.18)
    sp.part(body, "Hongo")
    for x, y in ((0.18, 0.82), (0.82, 0.8)):
        sp.part(polygon(S, [(x, y - 0.07), (x + 0.04, y), (x, y + 0.04), (x - 0.04, y)]), "brillo")
    if face: put_face(sp, 0.5, 0.62, 0.14, 0.06, mood="fierce", iris=(220, 180, 40), mouth="grin")
    return done(sp)

DESIGNS4 = {
    "perfringens": perfringens, "klebsi": klebsi, "putida": putida, "giardia": giardia, "neisseria": neisseria,
    "spirogyra": spirogyra, "caulobac": caulobac, "kefirgran": kefirgran, "methanococ": methanococ, "thiomargar": thiomargar,
    "mycoides": mycoides, "amberspor": amberspor, "flavus": flavus, "chrysogenum": chrysogenum,
}
