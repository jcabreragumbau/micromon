"""Diseños a mano de las últimas 20 especies (sobre todo Alto Mando, Campeón y Calle Selección Natural)."""
import math
import numpy as np
from pix import Sprite, ellipse, capsule, polygon, regular, bezier, stroke, wave, shift, dilate, RAMPS
from designs1 import leaf, flame, feet, arms, put_face, stripes, R
from designs2 import done, spikes, spots, _capsid

def coco(S, x, y, r): return ellipse(S, x, y, r, r * 0.95)

def chain(sp, S, pts, r, ramp):
    for x, y in pts: sp.part(coco(S, x, y, r), ramp)

# ================================================================ Levaduras y simbiontes
def pichiamax(S, face=True):
    """Pichiamax: levadura reina con corona de burbujas, barril de vino y capa de espuma (homenaje a la fermentación)."""
    sp = Sprite(S)
    cape = polygon(S, [(0.24, 0.44), (0.76, 0.44), (0.92, 0.96), (0.08, 0.96)])
    sp.part(cape, "Simbionte")
    body = coco(S, 0.5, 0.62, 0.26)
    sp.part(body, "Levadura")
    stripes(sp, body, [[(0.26, 0.56), (0.74, 0.56)], [(0.25, 0.72), (0.75, 0.72)]], 2.0 / S, R("Anaerobio", 1))
    for x, y, r in ((0.32, 0.26, 0.06), (0.5, 0.2, 0.08), (0.68, 0.26, 0.06)):
        sp.part(coco(S, x, y, r), "cristal")
    sp.part(polygon(S, [(0.32, 0.36), (0.36, 0.28), (0.44, 0.34), (0.5, 0.26), (0.56, 0.34), (0.64, 0.28), (0.68, 0.36)]), "brillo", highlight=False)
    sp.part(coco(S, 0.84, 0.36, 0.08), "Levadura")                     # yema
    if face: put_face(sp, 0.5, 0.58, 0.16, 0.065, mood="fierce", iris=(190, 120, 40), mouth="grin")
    return done(sp)

def longum(S, face=True):
    """Bifidobacterium longum: Y gigante ramificada como un árbol, guardiana de la microbiota."""
    sp = Sprite(S)
    for side in (-1, 1):
        sp.part(capsule(S, (0.5, 0.44), (0.5 + side * 0.26, 0.2), 0.09), "Simbionte")
        sp.part(capsule(S, (0.5 + side * 0.22, 0.24), (0.5 + side * 0.4, 0.2), 0.06), "Simbionte")
        sp.part(coco(S, 0.5 + side * 0.42, 0.2, 0.07), "Levadura")
    body = capsule(S, (0.5, 0.84), (0.5, 0.46), 0.18)
    sp.part(body, "Simbionte")
    sp.put(ellipse(S, 0.5, 0.7, 0.09, 0.08) & body, R("cristal", 3))
    arms(sp, [((0.34, 0.6), (0.2, 0.66)), ((0.66, 0.6), (0.8, 0.66))], 0.04, "Simbionte")
    feet(sp, (0.42, 0.58), 0.94, 0.07, 0.04, "Simbionte")
    if face: put_face(sp, 0.5, 0.56, 0.14, 0.06, iris=(220, 140, 160), mouth="smile")
    return done(sp)

# ================================================================ Proteus (forma L del GDD original)
def mirabilis(S, face=True):
    """Proteus mirabilis: bacteria que forma ondas de enjambre concéntricas (diana de swarming)."""
    sp = Sprite(S)
    for k, r in enumerate((0.44, 0.36, 0.28)):
        ring = ellipse(S, 0.5, 0.58, r, r * 0.8) & ~ellipse(S, 0.5, 0.58, r - 0.03, (r - 0.03) * 0.8)
        sp.put(ring, R("Gram-", 2 - k % 2))
    body = capsule(S, (0.38, 0.6), (0.62, 0.56), 0.14)
    sp.part(body, "Gram-")
    for a in np.linspace(0, 2 * math.pi, 10, endpoint=False):
        sp.lines(stroke(S, wave((0.5 + math.cos(a) * 0.16, 0.58 + math.sin(a) * 0.12), (0.5 + math.cos(a) * 0.24, 0.58 + math.sin(a) * 0.18), 0.01, 1.5), 1.0 / S), R("Gram-", 1))
    if face: put_face(sp, 0.5, 0.56, 0.13, 0.055, iris=(80, 110, 200), mouth="open")
    return done(sp)

