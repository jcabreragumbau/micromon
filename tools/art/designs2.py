"""Diseños a mano del primer tramo: Ruta 1, Bosque Viral, Gimnasio 1 y sus evoluciones."""
import math
import numpy as np
from pix import Sprite, ellipse, capsule, polygon, regular, bezier, stroke, wave, shift, dilate, RAMPS
from designs1 import leaf, flame, feet, arms, put_face, stripes, _cilia, R

def done(sp):
    sp.outline_all()
    return sp

def spikes(S, cx, cy, r, n, length, w=0.035, rot=0.0, arc=(0, 2 * math.pi)):
    m = np.zeros((S, S), bool)
    for k in range(n):
        a = arc[0] + (arc[1] - arc[0]) * (k + 0.5) / n + rot
        b1 = (cx + math.cos(a - w / r) * r, cy + math.sin(a - w / r) * r)
        b2 = (cx + math.cos(a + w / r) * r, cy + math.sin(a + w / r) * r)
        m |= polygon(S, [b1, (cx + math.cos(a) * (r + length), cy + math.sin(a) * (r + length)), b2])
    return m

def spots(sp, mask, pts, r, color):
    for x, y in pts: sp.put(ellipse(sp.S, x, y, r, r * 0.85) & mask, color)

# ================================================================ Ruta 1
def mucorin(S, face=True):
    """Moho de pan: bola algodonosa con esporangios negros en tallos."""
    sp = Sprite(S)
    for x, top in ((0.32, 0.2), (0.5, 0.12), (0.68, 0.22)):
        sp.part(stroke(S, [(x, 0.5), (x + (x - 0.5) * 0.3, top + 0.06)], 0.022), "Hongo", highlight=False)
        sp.part(ellipse(S, x + (x - 0.5) * 0.3, top, 0.065, 0.06), "esporangio")
    body = ellipse(S, 0.5, 0.64, 0.25, 0.2)
    for k in range(9):
        a = math.pi * (0.9 + 1.2 * k / 8)
        body |= ellipse(S, 0.5 + math.cos(a) * 0.2, 0.62 + math.sin(a) * 0.15, 0.08, 0.07)
    sp.part(body, "Hongo")
    feet(sp, (0.38, 0.62), 0.84, 0.06, 0.04, "Hongo")
    if face: put_face(sp, 0.5, 0.62, 0.17, 0.065, iris=(120, 90, 60), blush=True)
    return done(sp)

def sacchari(S, face=True):
    """Levadura: célula ovalada con yema (bebé) y cicatrices de gemación."""
    sp = Sprite(S)
    sp.part(ellipse(S, 0.74, 0.4, 0.11, 0.1), "Levadura")
    body = ellipse(S, 0.46, 0.6, 0.24, 0.26, 0.2)
    sp.part(body, "Levadura")
    spots(sp, body, [(0.3, 0.48), (0.62, 0.78)], 0.025, R("Levadura", 1))
    feet(sp, (0.36, 0.56), 0.86, 0.06, 0.04, "Levadura")
    if face:
        put_face(sp, 0.46, 0.58, 0.17, 0.065, iris=(190, 140, 50), mouth="open", blush=True)
        sp.eyes(0.74, 0.4, 0.06, 0.03)
    return done(sp)

def casei(S, face=True):
    """Lactobacilo: bastón cremoso con gorro de queso."""
    sp = Sprite(S)
    body = capsule(S, (0.5, 0.78), (0.5, 0.44), 0.16)
    sp.part(body, "Simbionte")
    cheese = polygon(S, [(0.3, 0.38), (0.72, 0.26), (0.7, 0.4), (0.32, 0.46)])
    sp.part(cheese, "brillo")
    spots(sp, cheese, [(0.45, 0.37), (0.6, 0.33)], 0.022, R("brillo", 0))
    arms(sp, [((0.35, 0.6), (0.24, 0.68)), ((0.65, 0.6), (0.76, 0.68))], 0.035, "Simbionte")
    feet(sp, (0.42, 0.58), 0.93, 0.06, 0.04, "Simbionte")
    if face: put_face(sp, 0.5, 0.55, 0.15, 0.06, iris=(220, 160, 60), blush=True)
    return done(sp)

