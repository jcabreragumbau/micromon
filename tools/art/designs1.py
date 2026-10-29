"""Diseños a mano (por especie) de las tres líneas iniciales.

Cada función (S, face) -> Sprite usa coordenadas normalizadas, así que sirve a 80 px
(combate) y a 32 px (icono). Los rasgos de criatura (hojas, llamas, cilios, patitas)
dan a cada Microo una silueta reconocible al estilo de los Pokémon de DS.
"""
import math
import numpy as np
from pix import Sprite, ellipse, capsule, polygon, regular, bezier, stroke, wave, shift, dilate, RAMPS

# ---------------------------------------------------------------- piezas de criatura
def leaf(S, base, tip, width):
    """Hoja con forma de lanza entre base y punta."""
    (bx, by), (tx, ty) = base, tip
    dx, dy = tx - bx, ty - by
    L = math.hypot(dx, dy) or 1
    nx, ny = -dy / L * width, dx / L * width
    left = bezier([(bx, by), (bx + dx * 0.4 + nx, by + dy * 0.4 + ny), (tx, ty)], 24)
    right = bezier([(tx, ty), (bx + dx * 0.4 - nx, by + dy * 0.4 - ny), (bx, by)], 24)
    return polygon(S, left + right)

def flame(S, cx, cy, h, w, tongues=3, lean=0.0):
    """Llama de varias lenguas que sube desde (cx, cy)."""
    pts = [(cx - w, cy)]
    for k in range(tongues):
        t = (k + 0.5) / tongues
        x = cx - w + 2 * w * t
        hh = h * (0.65 + 0.35 * math.sin(math.pi * t))
        pts += [(x - w / tongues * 0.6, cy - hh * 0.45), (x + lean * h, cy - hh), (x + w / tongues * 0.6, cy - hh * 0.45)]
    pts.append((cx + w, cy))
    pts += [(cx + w * 0.7, cy + h * 0.15), (cx, cy + h * 0.22), (cx - w * 0.7, cy + h * 0.15)]
    return polygon(S, pts)

def feet(sp, xs, y, rx, ry, ramp):
    for x in xs:
        sp.part(ellipse(sp.S, x, y, rx, ry), ramp, behind=True, highlight=False)

def arms(sp, pts, r, ramp):
    for a, b in pts:
        sp.part(capsule(sp.S, a, b, r), ramp, behind=True, highlight=False)

def put_face(sp, cx, cy, gap, size, mood="happy", iris=None, mouth="smile", blush=False, mw=0.04):
    if iris: sp.iris = iris
    sp.eyes(cx, cy, gap, size, mood=mood)
    sp.mouth(cx, cy + size * 1.75, mw, mouth)
    if blush: sp.blush(cx, cy + size * 1.25, gap * 1.6)

def stripes(sp, mask, pts_list, width, color):
    for pts in pts_list:
        sp.put(stroke(sp.S, pts, width) & mask & ~dilate(~mask), color)

R = lambda name, k: RAMPS[name][k]

# ---------------------------------------------------------------- línea Fotótrofo
def synechoc(S, face=True):
    sp = Sprite(S)
    # brote de dos hojas
    sp.part(stroke(S, [(0.5, 0.44), (0.5, 0.36)], 0.022), "Fotótrofo", highlight=False)
    sp.part(leaf(S, (0.5, 0.37), (0.33, 0.25), 0.07), "Fotótrofo")
    sp.part(leaf(S, (0.5, 0.37), (0.66, 0.22), 0.075), "Fotótrofo")
    body = capsule(S, (0.36, 0.63), (0.64, 0.61), 0.2)
    sp.part(body, "Fotótrofo")
    # tilacoides: arcos claros concéntricos en la mitad inferior
    stripes(sp, body, [bezier([(0.24, 0.66 + k * 0.04), (0.5, 0.86 + k * 0.03), (0.76, 0.64 + k * 0.04)], 30) for k in (-0.6, 0.6)], 1.2 / S, R("Fotótrofo", 3))
    feet(sp, (0.4, 0.6), 0.81, 0.07, 0.045, "Fotótrofo")
    if face: put_face(sp, 0.5, 0.58, 0.18, 0.07, iris=(70, 140, 60), blush=True)
    sp.outline_all()
    return sp