def vulgaris(S, face=True):
    """Proteus vulgaris: bastón cambiante con muchos flagelos y piedras de urea (cristales) que lanza."""
    sp = Sprite(S)
    for a in np.linspace(0.3, 2 * math.pi - 0.3, 8):
        x0, y0 = 0.5 + math.cos(a) * 0.22, 0.58 + math.sin(a) * 0.18
        sp.lines(stroke(S, wave((x0, y0), (x0 + math.cos(a) * 0.2, y0 + math.sin(a) * 0.18), 0.02, 2), 1.4 / S), R("Gram-", 1))
    body = capsule(S, (0.34, 0.6), (0.66, 0.56), 0.18)
    sp.part(body, "Gram-")
    for x, y in ((0.16, 0.2), (0.84, 0.18)):
        sp.part(regular(S, x, y, 0.06, 5), "cristal")
    if face: put_face(sp, 0.52, 0.56, 0.15, 0.06, mood="fierce", iris=(80, 110, 200), mouth="grin")
    return done(sp)

# ================================================================ Bacilos y cocos clínicos
def anthracis(S, face=True):
    """Bacillus anthracis: cadena de bastones en «caña de bambú» con esporas, como un guerrero de tres segmentos."""
    sp = Sprite(S)
    segs = [(0.3, 0.82), (0.42, 0.64), (0.54, 0.46)]
    for (x, y) in segs:
        sp.part(polygon(S, [(x - 0.12, y + 0.08), (x + 0.04, y - 0.14), (x + 0.16, y - 0.06), (x, y + 0.16)]), "Esporulado")
        sp.put(coco(S, x + 0.02, y + 0.01, 0.04), R("brillo", 3))
    head = capsule(S, (0.6, 0.36), (0.7, 0.24), 0.14)
    sp.part(head, "Gram+")
    sp.part(spikes(S, 0.66, 0.28, 0.15, 5, 0.06, 0.03, 0, (math.pi * 1.1, math.pi * 1.9)), "Esporulado", highlight=False)
    if face: put_face(sp, 0.66, 0.3, 0.12, 0.055, mood="fierce", iris=(130, 80, 200), mouth="fangs")
    return done(sp)

def pyogenes(S, face=True):
    """Streptococcus pyogenes: cadena de cocos que se enrosca como un látigo de fuego (fiebre escarlata)."""
    sp = Sprite(S)
    pts = [(0.5 + math.cos(t) * (0.08 + t * 0.045), 0.58 + math.sin(t) * (0.08 + t * 0.04)) for t in np.linspace(0, 6.5, 11)]
    chain(sp, S, pts[:-1], 0.06, "Gram+")
    sp.part(flame(S, pts[0][0], pts[0][1] - 0.04, 0.12, 0.06, 2, 0.0), "Antibiótico", highlight=False)
    sp.part(coco(S, *pts[-1], 0.13), "Antibiótico")
    if face: put_face(sp, pts[-1][0], pts[-1][1], 0.1, 0.05, mood="fierce", iris=(240, 80, 40), mouth="fangs")
    return done(sp)

def agalactiae(S, face=True):
    """Streptococcus agalactiae: cadena de cocos que forma una armadura de anillos, con halo de hemólisis beta."""
    sp = Sprite(S)
    sp.put(ellipse(S, 0.5, 0.56, 0.44, 0.42) & ~ellipse(S, 0.5, 0.56, 0.4, 0.38), R("cristal", 3))
    for k in range(9):
        a = math.pi * (0.75 + 1.5 * k / 8)
        sp.part(coco(S, 0.5 + math.cos(a) * 0.32, 0.58 + math.sin(a) * 0.3, 0.07), "Gram+")
    body = coco(S, 0.5, 0.58, 0.18)
    sp.part(body, "Antibiótico")
    if face: put_face(sp, 0.5, 0.56, 0.13, 0.06, mood="fierce", iris=(200, 70, 120), mouth="grin")
    return done(sp)

