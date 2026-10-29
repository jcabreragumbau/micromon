"""Generadores por familia morfológica para los 162 Microos (sprites provisionales).

Cada familia dibuja el cuerpo con parámetros (forma, flagelos, cápsula, esporas…) y
devuelve dónde va la cara. La fase evolutiva cambia tamaño, detalle y expresión.
Los diseños a mano de microos.py tienen prioridad sobre estos.
"""
import math, hashlib
import numpy as np
from pix import (Sprite, ellipse, capsule, polygon, regular, bezier, stroke, wave, shift, dilate, RAMPS, OUTLINE, WHITE)

def rnd(seed, n=0):
    return int(hashlib.sha256(f"{seed}:{n}".encode()).hexdigest()[:8], 16) / 0xFFFFFFFF

class Ctx:
    """Transforma coordenadas de diseño (centradas en 0.5, 0.56) según la escala de la fase."""
    def __init__(self, S, z, cy=0.56):
        self.S, self.z, self.cy = S, z, cy
    def p(self, x, y):
        return (0.5 + (x - 0.5) * self.z, self.cy + (y - self.cy) * self.z)
    def r(self, v):
        return v * self.z
    def w(self, px):  # grosor de trazo en píxeles a 64 px
        return max(1.0, px * self.S / 64) / self.S

# ---------------------------------------------------------------- piezas comunes
def flagellum(sp, c, a, b, ramp, amp=0.02, waves=2.0, px=1.2):
    sp.lines(stroke(sp.S, wave(c.p(*a), c.p(*b), c.r(amp), waves), c.w(px)), RAMPS[ramp][0])

def capsule_halo(sp, mask, ramp):
    halo = dilate(dilate(dilate(mask))) if sp.S >= 48 else dilate(dilate(mask))
    sp.part(halo & ~mask, ramp, highlight=False)

def face_for(mask):
    ys, xs = np.where(mask)
    S = mask.shape[0]
    return ((xs.mean() + 0.5) / S, (ys.mean() + 0.5) / S, (xs.max() - xs.min() + 1) / S, (ys.max() - ys.min() + 1) / S)