def anabaen(S, face=True):
    sp = Sprite(S)
    sp.part(ellipse(S, 0.22, 0.74, 0.1, 0.09), "Fotótrofo")
    het = ellipse(S, 0.4, 0.7, 0.12, 0.11)
    sp.part(het, "Simbionte")                                        # heterocisto
    sp.put(ellipse(S, 0.4, 0.7, 0.06, 0.055) & het, R("Simbionte", 3))
    for k, (x, y) in enumerate(((0.57, 0.36), (0.66, 0.28), (0.76, 0.34))):   # cresta de hojas
        sp.part(leaf(S, (0.64, 0.44), (x, y - 0.06), 0.05), "Fotótrofo")
    head = ellipse(S, 0.63, 0.55, 0.19, 0.17)
    sp.part(head, "Fotótrofo")
    stripes(sp, head, [bezier([(0.46, 0.6), (0.63, 0.74), (0.8, 0.58)], 30)], 1.2 / S, R("Fotótrofo", 3))
    feet(sp, (0.2, 0.4, 0.58, 0.72), 0.83, 0.055, 0.04, "Fotótrofo")
    if face: put_face(sp, 0.63, 0.53, 0.17, 0.065, iris=(70, 140, 60))
    sp.outline_all()
    return sp

def spirulmax(S, face=True):
    sp = Sprite(S)
    path = bezier([(0.12, 0.86), (0.55, 0.93), (0.92, 0.72), (0.2, 0.5), (0.65, 0.25)], 90)
    body = stroke(S, path, 0.2)
    sp.part(body, "Fotótrofo")
    # bandas helicoidales y placas de biofilm en el lomo
    for k in range(6, len(path) - 12, 9):
        (x, y), (x2, y2) = path[k], path[k + 1]
        dx, dy = x2 - x, y2 - y; L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L
        sp.put(stroke(S, [(x + nx * 0.09, y + ny * 0.09), (x - nx * 0.09 + dx * 3, y - ny * 0.09 + dy * 3)], 1.6 / S) & body, R("Fotótrofo", 0))
    for k in range(10, len(path) - 18, 14):
        x, y = path[k]
        sp.part(regular(S, x, y - 0.07, 0.045, 5, -math.pi / 2), "Biofilm", highlight=False)
    # cabeza con melena de hojas
    for a in range(5):
        ang = math.pi * (1.05 + 0.18 * a)
        sp.part(leaf(S, (0.66, 0.24), (0.66 + math.cos(ang) * 0.26, 0.24 + math.sin(ang) * 0.24), 0.06), "Fotótrofo")
    head = ellipse(S, 0.66, 0.26, 0.17, 0.14)
    sp.part(head, "Fotótrofo")
    sp.part(capsule(S, (0.74, 0.32), (0.86, 0.34), 0.06), "Fotótrofo")   # hocico
    if face: put_face(sp, 0.66, 0.24, 0.15, 0.06, mood="fierce", iris=(200, 60, 40), mouth="fangs", mw=0.045)
    sp.outline_all()
    return sp

# ---------------------------------------------------------------- línea Anaerobio
def butyricum(S, face=True):
    sp = Sprite(S)
    for (x, y, dx, dy) in ((0.22, 0.66, -0.16, 0.1), (0.3, 0.76, -0.08, 0.14), (0.34, 0.56, -0.14, -0.12)):
        sp.lines(stroke(S, wave((x, y), (x + dx, y + dy), 0.02, 2), 1.1 / S), R("Anaerobio", 2))
    sp.part(flame(S, 0.7, 0.32, 0.2, 0.09, 3, 0.05), "Anaerobio", highlight=False)
    sp.put(flame(S, 0.7, 0.32, 0.11, 0.045, 2, 0.04), R("brillo", 2))
    sp.part(capsule(S, (0.28, 0.66), (0.56, 0.58), 0.13), "Anaerobio")
    sp.part(ellipse(S, 0.7, 0.5, 0.17, 0.18), "brillo")              # espora terminal
    feet(sp, (0.36, 0.52), 0.79, 0.06, 0.04, "Anaerobio")
    if face: put_face(sp, 0.7, 0.5, 0.14, 0.06, iris=(200, 90, 30), mouth="open", blush=True, mw=0.035)
    sp.outline_all()
    return sp

