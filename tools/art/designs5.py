"""Diseños a mano del cuarto tramo: Rutas 5 y 6, Torre Prión, Ciudad Aerobia, guarida y Gimnasio 4."""
import math
import numpy as np
from pix import Sprite, ellipse, capsule, polygon, regular, bezier, stroke, wave, shift, dilate, RAMPS
from designs1 import leaf, flame, feet, arms, put_face, stripes, _cilia, R
from designs2 import done, spikes, spots, _capsid

def coco(S, x, y, r):
    return ellipse(S, x, y, r, r * 0.95)

# ================================================================ Ruta 5
def rickettsia(S, face=True):
    """Rickettsia: bacilo diminuto montado en un piojo-mochila (vector)."""
    sp = Sprite(S)
    louse = ellipse(S, 0.5, 0.72, 0.26, 0.16)
    for side in (-1, 1):
        for k in range(3):
            sp.part(stroke(S, [(0.5 + side * (0.12 + k * 0.06), 0.78), (0.5 + side * (0.24 + k * 0.08), 0.92)], 0.02), "Extremófilo", highlight=False)
    sp.part(louse, "Extremófilo")
    body = capsule(S, (0.4, 0.46), (0.6, 0.42), 0.14)
    sp.part(body, "Intracelular")
    if face: put_face(sp, 0.5, 0.44, 0.13, 0.055, iris=(170, 60, 150), mouth="grin")
    return done(sp)

def borrelia(S, face=True):
    """Borrelia: espiroqueta larga y suelta que se enrosca como un muelle con una garrapata en la cola."""
    sp = Sprite(S)
    path = [(0.16 + 0.68 * t, 0.66 + 0.1 * math.sin(t * 9 * math.pi) * (1 - 0.3 * t)) for t in np.linspace(0, 1, 90)]
    sp.part(stroke(S, path, 0.05), "Espiroqueta")
    sp.part(ellipse(S, 0.14, 0.72, 0.08, 0.06), "Extremófilo")
    head = ellipse(S, 0.82, 0.58, 0.14, 0.13)
    sp.part(head, "Espiroqueta")
    if face: put_face(sp, 0.82, 0.56, 0.12, 0.05, iris=(240, 120, 40), mood="fierce", mouth="fangs")
    return done(sp)

def mutans(S, face=True):
    """Streptococcus mutans: cadena de cocos que muerde un diente lleno de placa."""
    sp = Sprite(S)
    tooth = polygon(S, [(0.6, 0.2), (0.9, 0.2), (0.92, 0.5), (0.84, 0.86), (0.78, 0.6), (0.72, 0.86), (0.62, 0.5)])
    sp.part(tooth, "cristal")
    spots(sp, tooth, [(0.7, 0.3), (0.82, 0.42)], 0.035, R("Levadura", 1))
    for k, (x, y) in enumerate(((0.16, 0.8), (0.26, 0.72), (0.36, 0.64))):
        sp.part(coco(S, x, y, 0.08), "Gram+")
    head = coco(S, 0.46, 0.5, 0.15)
    sp.part(head, "Biofilm")
    if face: put_face(sp, 0.46, 0.48, 0.12, 0.055, iris=(200, 70, 120), mood="fierce", mouth="fangs")
    return done(sp)

def actinomyces(S, face=True):
    """Actinomyces: filamentos ramificados que forman un «gránulo de azufre» amarillo con rayos."""
    sp = Sprite(S)
    for k in range(10):
        a = k * math.pi / 5
        sp.part(stroke(S, [(0.5, 0.56), (0.5 + math.cos(a) * 0.38, 0.56 + math.sin(a) * 0.36)], 0.03), "Gram+", highlight=False)
        sp.part(ellipse(S, 0.5 + math.cos(a) * 0.38, 0.56 + math.sin(a) * 0.36, 0.04, 0.04), "Antibiótico", highlight=False)
    core = coco(S, 0.5, 0.56, 0.2)
    sp.part(core, "Espiroqueta")
    if face: put_face(sp, 0.5, 0.55, 0.14, 0.06, iris=(130, 80, 200))
    return done(sp)