def navicula(S, face=True):
    """Diatomea en forma de barca con frústula de vidrio estriada."""
    sp = Sprite(S)
    body = ellipse(S, 0.5, 0.6, 0.36, 0.17)
    sp.part(body, "Alga")
    stripes(sp, body, [[(0.2 + k * 0.05, 0.47), (0.2 + k * 0.05 + 0.01, 0.73)] for k in range(13) if abs(k - 6) > 1], 1.0 / S, R("Alga", 1))
    sp.put(stroke(S, [(0.16, 0.6), (0.84, 0.6)], 1.2 / S) & body, R("cristal", 3))
    sp.put(ellipse(S, 0.5, 0.6, 0.06, 0.07) & body, R("cristal", 2))
    if face: put_face(sp, 0.5, 0.56, 0.15, 0.055, iris=(60, 150, 120))
    return done(sp)

def epidermi(S, face=True):
    """Estafilococo de la piel: racimo de cocos rosados, uno como cabeza."""
    sp = Sprite(S)
    for x, y in ((0.28, 0.72), (0.72, 0.72), (0.4, 0.82), (0.6, 0.82), (0.24, 0.52), (0.76, 0.52)):
        sp.part(ellipse(S, x, y, 0.11, 0.1), "Gram+")
    head = ellipse(S, 0.5, 0.52, 0.2, 0.19)
    sp.part(head, "Gram+")
    if face: put_face(sp, 0.5, 0.5, 0.15, 0.065, iris=(200, 70, 120), blush=True)
    return done(sp)

def coli_k12(S, face=True):
    """E. coli de laboratorio: bastón con flagelos y fimbrias, cara despistada."""
    sp = Sprite(S)
    for k in range(3):
        sp.lines(stroke(S, wave((0.2, 0.6 + k * 0.06), (0.04, 0.5 + k * 0.14), 0.025, 2.5), 1.3 / S), R("Gram-", 1))
    body = capsule(S, (0.34, 0.62), (0.66, 0.58), 0.17)
    sp.part(spikes(S, 0.5, 0.6, 0.17, 14, 0.04, 0.008, 0, (math.pi, 2 * math.pi)), "Gram-", highlight=False)
    sp.part(body, "Gram-")
    feet(sp, (0.4, 0.6), 0.8, 0.06, 0.04, "Gram-")
    if face:
        put_face(sp, 0.52, 0.57, 0.16, 0.06, iris=(80, 110, 200), mouth="open")
    return done(sp)

def proteus_am(S, face=True):
    """Ameba: masa gelatinosa con pseudópodos y vacuolas."""
    sp = Sprite(S)
    body = ellipse(S, 0.5, 0.6, 0.24, 0.2)
    for (a, l) in ((3.3, 0.36), (4.2, 0.3), (5.5, 0.33), (0.4, 0.3), (2.5, 0.28)):
        body |= capsule(S, (0.5, 0.6), (0.5 + math.cos(a) * l, 0.6 + math.sin(a) * l * 0.8), 0.07)
    sp.part(body, "Protozoo")
    spots(sp, body, [(0.38, 0.7), (0.64, 0.7)], 0.035, R("Protozoo", 3))
    sp.put(ellipse(S, 0.6, 0.48, 0.05, 0.04) & body, R("Protozoo", 0))
    if face: put_face(sp, 0.48, 0.56, 0.15, 0.06, iris=(40, 90, 190), mouth="open")
    return done(sp)

# ================================================================ Bosque Viral
def _capsid(sp, cx, cy, r, ramp="Virus"):
    S = sp.S
    head = regular(S, cx, cy, r, 6, math.pi / 6)
    sp.part(head, ramp, highlight=False)
    v = RAMPS[ramp]
    sp.put(polygon(S, [(cx, cy), (cx - r * 0.87, cy - r / 2), (cx, cy - r)]) & head & ~dilate(~head), v[3])
    sp.put(polygon(S, [(cx, cy), (cx + r * 0.87, cy + r / 2), (cx, cy + r), (cx - r * 0.87, cy + r / 2)]) & head & ~dilate(~head), v[1])
    for a in range(6):
        ang = math.pi / 6 + a * math.pi / 3
        sp.put(stroke(S, [(cx, cy), (cx + math.cos(ang) * r, cy + math.sin(ang) * r)], 0.9 / S) & head, v[0])
    return head

