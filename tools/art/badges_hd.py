#!/usr/bin/env python3
"""Medallas HD a partir de la ilustración del usuario (assets/reference/props/medallas.jpg).

Recorta las 8 medallas (sin los rótulos), quita el fondo blanco y genera
assets/atlas/medallas_hd.png (8 celdas de 128×128, en el orden de las medallas del juego)
y medallas_hd.json.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label, binary_fill_holes

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets/reference/props/medallas.jpg"
OUT = ROOT / "assets/atlas"
CELL = 128
COLS = [(28, 262), (270, 505), (520, 760), (775, 1005)]
ROWS = [(18, 238), (292, 515)]
# celda (fila, columna) de cada medalla del juego, en el orden en que se ganan
ORDEN = {
    "probiotico": (1, 3),   # Alimentos · Dr. Solé
    "tapete": (1, 1),       # Ambiental · Dra. Gajú
    "micelio": (0, 2),      # Hongo · Dra. Guàrdia
    "catalasa": (0, 3),     # Levadura · Dr. Yero
    "quimiostato": (0, 1),  # Industrial · Dr. Mas
    "algoritmo": (0, 0),    # Bioinfo · Dr. Conchillo
    "ziehl": (1, 2),        # Clínica · Dra. Luquin
    "lisogenia": (1, 0),    # Fago · Dra. Campoy
}

def main():
    a = np.array(Image.open(SRC).convert("RGB"))
    atlas = Image.new("RGBA", (CELL * len(ORDEN), CELL * 2))
    for i, (bid, (r, c)) in enumerate(ORDEN.items()):
        (x0, x1), (y0, y1) = COLS[c], ROWS[r]
        crop = a[y0:y1, x0:x1]
        f = crop.astype(int)
        mx, mn = f.max(2), f.min(2)
        bg = (mx > 222) & (mx - mn < 28)
        lab, _ = label(bg)
        border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        fg = binary_fill_holes(~np.isin(lab, list(border)))
        # quedarse con las piezas grandes (fuera motas de JPEG)
        fl, n = label(fg); sizes = np.bincount(fl.ravel()); sizes[0] = 0
        fg = np.isin(fl, [k for k in range(1, n + 1) if sizes[k] > 150])
        ys, xs = np.where(fg)
        im = Image.fromarray(np.dstack([crop, np.where(fg, 255, 0).astype(np.uint8)])[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
        k = (CELL - 4) / max(im.size)
        im = im.convert("RGBa").resize((round(im.width * k), round(im.height * k)), Image.LANCZOS).convert("RGBA")
        arr = np.array(im); arr[..., 3] = np.where(arr[..., 3] > 110, 255, 0); im = Image.fromarray(arr)
        atlas.alpha_composite(im, (i * CELL + (CELL - im.width) // 2, (CELL - im.height) // 2))
    # segunda fila: siluetas para las medallas que aún no se tienen
    top = np.array(atlas)[:CELL]
    sil = np.zeros_like(top); sil[..., :3] = (20, 8, 14); sil[..., 3] = np.where(top[..., 3] > 0, 80, 0)
    atlas.alpha_composite(Image.fromarray(sil), (0, CELL))
    atlas.save(OUT / "medallas_hd.png", optimize=True)
    json.dump({"cell": CELL, "order": list(ORDEN)}, open(OUT / "medallas_hd.json", "w"))
    print("OK", len(ORDEN), "medallas")

if __name__ == "__main__":
    main()