def bdellovib(S, face=True):
    """Bdellovibrio: vibrio pequeño y rapidísimo con un flagelo enorme, depredador de bacterias."""
    sp = Sprite(S)
    sp.lines(stroke(S, wave((0.66, 0.5), (0.98, 0.5), 0.04, 3), 2.0 / S), R("Gram-", 1))
    body = stroke(S, bezier([(0.24, 0.42), (0.36, 0.7), (0.62, 0.6), (0.68, 0.44)], 30), 0.2)
    sp.part(body, "Gram-")
    if face: put_face(sp, 0.42, 0.56, 0.15, 0.06, mood="fierce", iris=(230, 60, 60), mouth="fangs", mw=0.05)
    return done(sp)

def smegmatis(S, face=True):
    """Mycobacterium smegmatis: bastón ceroso con capa de ácidos micólicos en forma de abrigo rosa."""
    sp = Sprite(S)
    body = capsule(S, (0.5, 0.84), (0.5, 0.36), 0.18)
    sp.part(body, "Ácido-Alc.")
    coat = body & ~capsule(S, (0.5, 0.84), (0.5, 0.36), 0.12)
    sp.put(coat & ~dilate(~body), R("Intracelular", 2))
    stripes(sp, body, [[(0.32, 0.5 + k * 0.08), (0.68, 0.52 + k * 0.08)] for k in range(4)], 1.0 / S, R("Ácido-Alc.", 1))
    feet(sp, (0.42, 0.58), 0.95, 0.06, 0.04, "Ácido-Alc.")
    if face: put_face(sp, 0.5, 0.44, 0.13, 0.055, iris=(200, 80, 140))
    return done(sp)

def cryptococ(S, face=True):
    """Cryptococcus: levadura redonda dentro de una cápsula gruesa (tinta china), como un huevo frito."""
    sp = Sprite(S)
    caps = ellipse(S, 0.5, 0.58, 0.34, 0.32)
    sp.part(caps, "cristal")
    sp.put(stroke(S, bezier([(0.18, 0.5), (0.5, 0.2), (0.82, 0.5)], 30), 1.4 / S) & caps, R("Levadura", 3))
    body = coco(S, 0.5, 0.6, 0.18)
    sp.part(body, "Levadura")
    sp.part(coco(S, 0.66, 0.42, 0.06), "Levadura")
    if face: put_face(sp, 0.5, 0.58, 0.12, 0.055, iris=(190, 140, 50), blush=True)
    return done(sp)

# ================================================================ Torre Prión
def pneumoniae(S, face=True):
    """Chlamydia pneumoniae: cuerpo elemental dentro de una inclusión, como un fantasma en una burbuja."""
    sp = Sprite(S)
    ghost = polygon(S, bezier([(0.22, 0.86), (0.18, 0.3), (0.5, 0.14), (0.82, 0.3), (0.78, 0.86)], 50) + [(0.68, 0.78), (0.58, 0.88), (0.5, 0.78), (0.42, 0.88), (0.32, 0.78)])
    sp.part(ghost, "Intracelular")
    for x, y in ((0.36, 0.62), (0.62, 0.66), (0.5, 0.74)):
        sp.put(coco(S, x, y, 0.035) & ghost, R("Intracelular", 3))
    if face: put_face(sp, 0.5, 0.42, 0.15, 0.065, mood="fierce", iris=(240, 240, 120), mouth="open")
    return done(sp)

def bovis(S, face=True):
    """Mycobacterium bovis: bastón ácido-alcohol resistente con cuernos de vaca y mancha."""
    sp = Sprite(S)
    for side in (-1, 1):
        sp.part(bezier_horn(S, side), "cristal", highlight=False)
    body = capsule(S, (0.5, 0.82), (0.5, 0.42), 0.2)
    sp.part(body, "Ácido-Alc.")
    spots(sp, body, [(0.38, 0.66), (0.62, 0.76)], 0.05, R("Extremófilo", 1))
    feet(sp, (0.4, 0.6), 0.94, 0.07, 0.045, "Ácido-Alc.")
    if face: put_face(sp, 0.5, 0.5, 0.15, 0.06, mood="fierce", iris=(200, 80, 140), mouth="smile")
    return done(sp)