def acetobuty(S, face=True):
    sp = Sprite(S)
    # cola de llama
    sp.part(flame(S, 0.26, 0.8, 0.22, 0.07, 2, -0.06), "Anaerobio", highlight=False)
    sp.part(flame(S, 0.5, 0.2, 0.2, 0.11, 3, 0.02), "Anaerobio", highlight=False)
    sp.put(flame(S, 0.5, 0.2, 0.1, 0.06, 2, 0.02), R("brillo", 2))
    body = capsule(S, (0.5, 0.78), (0.5, 0.5), 0.15)
    sp.part(body, "Anaerobio")
    sp.put(ellipse(S, 0.5, 0.68, 0.08, 0.1) & body, R("brillo", 3))   # vientre claro
    for x in (0.33, 0.67):                                             # hombreras de espora
        sp.part(ellipse(S, x, 0.52, 0.07, 0.06), "Esporulado")
    sp.part(ellipse(S, 0.5, 0.36, 0.17, 0.16), "brillo")
    arms(sp, [((0.37, 0.6), (0.26, 0.66)), ((0.63, 0.6), (0.74, 0.66))], 0.035, "Anaerobio")
    feet(sp, (0.42, 0.58), 0.93, 0.07, 0.045, "Anaerobio")
    if face: put_face(sp, 0.5, 0.35, 0.15, 0.06, iris=(200, 90, 30), mouth="smile")
    sp.outline_all()
    return sp

def thermocel(S, face=True):
    sp = Sprite(S)
    sp.part(flame(S, 0.5, 0.26, 0.28, 0.2, 5, 0.0), "Anaerobio", highlight=False)
    sp.put(flame(S, 0.5, 0.26, 0.16, 0.12, 3, 0.0), R("brillo", 2))
    torso = capsule(S, (0.5, 0.8), (0.5, 0.52), 0.21)
    sp.part(torso, "Extremófilo")
    # grietas de lava
    for pts in ([(0.38, 0.6), (0.44, 0.68), (0.4, 0.78)], [(0.6, 0.58), (0.56, 0.7), (0.63, 0.8)], [(0.5, 0.66), (0.5, 0.74)]):
        sp.put(stroke(S, pts, 1.6 / S) & torso, R("brillo", 2))
    for x in (0.27, 0.73):
        sp.part(ellipse(S, x, 0.54, 0.09, 0.08), "Anaerobio")
    sp.part(ellipse(S, 0.5, 0.38, 0.19, 0.16), "brillo")
    arms(sp, [((0.3, 0.62), (0.16, 0.74)), ((0.7, 0.62), (0.84, 0.74))], 0.05, "Extremófilo")
    for x in (0.16, 0.84):
        sp.part(ellipse(S, x, 0.76, 0.05, 0.05), "Anaerobio", highlight=False)
    feet(sp, (0.38, 0.62), 0.95, 0.09, 0.045, "Extremófilo")
    if face: put_face(sp, 0.5, 0.37, 0.16, 0.06, mood="fierce", iris=(240, 160, 30), mouth="fangs", mw=0.05)
    sp.outline_all()
    return sp

# ---------------------------------------------------------------- línea Protozoo
def _cilia(sp, mask, length, color, step=3):
    edge = dilate(mask) & ~mask
    ys, xs = np.where(edge)
    cy, cx = ys.mean(), xs.mean()
    S = sp.S
    cil = np.zeros_like(mask)
    for i in range(0, len(ys), step if S > 40 else 2):
        y, x = ys[i], xs[i]
        v = np.array([x - cx, y - cy]); v = v / (np.linalg.norm(v) or 1)
        q = ((x + 0.5) / S, (y + 0.5) / S)
        cil |= stroke(S, [q, (q[0] + v[0] * length + v[1] * 0.01, q[1] + v[1] * length - v[0] * 0.01)], 1.0 / S)
    sp.lines(cil & ~mask, color)

