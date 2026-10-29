"""Diseños a mano del tramo final: islas, Mansión, fósiles, virus finales, legendarios y evoluciones de Pleomorph."""
import math
import numpy as np
from pix import Sprite, ellipse, capsule, polygon, regular, bezier, stroke, wave, shift, dilate, RAMPS
from designs1 import leaf, flame, feet, arms, put_face, stripes, R
from designs2 import done, spikes, spots, _capsid

def coco(S, x, y, r): return ellipse(S, x, y, r, r * 0.95)

# ================================================================ Virus finales
def marburg_v(S, face=True):
    """Marburgvirus: filamento largo enrollado como un cayado (forma de «6»)."""
    sp = Sprite(S)
    pts = [(0.3, 0.92), (0.3, 0.5)] + [(0.5 + math.cos(a) * 0.2, 0.36 + math.sin(a) * 0.2) for a in np.linspace(math.pi, math.pi * 2.9, 30)]
    body = stroke(S, pts, 0.12)
    sp.part(spikes(S, 0.5, 0.36, 0.26, 14, 0.04, 0.02), "Gram-", highlight=False)
    sp.part(body | coco(S, 0.5, 0.36, 0.2), "Virus")
    stripes(sp, body, [[(0.24, 0.6 + k * 0.08), (0.36, 0.6 + k * 0.08)] for k in range(4)], 1.0 / S, R("Virus", 1))
    if face: put_face(sp, 0.5, 0.34, 0.12, 0.055, mood="fierce", iris=(240, 60, 60), mouth="fangs")
    return done(sp)

def filovir_z(S, face=True):
    """Filovirus Z (ébola): dragón-filamento serpenteante con espículas glicoproteicas y capa oscura."""
    sp = Sprite(S)
    path = bezier([(0.1, 0.92), (0.6, 1.0), (0.9, 0.7), (0.3, 0.55), (0.5, 0.3), (0.72, 0.26)], 90)
    body = stroke(S, path, 0.13)
    sp.part(stroke(S, path, 0.19) & ~body, "Gram-", highlight=False)
    sp.part(body, "Virus")
    for k in range(5, 85, 10):
        x, y = path[k]
        sp.part(coco(S, x, y - 0.08, 0.025), "Gram-", highlight=False)
    head = ellipse(S, 0.72, 0.26, 0.15, 0.13)
    sp.part(head, "Virus")
    for side in (-1, 1):
        sp.part(polygon(S, [(0.72 + side * 0.06, 0.16), (0.72 + side * 0.16, 0.02), (0.72 + side * 0.12, 0.18)]), "Gram-", highlight=False)
    if face: put_face(sp, 0.72, 0.26, 0.12, 0.05, mood="fierce", iris=(250, 40, 40), mouth="fangs")
    return done(sp)

def retrovir_x(S, face=True):
    """Retrovirus X: esfera envuelta con cápside cónica y una hebra de ADN que se integra (como una lanza)."""
    sp = Sprite(S)
    for k in range(9):
        t = k / 8
        y = 0.1 + t * 0.8
        sp.part(coco(S, 0.12 + 0.04 * math.sin(t * 6), y, 0.02), "Intracelular", highlight=False)
    sp.part(spikes(S, 0.56, 0.52, 0.3, 16, 0.08, 0.03), "Intracelular", highlight=False)
    body = coco(S, 0.56, 0.52, 0.31)
    sp.part(body, "Virus")
    sp.put(polygon(S, [(0.42, 0.72), (0.7, 0.72), (0.6, 0.36), (0.52, 0.36)]) & body, R("Intracelular", 1))
    if face: put_face(sp, 0.56, 0.5, 0.18, 0.065, mood="fierce", iris=(220, 60, 160), mouth="grin")
    return done(sp)

def mimivir(S, face=True):
    """Mimivirus: cápside gigante peluda (fibras) con una «estrella» en un vértice, tan grande como una bacteria."""
    sp = Sprite(S)
    head = regular(S, 0.5, 0.54, 0.32, 6, math.pi / 6)
    edge = dilate(head) & ~head
    ys, xs = np.where(edge)
    fib = np.zeros_like(head)
    for i in range(0, len(ys), 2):
        x, y = (xs[i] + 0.5) / S, (ys[i] + 0.5) / S
        vx, vy = x - 0.5, y - 0.54; L = math.hypot(vx, vy) or 1
        fib |= stroke(S, [(x, y), (x + vx / L * 0.06, y + vy / L * 0.06)], 1.0 / S)
    sp.lines(fib, R("Protozoo", 2))
    _capsid(sp, 0.5, 0.54, 0.32)
    sp.part(regular(S, 0.5, 0.24, 0.06, 5, -math.pi / 2), "brillo", highlight=False)
    if face: put_face(sp, 0.5, 0.56, 0.16, 0.065, iris=(60, 110, 200), mouth="smile")
    return done(sp)