def bezier_horn(S, side):
    return stroke(S, bezier([(0.5 + side * 0.12, 0.32), (0.5 + side * 0.32, 0.3), (0.5 + side * 0.34, 0.14)], 20), 0.035)

def prion_sc(S, face=True):
    """PrPSc: proteína mal plegada en lámina beta, un fantasma de cintas retorcidas."""
    sp = Sprite(S)
    for k in range(4):
        y = 0.3 + k * 0.14
        sp.part(stroke(S, [(0.22 + (k % 2) * 0.08, y), (0.78 - (k % 2) * 0.08, y + 0.05)], 0.06), "Intracelular", highlight=False)
        tip = 0.8 - (k % 2) * 0.08
        sp.part(polygon(S, [(tip, y - 0.05), (tip + 0.08, y + 0.03), (tip, y + 0.1)]), "Intracelular", highlight=False)
    core = ellipse(S, 0.5, 0.44, 0.18, 0.16)
    sp.part(core, "Ácido-Alc.")
    if face: put_face(sp, 0.5, 0.43, 0.13, 0.06, mood="fierce", iris=(250, 80, 80), mouth="grin")
    return done(sp)

# ================================================================ Ruta 6
def magnetospir(S, face=True):
    """Magnetospirillum: espirilo con una cadena interna de cristales de magnetita, como una brújula."""
    sp = Sprite(S)
    path = [(0.12 + 0.62 * t, 0.62 + 0.12 * math.sin(t * 2.4 * math.pi)) for t in np.linspace(0, 1, 60)]
    body = stroke(S, path, 0.13)
    sp.part(body, "Gram-")
    for k in range(6, 56, 8):
        x, y = path[k]
        sp.put(regular(S, x, y, 0.025, 4) & body, R("Extremófilo", 0))
    sp.part(polygon(S, [(0.82, 0.3), (0.9, 0.52), (0.82, 0.48), (0.74, 0.52)]), "Antibiótico", highlight=False)
    head = ellipse(S, 0.76, 0.6, 0.12, 0.12)
    sp.part(head, "Gram-")
    if face: put_face(sp, 0.76, 0.58, 0.1, 0.045, iris=(80, 110, 200))
    return done(sp)

def geobacter(S, face=True):
    """Geobacter: bastón con nanocables eléctricos que chisporrotean."""
    sp = Sprite(S)
    for a in (-0.6, 0.0, 0.6):
        pts = [(0.5, 0.5)]
        for k in range(1, 5):
            pts.append((0.5 + math.sin(a) * 0.1 * k + (0.03 if k % 2 else -0.03), 0.5 - 0.1 * k))
        sp.lines(stroke(S, pts, 1.6 / S), R("Espiroqueta", 2))
    body = capsule(S, (0.34, 0.66), (0.66, 0.6), 0.17)
    sp.part(body, "Espiroqueta")
    sp.put(stroke(S, [(0.42, 0.56), (0.5, 0.66), (0.46, 0.66), (0.54, 0.76)], 1.6 / S) & body, R("brillo", 3))
    feet(sp, (0.4, 0.6), 0.84, 0.06, 0.04, "Biofilm")
    if face: put_face(sp, 0.56, 0.6, 0.13, 0.055, iris=(240, 200, 40), mouth="grin")
    return done(sp)

def halobacter(S, face=True):
    """Halobacterium: arquea rosa plana sobre un cristal de sal cúbico."""
    sp = Sprite(S)
    salt = polygon(S, [(0.3, 0.74), (0.7, 0.74), (0.78, 0.66), (0.78, 0.92), (0.7, 0.98), (0.3, 0.98), (0.22, 0.92), (0.22, 0.66)])
    sp.part(salt, "cristal")
    body = capsule(S, (0.3, 0.5), (0.7, 0.46), 0.15)
    sp.part(body, "Intracelular")
    if face: put_face(sp, 0.5, 0.47, 0.14, 0.055, iris=(170, 80, 160), blush=True)
    return done(sp)

