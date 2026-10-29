"""Diseños a mano del segundo tramo: Ruta 2, Monte Micelio, Ruta 3 y Gimnasio 2."""
import math
import numpy as np
from pix import Sprite, ellipse, capsule, polygon, regular, bezier, stroke, wave, shift, dilate, RAMPS
from designs1 import leaf, flame, feet, arms, put_face, stripes, _cilia, R
from designs2 import done, spikes, spots

# ================================================================ Ruta 2
def rhizobi(S, face=True):
    """Rhizobium: bastón dentro de un nódulo-raíz rosado, con raicillas como patas."""
    sp = Sprite(S)
    for k in range(5):
        x = 0.3 + k * 0.1
        sp.lines(stroke(S, bezier([(x, 0.78), (x + (x - 0.5) * 0.5, 0.88), (x + (x - 0.5) * 0.9, 0.97)], 10), 1.5 / S), R("Esporulado", 1))
    nod = ellipse(S, 0.5, 0.62, 0.25, 0.22)
    sp.part(nod, "Simbionte")
    sp.part(leaf(S, (0.5, 0.42), (0.36, 0.2), 0.06), "Fotótrofo")
    sp.part(leaf(S, (0.5, 0.42), (0.64, 0.18), 0.065), "Fotótrofo")
    spots(sp, nod, [(0.33, 0.7), (0.67, 0.72)], 0.03, R("Simbionte", 3))
    if face: put_face(sp, 0.5, 0.6, 0.16, 0.06, iris=(80, 160, 70), blush=True)
    return done(sp)

def serratia(S, face=True):
    """Serratia marcescens: bastón rojo brillante (prodigiosina) con gotas como de sangre."""
    sp = Sprite(S)
    for k in range(3):
        sp.lines(stroke(S, wave((0.24, 0.66 + k * 0.05), (0.06, 0.58 + k * 0.12), 0.025, 2.5), 1.3 / S), R("Antibiótico", 1))
    body = capsule(S, (0.36, 0.64), (0.66, 0.5), 0.17)
    sp.part(body, "Antibiótico")
    for x, y, r in ((0.78, 0.78, 0.04), (0.86, 0.68, 0.03), (0.2, 0.84, 0.03)):
        sp.part(ellipse(S, x, y, r, r * 1.2), "Antibiótico", highlight=False)
    feet(sp, (0.42, 0.62), 0.82, 0.06, 0.04, "Antibiótico")
    if face: put_face(sp, 0.55, 0.53, 0.15, 0.06, mood="fierce", iris=(240, 200, 60), mouth="grin")
    return done(sp)

def thuringien(S, face=True):
    """Bacillus thuringiensis: bastón con cristal de toxina en forma de rombo y antenitas."""
    sp = Sprite(S)
    for side in (-1, 1):
        sp.part(stroke(S, [(0.5 + side * 0.06, 0.3), (0.5 + side * 0.14, 0.16)], 0.02), "Esporulado", highlight=False)
        sp.part(ellipse(S, 0.5 + side * 0.15, 0.14, 0.035, 0.035), "Simbionte", highlight=False)
    body = capsule(S, (0.5, 0.8), (0.5, 0.42), 0.17)
    sp.part(body, "Esporulado")
    sp.part(regular(S, 0.5, 0.7, 0.09, 4, 0, 1.4), "cristal")
    arms(sp, [((0.35, 0.6), (0.22, 0.66)), ((0.65, 0.6), (0.78, 0.66))], 0.035, "Esporulado")
    feet(sp, (0.42, 0.58), 0.93, 0.06, 0.04, "Esporulado")
    if face: put_face(sp, 0.5, 0.47, 0.15, 0.06, iris=(100, 170, 80))
    return done(sp)