def yersinia(S, face=True):
    """Yersinia pestis: bacilo en forma de imperdible con aspecto de jinete de la peste y una pulga de montura."""
    sp = Sprite(S)
    flea = ellipse(S, 0.5, 0.82, 0.26, 0.11)
    for side in (-1, 1):
        sp.part(stroke(S, [(0.5 + side * 0.18, 0.86), (0.5 + side * 0.3, 0.98)], 0.025), "Extremófilo", highlight=False)
    sp.part(flea, "Extremófilo")
    cloak = polygon(S, [(0.28, 0.3), (0.72, 0.3), (0.8, 0.76), (0.2, 0.76)])
    sp.part(cloak, "Extremófilo")
    body = capsule(S, (0.5, 0.66), (0.5, 0.34), 0.15)
    sp.part(body, "Antibiótico")
    for y in (0.4, 0.6):
        sp.put(coco(S, 0.5, y, 0.05) & body, R("Antibiótico", 0))
    sp.part(polygon(S, [(0.3, 0.32), (0.5, 0.1), (0.7, 0.32)]), "Extremófilo")
    if face: put_face(sp, 0.5, 0.48, 0.12, 0.055, mood="fierce", iris=(250, 220, 60), mouth="grin")
    return done(sp)

# ================================================================ Plantas y océano
def meliloti(S, face=True):
    """Sinorhizobium meliloti: bacteroide dentro de un nódulo de alfalfa, con flor morada."""
    sp = Sprite(S)
    sp.part(stroke(S, bezier([(0.5, 0.95), (0.46, 0.7), (0.52, 0.3)], 20), 0.03), "Fotótrofo", highlight=False)
    for a in (-0.9, -0.4, 0.4, 0.9):
        sp.part(leaf(S, (0.5, 0.5), (0.5 + math.sin(a) * 0.3, 0.5 - math.cos(a) * 0.2), 0.05), "Fotótrofo")
    sp.part(coco(S, 0.52, 0.2, 0.1), "Gram+")
    nod = ellipse(S, 0.5, 0.76, 0.24, 0.17)
    sp.part(nod, "Simbionte")
    if face: put_face(sp, 0.5, 0.74, 0.14, 0.055, iris=(80, 160, 70), blush=True)
    return done(sp)

def agrobacter(S, face=True):
    """Agrobacterium tumefaciens: ingeniera genética natural; inyecta su plásmido Ti en una agalla de planta."""
    sp = Sprite(S)
    gall = coco(S, 0.3, 0.72, 0.22)
    sp.part(gall, "Esporulado")
    spots(sp, gall, [(0.22, 0.66), (0.36, 0.8)], 0.04, R("Esporulado", 3))
    body = capsule(S, (0.56, 0.5), (0.8, 0.38), 0.14)
    sp.part(body, "Fotótrofo")
    ring = coco(S, 0.88, 0.2, 0.08) & ~coco(S, 0.88, 0.2, 0.04)
    sp.part(ring, "Intracelular", highlight=False)
    sp.part(stroke(S, [(0.56, 0.54), (0.42, 0.62)], 0.02), "Intracelular", highlight=False)
    if face: put_face(sp, 0.68, 0.44, 0.12, 0.05, mood="fierce", iris=(80, 160, 70), mouth="grin")
    return done(sp)

def alexandrium(S, face=True):
    """Alexandrium: dinoflagelado de la marea roja, acorazado, con saxitoxina en forma de rayos."""
    sp = Sprite(S)
    sp.put(ellipse(S, 0.5, 0.9, 0.46, 0.08), R("Antibiótico", 2))                    # marea roja
    body = ellipse(S, 0.5, 0.52, 0.3, 0.32)
    sp.part(body, "Alga")
    sp.put(stroke(S, [(0.2, 0.52), (0.8, 0.52)], 2.0 / S) & body, R("Alga", 0))
    stripes(sp, body, [[(0.5, 0.2), (0.5, 0.84)], [(0.34, 0.26), (0.36, 0.78)], [(0.66, 0.26), (0.64, 0.78)]], 1.0 / S, R("Alga", 1))
    sp.lines(stroke(S, wave((0.8, 0.52), (0.98, 0.4), 0.02, 2), 1.4 / S), R("Alga", 1))
    for x in (0.12, 0.88):
        sp.lines(stroke(S, [(x, 0.2), (x + 0.03, 0.28), (x - 0.01, 0.3), (x + 0.02, 0.38)], 1.4 / S), R("brillo", 3))
    if face: put_face(sp, 0.5, 0.44, 0.15, 0.06, mood="fierce", iris=(250, 80, 80), mouth="fangs")
    return done(sp)