def salinarum(S, face=True):
    """H. salinarum: arquea púrpura con vela de bacteriorrodopsina que capta la luz."""
    sp = Sprite(S)
    sail = polygon(S, [(0.5, 0.12), (0.84, 0.48), (0.5, 0.5)])
    sp.part(sail, "Archaea")
    sp.put(stroke(S, [(0.52, 0.2), (0.78, 0.46)], 1.4 / S) & sail, R("Archaea", 3))
    body = capsule(S, (0.24, 0.62), (0.76, 0.58), 0.17)
    sp.part(body, "Intracelular")
    sp.part(salt_block(S), "cristal")
    if face: put_face(sp, 0.48, 0.6, 0.15, 0.06, mood="fierce", iris=(200, 80, 200), mouth="grin")
    return done(sp)

def salt_block(S):
    return polygon(S, [(0.28, 0.84), (0.72, 0.84), (0.76, 0.96), (0.24, 0.96)])

def psychrobac(S, face=True):
    """Psychrobacter: cocobacilo azul hielo con gorro de lana y copos."""
    sp = Sprite(S)
    for x, y in ((0.16, 0.24), (0.84, 0.3), (0.22, 0.5)):
        sp.part(regular(S, x, y, 0.035, 6), "cristal", highlight=False)
    body = ellipse(S, 0.5, 0.62, 0.24, 0.22)
    sp.part(body, "Ácido-Alc.")
    hat = ellipse(S, 0.5, 0.42, 0.2, 0.12) & (ellipse(S, 0.5, 0.5, 0.3, 0.2) | ~ellipse(S, 0.5, 0.56, 0.3, 0.12))
    sp.part(hat, "Antibiótico")
    sp.part(coco(S, 0.5, 0.28, 0.05), "cristal")
    feet(sp, (0.4, 0.6), 0.86, 0.06, 0.04, "Ácido-Alc.")
    if face: put_face(sp, 0.5, 0.62, 0.14, 0.06, iris=(80, 150, 220), blush=True)
    return done(sp)

def baylyi(S, face=True):
    """Acinetobacter baylyi: cocobacilo que recoge ADN del ambiente con sus pili (un coleccionista)."""
    sp = Sprite(S)
    for k, a in enumerate((-0.9, -0.3, 0.3, 0.9)):
        tip = (0.5 + math.sin(a) * 0.4, 0.4 - math.cos(a) * 0.26)
        sp.lines(stroke(S, [(0.5, 0.5), tip], 1.4 / S), R("Gram+", 1))
        sp.lines(stroke(S, wave((tip[0] - 0.04, tip[1]), (tip[0] + 0.04, tip[1]), 0.012, 1.5), 1.2 / S), R("Simbionte", 2))
    body = ellipse(S, 0.5, 0.62, 0.22, 0.2)
    sp.part(body, "Gram+")
    feet(sp, (0.4, 0.6), 0.84, 0.06, 0.04, "Gram+")
    if face: put_face(sp, 0.5, 0.6, 0.14, 0.06, iris=(130, 80, 200), mouth="open")
    return done(sp)

def leishmania(S, face=True):
    """Leishmania: promastigote en forma de huso con un flagelo frontal largo."""
    sp = Sprite(S)
    sp.lines(stroke(S, wave((0.74, 0.34), (0.98, 0.14), 0.025, 2.5), 1.6 / S), R("Protozoo", 1))
    body = polygon(S, bezier([(0.12, 0.84), (0.3, 0.5), (0.7, 0.34), (0.78, 0.32), (0.6, 0.6), (0.12, 0.84)], 50))
    sp.part(body, "Protozoo")
    sp.put(coco(S, 0.42, 0.62, 0.04) & body, R("Protozoo", 0))
    if face: put_face(sp, 0.56, 0.48, 0.1, 0.045, mood="fierce", iris=(200, 60, 60), mouth="grin")
    return done(sp)

# ================================================================ Guarida y Casino
def volvox(S, face=True):
    """Volvox: esfera colonial perfecta con colonias hijas dentro, presumida y simétrica."""
    sp = Sprite(S)
    ball = coco(S, 0.5, 0.52, 0.38)
    sp.part(ball, "Fotótrofo")
    for a in np.linspace(0, 2 * math.pi, 18, endpoint=False):
        sp.put(coco(S, 0.5 + math.cos(a) * 0.33, 0.52 + math.sin(a) * 0.32, 0.018) & ball, R("Fotótrofo", 0))
    for x, y in ((0.34, 0.68), (0.68, 0.7)):
        sp.put(coco(S, x, y, 0.07) & ball, R("Alga", 2))
    sp.put(ellipse(S, 0.36, 0.32, 0.08, 0.05) & ball, R("Fotótrofo", 3))
    if face: put_face(sp, 0.5, 0.5, 0.16, 0.06, iris=(80, 160, 80), mouth="smile", blush=True)
    return done(sp)

