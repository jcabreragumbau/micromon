#!/usr/bin/env python3
"""Sprites de Microos dibujados por el usuario: láminas en assets/reference/microos/ con una rejilla de especies
(nombre arriba; frente a la izquierda y espalda a la derecha) sobre fondo claro.

Quita el fondo y los rótulos, separa cada figura y la escala a la celda de 80 px del juego con la misma escala para
toda la lámina (se respetan los tamaños relativos que dibujó el usuario). Escribe
assets/sprites/microos_usuario/<id>_frente.png y _espalda.png, que species_art.py usa en lugar de los generados.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label, binary_fill_holes

ROOT = Path(__file__).resolve().parents[2]
SRC, OUT = ROOT / "assets/reference/microos", ROOT / "assets/sprites/microos_usuario"
C, MAXF = 80, 76

LAMINAS = {
    "iniciales.png": [["synechoc", "anabaen", "spirulmax"], ["butyricum", "acetobuty", "thermocel"], ["paramec", "vorticel", "stentorox"]],
}

def figuras(path, rejilla):
    a = np.array(Image.open(path).convert("RGB")); f = a.astype(int)
    fondo = (f.min(2) > 215) & (f.max(2) - f.min(2) < 26)
    lab, _ = label(fondo)
    borde = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = binary_fill_holes(~np.isin(lab, list(borde)))
    fl, n = label(fg); tam = np.bincount(fl.ravel()); tam[0] = 0
    # piezas grandes (figuras); los rótulos son letras sueltas pequeñas y oscuras sobre una franja
    comps = []
    for k in range(1, n + 1):
        if tam[k] < 60: continue
        ys, xs = np.where(fl == k)
        # letras de los rótulos: piezas pequeñas casi negras
        tinta = ~fondo[ys, xs]
        if tam[k] < 4000 and tinta.any() and f[ys, xs][tinta].sum(1).mean() < 260 and (ys.max() - ys.min()) < 50: continue
        comps.append(dict(k=k, x=xs.mean(), y=ys.mean(), x0=xs.min(), x1=xs.max() + 1, y0=ys.min(), y1=ys.max() + 1, n=tam[k]))
    H, W = fg.shape
    filas, cols = len(rejilla), len(rejilla[0])
    out = {}
    for r in range(filas):
        for c in range(cols):
            celda = [q for q in comps if int(q["y"] / (H / filas)) == r and int(q["x"] / (W / cols)) == c]
            cuerpo = celda
            xm = c * W / cols + W / cols / 2
            for lado, sel in (("frente", [q for q in cuerpo if q["x"] < xm]), ("espalda", [q for q in cuerpo if q["x"] >= xm])):
                if not sel: raise SystemExit(f"{rejilla[r][c]} {lado}: sin figura")
                x0 = min(q["x0"] for q in sel); x1 = max(q["x1"] for q in sel); y0 = min(q["y0"] for q in sel); y1 = max(q["y1"] for q in sel)
                m = np.isin(fl[y0:y1, x0:x1], [q["k"] for q in sel])
                out[(rejilla[r][c], lado)] = Image.fromarray(np.dstack([a[y0:y1, x0:x1], np.where(m, 255, 0).astype(np.uint8)]))
    return out

def a_celda(im, k, alto_celda=C):
    s = im.convert("RGBa").resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS).convert("RGBA")
    arr = np.array(s); arr[..., 3] = np.where(arr[..., 3] > 120, 255, 0)
    s = Image.fromarray(arr)
    cel = Image.new("RGBA", (C, C)); cel.alpha_composite(s, ((C - s.width) // 2, alto_celda - 2 - s.height))
    return cel

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for lam, rejilla in LAMINAS.items():
        figs = figuras(SRC / lam, rejilla)
        k = MAXF / max(max(im.width, im.height) for im in figs.values())
        for (sp, lado), im in figs.items():
            a_celda(im, k).save(OUT / f"{sp}_{lado}.png")
        print("OK", lam, len(figs), "figuras")

if __name__ == "__main__":
    main()