def phage_x174(S, face=True):
    """Fago ΦX174: icosaedro con espículas en los vértices."""
    sp = Sprite(S)
    for a in range(6):
        ang = math.pi / 6 + a * math.pi / 3
        x, y = 0.5 + math.cos(ang) * 0.3, 0.56 + math.sin(ang) * 0.3
        sp.part(stroke(S, [(0.5 + math.cos(ang) * 0.26, 0.56 + math.sin(ang) * 0.26), (x, y)], 0.025), "Virus", highlight=False)
        sp.part(ellipse(S, x, y, 0.045, 0.045), "Virus")
    _capsid(sp, 0.5, 0.56, 0.27)
    if face: put_face(sp, 0.5, 0.58, 0.16, 0.06, mood="fierce", iris=(220, 60, 60), mouth="grin")
    return done(sp)

def lambda_v(S, face=True):
    """Fago lambda: cápside, cola larga flexible y fibra en la punta."""
    sp = Sprite(S)
    tail = bezier([(0.5, 0.48), (0.56, 0.7), (0.42, 0.86), (0.54, 0.95)], 30)
    sp.part(stroke(S, tail, 0.05), "Biofilm", highlight=False)
    for k in range(4, len(tail) - 2, 4):
        sp.put(ellipse(S, *tail[k], 0.035, 0.012), R("Biofilm", 0))
    sp.part(ellipse(S, 0.54, 0.95, 0.06, 0.03), "Biofilm", highlight=False)
    for side in (-1, 1):
        sp.part(leaf(S, (0.5 + side * 0.2, 0.3), (0.5 + side * 0.42, 0.14), 0.05), "Biofilm")
    _capsid(sp, 0.5, 0.3, 0.24)
    if face: put_face(sp, 0.5, 0.32, 0.15, 0.06, mood="fierce", iris=(220, 60, 60), mouth="fangs")
    return done(sp)

def _streptomyces(S, stage, face):
    sp = Sprite(S)
    # micelio: ramas con cadenas de esporas
    n = 2 + stage
    for k in range(n):
        a = math.pi * (1.15 + 0.7 * k / max(1, n - 1))
        x2, y2 = 0.5 + math.cos(a) * (0.3 + 0.05 * stage), 0.5 + math.sin(a) * 0.32
        sp.part(stroke(S, bezier([(0.5, 0.5), (0.5 + math.cos(a) * 0.15, 0.4), (x2, y2)], 20), 0.025), "Hongo", highlight=False)
        for j in range(3):
            sp.part(ellipse(S, x2 + math.cos(a) * j * 0.04, y2 + math.sin(a) * j * 0.04, 0.03, 0.03), "Antibiótico", highlight=False)
    body = ellipse(S, 0.5, 0.64, 0.2 + 0.02 * stage, 0.19 + 0.02 * stage)
    sp.part(body, "Hongo")
    sp.put(ellipse(S, 0.5, 0.72, 0.1, 0.08) & body, R("Antibiótico", 3))
    if stage >= 2:
        arms(sp, [((0.32, 0.66), (0.18, 0.74)), ((0.68, 0.66), (0.82, 0.74))], 0.04, "Hongo")
        for x in (0.18, 0.82): sp.part(regular(S, x, 0.76, 0.045, 4), "Antibiótico")
    feet(sp, (0.4, 0.6), 0.86 + 0.02 * stage, 0.065, 0.04, "Hongo")
    if face:
        put_face(sp, 0.5, 0.6, 0.16, 0.06 + 0.003 * stage, mood="fierce" if stage == 3 else "happy",
                 iris=(150, 60, 170), mouth="fangs" if stage == 3 else "smile", blush=stage == 1)
    return done(sp)

griseus = lambda S, face=True: _streptomyces(S, 1, face)
coelicol = lambda S, face=True: _streptomyces(S, 2, face)
avermitil = lambda S, face=True: _streptomyces(S, 3, face)

