"""Diseños a mano del quinto tramo: Ruta 7, Reserva Microbiana y Gimnasio 5."""
import math
import numpy as np
from pix import Sprite, ellipse, capsule, polygon, regular, bezier, stroke, wave, shift, dilate, RAMPS
from designs1 import leaf, flame, feet, arms, put_face, stripes, _cilia, R
from designs2 import done, spikes, spots

def coco(S, x, y, r): return ellipse(S, x, y, r, r * 0.95)

# ================================================================ Ruta 7
def tetani(S, face=True):
    """Clostridium tetani: «raqueta de tambor», bastón largo con espora redonda en la punta, usada como maza."""
    sp = Sprite(S)
    sp.part(capsule(S, (0.3, 0.86), (0.62, 0.36), 0.08), "Anaerobio")
    head = coco(S, 0.68, 0.28, 0.17)
    sp.part(head, "Esporulado")
    sp.part(spikes(S, 0.68, 0.28, 0.17, 7, 0.05, 0.025, 0, (math.pi * 1.1, math.pi * 2.3)), "Esporulado", highlight=False)
    arms(sp, [((0.4, 0.62), (0.24, 0.56)), ((0.46, 0.68), (0.6, 0.76))], 0.03, "Anaerobio")
    feet(sp, (0.26, 0.4), 0.92, 0.06, 0.04, "Anaerobio")
    if face: put_face(sp, 0.68, 0.28, 0.12, 0.055, mood="fierce", iris=(230, 90, 40), mouth="fangs")
    return done(sp)

def cryptospor(S, face=True):
    """Cryptosporidium: ooquiste blindado con cuatro esporozoítos dentro, como un búnker redondo."""
    sp = Sprite(S)
    shell = coco(S, 0.5, 0.56, 0.32)
    sp.part(shell, "Biofilm")
    inner = coco(S, 0.5, 0.56, 0.24)
    sp.put(inner, R("Protozoo", 3))
    for a in (0.3, 1.9, 3.5, 5.1):
        sp.put(capsule(S, (0.5 + math.cos(a) * 0.06, 0.6 + math.sin(a) * 0.05), (0.5 + math.cos(a) * 0.16, 0.6 + math.sin(a) * 0.13), 0.03) & inner, R("Protozoo", 1))
    for x in (0.26, 0.74):
        sp.put(regular(S, x, 0.42, 0.03, 4) & shell, R("Biofilm", 0))
    if face: put_face(sp, 0.5, 0.48, 0.15, 0.06, iris=(60, 110, 200), mood="fierce", mouth="smile")
    return done(sp)

def methanosar(S, face=True):
    """Methanosarcina: racimo de arqueas en paquetes cúbicos que suelta metano en llamas azules."""
    sp = Sprite(S)
    sp.part(flame(S, 0.5, 0.26, 0.22, 0.12, 3, 0.0), "Ácido-Alc.", highlight=False)
    for (x, y) in ((0.32, 0.5), (0.68, 0.5), (0.32, 0.78), (0.68, 0.78)):
        sp.part(regular(S, x, y, 0.17, 4, math.pi / 4), "Archaea")
    sp.part(coco(S, 0.5, 0.62, 0.2), "Archaea")
    if face: put_face(sp, 0.5, 0.6, 0.15, 0.065, mood="fierce", iris=(150, 120, 220), mouth="grin")
    return done(sp)

def sulfurreduc(S, face=True):
    """Geobacter sulfurreducens: espirilo eléctrico que conduce corriente con nanocables, como un dragón-cable."""
    sp = Sprite(S)
    path = [(0.12 + 0.62 * t, 0.7 - 0.2 * t + 0.08 * math.sin(t * 3 * math.pi)) for t in np.linspace(0, 1, 60)]
    sp.part(stroke(S, path, 0.14), "Espiroqueta")
    for k in range(5, 55, 10):
        x, y = path[k]
        sp.lines(stroke(S, [(x, y + 0.06), (x + 0.03, y + 0.14), (x - 0.01, y + 0.16), (x + 0.02, y + 0.24)], 1.5 / S), R("brillo", 3))
    head = ellipse(S, 0.76, 0.46, 0.16, 0.14)
    sp.part(head, "Biofilm")
    for side in (-1, 1):
        sp.part(stroke(S, [(0.76 + side * 0.06, 0.34), (0.76 + side * 0.12, 0.18)], 0.025), "Espiroqueta", highlight=False)
    if face: put_face(sp, 0.76, 0.46, 0.12, 0.05, mood="fierce", iris=(250, 220, 60), mouth="fangs")
    return done(sp)

