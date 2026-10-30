#!/usr/bin/env python3
"""Hojas de PNJ dibujadas por el usuario (assets/reference/npcs/<id>.png): 4 filas × 3 fotogramas
(frente, espalda, perfil izquierdo, perfil derecho; quieto, paso, paso) sobre fondo verde claro.

Quita el fondo y la sombra del suelo, recorta cada figura y la coloca en una celda de 128×128
(4× la celda de 32 del juego), con la misma escala para los 12 fotogramas y los pies alineados.
No reduce colores ni redibuja: solo escala. Escribe assets/sprites/characters_hd/<id>_hoja.png (384×512).
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label, binary_fill_holes

ROOT = Path(__file__).resolve().parents[2]
SRC, OUT = ROOT / "assets/reference/npcs", ROOT / "assets/sprites/characters_hd"
C = 128          # celda HD
ALTO = 108       # alto de la figura más alta dentro de la celda

def figuras(path: Path):
    a = np.array(Image.open(path).convert("RGB"))
    f = a.astype(int)
    bg = np.median(np.concatenate([f[-4:].reshape(-1, 3), f[:, -4:].reshape(-1, 3)]), axis=0)
    d = np.abs(f - bg).sum(2)
    # fondo y sombras: verdes parecidos al fondo, también los más oscuros (sombra) con el mismo tono
    g = f - f.mean(2, keepdims=True); gb = bg - bg.mean()
    tono = np.abs(g - gb).sum(2)
    fondo = (d < 40) | ((tono < 14) & (f.sum(2) < bg.sum()) & (f.sum(2) > bg.sum() * 0.62))
    lab, _ = label(fondo)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ~np.isin(lab, list(border))
    fg[:50] = False                                   # rótulo del nombre
    fl, n = label(fg)
    sizes = np.bincount(fl.ravel()); sizes[0] = 0
    comps = []
    for k in range(1, n + 1):
        if sizes[k] < 1500: continue
        ys, xs = np.where(fl == k)
        comps.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1, k))
    # agrupar por filas y columnas (rejilla 3×4)
    H, W = fg.shape
    celdas = {}
    for (x0, y0, x1, y1, k) in comps:
        r = min(3, int(((y0 + y1) / 2 - 50) / ((H - 50) / 4))); c = min(2, int((x0 + x1) / 2 / (W / 3)))
        celdas.setdefault((r, c), []).append((x0, y0, x1, y1, k))
    out = {}
    for (r, c), lst in celdas.items():
        x0 = min(b[0] for b in lst); y0 = min(b[1] for b in lst); x1 = max(b[2] for b in lst); y1 = max(b[3] for b in lst)
        m = np.isin(fl[y0:y1, x0:x1], [b[4] for b in lst])
        m = binary_fill_holes(m) & ~((fondo[y0:y1, x0:x1]) & ~binary_fill_holes(m) )
        rgba = np.dstack([a[y0:y1, x0:x1], np.where(m, 255, 0).astype(np.uint8)])
        out[(r, c)] = Image.fromarray(rgba)
    return out

def hoja(name: str) -> Image.Image:
    figs = figuras(SRC / f"{name}.png")
    if len(figs) != 12: raise SystemExit(f"{name}: se esperaban 12 figuras y hay {len(figs)}: {sorted(figs)}")
    k = ALTO / max(im.height for im in figs.values())
    sheet = Image.new("RGBA", (3 * C, 4 * C))
    for (r, c), im in figs.items():
        s = im.convert("RGBa").resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS).convert("RGBA")
        arr = np.array(s); arr[..., 3] = np.where(arr[..., 3] > 110, 255, 0); s = Image.fromarray(arr)
        sheet.alpha_composite(s, (c * C + (C - s.width) // 2, r * C + C - 6 - s.height))
    return sheet

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    names = sys.argv[1:] or [p.stem for p in sorted(SRC.glob("*.png"))]
    for n in names:
        hoja(n).save(OUT / f"{n}_hoja.png")
        print("OK", n)