def pandoravir(S, face=True):
    """Pandoravirus: ánfora gigante con un poro apical abierto del que salen genes desconocidos (caja de Pandora)."""
    sp = Sprite(S)
    for k, (x, y) in enumerate(((0.36, 0.1), (0.5, 0.04), (0.64, 0.1))):
        sp.part(stroke(S, wave((0.5, 0.2), (x, y), 0.015, 1.5), 0.02), "Protozoo", highlight=False)
        sp.part(regular(S, x, y, 0.035, 4), "brillo", highlight=False)
    body = polygon(S, bezier([(0.4, 0.2), (0.12, 0.4), (0.16, 0.86), (0.5, 0.96), (0.84, 0.86), (0.88, 0.4), (0.6, 0.2)], 60))
    sp.part(body, "Virus")
    stripes(sp, body, [bezier([(0.18, 0.4 + k * 0.12), (0.5, 0.46 + k * 0.12), (0.82, 0.4 + k * 0.12)], 20) for k in range(4)], 1.2 / S, R("Protozoo", 2))
    sp.part(ellipse(S, 0.5, 0.21, 0.12, 0.04), "Protozoo")
    arms(sp, [((0.16, 0.6), (0.04, 0.5)), ((0.84, 0.6), (0.96, 0.5))], 0.045, "Virus")
    if face: put_face(sp, 0.5, 0.52, 0.18, 0.07, mood="fierce", iris=(250, 200, 60), mouth="fangs", mw=0.07)
    return done(sp)

# ================================================================ Fósiles y arqueas antiguas
def stromatol(S, face=True):
    """Estromatolito: roca en capas de cianobacterias, con brotes verdes arriba."""
    sp = Sprite(S)
    rock = polygon(S, bezier([(0.16, 0.9), (0.12, 0.5), (0.32, 0.3), (0.68, 0.3), (0.88, 0.5), (0.84, 0.9)], 50))
    sp.part(rock, "Esporulado")
    stripes(sp, rock, [bezier([(0.14, 0.4 + k * 0.1), (0.5, 0.34 + k * 0.1), (0.86, 0.4 + k * 0.1)], 20) for k in range(6)], 1.6 / S, R("Fotótrofo", 1))
    for x in (0.36, 0.5, 0.64):
        sp.part(leaf(S, (x, 0.32), (x + 0.04, 0.16), 0.03), "Fotótrofo")
    if face: put_face(sp, 0.5, 0.56, 0.15, 0.06, iris=(80, 150, 80), mouth="smile")
    return done(sp)

def cyanofossil(S, face=True):
    """Cyanofossil: torre de estromatolito viva que libera oxígeno (burbujas) y tiene brazos de roca."""
    sp = Sprite(S)
    for x, y, r in ((0.2, 0.16, 0.04), (0.82, 0.12, 0.05), (0.72, 0.04, 0.03)):
        sp.part(coco(S, x, y, r), "cristal", highlight=False)
    tower = polygon(S, [(0.28, 0.94), (0.32, 0.22), (0.5, 0.12), (0.68, 0.22), (0.72, 0.94)])
    sp.part(tower, "Esporulado")
    stripes(sp, tower, [[(0.28, 0.3 + k * 0.09), (0.72, 0.32 + k * 0.09)] for k in range(8)], 1.6 / S, R("Fotótrofo", 1))
    arms(sp, [((0.3, 0.56), (0.12, 0.46)), ((0.7, 0.56), (0.88, 0.46))], 0.06, "Esporulado")
    for x in (0.4, 0.5, 0.6):
        sp.part(leaf(S, (x, 0.14), (x + 0.03, 0.02), 0.025), "Fotótrofo")
    if face: put_face(sp, 0.5, 0.38, 0.13, 0.055, mood="fierce", iris=(80, 150, 80), mouth="grin")
    return done(sp)

def palaeobacil(S, face=True):
    """Palaeobacil: bacilo prehistórico liberado del ámbar, con restos de resina como armadura y cola de escorpión."""
    sp = Sprite(S)
    sp.part(stroke(S, bezier([(0.3, 0.8), (0.1, 0.7), (0.12, 0.4), (0.24, 0.3)], 30), 0.05), "brillo")
    sp.part(polygon(S, [(0.2, 0.32), (0.3, 0.22), (0.3, 0.34)]), "Gram+", highlight=False)
    body = capsule(S, (0.36, 0.78), (0.68, 0.42), 0.17)
    sp.part(body, "Esporulado")
    for k in range(3):
        sp.put(polygon(S, [(0.4 + k * 0.1, 0.5 + k * 0.06), (0.52 + k * 0.1, 0.44 + k * 0.06), (0.5 + k * 0.1, 0.62 + k * 0.06)]) & body, R("brillo", 2))
    feet(sp, (0.4, 0.6), 0.9, 0.07, 0.04, "Gram+")
    if face: put_face(sp, 0.66, 0.46, 0.13, 0.055, mood="fierce", iris=(200, 120, 40), mouth="fangs")
    return done(sp)

