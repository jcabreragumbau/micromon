#!/usr/bin/env python3
"""Protagonistas de espaldas para el combate (hojas del usuario assets/reference/protagonistas/espalda-<chico|chica>.png:
5 fotogramas de lanzamiento dentro de un marco con el rótulo «Back», fondo blanco).
Quita el fondo, el marco y el rótulo; cada fotograma se recorta en su quinta parte del marco (así el cuerpo no se
mueve entre fotogramas aunque el brazo se estire) con los pies en el borde inferior, y se escala sin redibujar a
celdas de 384×384 (96×96 lógicos a 4×). Escribe assets/atlas/protas_espalda.png (fila 0 chico, 1 chica)."""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label, binary_fill_holes

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets/reference/protagonistas"
CELL = 384          # alto de la celda; el ancho es CW (cabe un brazo estirado)
CW = 512

def fotogramas(path):
    a = np.array(Image.open(path).convert("RGB")); f = a.astype(int)
    oscuro = f.max(2) < 60
    filas = np.where(oscuro.mean(1) > 0.8)[0]; cols = np.where(oscuro.mean(0) > 0.5)[0]
    y0, y1 = filas.min() + 6, filas.max() - 8          # dentro del marco
    x0, x1 = cols.min() + 6, cols.max() - 5
    sub = a[y0:y1, x0:x1]; s = sub.astype(int)
    blanco = (s.min(2) > 222) & (s.max(2) - s.min(2) < 24)
    lab, _ = label(blanco)
    borde = set(np.unique(np.concatenate([lab[0], lab[:, 0], lab[:, -1]]))) - {0}
    fg = binary_fill_holes(~np.isin(lab, list(borde)))
    fl, n = label(fg); tam = np.bincount(fl.ravel()); tam[0] = 0
    top = None
    W = fg.shape[1] / 5
    # cada pieza va al fotograma en cuya quinta parte cae su centro (una mano que sobresale no se cuela en el vecino)
    asign = {}
    for k in range(1, n + 1):
        if tam[k] < 3000: continue
        xs = np.where(fl == k)[1]
        asign.setdefault(min(4, int(xs.mean() // W)), []).append(k)
    ys_all = np.where(np.isin(fl, sum(asign.values(), [])).any(1))[0]; top = ys_all.min()
    M = int(W * 0.18)                    # margen a cada lado para brazos estirados
    out = []
    for i in range(5):
        a0 = int(i * W) - M; a1 = int((i + 1) * W) + M
        pad = np.zeros((fg.shape[0], fg.shape[1] + 2 * M, 3), np.uint8); pad[:, M:M + fg.shape[1]] = sub
        mk = np.zeros((fg.shape[0], fg.shape[1] + 2 * M), bool); mk[:, M:M + fg.shape[1]] = np.isin(fl, asign.get(i, []))
        a0 += M; a1 += M
        out.append(Image.fromarray(np.dstack([pad[top:, a0:a1], np.where(mk[top:, a0:a1], 255, 0).astype(np.uint8)])))
    return out

def main():
    filas = [fotogramas(SRC / "espalda-chico.png"), fotogramas(SRC / "espalda-chica.png")]
    k = min(CELL / max(im.height for fila in filas for im in fila), CW / max(im.width for fila in filas for im in fila))
    atlas = Image.new("RGBA", (5 * CW, 2 * CELL))
    for r, fila in enumerate(filas):
        for c, im in enumerate(fila):
            s = im.convert("RGBa").resize((round(im.width * k), round(im.height * k)), Image.LANCZOS).convert("RGBA")
            arr = np.array(s); arr[..., 3] = np.where(arr[..., 3] > 110, 255, 0)
            atlas.alpha_composite(Image.fromarray(arr), (c * CW + (CW - s.width) // 2, r * CELL + CELL - s.height))
    atlas.save(ROOT / "assets/atlas/protas_espalda.png", optimize=True)
    print("OK", atlas.size)

if __name__ == "__main__":
    main()
