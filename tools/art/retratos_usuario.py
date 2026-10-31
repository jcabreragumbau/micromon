#!/usr/bin/env python3
"""Retratos de combate nuevos del usuario (assets/reference/retratos/<personaje>.png, fondo ya recortado).

Toma la figura grande de la izquierda (el mayor componente opaco que empieza en el tercio izquierdo),
rellena huecos y escribe solo el retrato de combate (normal y HD), sin tocar los sprites de mapa.
No reduce colores en la versión HD: solo escala. Después hay que regenerar el atlas con char_atlas.py.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label, binary_fill_holes
sys.path.insert(0, str(Path(__file__).parent))
from convert_ref import shrink, hd, fit, OUT, OUT_HD, HD
from char_atlas import REFS

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets/reference/retratos"

def figura(path: Path) -> Image.Image:
    a = np.array(Image.open(path).convert("RGBA"))
    lab, _ = label(a[..., 3] > 100)
    sizes = np.bincount(lab.ravel()); sizes[0] = 0
    cand = [k for k in np.argsort(sizes)[::-1] if sizes[k] > 5000 and np.where(lab == k)[1].min() < a.shape[1] * 0.3]
    k = cand[0]
    ys, xs = np.where(lab == k)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    m = binary_fill_holes(lab[y0:y1, x0:x1] == k)
    c = a[y0:y1, x0:x1].copy(); c[..., 3] = np.where(m, 255, 0)
    return Image.fromarray(c)

if __name__ == "__main__":
    for p in sorted(SRC.glob("*.png")):
        ref = REFS[p.stem]
        im = figura(p)
        fit(shrink(im, 92, colors=24), 64, 96).save(OUT / f"{ref}_combate.png")
        fit(hd(im, 94 * HD, 64 * HD), 64 * HD, 96 * HD).save(OUT_HD / f"{ref}_combate.png")
        print("OK", p.stem, ref, im.size)