def lokiarca(S, face=True):
    """Lokiarchaeota: arquea con largas protuberancias como brazos (asgardiana), con aire de antepasado sabio."""
    sp = Sprite(S)
    for a in (-2.4, -1.6, -0.8, 0.4, 2.7):
        x2, y2 = 0.5 + math.cos(a) * 0.42, 0.56 + math.sin(a) * 0.4
        sp.part(stroke(S, bezier([(0.5, 0.56), (0.5 + math.cos(a + 0.3) * 0.25, 0.56 + math.sin(a + 0.3) * 0.25), (x2, y2)], 20), 0.04), "Archaea", highlight=False)
        sp.part(coco(S, x2, y2, 0.045), "Simbionte", highlight=False)
    body = coco(S, 0.5, 0.56, 0.22)
    sp.part(body, "Archaea")
    sp.part(ellipse(S, 0.5, 0.7, 0.14, 0.06), "cristal", highlight=False)        # barba
    if face: put_face(sp, 0.5, 0.52, 0.14, 0.055, iris=(150, 120, 220), mouth="smile")
    return done(sp)

# ================================================================ Legendarios
def sputnik_v(S, face=True):
    """Sputnik: virófago pequeño que parasita a los virus gigantes; un satélite con antenas."""
    sp = Sprite(S)
    for a in (-2.4, -0.7, 0.9, 2.5):
        sp.part(stroke(S, [(0.5 + math.cos(a) * 0.2, 0.52 + math.sin(a) * 0.2), (0.5 + math.cos(a) * 0.44, 0.52 + math.sin(a) * 0.44)], 0.02), "Biofilm", highlight=False)
        sp.part(coco(S, 0.5 + math.cos(a) * 0.44, 0.52 + math.sin(a) * 0.44, 0.04), "Anaerobio", highlight=False)
    for side in (-1, 1):
        sp.part(polygon(S, [(0.5 + side * 0.24, 0.42), (0.5 + side * 0.44, 0.38), (0.5 + side * 0.44, 0.66), (0.5 + side * 0.24, 0.62)]), "Ácido-Alc.")
    _capsid(sp, 0.5, 0.52, 0.22)
    if face: put_face(sp, 0.5, 0.54, 0.12, 0.055, mood="fierce", iris=(250, 120, 40), mouth="grin")
    return done(sp)

def ecoli_o157(S, face=True):
    """E. coli O157:H7: bastón imponente con aura de toxina Shiga, corona de fimbrias y un fago marcado en el pecho."""
    sp = Sprite(S)
    aura = ellipse(S, 0.5, 0.56, 0.46, 0.44) & ~ellipse(S, 0.5, 0.56, 0.4, 0.38)
    sp.put(aura, R("Antibiótico", 3))
    for k in range(4):
        sp.lines(stroke(S, wave((0.3, 0.8 + k * 0.03), (0.04, 0.66 + k * 0.08), 0.03, 2.5), 1.6 / S), R("Gram-", 1))
    body = capsule(S, (0.5, 0.86), (0.5, 0.36), 0.22)
    sp.part(body, "Gram-")
    sp.part(spikes(S, 0.5, 0.36, 0.22, 9, 0.08, 0.03, 0, (math.pi * 1.05, math.pi * 1.95)), "Antibiótico", highlight=False)
    emblem = regular(S, 0.5, 0.68, 0.07, 6, math.pi / 6)
    sp.put(emblem & body, R("Virus", 2))
    sp.put(stroke(S, [(0.5, 0.74), (0.5, 0.82)], 1.6 / S) & body, R("Virus", 1))
    arms(sp, [((0.3, 0.6), (0.12, 0.5)), ((0.7, 0.6), (0.88, 0.5))], 0.05, "Gram-")
    feet(sp, (0.4, 0.6), 0.95, 0.08, 0.04, "Gram-")
    if face: put_face(sp, 0.5, 0.46, 0.15, 0.065, mood="fierce", iris=(250, 40, 40), mouth="fangs", mw=0.06)
    return done(sp)

