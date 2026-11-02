#!/usr/bin/env python3
"""Micromón V2: terreno, árboles, casas e interiores con el tileset de 4.ª generación del usuario
(assets/reference/tileset_v2/exterior.png e interior.png, de akizakura16).

Las láminas están a 2× (cada píxel ocupa 2×2): se reducen a su tamaño nativo (casillas de 16 px) y se
amplían a 4× sin suavizado, que es la resolución a la que dibuja el juego. No se redibuja nada.

- Autotiles de 3×3 (camino, arena, agua, acantilado, alfombra): cada cuarto de 8×8 px de la casilla se
  toma del bloque según sus dos vecinos (como en RPG Maker), con la máscara de 4 vecinos del juego
  (1 = norte distinto, 2 = este, 4 = sur, 8 = oeste).
- Piezas que dependen de sus vecinos (setos, vallas, cornisas, mesas, mostradores): «nombre~máscara»,
  donde la máscara indica qué vecinos son de la misma pieza (1 N, 2 E, 4 S, 8 O).
- Paredes según el ambiente del mapa: «pared@interior», «pared@laboratorio».
- Objetos altos (camas, plantas, estanterías, ordenador) y edificios y árboles: en el atlas de
  edificios (props_hd) a 4× con «nativo»: se dibujan a escala 1 apoyados en su casilla.

Parte de los atlas de la versión 1 (assets/atlas/terreno_hd y props_hd) y escribe en assets/atlas_v2/.
Uso: python3 tools/art/tileset_v2.py [--ver]   (--ver deja una lámina de revisión en assets/atlas_v2/revision.png)
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
REF = ROOT / "assets/reference/tileset_v2"
A1 = ROOT / "assets/atlas"
A2 = ROOT / "assets/atlas_v2"
C = 64

def lamina(nombre):
    a = np.array(Image.open(REF / f"{nombre}.png").convert("RGBA"))
    return a[::2, ::2].copy()                      # tamaño nativo (los píxeles vienen duplicados)
EXT, INT = lamina("exterior"), lamina("interior")

def t16(h, r, c): return h[r * 16:(r + 1) * 16, c * 16:(c + 1) * 16].copy()
def x4(a): return np.repeat(np.repeat(a, 4, 0), 4, 1)
def sobre(fondo, fig):
    """Composición alfa de fig (RGBA) sobre fondo (RGBA opaco)."""
    a = fig[..., 3:4].astype(float) / 255
    o = fondo.copy()
    o[..., :3] = (fig[..., :3] * a + fondo[..., :3] * (1 - a)).round().astype(np.uint8)
    o[..., 3] = np.maximum(fondo[..., 3], fig[..., 3])
    return o

# esquinas interiores dibujadas en la lámina (el «agujero» de césped entre cuatro casillas): bloque -> casilla
# de la que sale cada cuarto. Las demás (agua, acantilado) se sintetizan a partir del borde.
ESQ_REAL = {(0, 0): {"tl": (4, 1), "tr": (4, 0), "bl": (3, 1), "br": (3, 0)},
            (0, 5): {"tl": (4, 7), "tr": (4, 6), "bl": (3, 7), "br": (3, 6)}}

# margen de los bordes más fino (px que se desplaza cada cuarto hacia fuera) en caminos y arena
ENC = {(0, 0): 3, (0, 5): 3}

def esquina_interior(h, r0, c0, q, k=0):
    """Cuarto de 8×8 con una esquina interior (los dos lados son del mismo terreno y la diagonal no)."""
    qy, qx = (0 if q[0] == "t" else 1), (0 if q[1] == "l" else 1)
    if (r0, c0) in ESQ_REAL:
        r, c = ESQ_REAL[(r0, c0)][q]
        # la esquina de la lámina está en el borde del cuarto que toca la esquina de la casilla
        t = t16(h, r, c)
        dx, dy = (k if qx == 0 else -k), (k if qy == 0 else -k)
        return t[qy * 8 + dy:qy * 8 + 8 + dy, qx * 8 + dx:qx * 8 + 8 + dx]
    # síntesis: un cuarto de círculo en la esquina con las capas del borde (de fuera adentro)
    borde = t16(h, r0 + (0 if qy == 0 else 2), c0 + 1)
    centro = t16(h, r0 + 1, c0 + 1)
    o = np.zeros((8, 8, 4), np.uint8)
    for y in range(8):
        for x in range(8):
            X, Y = qx * 8 + x, qy * 8 + y
            r = np.hypot((X + 0.5) if qx == 0 else (16 - X - 0.5), (Y + 0.5) if qy == 0 else (16 - Y - 0.5))
            k = min(15, int(r))
            ky = k if qy == 0 else 15 - k
            p = borde[ky, X]
            o[y, x] = p if np.abs(p.astype(int) - centro[ky, X].astype(int)).sum() > 0 else centro[Y, X]
    return o

def autotile(h, r0, c0, mask, diag=0):
    """Casilla de 16 px compuesta por cuartos del bloque 3×3 (r0, c0) según la máscara de bordes
    (1 N, 2 E, 4 S, 8 O distintos) y las diagonales distintas (1 NE, 2 SE, 4 SO, 8 NO) para las
    esquinas interiores, de modo que los cruces y recodos quedan bien unidos."""
    n, e, s, w = mask & 1, mask & 2, mask & 4, mask & 8
    o = np.zeros((16, 16, 4), np.uint8)
    for qy, vert in ((0, n), (1, s)):
        for qx, hor in ((0, w), (1, e)):
            q = ("t" if qy == 0 else "b") + ("l" if qx == 0 else "r")
            dbit = {"tr": 1, "br": 2, "bl": 4, "tl": 8}[q]
            if not vert and not hor and diag & dbit:
                o[qy * 8:qy * 8 + 8, qx * 8:qx * 8 + 8] = esquina_interior(h, r0, c0, q, ENC.get((r0, c0), 0))
                continue
            br = (0 if qy == 0 else 2) if vert else 1
            bc = (0 if qx == 0 else 2) if hor else 1
            src = t16(h, r0 + br, c0 + bc)
            # el cuarto se toma desplazado hacia el borde exterior (ENC px): el margen de césped queda más
            # fino y en los tramos de una casilla de ancho sigue habiendo material en medio
            k = ENC.get((r0, c0), 0)
            # (solo en perpendicular al borde, para no repetir la textura a lo largo del borde)
            dx = (k if qx == 0 else -k) if hor else 0
            dy = (k if qy == 0 else -k) if vert else 0
            o[qy * 8:qy * 8 + 8, qx * 8:qx * 8 + 8] = src[qy * 8 + dy:qy * 8 + 8 + dy, qx * 8 + dx:qx * 8 + 8 + dx]
    return o

def diagonales(mask):
    """Combinaciones de diagonales que importan para una máscara (solo esquinas con los dos lados iguales)."""
    bits = [b for b, (a1, a2) in ((1, (1, 2)), (2, (4, 2)), (4, (4, 8)), (8, (1, 8))) if not (mask & a1) and not (mask & a2)]
    out = []
    for i in range(1, 1 << len(bits)):
        out.append(sum(b for j, b in enumerate(bits) if i >> j & 1))
    return out

T2 = np.array(Image.open(REF / "terreno2.png").convert("RGBA"))      # segunda lámina (ya a tamaño nativo)

def c16(h, x, y): return h[y:y + 16, x:x + 16].copy()

def a_cesped_v2(t):
    """El verde de la segunda lámina es 8 puntos más claro que el de la primera: se iguala."""
    o = t.copy(); f = o[..., :3].astype(int)
    verde = ((f[..., 1] - f[..., 0]) > 60) & (o[..., 3] > 0)
    o[verde, :3] = (f[verde] - 8).clip(0, 255).astype(np.uint8)
    return o

def relieve(h, r, c0, mask, cesped=False):
    """Casilla de una plantilla de relieve de 4×4 (filas r..r+3, columnas c0..c0+3): borde superior en la
    mitad baja de la fila r, laterales en r+1..r+2 y la cara en r+3. mask: 1 N, 2 E, 4 S, 8 O distintos."""
    n, e, s_, w = mask & 1, mask & 2, mask & 4, mask & 8
    ry, my, fy = r * 16 + 8, (r + 1) * 16, (r + 3) * 16
    o = np.zeros((16, 16, 4), np.uint8)
    for qy, vert in ((0, n), (1, s_)):
        for qx, hor in ((0, w), (1, e)):
            y = (ry if qy == 0 else fy) if vert else my
            if qy == 0 and s_ and not n: y = fy            # la cara ocupa la casilla entera
            x = ((c0 if qx == 0 else c0 + 3) if hor else c0 + 1) * 16
            src = c16(h, x, y)
            o[qy * 8:qy * 8 + 8, qx * 8:qx * 8 + 8] = src[qy * 8:qy * 8 + 8, qx * 8:qx * 8 + 8]
    o = a_cesped_v2(o)
    return sobre(HIERBA, o)

def con_cueva(t, h, r):
    """Boca de cueva de la plantilla (fila r, columnas 4-5: recortada centrada en el hueco) sobre la pared."""
    b = a_cesped_v2(c16(h, 4 * 16 + 8, r * 16))
    return sobre(t, b)

EDIF2 = {
    # casas en las que se puede entrar (interior genérico con un vecino)
    "v2_casa_teal": ("e43", "casa"), "v2_casa_rosa": ("e46", "casa"), "v2_casa_rosa2": ("e47", "casa"), "v2_casa_gris": ("e48", "casa"),
    "v2_casa_naranja": ("e87", "casa"), "v2_casa_madera": ("e93", "casa"), "v2_cabana": ("e94", "casa"), "v2_casa_verde": ("e100", "casa"),
    "v2_casa_cristal": ("e107", "casa"), "v2_casa_azulejo": ("e108", "casa"), "v2_casa_azul": ("e109", "casa"), "v2_casa_roja": ("e115", "casa"),
    "v2_casa_verde2": ("e128", "casa"), "v2_casa_cian": ("e134", "casa"), "v2_casa_verde3": ("e137", "casa"), "v2_casa_naranja2": ("e138", "casa"),
    "v2_casa_gris2": ("e152", "casa"), "v2_casa_roja2": ("e157", "casa"), "v2_casa_rosa3": ("e159", "casa"), "v2_casa_crema": ("e160", "casa"),
    "v2_casa_marron": ("e167", "casa"), "v2_casa_lila": ("e168", "casa"), "v2_casita": ("e63", "casa"), "v2_choza": ("e62", "casa"),
    "v2_casa_grande": ("e44", "casa"), "v2_mansion": ("e45", "casa"), "v2_casa_grande_roja": ("e126", "casa"), "v2_casa_morada": ("e49", "casa"),
    # edificios de ciudad (no se entra)
    "v2_tienda_gris": ("e127", "edificio"), "v2_mercado": ("e136", "edificio"), "v2_tienda_toldo": ("e71", "edificio"), "v2_kiosco": ("e67", "edificio"),
    "v2_tienda_moderna": ("e68", "edificio"), "v2_bloque_azul": ("e69", "edificio"), "v2_oficina": ("e70", "edificio"), "v2_bloque_naranja": ("e74", "edificio"),
    "v2_cafeteria": ("e75", "edificio"), "v2_cristalera": ("e76", "edificio"), "v2_pagoda": ("e89", "edificio"), "v2_nave": ("e91", "edificio"),
    "v2_casona": ("e92", "edificio"), "v2_tienda_marron": ("e99", "edificio"), "v2_salon": ("e114", "edificio"), "v2_cupula": ("e143", "edificio"),
    "v2_bloque_verde": ("e146", "edificio"), "v2_bloque_crema": ("e148", "edificio"), "v2_tienda_cian": ("e149", "edificio"), "v2_tienda_naranja": ("e150", "edificio"),
    "v2_torre_cristal": ("e151", "edificio"), "v2_teatro": ("e154", "edificio"), "v2_nave_granate": ("e156", "edificio"), "v2_bloque_amarillo": ("e169", "edificio"),
    "v2_rascacielos": ("e173", "edificio"), "v2_torre_dorada": ("e145", "edificio"), "v2_faro": ("e104", "edificio"), "v2_torre_agua": ("e116", "edificio"),
    "v2_choza_redonda": ("e118", "edificio"), "v2_casa_piedra": ("e53", "edificio"), "v2_templo": ("e52", "edificio"),
    # decoración grande
    "v2_parada": ("e86", "deco"), "v2_banderines": ("e97", "deco"), "v2_toldo_azul": ("e112", "deco"), "v2_toldo_rosa": ("e113", "deco"),
    "v2_barco": ("e103", "deco"), "v2_ferri": ("e105", "deco"), "v2_arco": ("e66", "deco"),
}
# decoración pequeña de terreno2 (x, y, ancho, alto en px nativos); la farola es de la primera lámina
DECO2 = {
    "jardinera": (51, 3207, 58, 56), "maceta_flores": (15, 3222, 19, 29), "arbusto": (46, 3290, 20, 15), "arbusto_flor": (94, 3320, 20, 17),
    "seto_largo": (0, 3413, 80, 25), "arbol_caduco": (7, 3608, 49, 57), "arbol_otono": (71, 3608, 49, 57), "arbol_rojo": (7, 3672, 49, 57),
    "farola": (112, 2063, 16, 43),
}

def rellena_puerta(s):
    """Las puertas vienen huecas (en el juego original se animan aparte): se rellenan de oscuro."""
    o = s.copy(); a = o[..., 3]
    h, w = a.shape
    for y in range(int(h * 0.45), h):
        fila = a[y] == 255
        for x in range(w):
            if a[y, x] < 255 and fila[:x].any() and fila[x + 1:].any() and (a[:y, x] == 255).any():
                # hueco con fachada a los dos lados y encima: puerta
                izq, der = np.where(fila[:x])[0].max(), x + 1 + np.where(fila[x + 1:])[0].min()
                if der - izq <= 30: o[y, x] = (52, 44, 58, 255)
    return o

def puerta_de(s):
    """Centro x de la puerta (zona rellenada en rellena_puerta), o None."""
    from scipy.ndimage import label as _label
    m = (s[..., :3] == (52, 44, 58)).all(-1) & (s[..., 3] == 255)
    if not m.any(): return None
    lab, n = _label(m)
    cx = s.shape[1] / 2
    mejor = None
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(xs) < 12: continue
        c = (xs.min() + xs.max() + 1) / 2
        # la puerta: el hueco más grande; a igualdad, el más centrado
        clave = (-len(xs) // 20, abs(c - cx))
        if mejor is None or clave < mejor[0]: mejor = (clave, c)
    return mejor[1] if mejor else None

def recorta(h, x, y, w, hh):
    """Sprite libre (coordenadas nativas) recortado a su caja de opacidad."""
    a = h[y:y + hh, x:x + w].copy()
    ys, xs = np.where(a[..., 3] > 0)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

# ---------------------------------------------------------------- exterior
HIERBA = t16(EXT, 0, 4)
HIERBA2 = t16(EXT, 2, 4)
MATA = t16(EXT, 2, 3)

def hierba_alta(oscura=False):
    """Hierba alta: cuatro matas de la lámina (la de la fila 2) sobre el césped, apretadas."""
    mata = MATA.copy()
    # la mata sin su césped: píxeles distintos del césped liso
    dif = np.abs(mata[..., :3].astype(int) - HIERBA[..., :3].astype(int)).sum(2) > 18
    fig = mata.copy(); fig[..., 3] = np.where(dif, 255, 0)
    ys, xs = np.where(dif)
    fig = fig[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    o = HIERBA.copy()
    fh, fw = fig.shape[:2]
    for dx, dy in ((-3, -5), (5, -5), (1, 0), (-4, 4), (6, 4)):
        lienzo = np.zeros((16 + 2 * fh, 16 + 2 * fw, 4), np.uint8)
        ox, oy = fw + 8 - fw // 2 + dx, fh + 8 - fh // 2 + dy
        lienzo[oy:oy + fh, ox:ox + fw] = fig
        o = sobre(o, lienzo[fh:fh + 16, fw:fw + 16])
    # algo más oscura y verde que el césped, para que se distinga bien
    f = o[..., :3].astype(float); dif2 = np.abs(o[..., :3].astype(int) - HIERBA[..., :3].astype(int)).sum(2) > 0
    o[dif2, :3] = (f[dif2] * np.array([0.84, 0.92, 0.80])).clip(0, 255).astype(np.uint8)
    if oscura:
        f = o[..., :3].astype(float) * np.array([0.62, 0.74, 0.66])
        o[..., :3] = f.clip(0, 255).astype(np.uint8)
    return o

def sin_agua(t):
    """Cambia los píxeles de agua (azules) por césped, oscurecido donde el agua tenía sombra."""
    o = t.copy()
    f = t[..., :3].astype(int)
    agua = (f[..., 2] > f[..., 0] + 40) & (f[..., 2] > f[..., 1] - 5) & (t[..., 3] > 0)
    luz = f.sum(2) / max(1, np.median(f[agua].sum(1)) if agua.any() else 1)
    g = HIERBA[..., :3].astype(float) * np.clip(luz, 0.55, 1.0)[..., None]
    o[agua, :3] = g[agua].round().astype(np.uint8); o[agua, 3] = 255
    return o

def pieza_lineal(mask, L, M, R, T=None, V=None, B=None, solo=None):
    """Pieza de una línea (seto, valla, cornisa) según sus vecinos iguales (1 N, 2 E, 4 S, 8 O)."""
    hor = mask & (2 | 8)
    if hor or T is None:
        if mask & 2 and mask & 8: return M
        if mask & 2: return L
        if mask & 8: return R
        if not (mask & (1 | 4)) or T is None: return solo if solo is not None else M
    if mask & 1 and mask & 4: return V
    if mask & 4: return T
    if mask & 1: return B
    return solo if solo is not None else M

def agua_marco(mask, f, centro0, diag=0, bloque=(5, 0)):
    base = autotile(EXT, bloque[0], bloque[1], mask, diag)
    if f == 0: return base
    # segundo fotograma: el agua del centro desplazada (las ondas se mueven); la orilla queda igual
    paleta = {tuple(p) for p in centro0.reshape(-1, 4)}
    mov = np.roll(centro0, 6, axis=1)
    o = base.copy()
    for y in range(16):
        for x in range(16):
            if tuple(base[y, x]) in paleta: o[y, x] = mov[y, x]
    return o

# ---------------------------------------------------------------- interior
SUELOS = {   # (fila, columna) de una casilla limpia (sin sombra) de cada suelo
    "suelo_madera": (80, 0),
    "suelo_lab": (48, 0),
}
PAREDES = {  # ambiente -> (pared, zócalo)
    "interior": ((222, 1), (223, 1)),
    "laboratorio": ((227, 1), (228, 1)),
}

def main():
    A2.mkdir(exist_ok=True)
    meta1 = json.load(open(A1 / "terreno_hd.json"))
    atl1 = np.array(Image.open(A1 / "terreno_hd.png").convert("RGBA"))
    celdas: dict[str, np.ndarray] = {}
    for n, i in meta1["index"].items():                   # todo lo de la V1 (montaña, cueva...) sigue igual
        y, x = (i // meta1["cols"]) * C, (i % meta1["cols"]) * C
        celdas[n] = atl1[y:y + C, x:x + C]
    def pon(n, t16_, q=None):
        # una sola copia («#0»): el juego usa la #0 cuando no hay un cuarto propio (q = 1..3)
        for k in ([q] if q is not None else [0]): celdas[f"{n}#{k}"] = x4(t16_)
        for k in range(1, 4):
            if q is None: celdas.pop(f"{n}#{k}", None)       # quita los cuartos heredados de la V1

    # césped, hierba alta y flores
    pon("hierba", HIERBA)
    pon("hierba2", HIERBA2)
    ha, ho = hierba_alta(), hierba_alta(True)
    pon("hierba_alta", ha); pon("hierba_oscura", ho)
    roja, blanca = t16(EXT, 0, 3), t16(EXT, 1, 3)
    for f in ("flores0", "flores1"):
        for q in range(4): pon(f, roja if q in (0, 3) else blanca, q)
    # camino, arena y agua (autotiles)
    # «nombre^d»: la misma casilla con esquinas interiores en las diagonales d (las elige el juego)
    centro = t16(EXT, 6, 1)
    for k in range(16):
        for d in [0] + diagonales(k):
            suf = f"^{d}" if d else ""
            pon(f"camino_{k}{suf}", autotile(EXT, 0, 0, k, d))
            pon(f"arena_{k}{suf}", autotile(EXT, 0, 5, k, d))
            for f in (0, 1): pon(f"agua_{k}_{f}{suf}", agua_marco(k, f, centro, d))
    # agua de playa (orilla de arena, agua profunda) y arena junto al camino (el camino en lugar del césped)
    centro_p = t16(EXT, 6, 6)
    camino_c = t16(EXT, 1, 1)
    def sobre_camino(t):
        o = t.copy(); f = t[..., :3].astype(int)
        verde = (f[..., 1] - f[..., 0]) > 60
        o[verde] = camino_c[verde]
        return o
    for k in range(16):
        for d in [0] + diagonales(k):
            suf = f"^{d}" if d else ""
            for f in (0, 1): pon(f"aguap_{k}_{f}{suf}", agua_marco(k, f, centro_p, d, (5, 5)))
            pon(f"arenac_{k}{suf}", sobre_camino(autotile(EXT, 0, 5, k, d)))
    pon("camino", t16(EXT, 1, 1)); pon("arena", t16(EXT, 1, 6))
    pon("agua0", centro); pon("agua1", agua_marco(0, 1, centro))
    # desniveles (acantilado «A»: el terreno de su norte está más alto) y montaña («%»): plantillas de relieve
    # de la segunda lámina (terreno2.png). La cara mira al sur; el borde de arriba de la plantilla está medio
    # tile más arriba (se recorta desplazado).
    for k in range(16):
        pon(f"acantilado~{k}", relieve(T2, 335, 0, 15 - k, cesped=True))          # ~: vecinos iguales
        pon(f"cueva_entrada~{k}", con_cueva(relieve(T2, 335, 0, 15 - k, cesped=True), T2, 341))
    for n in (0, 1):
        for e in (0, 1):
            for w in (0, 1):
                pon(f"monte_cima_{n}{e}{w}", relieve(T2, 315, 0, n | e * 2 | w * 8))
    for e in (0, 1):
        for w in (0, 1):
            pon(f"monte_alta_{e}{w}", relieve(T2, 315, 0, 1 | e * 2 | w * 8))
            pon(f"monte_cara1_{e}{w}", relieve(T2, 315, 0, 1 | 4 | e * 2 | w * 8))
            pon(f"monte_cara2_{e}{w}", relieve(T2, 315, 0, 4 | e * 2 | w * 8))
    pon("monte_cueva", con_cueva(relieve(T2, 315, 0, 4), T2, 321))
    # escaleras talladas: en la roca de la montaña y en los desniveles de césped
    pon("escalon", sobre(t16(T2, 331, 4), t16(T2, 331, 4)))
    pon("escalon_cesped", sobre(t16(T2, 331, 4), t16(T2, 331, 4)))         # también de roca: se leen mejor
    # piezas lineales sobre césped (se guardan como objetos: el suelo de debajo lo pone el juego)
    lin = {
        "seto": dict(L=t16(EXT, 122, 5), M=t16(EXT, 122, 6), R=t16(EXT, 122, 7), T=t16(EXT, 122, 4), V=t16(EXT, 123, 4), B=t16(EXT, 124, 4), solo=t16(EXT, 121, 4)),
        "valla": dict(L=t16(EXT, 130, 3), M=t16(EXT, 130, 1), R=t16(EXT, 130, 4), T=t16(EXT, 128, 4), V=t16(EXT, 129, 0), B=t16(EXT, 129, 0)),
        "valla_v": dict(L=t16(EXT, 133, 3), M=t16(EXT, 133, 1), R=t16(EXT, 133, 4), T=t16(EXT, 131, 4), V=t16(EXT, 132, 0), B=t16(EXT, 132, 0)),
        "bordillo": dict(L=t16(EXT, 37, 5), M=t16(EXT, 37, 6), R=t16(EXT, 37, 7)),
    }
    objetos: dict[str, np.ndarray] = {}
    for n, p in lin.items():
        for k in range(16): objetos[f"obj:{n}~{k}"] = x4(pieza_lineal(k, **p))
        objetos[f"obj:{n}"] = x4(p["M"])
    objetos["obj:cartel"] = x4(t16(EXT, 135, 4))
    objetos["obj:roca"] = x4(t16(EXT, 145, 7))

    # interiores: suelos, paredes por ambiente, alfombra, mesas, mostradores y escaleras
    for n, (r, c) in SUELOS.items(): pon(n, t16(INT, r, c))
    for env, (p, z) in PAREDES.items():
        pon(f"pared@{env}", t16(INT, *p)); pon(f"pared_base@{env}", t16(INT, *z))
    madera = t16(INT, *SUELOS["suelo_madera"])
    for k in range(16):
        objetos[f"obj:alfombra~{15 - k}"] = x4(autotile(INT, 320, 3, k))
    mesa = dict(L=t16(INT, 528, 0), M=t16(INT, 528, 0), R=t16(INT, 528, 1), T=t16(INT, 524, 3), V=t16(INT, 525, 3), B=t16(INT, 526, 3), solo=t16(INT, 528, 3))
    mostr = dict(L=t16(INT, 414, 4), M=t16(INT, 414, 5), R=t16(INT, 414, 6))
    for k in range(16):
        objetos[f"obj:mesa~{k}"] = x4(pieza_lineal(k, **mesa))
        objetos[f"obj:mostrador~{k}"] = x4(pieza_lineal(k, **mostr))
    objetos["obj:escaleras"] = x4(t16(INT, 505, 1))

    # ---- atlas de terreno
    nombres = list(celdas) + list(objetos)
    cols = 32
    filas = (len(nombres) + cols - 1) // cols
    atlas = np.zeros((filas * C, cols * C, 4), np.uint8)
    idx = {}
    for i, n in enumerate(nombres):
        y, x = (i // cols) * C, (i % cols) * C
        atlas[y:y + C, x:x + C] = celdas[n] if n in celdas else objetos[n]
        idx[n] = i
    Image.fromarray(atlas).save(A2 / "terreno_hd.png", optimize=True)
    json.dump({"cell": C, "cols": cols, "index": idx}, open(A2 / "terreno_hd.json", "w"))

    # ---- atlas de edificios: los de la V1 más casas, árboles y muebles altos nuevos (a 4×, «nativo»)
    pm1 = json.load(open(A1 / "props_hd.json"))
    pa1 = np.array(Image.open(A1 / "props_hd.png").convert("RGBA"))
    nuevos = {
        # nombre: (sprite nativo, puerta (x centro), datos extra)
        "casa_roja": recorta(EXT, 0, 3562, 128, 104),     # puerta en el centro (ventana-puerta-ventana)
        "casa_azul": recorta(EXT, 0, 8529, 128, 113),
        "arbol": recorta(EXT, 0, 650, 50, 56),
        "arbolv": recorta(EXT, 0, 1034, 50, 56),
        "obj_cama": recorta(INT, 8, 7798, 36, 44),
        "obj_planta": recorta(INT, 16, 7752, 16, 42),
        "obj_estanteria": recorta(INT, 48, 7264, 16, 50),
        "obj_pc": recorta(INT, 64, 6704, 18, 34),
    }
    def base_solida(s):
        ys = np.where((s[..., 3] == 255).any(1))[0]
        return int(ys.max()) + 1
    def centro_puerta(s):
        # la puerta: la columna más oscura del tercio inferior (madera de la puerta), por defecto el centro
        h, w = s.shape[:2]
        zona = s[int(h * 0.62):base_solida(s), :, :3].astype(float).mean(2)
        op = s[int(h * 0.62):base_solida(s), :, 3] == 255
        col = np.where(op.all(0), zona.mean(0), 999)
        k = 7
        sm = np.convolve(col, np.ones(k) / k, mode="same")
        return int(np.argmin(sm[k:-k]) + k)
    # edificios y decoración de la segunda lámina para las ciudades de la V2 (ids del catálogo
    # tools/art/catalogo_edificios2.json); tipo: casa (se entra), edificio (no se entra), deco (objeto)
    E2 = np.array(Image.open(REF / "edificios2.png").convert("RGBA"))
    cat = {d["id"]: d for d in json.load(open(ROOT / "tools/art/catalogo_edificios2.json"))}
    meta2 = {}
    for nombre, (cid, tipo) in EDIF2.items():
        d = cat[cid]
        spr = E2[d["y"]:d["y"] + d["h"], d["x"]:d["x"] + d["w"]].copy()
        nuevos[nombre] = rellena_puerta(spr) if tipo == "casa" else spr
        meta2[nombre] = tipo
    for nombre, (x, y, w, h) in DECO2.items():
        nuevos[nombre] = recorta(T2 if nombre != "farola" else EXT, x, y, w, h)
        meta2[nombre] = "deco"
    resto = {k: v for k, v in pm1.items() if k not in nuevos}
    piezas = [(k, pa1[v["y"]:v["y"] + v["h"], v["x"]:v["x"] + v["w"]], v) for k, v in resto.items()]
    for k, s in nuevos.items():
        g = x4(s)
        m = {"nativo": 1, "base": base_solida(s) * 4}
        if k.startswith("casa"):
            ys, xs = np.where(s[..., 3] == 255)
            m["door"] = [int(xs.min() + xs.max() + 1) * 2, base_solida(s) * 4]      # puerta centrada
            m["wall"] = [int(xs.min()) * 4, int(xs.max() + 1) * 4]
        if k in meta2:
            ys, xs = np.where(s[..., 3] == 255)
            x0, x1 = int(xs.min()), int(xs.max()) + 1
            pc = puerta_de(s) if meta2[k] == "casa" else None
            m["door"] = [int((pc if pc is not None else (x0 + x1) / 2) * 4), base_solida(s) * 4]
            m["wall"] = [x0 * 4, x1 * 4]
            # planta en casillas y casilla de la puerta (desde la izquierda de la planta)
            ancho = max(1, -(-(x1 - x0) // 16)); alto = max(1, -(-(base_solida(s) - int(ys.min())) // 16))
            if meta2[k] == "deco": alto = 1 if (x1 - x0) <= 24 else max(1, alto - 1)
            m["planta"] = [ancho, alto, min(ancho - 1, int(((pc if pc is not None else (x0 + x1) / 2) - x0) // 16)), meta2[k]]
        if k.startswith("arbol"):
            ys, xs = np.where(s[..., 3] == 255)
            m["ax"] = int((xs.min() + xs.max() + 1) * 2)      # centro del tronco (centro del dibujo)
        piezas.append((k, g, m))
    # empaquetado en estantes de 4096 px de ancho (de más alto a más bajo)
    MAXW = 4096
    orden = sorted(piezas, key=lambda p: -p[1].shape[0])
    pos, x, y, alto_fila = {}, 0, 0, 0
    for k, img, m in orden:
        h, w = img.shape[:2]
        if x + w > MAXW: x, y, alto_fila = 0, y + alto_fila + 2, 0
        pos[k] = (x, y); x += w + 2; alto_fila = max(alto_fila, h)
    W, H = MAXW, y + alto_fila
    pa2 = np.zeros((H, W, 4), np.uint8)
    pm2 = {}
    for k, img, m in piezas:
        h, w = img.shape[:2]; px, py = pos[k]
        pa2[py:py + h, px:px + w] = img
        d = {kk: vv for kk, vv in m.items() if kk not in ("x", "y", "w", "h")}
        pm2[k] = {"x": px, "y": py, "w": w, "h": h, **d}
    Image.fromarray(pa2).save(A2 / "props_hd.png", optimize=True)
    json.dump(pm2, open(A2 / "props_hd.json", "w"))
    print("OK terreno", len(nombres), "celdas · edificios", len(pm2), pa2.shape)
    for k in list(nuevos)[:8]: print(" ", k, pm2[k])

    if "--ver" in sys.argv:
        # lámina de revisión: autotiles de camino/agua/acantilado, piezas lineales, muebles y edificios
        filas_rev = [
            [f"camino_{k}#0" for k in range(16)], [f"agua_{k}_0#0" for k in range(16)], [f"arena_{k}#0" for k in range(16)],
            [f"acantilado~{k}#0" for k in range(16)], ["hierba#0", "hierba2#0", "hierba_alta#0", "hierba_oscura#0", "flores0#0", "flores0#1", "suelo_madera#0", "suelo_lab#0", "pared@interior#0", "pared_base@interior#0", "pared@laboratorio#0", "pared_base@laboratorio#0"],
        ] + [[f"obj:{n}~{k}" for k in range(16)] for n in ("seto", "valla", "valla_v", "bordillo", "alfombra", "mesa", "mostrador")]
        hoja = np.zeros((len(filas_rev) * 34 + 260, 16 * 34, 4), np.uint8); hoja[..., :3] = 255; hoja[..., 3] = 255
        for j, f in enumerate(filas_rev):
            for i, n in enumerate(f):
                c = celdas.get(n, objetos.get(n))
                if c is None: continue
                t = np.array(Image.fromarray(c).resize((32, 32), Image.NEAREST))
                hoja[j * 34:j * 34 + 32, i * 34:i * 34 + 32] = sobre(hoja[j * 34:j * 34 + 32, i * 34:i * 34 + 32], t)
        x = 0
        for k in nuevos:
            v = pm2[k]; s = pa2[v["y"]:v["y"] + v["h"], v["x"]:v["x"] + v["w"]]
            s = np.array(Image.fromarray(s).resize((v["w"] // 2, v["h"] // 2), Image.NEAREST))
            y0 = len(filas_rev) * 34
            if x + s.shape[1] > hoja.shape[1]: break
            hoja[y0:y0 + s.shape[0], x:x + s.shape[1]] = sobre(hoja[y0:y0 + s.shape[0], x:x + s.shape[1]], s)
            x += s.shape[1] + 4
        Image.fromarray(hoja).save(A2 / "revision.png")

if __name__ == "__main__":
    main()