def pelagibac(S, face=True):
    """Pelagibacter: la bacteria más abundante del océano, diminuta y en forma de luna creciente que flota."""
    sp = Sprite(S)
    for k in range(3):
        sp.part(stroke(S, bezier([(0.1, 0.84 + k * 0.05), (0.5, 0.78 + k * 0.05), (0.9, 0.84 + k * 0.05)], 20), 0.025), "Ácido-Alc.", highlight=False)
    moon = ellipse(S, 0.5, 0.48, 0.24, 0.26) & ~ellipse(S, 0.62, 0.38, 0.2, 0.22)
    sp.part(moon, "Gram-")
    sp.part(coco(S, 0.64, 0.6, 0.04), "cristal", highlight=False)
    if face: put_face(sp, 0.4, 0.56, 0.08, 0.045, iris=(80, 110, 200))
    return done(sp)

def prochloron(S, face=True):
    """Prochloron: cianobacteria simbionte de las ascidias; esfera verde dentro de un túnico translúcido."""
    sp = Sprite(S)
    tunic = polygon(S, bezier([(0.2, 0.92), (0.1, 0.4), (0.5, 0.1), (0.9, 0.4), (0.8, 0.92)], 50))
    sp.part(tunic, "cristal")
    for x, y in ((0.34, 0.4), (0.62, 0.36), (0.5, 0.62)):
        sp.part(coco(S, x, y, 0.1), "Fotótrofo")
    if face: put_face(sp, 0.5, 0.62, 0.1, 0.045, iris=(80, 150, 80))
    return done(sp)

# ================================================================ Alto Mando: parásitos y espiroquetas
def naegleria(S, face=True):
    """Naegleria: ameba «comecerebros» con pseudópodos de lóbulo y un flagelo doble cuando nada."""
    sp = Sprite(S)
    for side in (-1, 1):
        sp.lines(stroke(S, wave((0.5 + side * 0.06, 0.28), (0.5 + side * 0.2, 0.06), 0.02, 2), 1.4 / S), R("Protozoo", 1))
    body = coco(S, 0.5, 0.58, 0.26)
    for a, l in ((3.4, 0.38), (5.9, 0.38), (2.4, 0.34), (0.8, 0.34)):
        body |= coco(S, 0.5 + math.cos(a) * l * 0.8, 0.58 + math.sin(a) * l * 0.7, 0.09)
    sp.part(body, "Intracelular")
    sp.put(coco(S, 0.62, 0.68, 0.06) & body, R("Protozoo", 0))
    if face: put_face(sp, 0.48, 0.52, 0.16, 0.065, mood="fierce", iris=(240, 60, 60), mouth="fangs", mw=0.06)
    return done(sp)

def trypanosom(S, face=True):
    """Trypanosoma: protozoo alargado con membrana ondulante como una aleta, nadador de la sangre."""
    sp = Sprite(S)
    path = bezier([(0.1, 0.8), (0.3, 0.5), (0.6, 0.7), (0.86, 0.36)], 40)
    body = stroke(S, path, 0.11)
    fin = np.zeros_like(body)
    for k in range(0, 38, 2):
        x, y = path[k]
        fin |= stroke(S, [(x, y), (x + 0.02, y - 0.1 - 0.03 * math.sin(k / 3))], 0.02)
    sp.part(fin & ~body, "Espiroqueta", highlight=False)
    sp.part(body, "Protozoo")
    sp.lines(stroke(S, wave((0.86, 0.36), (0.98, 0.18), 0.02, 2), 1.4 / S), R("Espiroqueta", 1))
    if face: put_face(sp, 0.74, 0.46, 0.09, 0.045, mood="fierce", iris=(240, 120, 40), mouth="grin")
    return done(sp)

def plasmodium(S, face=True):
    """Plasmodium falciparum: anillo dentro de un glóbulo rojo, con merozoítos como cuchillas giratorias."""
    sp = Sprite(S)
    for k in range(6):
        a = k * math.pi / 3
        sp.part(ellipse(S, 0.5 + math.cos(a) * 0.4, 0.54 + math.sin(a) * 0.38, 0.06, 0.035, a), "Protozoo", highlight=False)
    rbc = coco(S, 0.5, 0.54, 0.32)
    sp.part(rbc, "Antibiótico")
    sp.put(coco(S, 0.5, 0.54, 0.2), R("Antibiótico", 3))
    ring = coco(S, 0.5, 0.54, 0.13) & ~coco(S, 0.5, 0.54, 0.08)
    sp.put(ring, R("Intracelular", 1))
    if face: put_face(sp, 0.5, 0.52, 0.2, 0.06, mood="fierce", iris=(170, 60, 150), mouth="fangs")
    return done(sp)