def crescentus(S, face=True):
    """Caulobacter crescentus adulto: media luna sobre un pedúnculo con ventosa superfuerte."""
    sp = Sprite(S)
    sp.part(stroke(S, [(0.5, 0.62), (0.5, 0.92)], 0.04), "Biofilm", highlight=False)
    sp.part(ellipse(S, 0.5, 0.93, 0.16, 0.05), "Biofilm")
    moon = ellipse(S, 0.5, 0.42, 0.32, 0.3) & ~ellipse(S, 0.5, 0.2, 0.3, 0.26)
    sp.part(moon, "Gram-")
    arms(sp, [((0.24, 0.5), (0.12, 0.62)), ((0.76, 0.5), (0.88, 0.62))], 0.035, "Gram-")
    if face: put_face(sp, 0.5, 0.56, 0.15, 0.055, mood="fierce", iris=(80, 110, 200), mouth="grin")
    return done(sp)

def marcescens(S, face=True):
    """Serratia marcescens evolucionada: gran bastón rojo con capa y gotas de prodigiosina."""
    sp = Sprite(S)
    cape = polygon(S, [(0.3, 0.4), (0.7, 0.4), (0.86, 0.94), (0.14, 0.94)])
    sp.part(cape, "Gram-")
    body = capsule(S, (0.5, 0.84), (0.5, 0.42), 0.18)
    sp.part(body, "Antibiótico")
    for x, y in ((0.16, 0.3), (0.84, 0.26), (0.9, 0.44)):
        sp.part(ellipse(S, x, y, 0.035, 0.045), "Antibiótico", highlight=False)
    arms(sp, [((0.34, 0.6), (0.2, 0.68)), ((0.66, 0.6), (0.8, 0.68))], 0.04, "Antibiótico")
    if face: put_face(sp, 0.5, 0.5, 0.15, 0.06, mood="fierce", iris=(240, 200, 60), mouth="fangs")
    return done(sp)

def myxococcus(S, face=True):
    """Myxococcus xanthus: enjambre amarillo de bastones con cuerpos fructíferos en forma de árbol (bacteria lobo social)."""
    sp = Sprite(S)
    for x, h in ((0.28, 0.24), (0.5, 0.14), (0.72, 0.26)):
        sp.part(stroke(S, [(x, 0.52), (x, h + 0.08)], 0.03), "Espiroqueta", highlight=False)
        sp.part(coco(S, x, h, 0.07), "Esporulado")
    swarm = polygon(S, bezier([(0.1, 0.9), (0.06, 0.58), (0.3, 0.46), (0.7, 0.46), (0.94, 0.58), (0.9, 0.9)], 60))
    sp.part(swarm, "Espiroqueta")
    for x, y, a in ((0.22, 0.78, 0.4), (0.4, 0.86, -0.3), (0.62, 0.84, 0.5), (0.8, 0.76, -0.5)):
        sp.put(capsule(S, (x - 0.04 * math.cos(a), y - 0.04 * math.sin(a)), (x + 0.04 * math.cos(a), y + 0.04 * math.sin(a)), 0.015) & swarm, R("Espiroqueta", 1))
    if face: put_face(sp, 0.5, 0.62, 0.17, 0.06, mood="fierce", iris=(120, 70, 30), mouth="grin")
    return done(sp)

