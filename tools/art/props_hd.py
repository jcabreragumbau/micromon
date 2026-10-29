#!/usr/bin/env python3
"""Edificios y árboles HD a partir de las ilustraciones del usuario (assets/reference/props/).

Quita el fondo blanco, recorta y empaqueta en assets/atlas/props_hd.png con un JSON que
indica, en píxeles del atlas, el rectángulo de cada imagen, el centro y la base de la puerta
y el ancho de la fachada (para encajar el dibujo sobre la planta del edificio en el mapa).
No se reducen colores ni se redibuja nada: solo se escala.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets/reference/props"
OUT = ROOT / "assets/atlas"
MAXW = 440  # ancho máximo guardado (≈ 4× el tamaño en pantalla)

# Medidas en píxeles de la ilustración original: centro de la puerta, base de la puerta, fachada (x0, x1)
META = {
    "casa_roja":   dict(door=(530, 885), wall=(85, 945)),
    "casa_azul":   dict(door=(530, 885), wall=(85, 945)),
    "laboratorio": dict(door=(513, 545), wall=(235, 810)),
    "centro":      dict(door=(512, 528), wall=(130, 900)),
    "tienda":      dict(door=(512, 528), wall=(130, 900)),
    "arbol":       dict(),
}

def cut(path: Path) -> tuple[Image.Image, tuple[int, int]]:
    a = np.array(Image.open(path).convert("RGB"))
    f = a.astype(int)
    mx, mn = f.max(2), f.min(2)
    bg = (mx > 228) & (mx - mn < 20)
    lab, _ = label(bg)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ~np.isin(lab, list(border))
    if path.stem == "laboratorio":
        # huecos blancos cerrados (entre las tuberías): también son fondo
        white = (mx > 240) & (mx - mn < 12)
        wl, n = label(white)
        sizes = np.bincount(wl.ravel())
        for i in range(1, n + 1):
            if sizes[i] > 60: fg[wl == i] = False
    ys, xs = np.where(fg)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    rgba = np.dstack([a, np.where(fg, 255, 0).astype(np.uint8)])[y0:y1, x0:x1]
    return Image.fromarray(rgba), (x0, y0)

def main():
    items = {}
    for name, meta in META.items():
        im, (ox, oy) = cut(SRC / f"{name}.png")
        k = min(1.0, MAXW / im.width)
        im = im.convert("RGBa").resize((round(im.width * k), round(im.height * k)), Image.LANCZOS).convert("RGBA")
        a = np.array(im); a[..., 3] = np.where(a[..., 3] > 110, 255, 0); im = Image.fromarray(a)
        m = {}
        if "door" in meta:
            m["door"] = [round((meta["door"][0] - ox) * k), round((meta["door"][1] - oy) * k)]
            m["wall"] = [round((meta["wall"][0] - ox) * k), round((meta["wall"][1] - ox) * k)]
        items[name] = (im, m)
    # variante oscura del árbol para los bosques densos
    t = np.array(items["arbol"][0]).astype(float)
    t[..., :3] *= [0.72, 0.8, 0.86]
    items["arbolv"] = (Image.fromarray(t.clip(0, 255).astype(np.uint8)), {})
    W = sum(im.width for im, _ in items.values()) + 2 * len(items)
    H = max(im.height for im, _ in items.values())
    atlas = Image.new("RGBA", (W, H)); x = 0; meta = {}
    for name, (im, m) in items.items():
        atlas.alpha_composite(im, (x, 0))
        meta[name] = {"x": x, "y": 0, "w": im.width, "h": im.height, **m}
        x += im.width + 2
    atlas.save(OUT / "props_hd.png", optimize=True)
    json.dump(meta, open(OUT / "props_hd.json", "w"))
    print("OK", {k: (v["w"], v["h"]) for k, v in meta.items()})

if __name__ == "__main__":
    main()