def bifidum(S, face=True):
    """Bifidobacterium: bastón bífido en forma de Y, como un tirachinas con cara."""
    sp = Sprite(S)
    for side in (-1, 1):
        sp.part(capsule(S, (0.5, 0.48), (0.5 + side * 0.22, 0.24), 0.1), "Simbionte")
        sp.part(ellipse(S, 0.5 + side * 0.24, 0.22, 0.09, 0.08), "Levadura")
    body = capsule(S, (0.5, 0.8), (0.5, 0.52), 0.17)
    sp.part(body, "Simbionte")
    sp.put(ellipse(S, 0.5, 0.72, 0.08, 0.07) & body, R("cristal", 3))
    feet(sp, (0.42, 0.58), 0.93, 0.06, 0.04, "Simbionte")
    if face: put_face(sp, 0.5, 0.6, 0.15, 0.06, iris=(220, 140, 160), blush=True)
    return done(sp)

def euglena(S, face=True):
    """Euglena: gota verde con mancha ocular roja y un flagelo largo como coleta."""
    sp = Sprite(S)
    sp.lines(stroke(S, wave((0.62, 0.22), (0.92, 0.06), 0.03, 2.5), 1.6 / S), R("Protozoo", 1))
    body = polygon(S, bezier([(0.5, 0.94), (0.2, 0.7), (0.3, 0.3), (0.6, 0.2), (0.78, 0.4), (0.7, 0.7), (0.5, 0.94)], 60))
    sp.part(body, "Fotótrofo")
    for y in (0.5, 0.62, 0.74):
        sp.put(ellipse(S, 0.4, y, 0.04, 0.02, 0.4) & body, R("Fotótrofo", 0))
        sp.put(ellipse(S, 0.6, y + 0.03, 0.04, 0.02, -0.4) & body, R("Fotótrofo", 0))
    sp.put(ellipse(S, 0.6, 0.3, 0.035, 0.035) & body, (230, 60, 50))          # estigma
    if face: put_face(sp, 0.5, 0.44, 0.14, 0.055, iris=(60, 130, 200))
    return done(sp)

# ================================================================ Monte Micelio
def roqueforti(S, face=True):
    """Penicillium roqueforti: queso azul con pinceles de conidióforos verdeazulados."""
    sp = Sprite(S)
    for x in (0.3, 0.5, 0.7):
        top = 0.16 if x == 0.5 else 0.22
        sp.part(stroke(S, [(x, 0.42), (x, top + 0.06)], 0.02), "Hongo", highlight=False)
        for dx in (-0.04, 0, 0.04):
            sp.part(capsule(S, (x + dx * 0.5, top + 0.05), (x + dx, top - 0.04), 0.018), "Ácido-Alc.", highlight=False)
    body = polygon(S, [(0.14, 0.46), (0.86, 0.46), (0.86, 0.84), (0.14, 0.84)])
    sp.part(body, "Levadura")
    spots(sp, body, [(0.26, 0.56), (0.7, 0.58), (0.36, 0.76), (0.78, 0.76), (0.56, 0.8)], 0.035, R("Ácido-Alc.", 1))
    sp.put(stroke(S, [(0.15, 0.48), (0.85, 0.48)], 1.6 / S), R("Levadura", 3))
    if face: put_face(sp, 0.5, 0.62, 0.17, 0.06, iris=(70, 120, 170))
    return done(sp)

def niger(S, face=True):
    """Aspergillus niger: cabeza conidial negra y redonda sobre un tallo, como un diente de león oscuro."""
    sp = Sprite(S)
    sp.part(capsule(S, (0.5, 0.92), (0.5, 0.56), 0.06), "Hongo")
    sp.part(ellipse(S, 0.5, 0.94, 0.12, 0.04), "Hongo", highlight=False)
    sp.part(spikes(S, 0.5, 0.38, 0.26, 18, 0.06, 0.025), "Extremófilo", highlight=False)
    head = ellipse(S, 0.5, 0.38, 0.27, 0.26)
    sp.part(head, "Extremófilo")
    spots(sp, head, [(0.3, 0.26), (0.7, 0.3), (0.34, 0.54), (0.68, 0.52)], 0.03, R("Extremófilo", 0))
    arms(sp, [((0.47, 0.7), (0.32, 0.64)), ((0.53, 0.72), (0.68, 0.66))], 0.025, "Hongo")
    if face: put_face(sp, 0.5, 0.38, 0.16, 0.065, mood="fierce", iris=(230, 200, 60), mouth="grin")
    return done(sp)