def meningitid(S, face=True):
    """Neisseria meningitidis: diplococo con cápsula y casco, con aire de guerrero."""
    sp = Sprite(S)
    caps = ellipse(S, 0.5, 0.6, 0.38, 0.3)
    sp.part(caps, "cristal")
    for x, s in ((0.33, -1), (0.67, 1)):
        bean = ellipse(S, x, 0.62, 0.16, 0.22) & ~ellipse(S, 0.5, 0.62, 0.04, 0.3)
        sp.part(bean, "Gram-")
    sp.part(polygon(S, [(0.2, 0.36), (0.8, 0.36), (0.72, 0.2), (0.5, 0.12), (0.28, 0.2)]), "Biofilm")
    if face:
        sp.iris = (80, 110, 200)
        sp.eyes(0.33, 0.56, 0.0, 0.06, mood="fierce"); sp.eyes(0.67, 0.56, 0.0, 0.06, mood="fierce")
        sp.mouth(0.5, 0.74, 0.05, "fangs")
    sp.outline_all()
    return sp

def pneumonia_k(S, face=True):
    """Klebsiella hiperviscosa: gota de moco gigante que forma hilos (prueba del hilo), con el bastón dentro."""
    sp = Sprite(S)
    for x in (0.3, 0.5, 0.7):
        sp.part(stroke(S, bezier([(x, 0.84), (x + 0.02, 0.92), (x - 0.01, 0.99)], 10), 0.025), "cristal", highlight=False)
    goo = polygon(S, bezier([(0.12, 0.86), (0.06, 0.4), (0.5, 0.1), (0.94, 0.4), (0.88, 0.86)], 60))
    sp.part(goo, "cristal")
    body = capsule(S, (0.36, 0.6), (0.64, 0.56), 0.15)
    sp.part(body, "Gram-")
    sp.put(ellipse(S, 0.3, 0.32, 0.07, 0.05) & goo, (255, 255, 255))
    if face: put_face(sp, 0.5, 0.56, 0.14, 0.06, mood="fierce", iris=(80, 110, 200), mouth="grin")
    return done(sp)

def prowazekii(S, face=True):
    """Rickettsia prowazekii (tifus): bacilo con capa de piojos y sombrero de explorador."""
    sp = Sprite(S)
    cape = polygon(S, [(0.28, 0.48), (0.72, 0.48), (0.86, 0.94), (0.14, 0.94)])
    sp.part(cape, "Extremófilo")
    body = capsule(S, (0.5, 0.86), (0.5, 0.42), 0.18)
    sp.part(body, "Intracelular")
    sp.part(ellipse(S, 0.5, 0.3, 0.28, 0.05), "Esporulado")
    sp.part(ellipse(S, 0.5, 0.24, 0.15, 0.08) & ~ellipse(S, 0.5, 0.36, 0.3, 0.06), "Esporulado")
    if face: put_face(sp, 0.5, 0.48, 0.14, 0.06, mood="fierce", iris=(170, 60, 150), mouth="grin")
    return done(sp)

