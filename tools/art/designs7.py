"""Diseños a mano del sexto tramo: Ruta 8, Instituto de Biotecnología y Gimnasio 6."""
import math
import numpy as np
from pix import Sprite, ellipse, capsule, polygon, regular, bezier, stroke, wave, shift, dilate, RAMPS
from designs1 import leaf, flame, feet, arms, put_face, stripes, _cilia, R
from designs2 import done, spikes, spots, _capsid

def coco(S, x, y, r): return ellipse(S, x, y, r, r * 0.95)

# ================================================================ Virus
def rous_v(S, face=True):
    """Virus del sarcoma de Rous: esfera envuelta con espículas en forma de seta (retrovirus joven)."""
    sp = Sprite(S)
    sp.part(spikes(S, 0.5, 0.54, 0.26, 12, 0.07, 0.03), "Virus", highlight=False)
    for a in np.linspace(0, 2 * math.pi, 12, endpoint=False):
        sp.part(coco(S, 0.5 + math.cos(a) * 0.35, 0.54 + math.sin(a) * 0.34, 0.03), "Intracelular", highlight=False)
    body = coco(S, 0.5, 0.54, 0.27)
    sp.part(body, "Virus")
    sp.put(regular(S, 0.5, 0.6, 0.1, 6) & body, R("Virus", 0))
    if face: put_face(sp, 0.5, 0.5, 0.15, 0.065, iris=(220, 60, 60), mouth="grin", blush=True)
    return done(sp)

def lentivir(S, face=True):
    """Lentivirus: envoltura con cápside cónica dentro, como un ojo con una pupila en cono."""
    sp = Sprite(S)
    sp.part(spikes(S, 0.5, 0.54, 0.3, 14, 0.06, 0.025), "Intracelular", highlight=False)
    body = coco(S, 0.5, 0.54, 0.31)
    sp.part(body, "Virus")
    sp.put(polygon(S, [(0.36, 0.72), (0.64, 0.72), (0.54, 0.4), (0.46, 0.4)]) & body, R("Intracelular", 1))
    if face: put_face(sp, 0.5, 0.48, 0.2, 0.065, mood="fierce", iris=(220, 60, 160), mouth="fangs")
    return done(sp)

def poxvir(S, face=True):
    """Poxvirus: ladrillo grande con superficie de cordones, el virus más voluminoso."""
    sp = Sprite(S)
    body = polygon(S, [(0.2, 0.32), (0.8, 0.32), (0.86, 0.4), (0.86, 0.82), (0.8, 0.9), (0.2, 0.9), (0.14, 0.82), (0.14, 0.4)])
    sp.part(body, "Virus")
    stripes(sp, body, [bezier([(0.18, 0.4 + k * 0.1), (0.5, 0.36 + k * 0.1 + 0.05 * (k % 2)), (0.82, 0.4 + k * 0.1)], 20) for k in range(5)], 1.2 / S, R("Virus", 1))
    feet(sp, (0.32, 0.68), 0.95, 0.08, 0.04, "Virus")
    if face: put_face(sp, 0.5, 0.56, 0.18, 0.065, iris=(200, 60, 60), mouth="smile")
    return done(sp)

def lyssavir(S, face=True):
    """Lyssavirus (rabia): bala con espículas y colmillos, de mirada rabiosa."""
    sp = Sprite(S)
    bullet = capsule(S, (0.5, 0.86), (0.5, 0.36), 0.2) & ~polygon(S, [(0, 0.86), (1, 0.86), (1, 1), (0, 1)])
    sp.part(spikes(S, 0.5, 0.56, 0.22, 16, 0.05, 0.02, 0, (math.pi * 0.9, math.pi * 2.1)), "Virus", highlight=False)
    sp.part(bullet | polygon(S, [(0.3, 0.86), (0.7, 0.86), (0.7, 0.9), (0.3, 0.9)]), "Virus")
    stripes(sp, bullet, [[(0.3, 0.5 + k * 0.08), (0.7, 0.5 + k * 0.08)] for k in range(4)], 1.0 / S, R("Virus", 1))
    if face: put_face(sp, 0.5, 0.44, 0.15, 0.065, mood="fierce", iris=(250, 80, 40), mouth="fangs", mw=0.06)
    return done(sp)