def paramec(S, face=True):
    sp = Sprite(S)
    body = ellipse(S, 0.5, 0.58, 0.23, 0.3, 0.35) & ~ellipse(S, 0.69, 0.62, 0.07, 0.12, 0.35)
    _cilia(sp, body, 0.045, R("Protozoo", 2))
    sp.part(body, "Protozoo")
    sp.put(ellipse(S, 0.45, 0.7, 0.07, 0.045, 0.3) & body, R("Protozoo", 0))
    sp.put((regular(S, 0.38, 0.4, 0.05, 5) | ellipse(S, 0.38, 0.4, 0.022, 0.022)) & body, R("Protozoo", 3))
    feet(sp, (0.4, 0.58), 0.87, 0.06, 0.04, "Protozoo")
    if face: put_face(sp, 0.49, 0.52, 0.15, 0.065, iris=(40, 90, 190), blush=True)
    sp.outline_all()
    return sp

def vorticel(S, face=True):
    sp = Sprite(S)
    spring = [(0.5 + 0.05 * math.sin(t * 9), 0.92 - t * 0.34) for t in np.linspace(0, 1, 50)]
    sp.part(stroke(S, spring, 0.03), "Protozoo", highlight=False)
    sp.part(ellipse(S, 0.5, 0.93, 0.08, 0.035), "Protozoo", highlight=False)
    bell = polygon(S, [(0.28, 0.32), (0.72, 0.32), (0.62, 0.56), (0.5, 0.62), (0.38, 0.56)]) | ellipse(S, 0.5, 0.33, 0.23, 0.07)
    # fuente de cilios en la boca de la campana
    for k in range(9):
        a = math.pi * (1.1 + 0.8 * k / 8)
        sp.lines(stroke(S, bezier([(0.5 + math.cos(a) * 0.18, 0.3), (0.5 + math.cos(a) * 0.3, 0.12), (0.5 + math.cos(a) * 0.38, 0.2)], 12), 1.2 / S), R("Protozoo", 2))
    sp.part(bell, "Protozoo")
    sp.put(ellipse(S, 0.5, 0.33, 0.19, 0.045) & bell, R("Protozoo", 0))
    arms(sp, [((0.32, 0.46), (0.2, 0.52)), ((0.68, 0.46), (0.8, 0.52))], 0.03, "Protozoo")
    if face: put_face(sp, 0.5, 0.45, 0.15, 0.06, iris=(40, 90, 190))
    sp.outline_all()
    return sp

def stentorox(S, face=True):
    sp = Sprite(S)
    body = polygon(S, [(0.2, 0.22), (0.8, 0.22), (0.62, 0.6), (0.57, 0.86), (0.43, 0.86), (0.38, 0.6)]) | ellipse(S, 0.5, 0.22, 0.3, 0.08)
    _cilia(sp, ellipse(S, 0.5, 0.2, 0.3, 0.08), 0.06, R("Protozoo", 3), 2)
    sp.part(body, "Protozoo")
    stripes(sp, body, [[(0.3 + 0.08 * k, 0.26), (0.44 + 0.03 * k, 0.84)] for k in range(6)], 1.4 / S, R("Protozoo", 1))
    sp.put(ellipse(S, 0.5, 0.22, 0.25, 0.05) & body, R("Protozoo", 0))
    for k in range(5):                                                   # macronúcleo en rosario
        sp.put(ellipse(S, 0.58 - k * 0.012, 0.42 + k * 0.08, 0.025, 0.025) & body, R("Simbionte", 2))
    sp.part(ellipse(S, 0.5, 0.9, 0.12, 0.05), "Biofilm", highlight=False)  # pie de fijación
    arms(sp, [((0.3, 0.4), (0.12, 0.5)), ((0.7, 0.4), (0.88, 0.5))], 0.045, "Protozoo")
    if face: put_face(sp, 0.5, 0.36, 0.17, 0.065, mood="fierce", iris=(230, 200, 60), mouth="fangs", mw=0.05)
    sp.outline_all()
    return sp

DESIGNS1 = {"synechoc": synechoc, "anabaen": anabaen, "spirulmax": spirulmax,
            "butyricum": butyricum, "acetobuty": acetobuty, "thermocel": thermocel,
            "paramec": paramec, "vorticel": vorticel, "stentorox": stentorox}
