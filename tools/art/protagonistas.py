#!/usr/bin/env python3
"""Protagonistas (chico y chica) a partir de las hojas del usuario (assets/reference/protagonistas/<id>.png):
4 filas × 5 fotogramas sobre fondo blanco (frente, perfil izquierdo, perfil derecho, espalda).

Quita el fondo blanco (relleno desde los bordes), recorta cada figura y la coloca en una celda de 128×128 con la
misma escala que los PNJ y los pies alineados. El juego usa 3 fotogramas por dirección (quieto, paso, paso):
se toman el 1.º, el 2.º y el 4.º de cada fila. No reduce colores ni redibuja: solo escala.
Escribe assets/sprites/characters_hd/<id>_hoja.png (384×512), que char_atlas.py prefiere a la conversión del GDD.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label, binary_fill_holes

ROOT = Path(__file__).resolve().parents[2]
SRC, OUT = ROOT / "assets/reference/protagonistas", ROOT / "assets/sprites/characters_hd"
C, ALTO = 128, 108
FILAS = {0: 0, 1: 2, 2: 3, 3: 1}      # fila de la hoja del usuario -> fila del juego (frente, espalda, izquierda, derecha)
COLS = [0, 1, 3]                       # quieto, paso, paso

def figuras(path: Path):
    a = np.array(Image.open(path).convert("RGB"))
    f = a.astype(int)
    blanco = (f.min(2) > 228) & (f.max(2) - f.min(2) < 20)
    lab, _ = label(blanco)
    borde = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = binary_fill_holes(~np.isin(lab, list(borde)))
    fl, n = label(fg)
    tam = np.bincount(fl.ravel()); tam[0] = 0
    comps = []
    for k in range(1, n + 1):
        if tam[k] < 800: continue
        ys, xs = np.where(fl == k)
        comps.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1, k))
    H, W = fg.shape
    # filas y columnas por posición (la rejilla ocupa la zona con figuras)
    x_min, x_max = min(c[0] for c in comps), max(c[2] for c in comps)
    y_min, y_max = min(c[1] for c in comps), max(c[3] for c in comps)
    celdas = {}
    for (x0, y0, x1, y1, k) in comps:
        r = min(3, int(((y0 + y1) / 2 - y_min) / ((y_max - y_min) / 4)))
        c = min(4, int(((x0 + x1) / 2 - x_min) / ((x_max - x_min) / 5)))
        celdas.setdefault((r, c), []).append((x0, y0, x1, y1, k))
    out = {}
    for (r, c), lst in celdas.items():
        x0 = min(b[0] for b in lst); y0 = min(b[1] for b in lst); x1 = max(b[2] for b in lst); y1 = max(b[3] for b in lst)
        m = np.isin(fl[y0:y1, x0:x1], [b[4] for b in lst])
        out[(r, c)] = Image.fromarray(np.dstack([a[y0:y1, x0:x1], np.where(m, 255, 0).astype(np.uint8)]))
    return out

def hoja(name: str) -> Image.Image:
    figs = figuras(SRC / f"{name}.png")
    if len(figs) != 20: raise SystemExit(f"{name}: se esperaban 20 figuras y hay {len(figs)}")
    k = ALTO / max(im.height for im in figs.values())
    sheet = Image.new("RGBA", (3 * C, 4 * C))
    for r_u, r in FILAS.items():
        for j, c_u in enumerate(COLS):
            im = figs[(r_u, c_u)]
            s = im.convert("RGBa").resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS).convert("RGBA")
            arr = np.array(s); arr[..., 3] = np.where(arr[..., 3] > 110, 255, 0)
            s = Image.fromarray(arr)
            sheet.alpha_composite(s, (j * C + (C - s.width) // 2, r * C + C - 6 - s.height))
    return sheet

if __name__ == "__main__":
    for n in sys.argv[1:] or ["protagonista", "protagonista-chica"]:
        hoja(n).save(OUT / f"{n}_hoja.png"); print("OK", n)