# ================================================================ Ruta 8 y Gimnasio 6
def nocardia(S, face=True):
    """Nocardia: hifas ramificadas ácido-alcohol resistentes que forman una corona de ramas."""
    sp = Sprite(S)
    def branch(x, y, a, l, d):
        x2, y2 = x + math.cos(a) * l, y + math.sin(a) * l
        sp.part(stroke(S, [(x, y), (x2, y2)], 0.025 - d * 0.005), "Ácido-Alc.", highlight=False)
        if d < 2:
            branch(x2, y2, a - 0.5, l * 0.65, d + 1); branch(x2, y2, a + 0.5, l * 0.65, d + 1)
    for a in (-math.pi / 2, -math.pi / 2 - 0.9, -math.pi / 2 + 0.9):
        branch(0.5, 0.5, a, 0.16, 0)
    body = coco(S, 0.5, 0.64, 0.22)
    sp.part(body, "Ácido-Alc.")
    sp.put(stroke(S, [(0.3, 0.72), (0.7, 0.72)], 1.4 / S) & body, R("Antibiótico", 2))
    feet(sp, (0.4, 0.6), 0.86, 0.06, 0.04, "Ácido-Alc.")
    if face: put_face(sp, 0.5, 0.62, 0.14, 0.06, mood="fierce", iris=(200, 80, 140), mouth="grin")
    return done(sp)

def shewanella(S, face=True):
    """Shewanella: bacilo que respira metales; lleva una armadura de óxido y suelta chispas."""
    sp = Sprite(S)
    sp.lines(stroke(S, wave((0.18, 0.62), (0.02, 0.5), 0.025, 2.5), 1.4 / S), R("Espiroqueta", 1))
    body = capsule(S, (0.3, 0.64), (0.72, 0.56), 0.17)
    sp.part(body, "Espiroqueta")
    for x in (0.42, 0.56):
        sp.put(polygon(S, [(x - 0.05, 0.46), (x + 0.05, 0.44), (x + 0.06, 0.72), (x - 0.04, 0.74)]) & body, R("Extremófilo", 2))
    for x, y in ((0.82, 0.36), (0.88, 0.5), (0.2, 0.36)):
        sp.lines(stroke(S, [(x, y), (x + 0.03, y - 0.05), (x + 0.01, y - 0.06), (x + 0.04, y - 0.11)], 1.4 / S), R("brillo", 3))
    feet(sp, (0.42, 0.62), 0.8, 0.06, 0.04, "Extremófilo")
    if face: put_face(sp, 0.64, 0.56, 0.13, 0.055, mood="fierce", iris=(240, 200, 40), mouth="smile")
    return done(sp)

def chlamydia(S, face=True):
    """Chlamydia: cuerpo reticulado dentro de una inclusión, con cuerpos elementales como satélites."""
    sp = Sprite(S)
    for a in np.linspace(0, 2 * math.pi, 5, endpoint=False):
        sp.part(coco(S, 0.5 + math.cos(a) * 0.36, 0.56 + math.sin(a) * 0.34, 0.05), "Simbionte")
    body = coco(S, 0.5, 0.56, 0.26)
    sp.part(body, "Intracelular")
    stripes(sp, body, [[(0.28, 0.5 + k * 0.08), (0.72, 0.5 + k * 0.08)] for k in range(-1, 3)] + [[(0.38 + k * 0.12, 0.34), (0.38 + k * 0.12, 0.78)] for k in range(3)], 1.0 / S, R("Intracelular", 1))
    if face: put_face(sp, 0.5, 0.54, 0.14, 0.06, iris=(170, 60, 150), mood="fierce", mouth="grin")
    return done(sp)