def _spiro(S, stage, face):
    sp = Sprite(S)
    turns = 5 + stage * 2
    path = [(0.1 + 0.64 * t, 0.66 + 0.07 * math.sin(t * turns * math.pi) - 0.12 * math.sin(t * math.pi) * (stage - 1)) for t in np.linspace(0, 1, 80)]
    sp.part(stroke(S, path, 0.07 + 0.015 * stage), "Espiroqueta")
    # gancho en los extremos
    sp.part(stroke(S, [path[0], (0.06, 0.52), (0.1, 0.46)], 0.04), "Espiroqueta", highlight=False)
    hx, hy = path[-1]
    if stage == 2:
        sp.part(ellipse(S, 0.24, 0.66, 0.1, 0.08), "Protozoo")    # vacuola parásita
    head = ellipse(S, hx, hy - 0.06, 0.14 + 0.02 * stage, 0.12 + 0.02 * stage)
    sp.part(head, "Espiroqueta")
    if face: put_face(sp, hx - 0.01, hy - 0.07, 0.13, 0.055, mood="fierce" if stage == 2 else "happy",
                      iris=(240, 120, 40), mouth="fangs" if stage == 2 else "smile")
    return done(sp)

leptospir = lambda S, face=True: _spiro(S, 1, face)
interrogan = lambda S, face=True: _spiro(S, 2, face)

def micrococ(S, face=True):
    """Micrococo: tétrada de cocos amarillos, el mayor hace de cara."""
    sp = Sprite(S)
    for x, y in ((0.3, 0.78), (0.7, 0.78), (0.7, 0.44)):
        sp.part(ellipse(S, x, y, 0.13, 0.12), "brillo")
    head = ellipse(S, 0.42, 0.52, 0.21, 0.2)
    sp.part(head, "Gram+")
    if face: put_face(sp, 0.42, 0.5, 0.15, 0.065, iris=(220, 170, 40), blush=True)
    return done(sp)

def sarcina(S, face=True):
    """Sarcina: cubo de 8 cocos apilados con cara en la cara frontal."""
    sp = Sprite(S)
    for x, y in ((0.36, 0.3), (0.64, 0.3)):
        sp.part(ellipse(S, x, y, 0.15, 0.13), "Biofilm")
    for x, y in ((0.3, 0.72), (0.7, 0.72)):
        sp.part(ellipse(S, x, y, 0.17, 0.16), "Gram+")
    for x, y in ((0.3, 0.48), (0.7, 0.48)):
        sp.part(ellipse(S, x, y, 0.17, 0.16), "Gram+")
    arms(sp, [((0.14, 0.6), (0.06, 0.72)), ((0.86, 0.6), (0.94, 0.72))], 0.045, "Biofilm")
    feet(sp, (0.32, 0.68), 0.92, 0.08, 0.04, "Biofilm")
    if face: put_face(sp, 0.5, 0.58, 0.2, 0.065, mood="fierce", iris=(220, 70, 120), mouth="fangs", mw=0.06)
    return done(sp)

def _bacillus(S, stage, face, ramp="Esporulado", fierce=False):
    sp = Sprite(S)
    h = 0.26 + 0.05 * stage
    if stage >= 2:
        for side in (-1, 1):
            for k in range(3):
                sp.lines(stroke(S, wave((0.5 + side * 0.14, 0.6 + k * 0.08), (0.5 + side * 0.4, 0.5 + k * 0.14), 0.02, 2), 1.3 / S), R(ramp, 1))
    body = capsule(S, (0.5, 0.92 - 0.14), (0.5, 0.92 - 0.14 - h), 0.15 + 0.02 * stage)
    sp.part(body, ramp)
    # espora central visible
    sp.put(ellipse(S, 0.5, 0.92 - 0.14 - h * 0.35, 0.06, 0.08) & body, R("brillo", 3))
    if stage >= 2:
        sp.part(spikes(S, 0.5, 0.92 - 0.14 - h, 0.15 + 0.02 * stage, 5, 0.07, 0.03, 0, (math.pi * 1.1, math.pi * 1.9)), ramp, highlight=False)
    arms(sp, [((0.36, 0.62), (0.22, 0.7)), ((0.64, 0.62), (0.78, 0.7))], 0.035, ramp)
    feet(sp, (0.42, 0.58), 0.92, 0.065, 0.04, ramp)
    if face: put_face(sp, 0.5, 0.92 - 0.14 - h + 0.06, 0.15, 0.06, mood="fierce" if fierce else "happy",
                      iris=(110, 160, 80), mouth="fangs" if fierce else "smile", blush=stage == 1 and not fierce)
    return done(sp)

