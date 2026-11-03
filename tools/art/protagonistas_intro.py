#!/usr/bin/env python3
"""Figuras grandes de los protagonistas para la elección de personaje de la intro (hojas del usuario
assets/reference/protagonistas/intro-<chico|chica>.png: 4 fotogramas de paso sobre fondo blanco, con rótulo y marco).
Quita el fondo, recorta las 4 figuras y las escala (sin redibujar) a celdas de 256×384 (64×96 lógicos a 4×), pies
alineados. Escribe assets/atlas/protas_intro.png (fila 0 chico, fila 1 chica) y protas_intro.json."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label, binary_fill_holes

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets/reference/protagonistas"
CW, CH, ALTO = 256, 384, 372

def figuras(path):
    a = np.array(Image.open(path).convert("RGB")); f = a.astype(int)
    blanco = (f.min(2) > 225) & (f.max(2) - f.min(2) < 22)
    h, w = blanco.shape
    zona = np.zeros_like(blanco); zona[130:h - 30, 30:w - 30] = True       # sin rótulo ni marco
    lab, _ = label(blanco | ~zona)
    borde = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = binary_fill_holes(~np.isin(lab, list(borde))) & zona
    fl, n = label(fg); tam = np.bincount(fl.ravel()); tam[0] = 0
    comps = sorted([k for k in range(1, n + 1) if tam[k] > 20000], key=lambda k: np.where(fl == k)[1].mean())
    if len(comps) != 4: raise SystemExit(f"{path.name}: {len(comps)} figuras")
    out = []
    for k in comps:
        ys, xs = np.where(fl == k)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        m = binary_fill_holes(fl[y0:y1, x0:x1] == k)
        out.append(Image.fromarray(np.dstack([a[y0:y1, x0:x1], np.where(m, 255, 0).astype(np.uint8)])))
    return out

def main():
    filas = [figuras(SRC / "intro-chico.png"), figuras(SRC / "intro-chica.png")]
    k = ALTO / max(im.height for fila in filas for im in fila)
    atlas = Image.new("RGBA", (4 * CW, 2 * CH))
    for r, fila in enumerate(filas):
        for c, im in enumerate(fila):
            s = im.convert("RGBa").resize((round(im.width * k), round(im.height * k)), Image.LANCZOS).convert("RGBA")
            arr = np.array(s); arr[..., 3] = np.where(arr[..., 3] > 110, 255, 0); s = Image.fromarray(arr)
            atlas.alpha_composite(s, (c * CW + (CW - s.width) // 2, r * CH + CH - 4 - s.height))
    atlas.save(ROOT / "assets/atlas/protas_intro.png", optimize=True)
    json.dump({"cw": CW, "ch": CH, "filas": {"chico": 0, "chica": 1}, "frames": 4}, open(ROOT / "assets/atlas/protas_intro.json", "w"))
    print("OK", atlas.size)

if __name__ == "__main__":
    main()