def toxoplasma(S, face=True):
    """Toxoplasma: taquizoíto en forma de media luna con orejas de gato (manipula a los ratones para que no teman a los gatos)."""
    sp = Sprite(S)
    for side in (-1, 1):
        sp.part(polygon(S, [(0.5 + side * 0.08, 0.32), (0.5 + side * 0.24, 0.12), (0.5 + side * 0.26, 0.36)]), "Protozoo")
    body = ellipse(S, 0.5, 0.56, 0.28, 0.26) & ~ellipse(S, 0.5, 0.96, 0.2, 0.16)
    sp.part(body, "Intracelular")
    sp.part(stroke(S, bezier([(0.74, 0.7), (0.92, 0.6), (0.88, 0.4)], 20), 0.035), "Intracelular", highlight=False)
    if face:
        put_face(sp, 0.5, 0.52, 0.15, 0.065, mood="fierce", iris=(240, 220, 60), mouth="grin")
    return done(sp)

def treponema(S, face=True):
    """Treponema pallidum: espiroqueta pálida y fina como un sacacorchos, casi invisible."""
    sp = Sprite(S)
    path = [(0.5 + 0.12 * math.sin(t * 7 * math.pi), 0.92 - 0.72 * t) for t in np.linspace(0, 1, 120)]
    sp.part(stroke(S, path, 0.05), "Espiroqueta")
    head = coco(S, 0.5, 0.18, 0.11)
    sp.part(head, "cristal")
    if face: put_face(sp, 0.5, 0.18, 0.09, 0.045, mood="fierce", iris=(200, 200, 220), mouth="grin")
    return done(sp)

# ================================================================ Arqueas extremas
def sulfolobus(S, face=True):
    """Sulfolobus: arquea lobulada de las solfataras, entre vapor de azufre, ácida y ardiente."""
    sp = Sprite(S)
    for x in (0.24, 0.5, 0.76):
        sp.part(coco(S, x, 0.16, 0.06), "Espiroqueta", highlight=False)
    body = coco(S, 0.5, 0.58, 0.24) | coco(S, 0.32, 0.46, 0.12) | coco(S, 0.68, 0.46, 0.12) | coco(S, 0.36, 0.76, 0.1) | coco(S, 0.66, 0.78, 0.1)
    sp.part(body, "Archaea")
    sp.put(stroke(S, bezier([(0.3, 0.68), (0.5, 0.78), (0.7, 0.68)], 20), 1.4 / S) & body, R("Espiroqueta", 2))
    if face: put_face(sp, 0.5, 0.56, 0.15, 0.065, mood="fierce", iris=(250, 220, 60), mouth="fangs")
    return done(sp)

def pyrococcus(S, face=True):
    """Pyrococcus furiosus: «bola de fuego furiosa», coco de arquea con mechón de flagelos de llama."""
    sp = Sprite(S)
    sp.part(flame(S, 0.5, 0.36, 0.34, 0.32, 5, 0.0), "Anaerobio", highlight=False)
    for k in range(6):
        a = math.pi * (0.1 + 0.16 * k)
        sp.lines(stroke(S, wave((0.5 + math.cos(a) * 0.24, 0.62 + math.sin(a) * 0.2), (0.5 + math.cos(a) * 0.44, 0.62 + math.sin(a) * 0.36), 0.02, 2), 1.4 / S), R("Anaerobio", 1))
    body = coco(S, 0.5, 0.6, 0.26)
    sp.part(body, "Archaea")
    if face: put_face(sp, 0.5, 0.58, 0.16, 0.07, mood="fierce", iris=(250, 120, 40), mouth="fangs", mw=0.06)
    return done(sp)

DESIGNS10 = {
    "pichiamax": pichiamax, "longum": longum, "mirabilis": mirabilis, "vulgaris": vulgaris, "anthracis": anthracis,
    "pyogenes": pyogenes, "agalactiae": agalactiae, "yersinia": yersinia, "meliloti": meliloti, "agrobacter": agrobacter,
    "alexandrium": alexandrium, "pelagibac": pelagibac, "prochloron": prochloron, "naegleria": naegleria, "trypanosom": trypanosom,
    "plasmodium": plasmodium, "toxoplasma": toxoplasma, "treponema": treponema, "sulfolobus": sulfolobus, "pyrococcus": pyrococcus,
}