subtilis = lambda S, face=True: _bacillus(S, 1, face)
lichenifor = lambda S, face=True: _bacillus(S, 2, face)

def cereus(S, face=True):
    """Bacillus cereus: cadena de bastones (como un ciempiés) con cabeza de arroz."""
    sp = Sprite(S)
    for k, (x, y) in enumerate(((0.16, 0.8), (0.32, 0.76), (0.48, 0.72))):
        sp.part(capsule(S, (x - 0.06, y), (x + 0.06, y - 0.02), 0.08), "Esporulado")
        feet(sp, (x,), y + 0.1, 0.035, 0.03, "Esporulado")
    sp.part(spikes(S, 0.66, 0.5, 0.17, 5, 0.07, 0.03, 0, (math.pi * 1.1, math.pi * 1.9)), "brillo", highlight=False)
    head = capsule(S, (0.6, 0.58), (0.72, 0.46), 0.17)
    sp.part(head, "Esporulado")
    if face: put_face(sp, 0.67, 0.52, 0.15, 0.06, mood="fierce", iris=(230, 170, 50), mouth="fangs")
    return done(sp)

def listeria(S, face=True):
    """Listeria: bastón con cometa de actina, se mueve dentro de las células (bufanda roja)."""
    sp = Sprite(S)
    for k in range(5):
        sp.part(ellipse(S, 0.1 + k * 0.06, 0.82 - k * 0.04, 0.03 + k * 0.008, 0.025 + k * 0.006), "Intracelular", highlight=False)
    body = capsule(S, (0.44, 0.7), (0.64, 0.42), 0.16)
    sp.part(body, "Gram+")
    scarf = stroke(S, [(0.38, 0.6), (0.6, 0.66), (0.72, 0.56)], 0.04) & dilate(body)
    sp.part(scarf | stroke(S, [(0.42, 0.62), (0.28, 0.7), (0.24, 0.62)], 0.035), "Intracelular", highlight=False)
    arms(sp, [((0.66, 0.58), (0.82, 0.6))], 0.035, "Gram+")
    feet(sp, (0.42, 0.6), 0.86, 0.06, 0.04, "Gram+")
    if face: put_face(sp, 0.6, 0.47, 0.14, 0.06, mood="fierce", iris=(160, 60, 160), mouth="grin")
    return done(sp)

def rhizopupa(S, face=True):
    """Rhizopus joven: capullo con rizoides como raíces y un esporangio-gorro."""
    sp = Sprite(S)
    for k in range(5):
        x = 0.3 + k * 0.1
        sp.lines(stroke(S, bezier([(x, 0.8), (x + (x - 0.5) * 0.4, 0.88), (x + (x - 0.5) * 0.7, 0.96)], 10), 1.4 / S), R("Hongo", 1))
    body = ellipse(S, 0.5, 0.62, 0.2, 0.22)
    sp.part(body, "Hongo")
    stripes(sp, body, [[(0.3, 0.52 + k * 0.08), (0.7, 0.5 + k * 0.08)] for k in range(4)], 1.0 / S, R("Hongo", 1))
    sp.part(ellipse(S, 0.5, 0.36, 0.17, 0.11) & ~ellipse(S, 0.5, 0.46, 0.18, 0.06), "esporangio")
    spots(sp, ellipse(S, 0.5, 0.36, 0.17, 0.11), [(0.42, 0.33), (0.58, 0.32)], 0.02, R("esporangio", 3))
    if face: put_face(sp, 0.5, 0.56, 0.14, 0.055, iris=(120, 90, 60), mood="happy")
    return done(sp)