def pleomorph(S, face=True):
    """Pleomorph (forma L): gelatina lila translúcida sin pared, con lóbulos que cambian de forma."""
    sp = Sprite(S)
    body = ellipse(S, 0.5, 0.64, 0.28, 0.24)
    for x, y, r in ((0.3, 0.42, 0.1), (0.52, 0.34, 0.12), (0.72, 0.44, 0.09)):
        body |= coco(S, x, y, r)
    sp.part(body, "Archaea")
    for x, y in ((0.36, 0.74), (0.66, 0.7), (0.5, 0.82)):
        sp.put(coco(S, x, y, 0.03) & body, R("Archaea", 3))
    sp.put(ellipse(S, 0.4, 0.4, 0.05, 0.035) & body, (255, 255, 255))
    if face: put_face(sp, 0.5, 0.6, 0.15, 0.065, iris=(120, 90, 200), blush=True)
    return done(sp)

def cholerae(S, face=True):
    """Vibrio cholerae: coma azul con un flagelo polar y una ola debajo."""
    sp = Sprite(S)
    sp.part(polygon(S, bezier([(0.06, 0.92), (0.3, 0.78), (0.5, 0.92), (0.7, 0.78), (0.94, 0.92)], 40) + [(0.94, 0.98), (0.06, 0.98)]), "Ácido-Alc.")
    sp.lines(stroke(S, wave((0.78, 0.36), (0.98, 0.12), 0.025, 2.5), 1.8 / S), R("Gram-", 1))
    body = stroke(S, bezier([(0.2, 0.42), (0.34, 0.78), (0.66, 0.68), (0.78, 0.4)], 30), 0.22)
    sp.part(body, "Gram-")
    if face: put_face(sp, 0.5, 0.6, 0.15, 0.06, iris=(80, 110, 200), mood="fierce", mouth="grin")
    return done(sp)

# ================================================================ Gimnasio 4
def neoformans(S, face=True):
    """C. neoformans: levadura encapsulada enorme con cápsula de polisacárido en forma de capucha."""
    sp = Sprite(S)
    caps = ellipse(S, 0.5, 0.56, 0.38, 0.36)
    sp.part(caps, "Biofilm")
    sp.put(stroke(S, bezier([(0.14, 0.56), (0.5, 0.14), (0.86, 0.56)], 30), 1.6 / S) & caps, R("Biofilm", 3))
    body = coco(S, 0.5, 0.6, 0.2)
    sp.part(body, "Levadura")
    for x in (0.26, 0.74):
        sp.part(coco(S, x, 0.84, 0.08), "Levadura")
    if face: put_face(sp, 0.5, 0.58, 0.14, 0.06, mood="fierce", iris=(190, 140, 50), mouth="fangs")
    return done(sp)

def auris(S, face=True):
    """Candida auris: levadura acorazada con escudo de biofilm, imposible de eliminar."""
    sp = Sprite(S)
    shield = regular(S, 0.24, 0.62, 0.15, 6, math.pi / 6)
    body = ellipse(S, 0.56, 0.58, 0.24, 0.27)
    sp.part(body, "Levadura")
    sp.part(polygon(S, [(0.4, 0.36), (0.72, 0.36), (0.78, 0.22), (0.56, 0.12), (0.34, 0.22)]), "Biofilm")   # yelmo
    sp.part(shield, "Biofilm")
    sp.put(regular(S, 0.24, 0.62, 0.07, 6, math.pi / 6) & shield, R("Levadura", 2))
    arms(sp, [((0.76, 0.6), (0.9, 0.5))], 0.045, "Levadura")
    feet(sp, (0.46, 0.66), 0.92, 0.07, 0.04, "Biofilm")
    if face: put_face(sp, 0.56, 0.5, 0.14, 0.06, mood="fierce", iris=(200, 60, 160), mouth="grin")
    return done(sp)

DESIGNS5 = {
    "rickettsia": rickettsia, "borrelia": borrelia, "mutans": mutans, "actinomyces": actinomyces, "bdellovib": bdellovib,
    "smegmatis": smegmatis, "cryptococ": cryptococ, "pneumoniae": pneumoniae, "bovis": bovis, "prion-sc": prion_sc,
    "magnetospir": magnetospir, "geobacter": geobacter, "halobacter": halobacter, "salinarum": salinarum, "psychrobac": psychrobac,
    "baylyi": baylyi, "leishmania": leishmania, "volvox": volvox, "crescentus": crescentus, "marcescens": marcescens,
    "myxococcus": myxococcus, "pleomorph": pleomorph, "cholerae": cholerae, "neoformans": neoformans, "auris": auris,
}