def _bacteroides(S, stage, face):
    sp = Sprite(S)
    body = capsule(S, (0.32, 0.66), (0.68, 0.6), 0.17 + 0.03 * stage)
    if stage == 2:
        for x in (0.28, 0.5, 0.72):
            sp.part(spikes(S, x, 0.5, 0.12, 3, 0.06, 0.03, 0, (math.pi * 1.2, math.pi * 1.8)), "Esporulado", highlight=False)
    sp.part(body, "Anaerobio")
    # cápsula polisacárida difusa
    sp.put(stroke(S, bezier([(0.18, 0.7), (0.5, 0.84 + 0.03 * stage), (0.82, 0.66)], 30), 1.4 / S) & body, R("Anaerobio", 3))
    sp.put(ellipse(S, 0.36, 0.68, 0.05, 0.04) & body, R("Esporulado", 2))
    if stage == 2:
        arms(sp, [((0.24, 0.66), (0.1, 0.72)), ((0.76, 0.62), (0.9, 0.66))], 0.04, "Anaerobio")
    feet(sp, (0.38, 0.62), 0.84 + 0.03 * stage, 0.07, 0.04, "Anaerobio")
    if face: put_face(sp, 0.52, 0.6, 0.16, 0.06, mood="fierce" if stage == 2 else "happy", iris=(180, 90, 40),
                      mouth="fangs" if stage == 2 else "smile", blush=stage == 1)
    return done(sp)

bacteroid = lambda S, face=True: _bacteroides(S, 1, face)
fragilis = lambda S, face=True: _bacteroides(S, 2, face)

def thermus(S, face=True):
    """Thermus: bastón amarillo de las fuentes termales, con vapor y una toalla."""
    sp = Sprite(S)
    for k, x in enumerate((0.32, 0.5, 0.68)):
        sp.lines(stroke(S, wave((x, 0.3), (x + 0.02, 0.06), 0.025, 1.5), 1.6 / S), (240, 240, 250))
    sp.part(ellipse(S, 0.5, 0.86, 0.36, 0.08), "Ácido-Alc.", highlight=False)     # charca
    body = capsule(S, (0.5, 0.82), (0.5, 0.44), 0.18)
    sp.part(body, "brillo")
    sp.part(capsule(S, (0.34, 0.36), (0.66, 0.34), 0.05), "Simbionte")          # toalla en la cabeza
    sp.put(ellipse(S, 0.5, 0.86, 0.36, 0.06) & body, R("Ácido-Alc.", 2))
    if face: put_face(sp, 0.5, 0.52, 0.15, 0.06, iris=(220, 120, 40), blush=True, mouth="open")
    return done(sp)

# ================================================================ Ruta 3 y Gimnasio 2
def noctiluca(S, face=True):
    """Noctiluca: globo translúcido bioluminiscente con tentáculo, como una linterna marina."""
    sp = Sprite(S)
    sp.part(stroke(S, bezier([(0.5, 0.74), (0.6, 0.86), (0.48, 0.96)], 20), 0.025), "Alga", highlight=False)
    body = ellipse(S, 0.5, 0.48, 0.3, 0.29)
    sp.part(body, "Ácido-Alc.")
    for x, y in ((0.32, 0.4), (0.66, 0.36), (0.4, 0.64), (0.64, 0.62), (0.5, 0.28)):
        sp.put(ellipse(S, x, y, 0.03, 0.03) & body, (210, 255, 250))
    sp.put(ellipse(S, 0.4, 0.34, 0.06, 0.04) & body, R("cristal", 3))
    if face: put_face(sp, 0.5, 0.5, 0.15, 0.06, iris=(40, 160, 200))
    return done(sp)