def _myco(S, stage, face):
    """Micoplasma: sin pared, forma de gota/pera blanda con cola de anclaje."""
    sp = Sprite(S)
    s = 1 + 0.15 * (stage - 1)
    body = ellipse(S, 0.5, 0.6, 0.2 * s, 0.22 * s) | capsule(S, (0.5, 0.42), (0.62, 0.26), 0.06 * s)
    if stage == 2:
        body |= capsule(S, (0.5, 0.6), (0.22, 0.42), 0.06) | capsule(S, (0.5, 0.6), (0.8, 0.44), 0.06)
    sp.part(body, "Intracelular")
    sp.part(ellipse(S, 0.63, 0.24, 0.05, 0.04), "Biofilm" if stage == 2 else "Intracelular", highlight=False)
    spots(sp, body, [(0.4, 0.72), (0.58, 0.76)], 0.02, R("Intracelular", 1))
    if face: put_face(sp, 0.5, 0.6, 0.15, 0.06, mood="fierce" if stage == 2 else "happy",
                      iris=(170, 60, 150), mouth="grin" if stage == 2 else "smile", blush=stage == 1)
    return done(sp)

mycoplas = lambda S, face=True: _myco(S, 1, face)
genitalium = lambda S, face=True: _myco(S, 2, face)

# ================================================================ evoluciones restantes
def pastorian(S, face=True):
    """Levadura de cerveza: barril espumoso con burbujas."""
    sp = Sprite(S)
    for x, y, r in ((0.3, 0.2, 0.05), (0.42, 0.12, 0.035), (0.66, 0.16, 0.045)):
        sp.part(ellipse(S, x, y, r, r), "cristal", highlight=False)
    foam = ellipse(S, 0.5, 0.32, 0.27, 0.1)
    for x in (0.3, 0.45, 0.6, 0.72): foam |= ellipse(S, x, 0.3, 0.08, 0.07)
    body = ellipse(S, 0.5, 0.62, 0.25, 0.27, 0)
    sp.part(body, "Levadura")
    stripes(sp, body, [[(0.27, 0.48), (0.73, 0.48)], [(0.26, 0.76), (0.74, 0.76)]], 2.0 / S, R("Anaerobio", 1))
    sp.part(foam, "cristal")
    arms(sp, [((0.27, 0.6), (0.14, 0.68)), ((0.73, 0.6), (0.86, 0.68))], 0.04, "Levadura")
    feet(sp, (0.4, 0.6), 0.9, 0.07, 0.04, "Levadura")
    if face: put_face(sp, 0.5, 0.6, 0.17, 0.065, iris=(190, 120, 40), mouth="open")
    return done(sp)

def acidophilus(S, face=True):
    """Lactobacilo evolucionado: guerrero de yogur con escudo y casco de bastón."""
    sp = Sprite(S)
    body = capsule(S, (0.5, 0.82), (0.5, 0.42), 0.18)
    sp.part(body, "Simbionte")
    sp.put(ellipse(S, 0.5, 0.68, 0.09, 0.11) & body, R("cristal", 3))
    sp.part(capsule(S, (0.36, 0.24), (0.64, 0.24), 0.05), "brillo")       # casco-bastón
    shield = regular(S, 0.22, 0.66, 0.11, 6, math.pi / 6)
    sp.part(shield, "cristal")
    sp.put(regular(S, 0.22, 0.66, 0.05, 6, math.pi / 6) & shield, R("Simbionte", 2))
    arms(sp, [((0.66, 0.58), (0.82, 0.5))], 0.04, "Simbionte")
    feet(sp, (0.42, 0.58), 0.95, 0.07, 0.04, "Simbionte")
    if face: put_face(sp, 0.5, 0.47, 0.15, 0.06, mood="fierce", iris=(220, 160, 60), mouth="smile")
    return done(sp)

def aureus(S, face=True):
    """S. aureus: racimo dorado con corona y capa de biofilm."""
    sp = Sprite(S)
    cape = polygon(S, [(0.22, 0.44), (0.78, 0.44), (0.9, 0.94), (0.1, 0.94)])
    sp.part(cape, "Biofilm")
    for x, y in ((0.32, 0.8), (0.5, 0.84), (0.68, 0.8), (0.4, 0.66), (0.6, 0.66)):
        sp.part(ellipse(S, x, y, 0.12, 0.11), "brillo")
    head = ellipse(S, 0.5, 0.4, 0.2, 0.18)
    sp.part(head, "brillo")
    crown = polygon(S, [(0.36, 0.24), (0.36, 0.12), (0.43, 0.19), (0.5, 0.08), (0.57, 0.19), (0.64, 0.12), (0.64, 0.24)])
    sp.part(crown, "carotenoide", highlight=False)
    if face: put_face(sp, 0.5, 0.4, 0.15, 0.06, mood="fierce", iris=(200, 40, 40), mouth="grin")
    return done(sp)