def acantharia(S, face=True):
    """Acantharia: protozoo con 20 espinas de sulfato de estroncio en estrella."""
    sp = Sprite(S)
    for k in range(10):
        a = k * math.pi / 5 + 0.15
        sp.part(polygon(S, [(0.5 + math.cos(a - 0.12) * 0.12, 0.54 + math.sin(a - 0.12) * 0.12), (0.5 + math.cos(a) * 0.44, 0.54 + math.sin(a) * 0.42),
                            (0.5 + math.cos(a + 0.12) * 0.12, 0.54 + math.sin(a + 0.12) * 0.12)]), "cristal", highlight=False)
    body = coco(S, 0.5, 0.54, 0.18)
    sp.part(body, "Protozoo")
    if face: put_face(sp, 0.5, 0.52, 0.12, 0.055, iris=(60, 150, 120))
    return done(sp)

def radiolaria(S, face=True):
    """Radiolaria: esqueleto geodésico de sílice, una esfera de celosía con un núcleo dentro."""
    sp = Sprite(S)
    for k in range(8):
        a = k * math.pi / 4
        sp.part(stroke(S, [(0.5 + math.cos(a) * 0.32, 0.52 + math.sin(a) * 0.32), (0.5 + math.cos(a) * 0.46, 0.52 + math.sin(a) * 0.45)], 0.02), "cristal", highlight=False)
    shell = coco(S, 0.5, 0.52, 0.33)
    sp.part(shell, "cristal")
    holes = np.zeros_like(shell)
    for a in np.linspace(0, 2 * math.pi, 9, endpoint=False):
        for rr in (0.12, 0.24):
            holes |= regular(S, 0.5 + math.cos(a + rr) * rr, 0.52 + math.sin(a + rr) * rr, 0.035, 6)
    sp.put(holes & shell, R("cristal", 0))
    core = coco(S, 0.5, 0.52, 0.14)
    sp.part(core, "Intracelular")
    if face: put_face(sp, 0.5, 0.5, 0.1, 0.045, mood="fierce", iris=(170, 60, 150), mouth="smile")
    return done(sp)

def aeruginosa(S, face=True):
    """Pseudomonas aeruginosa: bastón verde-azulado con escudo de biofilm y aura de piocianina."""
    sp = Sprite(S)
    aura = ellipse(S, 0.5, 0.58, 0.44, 0.4) & ~ellipse(S, 0.5, 0.58, 0.38, 0.34)
    sp.put(aura, R("Fotótrofo", 3))
    sp.lines(stroke(S, wave((0.7, 0.42), (0.96, 0.24), 0.025, 2.5), 1.8 / S), R("Gram-", 1))
    body = capsule(S, (0.5, 0.84), (0.5, 0.4), 0.19)
    sp.part(body, "Alga")
    shield = regular(S, 0.24, 0.62, 0.14, 6, math.pi / 6)
    sp.part(shield, "Biofilm")
    sp.put(regular(S, 0.24, 0.62, 0.06, 6, math.pi / 6) & shield, R("Fotótrofo", 2))
    arms(sp, [((0.68, 0.6), (0.82, 0.68))], 0.04, "Alga")
    feet(sp, (0.42, 0.58), 0.95, 0.07, 0.04, "Alga")
    if face: put_face(sp, 0.52, 0.5, 0.14, 0.06, mood="fierce", iris=(60, 170, 150), mouth="fangs")
    return done(sp)

def bacteriovor(S, face=True):
    """Bdellovibrio bacteriovorus: depredador que perfora a su presa y vive dentro de ella (bdeloplasto)."""
    sp = Sprite(S)
    prey = coco(S, 0.42, 0.62, 0.3)
    sp.part(prey, "Gram-")
    sp.put(coco(S, 0.42, 0.62, 0.24) & prey, R("Gram-", 3))
    body = stroke(S, bezier([(0.3, 0.54), (0.42, 0.76), (0.6, 0.68), (0.62, 0.52)], 30), 0.14)
    sp.part(body & prey, "Antibiótico", outline=False)
    sp.lines(stroke(S, wave((0.66, 0.36), (0.96, 0.16), 0.03, 3), 1.8 / S), R("Antibiótico", 1))
    sp.part(capsule(S, (0.66, 0.4), (0.74, 0.3), 0.06), "Antibiótico")
    if face: put_face(sp, 0.46, 0.6, 0.14, 0.06, mood="fierce", iris=(240, 200, 60), mouth="fangs")
    return done(sp)