def ceratium(S, face=True):
    """Ceratium: dinoflagelado con tres cuernos largos y placas tecales, como un ancla."""
    sp = Sprite(S)
    for a, b in (((0.5, 0.4), (0.5, 0.04)), ((0.4, 0.66), (0.2, 0.94)), ((0.6, 0.66), (0.86, 0.86))):
        sp.part(capsule(S, a, b, 0.04), "Alga", highlight=False)
    body = regular(S, 0.5, 0.56, 0.2, 6, 0) | ellipse(S, 0.5, 0.56, 0.18, 0.19)
    sp.part(body, "Alga")
    sp.put(stroke(S, [(0.3, 0.56), (0.7, 0.56)], 1.6 / S) & body, R("Alga", 0))     # cíngulo
    stripes(sp, body, [[(0.5, 0.38), (0.5, 0.56)], [(0.38, 0.44), (0.44, 0.56)], [(0.62, 0.44), (0.56, 0.56)]], 1.0 / S, R("Alga", 1))
    if face: put_face(sp, 0.5, 0.62, 0.13, 0.05, iris=(60, 150, 120), mouth="smile")
    return done(sp)

def zymomonas(S, face=True):
    """Zymomonas: bastón regordete con burbujas de fermentación y hojas de agave."""
    sp = Sprite(S)
    for ang in (-0.9, -0.3, 0.3, 0.9):
        sp.part(leaf(S, (0.5, 0.86), (0.5 + math.sin(ang) * 0.4, 0.86 - math.cos(ang) * 0.32), 0.05), "Fotótrofo")
    body = capsule(S, (0.5, 0.74), (0.5, 0.46), 0.18)
    sp.part(body, "Anaerobio")
    for x, y, r in ((0.3, 0.26, 0.04), (0.42, 0.16, 0.03), (0.66, 0.22, 0.045)):
        sp.part(ellipse(S, x, y, r, r), "cristal", highlight=False)
    if face: put_face(sp, 0.5, 0.56, 0.15, 0.06, iris=(200, 120, 40), mouth="open", blush=True)
    return done(sp)

def albicans(S, face=True):
    """Candida albicans: levadura blanca que forma una cadena de hifas como una bufanda."""
    sp = Sprite(S)
    for k in range(4):
        sp.part(capsule(S, (0.6 + k * 0.08, 0.76 - k * 0.02), (0.66 + k * 0.08, 0.74 - k * 0.04), 0.04), "Levadura", highlight=False)
    body = ellipse(S, 0.44, 0.58, 0.24, 0.26)
    sp.part(body, "cristal")
    sp.part(ellipse(S, 0.66, 0.34, 0.09, 0.08), "cristal")
    sp.part(stroke(S, [(0.22, 0.7), (0.44, 0.76), (0.66, 0.7)], 0.035), "Biofilm", highlight=False)
    feet(sp, (0.36, 0.54), 0.87, 0.06, 0.04, "Levadura")
    if face: put_face(sp, 0.44, 0.56, 0.16, 0.065, iris=(200, 120, 180), blush=True)
    return done(sp)

def desulfovib(S, face=True):
    """Desulfovibrio: vibrio curvado con flagelo y nube amarilla de H2S."""
    sp = Sprite(S)
    for x, y, r in ((0.2, 0.3, 0.09), (0.32, 0.2, 0.07), (0.14, 0.18, 0.05)):
        sp.part(ellipse(S, x, y, r, r * 0.8), "Espiroqueta", highlight=False)
    sp.lines(stroke(S, wave((0.8, 0.5), (0.97, 0.34), 0.02, 2.5), 1.5 / S), R("Gram-", 1))
    path = bezier([(0.2, 0.62), (0.4, 0.86), (0.72, 0.74), (0.8, 0.5)], 40)
    body = stroke(S, path, 0.18)
    sp.part(body, "Anaerobio")
    sp.put(stroke(S, bezier([(0.26, 0.6), (0.44, 0.78), (0.7, 0.68)], 30), 1.4 / S) & body, R("Gram-", 2))
    if face: put_face(sp, 0.66, 0.62, 0.14, 0.055, mood="fierce", iris=(200, 180, 40), mouth="grin")
    return done(sp)

DESIGNS3 = {
    "rhizobi": rhizobi, "serratia": serratia, "thuringien": thuringien, "bifidum": bifidum, "euglena": euglena,
    "roqueforti": roqueforti, "niger": niger, "bacteroid": bacteroid, "fragilis": fragilis, "thermus": thermus,
    "noctiluca": noctiluca, "ceratium": ceratium, "zymomonas": zymomonas, "albicans": albicans, "desulfovib": desulfovib,
}