# ---------------------------------------------------------------- familias
def bacilo(sp, c, P, r1, r2, seed):
    L, T = P.get("len", 0.30), P.get("thick", 0.13)
    tilt = P.get("tilt", -0.12)
    n = P.get("chain", 1)
    segs = []
    total = L * n + 0.04 * (n - 1)
    x0 = 0.5 - total / 2
    for i in range(n):
        xa = x0 + i * (L + 0.04)
        ya = 0.58 - tilt * (xa - 0.5)
        yb = 0.58 - tilt * (xa + L - 0.5)
        segs.append(((xa + T * 0.8, ya), (xa + L - T * 0.8, yb)))
    fl = P.get("flag", "none")
    a0, b0 = segs[0][0], segs[-1][1]
    if fl in ("polar", "lofo", "bipolar"):
        k = 3 if fl == "lofo" else 1
        for j in range(k):
            flagellum(sp, c, (b0[0] + T * 0.7, b0[1] + (j - (k - 1) / 2) * 0.04), (b0[0] + 0.28, b0[1] - 0.08 + j * 0.06), r2, waves=2.2)
        if fl == "bipolar":
            flagellum(sp, c, (a0[0] - T * 0.7, a0[1]), (a0[0] - 0.26, a0[1] + 0.08), r2, waves=2.2)
    elif fl == "peri":
        for j in range(5):
            t = (j + 0.5) / 5
            x = a0[0] + (b0[0] - a0[0]) * t
            y = a0[1] + (b0[1] - a0[1]) * t
            s = -1 if j % 2 else 1
            flagellum(sp, c, (x, y + s * T * 0.8), (x - 0.06, y + s * (T + 0.15)), r2, amp=0.015, waves=1.5, px=1.0)
    body = np.zeros((sp.S, sp.S), bool)
    for a, b in segs:
        body |= capsule(sp.S, c.p(*a), c.p(*b), c.r(T))
    if P.get("capsula"):
        capsule_halo(sp, body, P.get("capsula_ramp", "cristal"))
    for a, b in segs:
        sp.part(capsule(sp.S, c.p(*a), c.p(*b), c.r(T)), r1)
    sporep = P.get("spore")
    if sporep:
        a, b = segs[-1]
        pos = b if sporep == "terminal" else ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        if sporep == "terminal": pos = (b[0] + T * 0.5, b[1])
        sp.part(ellipse(sp.S, *c.p(*pos), c.r(T * 1.15), c.r(T * 1.2)), "brillo")
    if P.get("stripes"):
        for a, b in segs:
            for k in range(1, 4):
                t = k / 4
                x = a[0] + (b[0] - a[0]) * t
                y = a[1] + (b[1] - a[1]) * t
                sp.put(stroke(sp.S, [c.p(x, y - T * 0.7), c.p(x, y + T * 0.7)], c.w(1)) & body & ~dilate(~body), RAMPS[r1][0])
    if P.get("pili"):
        edge = dilate(body) & ~body
        ys, xs = np.where(edge)
        for i in range(0, len(ys), max(3, len(ys) // 14)):
            y, x = ys[i], xs[i]
            cy, cx = np.where(body)[0].mean(), np.where(body)[1].mean()
            v = np.array([x - cx, y - cy]); v = v / (np.linalg.norm(v) or 1)
            q = ((x + 0.5) / sp.S, (y + 0.5) / sp.S)
            sp.put(stroke(sp.S, [q, (q[0] + v[0] * 2.5 / 64, q[1] + v[1] * 2.5 / 64)], c.w(1)) & ~body, RAMPS[r2][0])
    seg = segs[n // 2]
    fx = (seg[0][0] + seg[1][0]) / 2 + (T * 0.4 if n == 1 else 0)
    fy = (seg[0][1] + seg[1][1]) / 2
    fx, fy = c.p(fx, fy)
    return (fx, fy - c.r(T * 0.15), c.r(min(0.16, L * 0.45)), c.r(min(0.06, T * 0.42)))

def coco(sp, c, P, r1, r2, seed):
    arr = P.get("arr", "single")
    R = P.get("r", 0.2)
    pts = {"single": [(0.5, 0.56)], "diplo": [(0.38, 0.56), (0.62, 0.56)],
           "cadena": [(0.22, 0.62), (0.4, 0.56), (0.6, 0.56), (0.78, 0.62)],
           "racimo": [(0.36, 0.44), (0.62, 0.42), (0.28, 0.66), (0.72, 0.66), (0.5, 0.6)],
           "tetrada": [(0.38, 0.44), (0.62, 0.44), (0.38, 0.68), (0.62, 0.68)],
           "cubo": [(0.36, 0.42), (0.64, 0.42), (0.36, 0.7), (0.64, 0.7), (0.5, 0.56)]}[arr]
    if arr != "single": R = P.get("r", 0.13)
    allm = np.zeros((sp.S, sp.S), bool)
    for (x, y) in pts:
        allm |= ellipse(sp.S, *c.p(x, y), c.r(R), c.r(R))
    if P.get("capsula"):
        capsule_halo(sp, allm, P.get("capsula_ramp", "cristal"))
    main = None
    order = sorted(pts, key=lambda p: (p[1], p[0]))
    for (x, y) in order:
        m = ellipse(sp.S, *c.p(x, y), c.r(R), c.r(R))
        sp.part(m, r1 if (x, y) != order[-1] or arr == "single" else r1)
        main = (x, y)
    fx, fy = c.p(*(pts[-1] if arr in ("racimo", "cubo") else pts[len(pts) // 2] if arr != "diplo" else pts[1]))
    if arr == "single" and P.get("pili"):
        for k in range(10):
            ang = 2 * math.pi * k / 10
            q0 = c.p(0.5 + math.cos(ang) * R, 0.56 + math.sin(ang) * R)
            q1 = c.p(0.5 + math.cos(ang) * (R + 0.07), 0.56 + math.sin(ang) * (R + 0.07))
            sp.lines(stroke(sp.S, [q0, q1], c.w(1.2)), RAMPS[r2][0])
        sp.part(ellipse(sp.S, *c.p(0.5, 0.56), c.r(R), c.r(R)), r1)
    if P.get("halo2"):
        sp.put(ellipse(sp.S, *c.p(0.5, 0.56), c.r(R * 0.45), c.r(R * 0.45)) & sp.filled, RAMPS[r2][2])
    return (fx, fy, c.r(R * 0.9), c.r(min(0.065, R * 0.35)))

def espirilo(sp, c, P, r1, r2, seed):
    turns, amp, T = P.get("turns", 2.5), P.get("amp", 0.09), P.get("thick", 0.06)
    pts = wave((0.18, 0.6), (0.82, 0.5), amp, turns, 80)
    pts = [c.p(*q) for q in pts]
    body = stroke(sp.S, pts, c.r(T * 2))
    if P.get("flag", True):
        sp.lines(stroke(sp.S, wave(pts[-1], (pts[-1][0] + c.r(0.12), pts[-1][1] - c.r(0.1)), c.r(0.02), 2), c.w(1.2)), RAMPS[r2][0])
        sp.lines(stroke(sp.S, wave(pts[0], (pts[0][0] - c.r(0.12), pts[0][1] + c.r(0.1)), c.r(0.02), 2), c.w(1.2)), RAMPS[r2][0])
    sp.part(body, r1)
    head = pts[int(len(pts) * 0.72)]
    if P.get("head", True):
        hm = ellipse(sp.S, head[0], head[1], c.r(0.11), c.r(0.1))
        sp.part(hm, r1)
        return (head[0], head[1], c.r(0.1), c.r(0.045))
    return (head[0], head[1], c.r(0.08), c.r(0.04))

def vibrio(sp, c, P, r1, r2, seed):
    pts = [c.p(*q) for q in bezier([(0.26, 0.5), (0.45, 0.78), (0.72, 0.6)], 40)]
    tip = pts[-1]
    sp.lines(stroke(sp.S, wave(tip, (tip[0] + c.r(0.18), tip[1] - c.r(0.22)), c.r(0.025), 2.5), c.w(1.3)), RAMPS[r2][0])
    body = stroke(sp.S, pts, c.r(P.get("thick", 0.13) * 2))
    sp.part(body, r1)
    if P.get("glow"):
        sp.put(body & ~dilate(~body) & shift(body, 0, 2), RAMPS[r2][3])
    fx, fy, _, _ = face_for(body)
    return (fx, fy - c.r(0.02), c.r(0.14), c.r(0.055))

def levadura(sp, c, P, r1, r2, seed):
    buds = P.get("buds", 1)
    main = ellipse(sp.S, *c.p(0.48, 0.58), c.r(0.22), c.r(0.2))
    if P.get("capsula"):
        capsule_halo(sp, main, P.get("capsula_ramp", "cristal"))
    if P.get("hifas"):
        for k in range(3):
            flagellum(sp, c, (0.3, 0.7 - k * 0.05), (0.12, 0.78 - k * 0.12), r1, amp=0.01, waves=1, px=2)
    for i in range(buds):
        ang = -0.7 + i * 0.9
        bx, by = 0.48 + math.cos(ang) * 0.27, 0.58 + math.sin(ang) * 0.24 - 0.04
        rr = 0.1 - i * 0.02
        sp.part(ellipse(sp.S, *c.p(bx, by), c.r(rr), c.r(rr * 0.95)), r1)
    sp.part(main, r1)
    # cicatrices de gemación
    sp.put(ellipse(sp.S, *c.p(0.34, 0.68), c.r(0.03), c.r(0.02)) & main, RAMPS[r1][0])
    if P.get("vacuola"):
        sp.put(ellipse(sp.S, *c.p(0.56, 0.66), c.r(0.06), c.r(0.045)) & main, RAMPS[r2][2])
    return (*c.p(0.47, 0.55), c.r(0.17), c.r(0.06))

def moho(sp, c, P, r1, r2, seed):
    kind = P.get("head", "esporangio")
    n = P.get("stalks", 1)
    xs = [0.5] if n == 1 else [0.34, 0.66] if n == 2 else [0.28, 0.5, 0.72]
    sp.part(ellipse(sp.S, *c.p(0.5, 0.88), c.r(0.24), c.r(0.05)), r1, highlight=False)
    face_head = None
    for i, x in enumerate(xs):
        top = 0.36 if i == len(xs) // 2 else 0.46
        sp.part(capsule(sp.S, c.p(x, 0.86), c.p(x, top + 0.08), c.r(0.035)), r1, highlight=False)
        if kind == "esporangio":
            h = ellipse(sp.S, *c.p(x, top), c.r(0.13), c.r(0.12))
            sp.part(h, r2 if P.get("head_r2") else "esporangio" if P.get("negro") else r1)
            for k in range(6):
                sp.put(ellipse(sp.S, *c.p(x - 0.07 + 0.05 * (k % 3), top - 0.04 + 0.06 * (k // 3)), c.r(0.015), c.r(0.015)) & h, RAMPS[r1][3])
        elif kind == "conidios":   # Aspergillus: cabeza radial
            h = ellipse(sp.S, *c.p(x, top), c.r(0.1), c.r(0.1))
            for k in range(9):
                ang = math.pi * (k / 8)
                sp.part(ellipse(sp.S, *c.p(x - math.cos(ang) * 0.13, top - math.sin(ang) * 0.12), c.r(0.035), c.r(0.035)), r2, highlight=False)
            sp.part(h, r1)
        elif kind == "pincel":     # Penicillium: cadenas en pincel
            for k in range(5):
                dx = (k - 2) * 0.05
                for j in range(3):
                    sp.part(ellipse(sp.S, *c.p(x + dx * (1 + j * 0.3), top - 0.04 - j * 0.06), c.r(0.028), c.r(0.028)), r2, highlight=False)
            h = ellipse(sp.S, *c.p(x, top + 0.04), c.r(0.09), c.r(0.06))
            sp.part(h, r1)
        elif kind == "seta":
            h = polygon(sp.S, [c.p(x - 0.22, top + 0.05), c.p(x - 0.15, top - 0.1), c.p(x, top - 0.15), c.p(x + 0.15, top - 0.1), c.p(x + 0.22, top + 0.05)])
            sp.part(h, r2)
        if i == len(xs) // 2:
            face_head = c.p(x, top + (0.02 if kind != "seta" else -0.04))
    return (face_head[0], face_head[1], c.r(0.13), c.r(0.045))

def actinomiceto(sp, c, P, r1, r2, seed):
    # micelio ramificado con cadenas de esporas en espiral
    rng = [rnd(seed, i) for i in range(30)]
    trunk = [(0.5, 0.88), (0.48, 0.66), (0.52, 0.46)]
    sp.part(stroke(sp.S, [c.p(*q) for q in trunk], c.r(0.07)), r1, highlight=False)
    for k in range(4):
        y = 0.8 - k * 0.11
        s = -1 if k % 2 else 1
        br = [(0.5, y), (0.5 + s * 0.16, y - 0.06), (0.5 + s * (0.22 + rng[k] * 0.06), y - 0.15)]
        sp.part(stroke(sp.S, [c.p(*q) for q in br], c.r(0.04)), r1, highlight=False)
        for j in range(4):
            q = c.p(br[-1][0] + s * 0.02 * j, br[-1][1] - 0.035 * j)
            sp.part(ellipse(sp.S, q[0], q[1], c.r(0.025), c.r(0.025)), r2, highlight=False)
    head = ellipse(sp.S, *c.p(0.52, 0.38), c.r(0.15), c.r(0.13))
    sp.part(head, r1)
    return (*c.p(0.52, 0.38), c.r(0.14), c.r(0.05))

def fago(sp, c, P, r1, r2, seed):
    tail = P.get("tail", "larga")
    hs = P.get("head", 0.16)
    hy = 0.3 if tail != "ninguna" else 0.52
    if tail != "ninguna":
        tl = 0.32 if tail == "larga" else 0.16
        if P.get("fibers", True):
            for side in (-1, 1):
                for kx, fx in ((0.12, 0.22), (0.18, 0.3)):
                    sp.part(stroke(sp.S, [c.p(0.5, hy + hs + tl), c.p(0.5 + side * kx, hy + hs + tl - 0.03), c.p(0.5 + side * fx, hy + hs + tl + 0.12)], c.w(2)), r2, highlight=False, flat=True)
        sheath = polygon(sp.S, [c.p(0.46, hy + hs * 0.8), c.p(0.54, hy + hs * 0.8), c.p(0.54, hy + hs + tl), c.p(0.46, hy + hs + tl)])
        sp.part(sheath, r2, highlight=False)
        if tail == "larga" and P.get("rings", True):
            for k in range(4):
                y = hy + hs + 0.05 + k * tl / 4.5
                sp.put(stroke(sp.S, [c.p(0.46, y), c.p(0.54, y)], c.w(1)) & sheath, RAMPS[r2][0])
    shape = P.get("shape", "icosa")
    if shape == "icosa":
        head = regular(sp.S, *c.p(0.5, hy), c.r(hs), 6, math.pi / 2)
    elif shape == "prolate":
        head = polygon(sp.S, [c.p(0.5, hy - hs * 1.4), c.p(0.5 + hs, hy - hs * 0.8), c.p(0.5 + hs, hy + hs * 0.7), c.p(0.5, hy + hs * 1.2), c.p(0.5 - hs, hy + hs * 0.7), c.p(0.5 - hs, hy - hs * 0.8)])
    else:
        head = ellipse(sp.S, *c.p(0.5, hy), c.r(hs), c.r(hs))
    sp.part(head, r1, highlight=False)
    left = head & polygon(sp.S, [c.p(0.2, 0), c.p(0.5, 0), c.p(0.5, 1), c.p(0.2, 1)])
    sp.put(left & ~dilate(~head), RAMPS[r1][2])
    sp.put(stroke(sp.S, [c.p(0.5, hy - hs), c.p(0.5, hy + hs)], c.w(1)) & head, RAMPS[r1][0])
    return (*c.p(0.5, hy + hs * 0.15), c.r(hs * 0.9), c.r(min(0.055, hs * 0.33)))

def virus_env(sp, c, P, r1, r2, seed):
    form = P.get("form", "esfera")
    if form == "bala":   # rabdovirus
        body = capsule(sp.S, c.p(0.5, 0.36), c.p(0.5, 0.74), c.r(0.17)) & ~polygon(sp.S, [c.p(0, 0.8), c.p(1, 0.8), c.p(1, 1), c.p(0, 1)])
    elif form == "filamento":
        pts = [c.p(*q) for q in bezier([(0.2, 0.75), (0.25, 0.25), (0.72, 0.2), (0.8, 0.5), (0.62, 0.62)], 60)]
        body = stroke(sp.S, pts, c.r(0.13))
    elif form == "ladrillo":
        body = polygon(sp.S, [c.p(0.3, 0.38), c.p(0.7, 0.38), c.p(0.74, 0.76), c.p(0.26, 0.76)])
    elif form == "anfora":
        body = ellipse(sp.S, *c.p(0.5, 0.58), c.r(0.24), c.r(0.32)) | ellipse(sp.S, *c.p(0.5, 0.26), c.r(0.08), c.r(0.06))
    else:
        body = ellipse(sp.S, *c.p(0.5, 0.56), c.r(0.24), c.r(0.24))
    if P.get("spikes", True) and form not in ("filamento",):
        edge = dilate(body) & ~body
        ys, xs = np.where(edge)
        cyc, cxc = np.where(body)[0].mean(), np.where(body)[1].mean()
        step = max(3, len(ys) // 16)
        for i in range(0, len(ys), step):
            y, x = ys[i], xs[i]
            v = np.array([x - cxc, y - cyc]); v = v / (np.linalg.norm(v) or 1)
            q0 = ((x + 0.5) / sp.S, (y + 0.5) / sp.S)
            q1 = (q0[0] + v[0] * c.r(0.06), q0[1] + v[1] * c.r(0.06))
            sp.lines(stroke(sp.S, [q0, q1], c.w(1.4)), RAMPS[r2][1])
            sp.put(ellipse(sp.S, q1[0], q1[1], c.w(1.4), c.w(1.4)), RAMPS[r2][2])
    sp.part(body, r1)
    if form in ("esfera", "ladrillo", "anfora"):
        sp.put(ellipse(sp.S, *c.p(0.5, 0.62), c.r(0.1), c.r(0.07)) & body & ~dilate(~body), RAMPS[r2][0])
    fx, fy, _, _ = face_for(body)
    if form == "filamento": fx, fy = c.p(0.3, 0.42)
    return (fx, fy - c.r(0.04), c.r(0.15), c.r(0.055))

def ciliado(sp, c, P, r1, r2, seed):
    form = P.get("form", "zapatilla")
    if form == "campana":   # Vorticella: campana sobre pedúnculo contráctil
        sp.part(stroke(sp.S, [c.p(*q) for q in wave((0.5, 0.9), (0.5, 0.62), 0.03, 3)], c.w(2)), r2, highlight=False, flat=True)
        body = polygon(sp.S, [c.p(0.3, 0.36), c.p(0.7, 0.36), c.p(0.6, 0.62), c.p(0.4, 0.62)]) | ellipse(sp.S, *c.p(0.5, 0.36), c.r(0.21), c.r(0.06))
    elif form == "trompeta":  # Stentor
        body = polygon(sp.S, [c.p(0.22, 0.28), c.p(0.78, 0.28), c.p(0.58, 0.62), c.p(0.54, 0.88), c.p(0.46, 0.88), c.p(0.42, 0.62)]) | ellipse(sp.S, *c.p(0.5, 0.28), c.r(0.28), c.r(0.07))
    else:
        body = ellipse(sp.S, *c.p(0.5, 0.56), c.r(0.22), c.r(0.32), 0.35) & ~ellipse(sp.S, *c.p(0.67, 0.6), c.r(0.06), c.r(0.12), 0.35)
    edge = dilate(body) & ~body
    ys, xs = np.where(edge)
    cyc, cxc = ys.mean(), xs.mean()
    cil = np.zeros_like(body)
    for i in range(0, len(ys), 2 if sp.S <= 32 else 3):
        y, x = ys[i], xs[i]
        v = np.array([x - cxc, y - cyc]); v = v / (np.linalg.norm(v) or 1)
        q0 = ((x + 0.5) / sp.S, (y + 0.5) / sp.S)
        cil |= stroke(sp.S, [q0, (q0[0] + v[0] * 3 / 64, q0[1] + v[1] * 3 / 64)], 1.0 / sp.S)
    sp.lines(cil, RAMPS[r1][2])
    sp.part(body, r1)
    sp.put(ellipse(sp.S, *c.p(0.47, 0.6), c.r(0.07), c.r(0.045), 0.3) & body, RAMPS[r1][0])
    if P.get("rayas"):
        for k in range(3):
            sp.put(stroke(sp.S, [c.p(0.35 + k * 0.1, 0.3), c.p(0.45 + k * 0.05, 0.6)], c.w(1)) & body & ~dilate(~body), RAMPS[r2][1])
    fx, fy, _, _ = face_for(body)
    return (fx - c.r(0.02), fy - c.r(0.07 if form != "zapatilla" else 0.02), c.r(0.14), c.r(0.058))

def flagelado(sp, c, P, r1, r2, seed):
    form = P.get("form", "lagrima")
    if form == "tripanosoma":
        pts = [c.p(*q) for q in bezier([(0.18, 0.66), (0.4, 0.42), (0.62, 0.7), (0.84, 0.44)], 50)]
        body = stroke(sp.S, pts, c.r(0.14))
        memb = stroke(sp.S, [(x, y - c.r(0.08)) for x, y in pts[5:-5]], c.r(0.03))
        sp.lines(stroke(sp.S, wave(pts[-1], (pts[-1][0] + c.r(0.1), pts[-1][1] - c.r(0.12)), c.r(0.02), 2), c.w(1.3)), RAMPS[r2][0])
        sp.part(body, r1)
        sp.put(memb & body, RAMPS[r1][3])
        return (*pts[30], c.r(0.1), c.r(0.045))
    body = ellipse(sp.S, *c.p(0.5, 0.58), c.r(0.17), c.r(0.27), -0.4) | ellipse(sp.S, *c.p(0.6, 0.38), c.r(0.1), c.r(0.1))
    tip = c.p(0.66, 0.3)
    sp.lines(stroke(sp.S, wave(tip, (tip[0] + c.r(0.18), tip[1] - c.r(0.2)), c.r(0.025), 2.5), c.w(1.3)), RAMPS[r2][0])
    sp.part(body, r1)
    if P.get("cloro"):
        for k in range(5):
            sp.put(ellipse(sp.S, *c.p(0.42 + 0.05 * (k % 3), 0.6 + 0.06 * (k // 3)), c.r(0.03), c.r(0.022)) & body, RAMPS[r2][1])
    sp.put(ellipse(sp.S, *c.p(0.62, 0.34), c.r(0.022), c.r(0.022)) & body, RAMPS["Antibiótico"][1])  # estigma rojo
    return (*c.p(0.52, 0.5), c.r(0.13), c.r(0.05))

def ameba(sp, c, P, r1, r2, seed):
    rr = [rnd(seed, i) for i in range(12)]
    body = ellipse(sp.S, *c.p(0.5, 0.58), c.r(0.22), c.r(0.18))
    for k in range(P.get("pods", 5)):
        ang = 2 * math.pi * k / P.get("pods", 5) + rr[k]
        body |= capsule(sp.S, c.p(0.5, 0.58), c.p(0.5 + math.cos(ang) * (0.26 + rr[k + 5] * 0.08), 0.58 + math.sin(ang) * (0.22 + rr[k + 5] * 0.06)), c.r(0.07))
    sp.part(body, r1)
    sp.put(ellipse(sp.S, *c.p(0.58, 0.66), c.r(0.07), c.r(0.06)) & body & ~dilate(~body), RAMPS[r2][1])
    for k in range(4):
        sp.put(ellipse(sp.S, *c.p(0.36 + 0.08 * k, 0.72 - 0.03 * (k % 2)), c.r(0.018), c.r(0.018)) & body, RAMPS[r1][3])
    return (*c.p(0.48, 0.54), c.r(0.14), c.r(0.058))

def diatomea(sp, c, P, r1, r2, seed):
    if P.get("form", "pennada") == "radial":
        body = ellipse(sp.S, *c.p(0.5, 0.56), c.r(0.27), c.r(0.27))
        sp.part(body, r1)
        for k in range(12):
            ang = 2 * math.pi * k / 12
            sp.put(stroke(sp.S, [c.p(0.5 + math.cos(ang) * 0.1, 0.56 + math.sin(ang) * 0.1), c.p(0.5 + math.cos(ang) * 0.25, 0.56 + math.sin(ang) * 0.25)], c.w(1)) & body & ~dilate(~body), RAMPS[r1][0])
        ring = ellipse(sp.S, *c.p(0.5, 0.56), c.r(0.1), c.r(0.1))
        sp.part(ring, r2)
        return (*c.p(0.5, 0.54), c.r(0.15), c.r(0.05))
    body = ellipse(sp.S, *c.p(0.5, 0.58), c.r(0.36), c.r(0.14), -0.15)
    sp.part(body, r1)
    for k in range(-5, 6):
        x = 0.5 + k * 0.055
        sp.put(stroke(sp.S, [c.p(x, 0.47), c.p(x - 0.01, 0.69)], c.w(1)) & body & ~dilate(~body), RAMPS[r1][0])
    sp.put(stroke(sp.S, [c.p(0.17, 0.62), c.p(0.83, 0.54)], c.w(1.2)) & body, RAMPS[r2][2])
    return (*c.p(0.5, 0.55), c.r(0.16), c.r(0.05))

def dinoflagelado(sp, c, P, r1, r2, seed):
    body = polygon(sp.S, [c.p(0.5, 0.14), c.p(0.6, 0.38), c.p(0.74, 0.5), c.p(0.68, 0.7), c.p(0.74, 0.92), c.p(0.6, 0.76), c.p(0.4, 0.76), c.p(0.3, 0.92), c.p(0.3, 0.68), c.p(0.26, 0.5), c.p(0.4, 0.38)]) if P.get("cuernos") else ellipse(sp.S, *c.p(0.5, 0.56), c.r(0.24), c.r(0.26))
    sp.part(body, r1)
    sp.put(stroke(sp.S, [c.p(0.24, 0.56), c.p(0.5, 0.6), c.p(0.76, 0.56)], c.w(1.5)) & body, RAMPS[r1][0])
    for k in range(5):
        sp.put(stroke(sp.S, [c.p(0.3 + k * 0.1, 0.4), c.p(0.32 + k * 0.1, 0.52)], c.w(1)) & body & ~dilate(~body), RAMPS[r1][2])
    if P.get("glow"):
        for k in range(6):
            q = c.p(0.2 + 0.12 * k, 0.2 + 0.1 * ((k * 7) % 3))
            sp.put(ellipse(sp.S, q[0], q[1], c.w(1.5), c.w(1.5)), RAMPS["Espiroqueta"][3])
    return (*c.p(0.5, 0.48), c.r(0.14), c.r(0.05))

def radiolario(sp, c, P, r1, r2, seed):
    for k in range(P.get("spines", 14)):
        ang = 2 * math.pi * k / P.get("spines", 14)
        sp.lines(stroke(sp.S, [c.p(0.5, 0.56), c.p(0.5 + math.cos(ang) * 0.42, 0.56 + math.sin(ang) * 0.4)], c.w(1.4)), RAMPS[r2][1])
    body = regular(sp.S, *c.p(0.5, 0.56), c.r(0.22), 8, 0.2)
    sp.part(body, r1)
    for k in range(8):
        ang = 2 * math.pi * k / 8 + 0.2
        sp.put(ellipse(sp.S, *c.p(0.5 + math.cos(ang) * 0.13, 0.56 + math.sin(ang) * 0.13), c.r(0.025), c.r(0.025)) & body, RAMPS[r1][3])
    return (*c.p(0.5, 0.55), c.r(0.14), c.r(0.05))

def colonia(sp, c, P, r1, r2, seed):
    body = ellipse(sp.S, *c.p(0.5, 0.56), c.r(0.3), c.r(0.3))
    sp.part(body, r1)
    for k in range(18):
        ang = 2 * math.pi * k / 18
        sp.put(ellipse(sp.S, *c.p(0.5 + math.cos(ang) * 0.24, 0.56 + math.sin(ang) * 0.24), c.r(0.025), c.r(0.025)) & body, RAMPS[r2][2])
    for (x, y) in ((0.42, 0.66), (0.6, 0.7)):
        sp.part(ellipse(sp.S, *c.p(x, y), c.r(0.07), c.r(0.07)) & body, r2, outline=False)
    return (*c.p(0.5, 0.5), c.r(0.16), c.r(0.058))

def filamento(sp, c, P, r1, r2, seed):
    if P.get("helice"):
        pts = [c.p(*q) for q in wave((0.16, 0.64), (0.84, 0.48), 0.1, 2.5, 80)]
        sp.part(stroke(sp.S, pts, c.r(0.16)), r1)
        for k in range(8):
            q = pts[5 + k * 9]
            sp.put(stroke(sp.S, [(q[0], q[1] - c.r(0.07)), (q[0], q[1] + c.r(0.07))], c.w(1)) & sp.filled, RAMPS[r1][0])
        q = pts[int(len(pts) * 0.5)]
        return (q[0], q[1], c.r(0.12), c.r(0.045))
    beads = P.get("beads", 5)
    pts = [(0.18 + i * (0.64 / (beads - 1)), 0.6 - 0.06 * math.sin(i)) for i in range(beads)]
    for i, (x, y) in enumerate(pts):
        rr = 0.085 if i != P.get("heterocisto", -1) else 0.1
        sp.part(ellipse(sp.S, *c.p(x, y), c.r(rr), c.r(rr * 0.9)), r2 if i == P.get("heterocisto", -1) else r1)
    m = beads // 2
    sp.part(ellipse(sp.S, *c.p(pts[m][0], pts[m][1] - 0.02), c.r(0.15), c.r(0.14)), r1)
    return (*c.p(pts[m][0], pts[m][1] - 0.03), c.r(0.13), c.r(0.05))

def arquea(sp, c, P, r1, r2, seed):
    form = P.get("form", "lobulada")
    if form == "cuadrada":
        body = polygon(sp.S, [c.p(0.26, 0.36), c.p(0.74, 0.34), c.p(0.76, 0.78), c.p(0.24, 0.8)])
    elif form == "disco":
        body = ellipse(sp.S, *c.p(0.5, 0.58), c.r(0.3), c.r(0.18))
    else:
        rr = [rnd(seed, i) for i in range(8)]
        body = ellipse(sp.S, *c.p(0.5, 0.57), c.r(0.24), c.r(0.22))
        for k in range(5):
            ang = 2 * math.pi * k / 5 + rr[k]
            body |= ellipse(sp.S, *c.p(0.5 + math.cos(ang) * 0.14, 0.57 + math.sin(ang) * 0.13), c.r(0.13), c.r(0.12))
    if P.get("pili"):
        for k in range(6):
            ang = -math.pi / 2 + (k - 2.5) * 0.4
            sp.lines(stroke(sp.S, wave(c.p(0.5 + math.cos(ang) * 0.24, 0.57 + math.sin(ang) * 0.22), c.p(0.5 + math.cos(ang) * 0.42, 0.57 + math.sin(ang) * 0.4), c.r(0.015), 1.5), c.w(1)), RAMPS[r2][0])
    sp.part(body, r1)
    if P.get("llama"):
        fl = polygon(sp.S, [c.p(0.38, 0.36), c.p(0.42, 0.18), c.p(0.48, 0.3), c.p(0.54, 0.14), c.p(0.6, 0.3), c.p(0.64, 0.2), c.p(0.66, 0.38)])
        sp.part(fl & ~body, r2, highlight=False)
    sp.put(stroke(sp.S, [c.p(0.3, 0.68), c.p(0.7, 0.66)], c.w(1)) & body & ~dilate(~body), RAMPS[r1][0])
    return (*c.p(0.5, 0.54), c.r(0.16), c.r(0.058))

def tardigrado(sp, c, P, r1, r2, seed):
    for k, x in enumerate((0.26, 0.42, 0.58, 0.74)):
        sp.part(capsule(sp.S, c.p(x, 0.72), c.p(x - 0.02, 0.86), c.r(0.055)), r1, highlight=False)
        for j in range(3):
            sp.put(ellipse(sp.S, *c.p(x - 0.04 + j * 0.03, 0.9), c.w(1), c.w(1.5)), OUTLINE)
    body = capsule(sp.S, c.p(0.28, 0.58), c.p(0.74, 0.58), c.r(0.2))
    sp.part(body, r1)
    for k in range(4):
        x = 0.34 + k * 0.12
        sp.put(stroke(sp.S, [c.p(x, 0.42), c.p(x + 0.02, 0.74)], c.w(1)) & body & ~dilate(~body), RAMPS[r1][0])
    snout = ellipse(sp.S, *c.p(0.82, 0.58), c.r(0.08), c.r(0.07))
    sp.part(snout, r1)
    sp.put(ellipse(sp.S, *c.p(0.86, 0.6), c.r(0.03), c.r(0.03)), OUTLINE)
    return (*c.p(0.68, 0.52), c.r(0.12), c.r(0.045))

def prion(sp, c, P, r1, r2, seed):
    pts = [c.p(*q) for q in bezier([(0.2, 0.3), (0.9, 0.2), (0.1, 0.6), (0.85, 0.85), (0.4, 0.9)], 80)]
    band = stroke(sp.S, pts, c.r(0.13))
    sp.part(band, r1)
    sp.put(stroke(sp.S, pts, c.w(1.5)) & band, RAMPS[r2][2])
    return (*c.p(0.5, 0.48), c.r(0.15), c.r(0.055))

def viroide(sp, c, P, r1, r2, seed):
    ring = ellipse(sp.S, *c.p(0.5, 0.56), c.r(0.32), c.r(0.24)) & ~ellipse(sp.S, *c.p(0.5, 0.56), c.r(0.18), c.r(0.11))
    sp.part(ring, r1)
    for k in range(16):
        ang = 2 * math.pi * k / 16
        sp.put(stroke(sp.S, [c.p(0.5 + math.cos(ang) * 0.19, 0.56 + math.sin(ang) * 0.12), c.p(0.5 + math.cos(ang) * 0.31, 0.56 + math.sin(ang) * 0.23)], c.w(1)) & ring, RAMPS[r2][1])
    return (*c.p(0.5, 0.36), c.r(0.14), c.r(0.045))

def legendario(sp, c, P, r1, r2, seed):
    """Bacilo legendario con armadura, flagelos majestuosos y aura."""
    aura = ellipse(sp.S, *c.p(0.5, 0.56), c.r(0.44), c.r(0.4))
    sp.part(aura & ~ellipse(sp.S, *c.p(0.5, 0.56), c.r(0.4), c.r(0.36)), P.get("aura", "brillo"), highlight=False, outline=False)
    for j in range(6):
        ang = math.pi * (0.15 + 0.14 * j)
        a = c.p(0.5 + math.cos(ang) * 0.2, 0.62 + math.sin(ang) * 0.12)
        sp.lines(stroke(sp.S, wave(a, (a[0] + math.cos(ang) * c.r(0.3), a[1] + math.sin(ang) * c.r(0.25)), c.r(0.03), 2.5), c.w(1.6)), RAMPS[r2][1])
    body = capsule(sp.S, c.p(0.3, 0.6), c.p(0.7, 0.5), c.r(0.17))
    sp.part(body, r1)
    for k in range(3):
        plate = capsule(sp.S, c.p(0.36 + k * 0.13, 0.43 - k * 0.03), c.p(0.42 + k * 0.13, 0.42 - k * 0.03), c.r(0.05))
        sp.part(plate, r2, highlight=False)
    sp.part(regular(sp.S, *c.p(0.5, 0.33), c.r(0.07), 4, 0), "brillo")
    return (*c.p(0.56, 0.56), c.r(0.15), c.r(0.055))

def luca(sp, c, P, r1, r2, seed):
    for k in range(8):
        ang = 2 * math.pi * k / 8
        sp.lines(stroke(sp.S, wave(c.p(0.5, 0.56), c.p(0.5 + math.cos(ang) * 0.44, 0.56 + math.sin(ang) * 0.42), c.r(0.02), 2), c.w(1.4)), RAMPS["brillo"][1])
    sp.part(ellipse(sp.S, *c.p(0.5, 0.56), c.r(0.3), c.r(0.3)), "brillo", highlight=False)
    core = ellipse(sp.S, *c.p(0.5, 0.56), c.r(0.22), c.r(0.22))
    sp.part(core, r1)
    sp.put(ellipse(sp.S, *c.p(0.5, 0.66), c.r(0.08), c.r(0.05)) & core, RAMPS[r2][2])
    return (*c.p(0.5, 0.53), c.r(0.15), c.r(0.055))

LIMBED = {"bacilo", "coco", "levadura", "ameba", "arquea", "colonia", "vibrio", "ciliado", "flagelado", "virus_env", "tardigrado_no"}
FAMILIES = {f.__name__: f for f in (bacilo, coco, espirilo, vibrio, levadura, moho, actinomiceto, fago, virus_env, ciliado,
                                    flagelado, ameba, diatomea, dinoflagelado, radiolario, colonia, filamento, arquea,
                                    tardigrado, prion, viroide, legendario, luca)}

def draw(species_id, types, stage, maxstage, family, params, S, face=True, legendary=False):
    z = {1: 0.74, 2: 0.88, 3: 1.0}[stage] if maxstage > 1 else 0.96
    if maxstage == 2 and stage == 2: z = 1.0
    if maxstage == 3 and stage == 2: z = 0.88
    if legendary: z = 1.0
    sp = Sprite(S)
    c = Ctx(S, z)
    r1 = params.get("r1", types[0])
    r2 = params.get("r2", types[1] if len(types) > 1 else types[0])
    fx, fy, gap, size = FAMILIES[family](sp, c, params, r1, r2, species_id)
    # Rasgos de criatura: patitas y bracitos por detrás del cuerpo
    if params.get("limbs", family in LIMBED) and S >= 48:
        f = sp.filled
        ys, xs = np.where(f)
        bottom = ys.max() / S
        span = max(gap * 1.1, 0.12 * z)
        for sd in (-1, 1):
            if bottom > 0.9: break
            foot = ellipse(S, fx + sd * span * 0.5, bottom - 0.01, 0.075 * z, 0.05 * z)
            sp.part(foot, r1, behind=True, highlight=False)
        if stage >= 2 or maxstage == 1:
            rows = np.where(f[int(min(S - 1, (fy + size * 2.4) * S))])[0]
            if rows.size:
                yy = fy + size * 2.4
                for sd, xe in ((-1, rows.min() / S), (1, rows.max() / S)):
                    arm = capsule(S, (xe - sd * 0.02, yy), (xe + sd * 0.07 * z, yy + 0.06 * z), 0.032 * z)
                    sp.part(arm, r1, behind=True, highlight=False)
    if face:
        mood = "fierce" if (stage == maxstage and maxstage > 1 and stage >= 2 and params.get("fierce", stage == 3)) or legendary or params.get("fierce") else "happy"
        sp.iris = RAMPS[r2][2] if r2 != r1 else RAMPS[r1][0]
        sp.eyes(fx, fy, max(gap, 0.08), max(size, 0.035) * (1.12 if stage == 1 else 1.0), mood=mood)
        mk = params.get("mouth", "fangs" if mood == "fierce" and (stage == 3 or legendary) else "smile")
        sp.mouth(fx, fy + max(size, 0.035) * 1.7, 0.035 * z, mk)
        if mood == "happy" and stage == 1:
            sp.blush(fx, fy + max(size, 0.035) * 1.2, max(gap, 0.08) * 1.5)
    sp.outline_all()
    return sp
