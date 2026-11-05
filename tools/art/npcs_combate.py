#!/usr/bin/env python3
"""Sprites de combate de los PNJ entrenadores (assets/reference/npcs_combate/NN.png, del usuario): figuras de
4.ª gen. de ~80×80 sobre fondo azul claro. Cada NN corresponde al PNJ de mapa npcNN (tools/art/npcs_ds.py).

Quita el fondo (relleno desde los bordes por los píxeles azulados parecidos al fondo, incluido el filete del marco),
centra la figura en un lienzo de 80×80 con los pies abajo y la amplía 4× sin suavizar. Escribe
assets/sprites/characters_hd/npcNN_combate80.png (320×320). Solo estos PNJ dan combate (aparte de los especiales).
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label

ROOT = Path(__file__).resolve().parents[2]
SRC, OUT = ROOT / "assets/reference/npcs_combate", ROOT / "assets/sprites/characters_hd"
L, K = 80, 4


def recorta(path):
    a = np.array(Image.open(path).convert("RGBA")).astype(int)
    rgb = a[..., :3]
    H, W = rgb.shape[:2]
    bg = np.median(np.concatenate([rgb[2, :], rgb[-3, :], rgb[:, 2], rgb[:, -3]]), axis=0)
    azulado = (rgb[..., 2] > rgb[..., 0] + 40) & (rgb[..., 2] > rgb[..., 1] + 15)
    cand = (np.abs(rgb - bg).sum(2) < 70) | (azulado & (np.abs(rgb - bg).sum(2) < 200))
    marco = np.zeros_like(cand); marco[:2] = marco[-2:] = True; marco[:, :2] = marco[:, -2:] = True
    cand |= marco & azulado
    lab, n = label(cand)
    borde = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fondo = np.isin(lab, list(borde))
    out = a.copy().astype(np.uint8); out[..., 3] = np.where(fondo, 0, 255)
    # restos sueltos (motas del marco)
    lab2, n2 = label(out[..., 3] > 0); tam = np.bincount(lab2.ravel()); tam[0] = 0
    out[..., 3] = np.where(np.isin(lab2, [k for k in range(1, n2 + 1) if tam[k] >= 4]), 255, 0)
    im = Image.fromarray(out)
    bb = im.getbbox()
    fig = im.crop(bb)
    cel = Image.new("RGBA", (L, L))
    cel.alpha_composite(fig, ((L - fig.width) // 2, L - fig.height))
    return cel.resize((L * K, L * K), Image.NEAREST)


def main():
    n = 0
    for p in sorted(SRC.glob("*.png")):
        recorta(p).save(OUT / f"npc{int(p.stem):02d}_combate80.png"); n += 1
    print("OK", n, "sprites de combate")


if __name__ == "__main__":
    main()