# ================================================================ Reserva Microbiana
def mixotricha(S, face=True):
    """Mixotricha paradoxa: protozoo con miles de espiroquetas que le sirven de motores (pelo ondulante)."""
    sp = Sprite(S)
    body = ellipse(S, 0.5, 0.58, 0.3, 0.26)
    edge = dilate(body) & ~body
    ys, xs = np.where(edge)
    hair = np.zeros_like(body)
    for i in range(0, len(ys), 2 if S > 40 else 1):
        x, y = (xs[i] + 0.5) / S, (ys[i] + 0.5) / S
        vx, vy = x - 0.5, y - 0.58; L = math.hypot(vx, vy) or 1
        hair |= stroke(S, wave((x, y), (x + vx / L * 0.09, y + vy / L * 0.09), 0.012, 1.5), 1.0 / S)
    sp.lines(hair & ~body, R("Espiroqueta", 2))
    sp.part(body, "Protozoo")
    for x, y in ((0.36, 0.7), (0.62, 0.72)):
        sp.put(capsule(S, (x - 0.03, y), (x + 0.03, y), 0.012) & body, R("Simbionte", 1))
    if face: put_face(sp, 0.5, 0.54, 0.15, 0.065, iris=(40, 90, 190), blush=True)
    return done(sp)

def aquaticus(S, face=True):
    """Thermus aquaticus: bastón dorado de las fuentes termales que sostiene una hélice de ADN (Taq polimerasa)."""
    sp = Sprite(S)
    for k in range(10):
        t = k / 9
        y = 0.18 + t * 0.6
        sp.part(coco(S, 0.84 + 0.05 * math.sin(t * 2 * math.pi), y, 0.025), "Simbionte", highlight=False)
        sp.part(coco(S, 0.84 - 0.05 * math.sin(t * 2 * math.pi), y, 0.025), "Gram+", highlight=False)
    body = capsule(S, (0.44, 0.84), (0.44, 0.38), 0.18)
    sp.part(body, "brillo")
    sp.part(flame(S, 0.44, 0.24, 0.16, 0.1, 3, 0.0), "Anaerobio", highlight=False)
    arms(sp, [((0.56, 0.56), (0.78, 0.5)), ((0.32, 0.6), (0.2, 0.7))], 0.035, "brillo")
    feet(sp, (0.36, 0.52), 0.94, 0.07, 0.04, "brillo")
    if face: put_face(sp, 0.44, 0.48, 0.14, 0.06, mood="fierce", iris=(220, 120, 40), mouth="smile")
    return done(sp)

def tardigrad(S, face=True):
    """Tardígrado: osito de agua regordete con ocho patas con garras, casi indestructible."""
    sp = Sprite(S)
    for k, x in enumerate((0.24, 0.42, 0.6, 0.78)):
        sp.part(capsule(S, (x, 0.74), (x - 0.02, 0.88), 0.05), "Extremófilo", behind=True)
        sp.lines(stroke(S, [(x - 0.05, 0.92), (x - 0.02, 0.9), (x + 0.01, 0.93)], 1.2 / S), R("Extremófilo", 0))
    body = capsule(S, (0.24, 0.58), (0.76, 0.58), 0.22)
    sp.part(body, "Extremófilo")
    stripes(sp, body, [[(x, 0.38), (x, 0.8)] for x in (0.36, 0.5, 0.64)], 1.0 / S, R("Extremófilo", 1))
    sp.part(ellipse(S, 0.84, 0.56, 0.1, 0.1), "Extremófilo")
    sp.put(coco(S, 0.92, 0.58, 0.03), R("Extremófilo", 0))                      # boca tubular
    if face: put_face(sp, 0.78, 0.5, 0.1, 0.045, iris=(60, 60, 60))
    return done(sp)

def radiodurans(S, face=True):
    """Deinococcus radiodurans: tétrada de cocos rojos con símbolo de radiación, resistente a todo."""
    sp = Sprite(S)
    for x, y in ((0.32, 0.4), (0.68, 0.4), (0.32, 0.74), (0.68, 0.74)):
        sp.part(coco(S, x, y, 0.19), "Antibiótico")
    core = coco(S, 0.5, 0.57, 0.12)
    sp.part(core, "brillo")
    for a in (math.pi / 2, math.pi / 2 + 2.09, math.pi / 2 + 4.19):
        sp.put(polygon(S, [(0.5, 0.57), (0.5 + math.cos(a - 0.45) * 0.11, 0.57 + math.sin(a - 0.45) * 0.11), (0.5 + math.cos(a + 0.45) * 0.11, 0.57 + math.sin(a + 0.45) * 0.11)]) & core, R("Extremófilo", 0))
    if face: put_face(sp, 0.5, 0.4, 0.36, 0.06, mood="fierce", iris=(250, 220, 60), mouth="grin", mw=0.05)
    return done(sp)