def salmonella(S, face=True):
    """Salmonella Typhimurium: bastón invasor con flagelos peritricos y una jeringa molecular (sistema de secreción tipo III)."""
    sp = Sprite(S)
    for a in np.linspace(0.6, 5.6, 7):
        x0, y0 = 0.5 + math.cos(a) * 0.2, 0.58 + math.sin(a) * 0.3
        sp.lines(stroke(S, wave((x0, y0), (x0 + math.cos(a) * 0.22, y0 + math.sin(a) * 0.18), 0.02, 2), 1.4 / S), R("Gram-", 1))
    body = capsule(S, (0.5, 0.84), (0.5, 0.34), 0.2)
    sp.part(body, "Intracelular")
    sp.part(polygon(S, [(0.66, 0.5), (0.94, 0.42), (0.96, 0.46), (0.68, 0.56)]), "Biofilm")
    sp.part(regular(S, 0.66, 0.53, 0.05, 6), "Biofilm")
    if face: put_face(sp, 0.48, 0.46, 0.14, 0.06, mood="fierce", iris=(220, 160, 40), mouth="grin")
    return done(sp)

def luca(S, face=True):
    """LUCA: el último antepasado común universal; esfera luminosa con anillos de ARN, ADN y membrana."""
    sp = Sprite(S)
    for k, ramp in enumerate(("Simbionte", "Archaea", "Fotótrofo")):
        pts = [(0.5 + math.cos(t) * 0.42, 0.52 + math.sin(t) * 0.14) for t in np.linspace(0, 2 * math.pi, 80)]
        ang = k * math.pi / 3
        pts = [(0.5 + (x - 0.5) * math.cos(ang) - (y - 0.52) * math.sin(ang), 0.52 + (x - 0.5) * math.sin(ang) + (y - 0.52) * math.cos(ang)) for x, y in pts]
        sp.part(stroke(S, pts, 0.03), ramp, highlight=False)
    body = coco(S, 0.5, 0.52, 0.24)
    sp.part(body, "brillo")
    sp.put(coco(S, 0.44, 0.44, 0.07) & body, (255, 255, 230))
    if face: put_face(sp, 0.5, 0.54, 0.14, 0.06, iris=(120, 90, 200), mouth="smile")
    return done(sp)

# ================================================================ Evoluciones de Pleomorph
def _morph(S, ramp, extra, face, iris):
    sp = Sprite(S)
    extra(sp, S)
    body = ellipse(S, 0.5, 0.62, 0.26, 0.24)
    for x, y, r in ((0.3, 0.42, 0.1), (0.52, 0.34, 0.12), (0.72, 0.44, 0.09)):
        body |= coco(S, x, y, r)
    sp.part(body, ramp)
    for x, y in ((0.36, 0.74), (0.66, 0.7)):
        sp.put(coco(S, x, y, 0.03) & body, R(ramp, 3))
    feet(sp, (0.38, 0.62), 0.88, 0.07, 0.04, ramp)
    if face: put_face(sp, 0.5, 0.6, 0.15, 0.065, mood="fierce", iris=iris, mouth="grin")
    return done(sp)

def halomorph(S, face=True):
    """Halomorph: forma L adaptada a la salmuera, con cristales de sal y aletas."""
    def extra(sp, S):
        for x, y in ((0.2, 0.3), (0.82, 0.32), (0.5, 0.14)):
            sp.part(regular(S, x, y, 0.07, 4, math.pi / 4), "cristal")
        for side in (-1, 1):
            sp.part(leaf(S, (0.5 + side * 0.2, 0.7), (0.5 + side * 0.44, 0.78), 0.05), "Ácido-Alc.")
    return _morph(S, "Protozoo", extra, face, (60, 140, 220))

def electromorph(S, face=True):
    """Electromorph: forma L eléctrica, espiral, con rayos y nanocables."""
    def extra(sp, S):
        for x in (0.2, 0.5, 0.8):
            sp.part(polygon(S, [(x - 0.04, 0.08), (x + 0.03, 0.08), (x, 0.2), (x + 0.05, 0.2), (x - 0.05, 0.36), (x - 0.01, 0.24), (x - 0.06, 0.24)]), "brillo", highlight=False)
    return _morph(S, "Espiroqueta", extra, face, (250, 220, 60))

def pyromorph(S, face=True):
    """Pyromorph: forma L de las chimeneas termales, con melena de fuego."""
    def extra(sp, S):
        sp.part(flame(S, 0.5, 0.36, 0.3, 0.3, 5, 0.0), "Anaerobio", highlight=False)
    return _morph(S, "Extremófilo", extra, face, (250, 140, 40))

DESIGNS9 = {
    "marburg-v": marburg_v, "filovir-z": filovir_z, "retrovir-x": retrovir_x, "mimivir": mimivir, "pandoravir": pandoravir,
    "stromatol": stromatol, "cyanofossil": cyanofossil, "palaeobacil": palaeobacil, "lokiarca": lokiarca,
    "sputnik-v": sputnik_v, "ecoli-o157": ecoli_o157, "salmonella-typhimurium": salmonella, "luca": luca,
    "halomorph": halomorph, "electromorph": electromorph, "pyromorph": pyromorph,
}
