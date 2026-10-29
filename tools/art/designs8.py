"""Diseños a mano del séptimo tramo: Ruta 9, Central Metabólica y Gimnasio 7."""
import math
import numpy as np
from pix import Sprite, ellipse, capsule, polygon, regular, bezier, stroke, wave, shift, dilate, RAMPS
from designs1 import leaf, flame, feet, arms, put_face, stripes, R
from designs2 import done, spikes, spots

def coco(S, x, y, r): return ellipse(S, x, y, r, r * 0.95)

def baumannii(S, face=True):
    """A. baumannii: cocobacilo acorazado de UCI, armadura de placas y bombas de eflujo en los hombros."""
    sp = Sprite(S)
    body = ellipse(S, 0.5, 0.62, 0.3, 0.27)
    sp.part(body, "Gram-")
    for k in range(3):
        sp.put(polygon(S, [(0.24, 0.5 + k * 0.1), (0.76, 0.5 + k * 0.1), (0.72, 0.56 + k * 0.1), (0.28, 0.56 + k * 0.1)]) & body, R("Biofilm", 2))
    for x in (0.18, 0.82):
        sp.part(regular(S, x, 0.48, 0.1, 6), "Biofilm")
        sp.put(coco(S, x, 0.48, 0.04), R("Antibiótico", 2))
    sp.part(polygon(S, [(0.32, 0.36), (0.68, 0.36), (0.62, 0.22), (0.5, 0.16), (0.38, 0.22)]), "Biofilm")
    feet(sp, (0.36, 0.64), 0.9, 0.08, 0.045, "Biofilm")
    if face: put_face(sp, 0.5, 0.44, 0.14, 0.055, mood="fierce", iris=(240, 60, 60), mouth="fangs")
    return done(sp)

def diatomax(S, face=True):
    """Diatomax: diatomea gigante acorazada, nave de sílice con ventanas y cañones de rafe."""
    sp = Sprite(S)
    hull = ellipse(S, 0.5, 0.58, 0.44, 0.24)
    sp.part(hull, "Ácido-Alc.")
    for k in range(-3, 4):
        sp.put(coco(S, 0.5 + k * 0.11, 0.52, 0.03) & hull, R("cristal", 3))
    sp.put(stroke(S, [(0.1, 0.64), (0.9, 0.64)], 1.6 / S) & hull, R("Alga", 1))
    dome = ellipse(S, 0.5, 0.38, 0.18, 0.14) & ~polygon(S, [(0, 0.42), (1, 0.42), (1, 1), (0, 1)])
    sp.part(dome, "cristal")
    for x in (0.08, 0.92):
        sp.part(capsule(S, (x, 0.58), (x + (0.06 if x > 0.5 else -0.06), 0.52), 0.035), "Alga")
    if face: put_face(sp, 0.5, 0.58, 0.18, 0.06, mood="fierce", iris=(60, 150, 120), mouth="grin")
    return done(sp)

def viroid_cad(S, face=True):
    """Viroide del Cadang-Cadang: anillo de ARN desnudo que se retuerce como un lazo eléctrico, con hojas marchitas."""
    sp = Sprite(S)
    for a in (0.6, 2.4):
        sp.part(leaf(S, (0.5 + math.cos(a) * 0.3, 0.84), (0.5 + math.cos(a) * 0.5, 0.96), 0.05), "Esporulado")
    ring = np.zeros((S, S), bool)
    pts = []
    for t in np.linspace(0, 2 * math.pi, 120):
        rr = 0.3 + 0.05 * math.sin(6 * t)
        pts.append((0.5 + math.cos(t) * rr, 0.52 + math.sin(t) * rr * 0.9))
    sp.part(stroke(S, pts, 0.07), "Espiroqueta")
    for k in range(0, 120, 10):
        x, y = pts[k]
        sp.put(coco(S, x, y, 0.02), R("Fotótrofo", 2))
    core = coco(S, 0.5, 0.52, 0.14)
    sp.part(core, "Fotótrofo")
    if face: put_face(sp, 0.5, 0.5, 0.11, 0.05, mood="fierce", iris=(250, 220, 60), mouth="grin")
    return done(sp)

def deinococ(S, face=True):
    """Deinococcus: tétrada roja indestructible cubierta de biofilm, con el símbolo de radiación en la frente."""
    sp = Sprite(S)
    mat = ellipse(S, 0.5, 0.62, 0.44, 0.34)
    sp.part(mat, "Biofilm")
    for x, y in ((0.34, 0.48), (0.66, 0.48), (0.34, 0.76), (0.66, 0.76)):
        sp.part(coco(S, x, y, 0.16), "Extremófilo")
    sp.part(coco(S, 0.5, 0.36, 0.08), "brillo")
    if face: put_face(sp, 0.5, 0.62, 0.32, 0.06, mood="fierce", iris=(250, 120, 60), mouth="fangs", mw=0.05)
    return done(sp)

DESIGNS8 = {"baumannii": baumannii, "diatomax": diatomax, "viroid-cad": viroid_cad, "deinococ": deinococ}