def colwellia(S, face=True):
    """Colwellia: bacteria del hielo marino con caparazón de cristal y bufanda."""
    sp = Sprite(S)
    for a in range(6):
        ang = a * math.pi / 3
        sp.part(stroke(S, [(0.5, 0.56), (0.5 + math.cos(ang) * 0.4, 0.56 + math.sin(ang) * 0.38)], 0.025), "cristal", highlight=False)
    shell = regular(S, 0.5, 0.56, 0.3, 6, math.pi / 6)
    sp.part(shell, "cristal")
    body = capsule(S, (0.38, 0.58), (0.62, 0.54), 0.13)
    sp.part(body, "Ácido-Alc.")
    sp.part(stroke(S, [(0.32, 0.68), (0.5, 0.72), (0.68, 0.66)], 0.03), "Antibiótico", highlight=False)
    if face: put_face(sp, 0.5, 0.54, 0.12, 0.05, iris=(60, 140, 220), blush=True)
    return done(sp)

def pyrolobus(S, face=True):
    """Pyrolobus fumarii: arquea lobulada que vive en chimeneas hidrotermales a 113 °C, rodeada de humo negro."""
    sp = Sprite(S)
    sp.part(polygon(S, [(0.3, 0.98), (0.38, 0.62), (0.62, 0.62), (0.7, 0.98)]), "Extremófilo")     # chimenea
    for x, y, r in ((0.7, 0.24, 0.06), (0.78, 0.15, 0.05), (0.84, 0.07, 0.04)):
        sp.part(coco(S, x, y, r), "Extremófilo", highlight=False)
    body = coco(S, 0.5, 0.46, 0.22) | coco(S, 0.32, 0.4, 0.1) | coco(S, 0.68, 0.4, 0.1) | coco(S, 0.5, 0.28, 0.09)
    sp.part(body, "Archaea")
    sp.part(flame(S, 0.5, 0.64, 0.1, 0.12, 3, 0.0), "Anaerobio", highlight=False)
    if face: put_face(sp, 0.5, 0.46, 0.15, 0.065, mood="fierce", iris=(250, 140, 40), mouth="fangs")
    return done(sp)

# ================================================================ Gimnasio 5
def mobilis(S, face=True):
    """Zymomonas mobilis: bastón industrial con casco, tubería de etanol y engranaje."""
    sp = Sprite(S)
    gear = regular(S, 0.22, 0.32, 0.12, 8) | coco(S, 0.22, 0.32, 0.1)
    sp.part(gear, "Biofilm")
    sp.put(coco(S, 0.22, 0.32, 0.04), R("Biofilm", 0))
    body = capsule(S, (0.54, 0.84), (0.54, 0.44), 0.19)
    sp.part(body, "Anaerobio")
    sp.part(ellipse(S, 0.54, 0.32, 0.2, 0.08) & ~ellipse(S, 0.54, 0.42, 0.3, 0.06), "brillo")       # casco
    sp.part(capsule(S, (0.74, 0.6), (0.92, 0.6), 0.04), "Biofilm")
    for x, y, r in ((0.94, 0.48, 0.03), (0.88, 0.4, 0.02)):
        sp.part(coco(S, x, y, r), "cristal", highlight=False)
    feet(sp, (0.46, 0.62), 0.94, 0.07, 0.04, "Anaerobio")
    if face: put_face(sp, 0.54, 0.5, 0.15, 0.06, mood="fierce", iris=(200, 120, 40), mouth="grin")
    return done(sp)

DESIGNS6 = {
    "tetani": tetani, "cryptospor": cryptospor, "methanosar": methanosar, "sulfurreduc": sulfurreduc, "meningitid": meningitid,
    "pneumonia-k": pneumonia_k, "prowazekii": prowazekii, "mixotricha": mixotricha, "aquaticus": aquaticus, "tardigrad": tardigrad,
    "radiodurans": radiodurans, "colwellia": colwellia, "pyrolobus": pyrolobus, "mobilis": mobilis,
}