# ================================================================ Urtaza
def parahaemolyticus(S, face=True):
    """V. parahaemolyticus: vibrio marino gigante con flagelo polar y corriente marina a su espalda."""
    sp = Sprite(S)
    for k in range(3):
        sp.part(stroke(S, bezier([(0.04, 0.3 + k * 0.18), (0.3, 0.2 + k * 0.18), (0.5, 0.36 + k * 0.18), (0.96, 0.26 + k * 0.18)], 30), 0.03), "Ácido-Alc.", highlight=False)
    sp.lines(stroke(S, wave((0.8, 0.34), (1.0, 0.1), 0.03, 3), 2.0 / S), R("Gram-", 1))
    body = stroke(S, bezier([(0.16, 0.46), (0.3, 0.86), (0.7, 0.8), (0.82, 0.42)], 30), 0.26)
    sp.part(body, "Extremófilo")
    sp.put(stroke(S, bezier([(0.24, 0.6), (0.36, 0.78), (0.66, 0.74), (0.74, 0.54)], 30), 1.6 / S) & body, R("Gram-", 2))
    if face: put_face(sp, 0.5, 0.64, 0.16, 0.065, mood="fierce", iris=(80, 110, 220), mouth="fangs", mw=0.06)
    return done(sp)

def vulnificus(S, face=True):
    """V. vulnificus: vibrio con cápsula y pseudópodos, que «devora carne»; aspecto de tiburón."""
    sp = Sprite(S)
    sp.part(polygon(S, [(0.4, 0.68), (0.54, 0.38), (0.64, 0.66)]), "Gram-")                  # aleta
    body = stroke(S, bezier([(0.12, 0.6), (0.4, 0.82), (0.72, 0.72), (0.9, 0.52)], 30), 0.22)
    sp.part(body, "Gram-")
    sp.part(polygon(S, [(0.04, 0.44), (0.18, 0.6), (0.06, 0.76)]), "Gram-")
    sp.put(stroke(S, bezier([(0.2, 0.7), (0.44, 0.86), (0.76, 0.76)], 30), 2.0 / S) & body, R("Protozoo", 3))
    if face:
        put_face(sp, 0.72, 0.6, 0.12, 0.055, mood="fierce", iris=(220, 40, 40), mouth="fangs", mw=0.055)
    return done(sp)

def tuberculos(S, face=True):
    """M. tuberculosis: bastón ceroso en «cordón» acorazado con placas de ácidos micólicos y capa."""
    sp = Sprite(S)
    cape = polygon(S, [(0.26, 0.36), (0.74, 0.36), (0.92, 0.96), (0.08, 0.96)])
    sp.part(cape, "Intracelular")
    for side in (-1, 1):
        sp.part(capsule(S, (0.5 + side * 0.16, 0.86), (0.5 + side * 0.2, 0.5), 0.07), "Ácido-Alc.")
    body = capsule(S, (0.5, 0.88), (0.5, 0.34), 0.18)
    sp.part(body, "Ácido-Alc.")
    for k in range(4):
        sp.put(polygon(S, [(0.34, 0.46 + k * 0.1), (0.66, 0.46 + k * 0.1), (0.62, 0.52 + k * 0.1), (0.38, 0.52 + k * 0.1)]) & body, R("Ácido-Alc.", 3))
    sp.part(polygon(S, [(0.36, 0.22), (0.4, 0.1), (0.46, 0.18), (0.5, 0.06), (0.54, 0.18), (0.6, 0.1), (0.64, 0.22)]), "Intracelular", highlight=False)
    if face: put_face(sp, 0.5, 0.36, 0.14, 0.06, mood="fierce", iris=(250, 60, 60), mouth="grin")
    return done(sp)

DESIGNS7 = {
    "rous-v": rous_v, "lentivir": lentivir, "poxvir": poxvir, "lyssavir": lyssavir, "nocardia": nocardia,
    "shewanella": shewanella, "chlamydia": chlamydia, "acantharia": acantharia, "radiolaria": radiolaria, "aeruginosa": aeruginosa,
    "bacteriovor": bacteriovor, "parahaemolyticus": parahaemolyticus, "vulnificus": vulnificus, "tuberculos": tuberculos,
}