def pinnularia(S, face=True):
    """Diatomea grande: barca acorazada con placas de sílice y remos."""
    sp = Sprite(S)
    for side in (-1, 1):
        for k in range(3):
            sp.part(capsule(S, (0.5 + side * (0.1 + k * 0.12), 0.7), (0.5 + side * (0.16 + k * 0.12), 0.88), 0.025), "Biofilm", highlight=False)
    body = ellipse(S, 0.5, 0.58, 0.42, 0.18)
    sp.part(body, "Alga")
    for k in range(-3, 4):
        if k: sp.put(ellipse(S, 0.5 + k * 0.1, 0.54, 0.035, 0.1) & body, R("cristal", 2))
    sp.part(regular(S, 0.5, 0.36, 0.1, 3, -math.pi / 2), "cristal", highlight=False)
    if face: put_face(sp, 0.5, 0.56, 0.14, 0.055, mood="fierce", iris=(60, 150, 120), mouth="grin")
    return done(sp)

def coli_bl21(S, face=True):
    """E. coli de expresión: bastón robusto con mochila-plásmido y pinzas de fimbrias."""
    sp = Sprite(S)
    for k in range(4):
        sp.lines(stroke(S, wave((0.24, 0.66 + k * 0.05), (0.04, 0.6 + k * 0.1), 0.025, 2.5), 1.4 / S), R("Gram-", 1))
    pl = ellipse(S, 0.26, 0.46, 0.12, 0.12) & ~ellipse(S, 0.26, 0.46, 0.06, 0.06)
    sp.part(pl, "Simbionte")
    body = capsule(S, (0.4, 0.68), (0.62, 0.44), 0.19)
    sp.part(body, "Gram-")
    arms(sp, [((0.7, 0.6), (0.88, 0.62)), ((0.36, 0.7), (0.26, 0.8))], 0.045, "Gram-")
    sp.part(ellipse(S, 0.9, 0.6, 0.05, 0.05), "Simbionte", highlight=False)
    feet(sp, (0.42, 0.62), 0.9, 0.07, 0.04, "Gram-")
    if face: put_face(sp, 0.58, 0.48, 0.15, 0.06, mood="fierce", iris=(80, 110, 200), mouth="smile")
    return done(sp)

def entamoeba(S, face=True):
    """Ameba grande: masa con boca enorme y pseudópodos-brazos."""
    sp = Sprite(S)
    body = ellipse(S, 0.5, 0.56, 0.3, 0.26)
    for a, l in ((3.4, 0.42), (5.9, 0.42), (2.3, 0.36), (0.8, 0.36), (4.7, 0.34)):
        body |= capsule(S, (0.5, 0.56), (0.5 + math.cos(a) * l, 0.56 + math.sin(a) * l * 0.85), 0.085)
    sp.part(body, "Protozoo")
    spots(sp, body, [(0.34, 0.68), (0.66, 0.42), (0.68, 0.7)], 0.04, R("Protozoo", 3))
    sp.put(ellipse(S, 0.5, 0.42, 0.06, 0.05) & body, R("Protozoo", 0))
    if face: put_face(sp, 0.48, 0.52, 0.17, 0.065, mood="fierce", iris=(200, 60, 60), mouth="fangs", mw=0.07)
    return done(sp)

DESIGNS2 = {
    "mucorin": mucorin, "sacchari": sacchari, "casei": casei, "navicula": navicula, "epidermi": epidermi,
    "coli-k12": coli_k12, "proteus-am": proteus_am, "phage-x174": phage_x174, "lambda-v": lambda_v,
    "griseus": griseus, "coelicol": coelicol, "avermitil": avermitil, "leptospir": leptospir,
    "interrogan": interrogan, "micrococ": micrococ, "sarcina": sarcina, "subtilis": subtilis,
    "lichenifor": lichenifor, "cereus": cereus, "listeria": listeria, "rhizopupa": rhizopupa,
    "mycoplas": mycoplas, "genitalium": genitalium, "pastorian": pastorian, "acidophilus": acidophilus,
    "aureus": aureus, "pinnularia": pinnularia, "coli-bl21": coli_bl21, "entamoeba": entamoeba,
}
