#!/usr/bin/env python3
"""Retratos de combate con fondo muy cargado: recorte GrabCut guiado a mano.

Para cada imagen: caja del personaje, franja central que siempre es personaje y
zonas que siempre son fondo (pantallas, carteles, estanterías, iconos).
Sobrescribe assets/sprites/characters/<ref>_combate.png y _busto.png.
"""
import sys
from pathlib import Path
import numpy as np, cv2
from PIL import Image
from scipy.ndimage import binary_fill_holes
sys.path.insert(0, str(Path(__file__).parent))
from convert_ref import shrink, fit

ROOT = Path(__file__).resolve().parents[2]
SRC, OUT = ROOT / "assets/reference", ROOT / "assets/sprites/characters"
# ref: (imagen, caja del personaje, franja central, zonas de fondo)
GUIA = {
    "ref8": ("image8.jpeg", (55, 40, 505, 905), (185, 130, 330, 880), [(0, 130, 115, 340), (0, 440, 55, 720)]),
    "ref9": ("image9.jpeg", (150, 125, 565, 905), (255, 165, 360, 880), [(0, 110, 205, 330), (0, 330, 150, 860)]),
    "ref10": ("image10.jpeg", (115, 95, 525, 905), (255, 120, 380, 880), [(400, 105, 560, 245), (0, 95, 105, 880), (525, 250, 575, 905)]),
    "ref11": ("image11.jpeg", (75, 105, 515, 895), (190, 125, 330, 880), [(0, 140, 165, 335), (0, 440, 85, 900), (470, 450, 560, 760)]),
    "ref13": ("image13.jpeg", (70, 105, 470, 925), (220, 130, 330, 900), [(0, 95, 215, 320), (0, 600, 80, 900), (0, 330, 55, 580), (470, 100, 565, 800)]),
    "ref22": ("image22.jpeg", (115, 115, 445, 885), (240, 140, 340, 860), [(0, 100, 105, 300), (0, 480, 165, 885), (455, 100, 560, 800)]),
}

def cut(ref):
    f, (x0, y0, x1, y1), (cx0, cy0, cx1, cy1), bgs = GUIA[ref]
    img = np.array(Image.open(SRC / f).convert("RGB"))
    H, W, _ = img.shape
    gc = np.full((H, W), cv2.GC_BGD, np.uint8)
    gc[y0:y1, x0:x1] = cv2.GC_PR_BGD
    yy, xx = np.mgrid[0:H, 0:W]
    ell = (((xx - (x0 + x1) / 2) / ((x1 - x0) * 0.42)) ** 2 + ((yy - (y0 + y1) / 2) / ((y1 - y0) * 0.5)) ** 2) < 1
    gc[ell & (gc == cv2.GC_PR_BGD)] = cv2.GC_PR_FGD
    for (a, b, c, d) in bgs: gc[b:d, a:c] = cv2.GC_BGD
    gc[cy0:cy1, cx0:cx1] = cv2.GC_FGD
    bgd, fgd = np.zeros((1, 65)), np.zeros((1, 65))
    cv2.grabCut(cv2.cvtColor(img, cv2.COLOR_RGB2BGR), gc, None, bgd, fgd, 12, cv2.GC_INIT_WITH_MASK)
    fg = ((gc == 1) | (gc == 3)).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(fg)
    fg = (lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])).astype(np.uint8)
    fg = binary_fill_holes(cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8)).astype(bool))
    # quitar el gris liso del panel que queda pegado a la silueta (tolerancia estrecha: no tocar batas blancas)
    panel = np.median(img[5:40, 5:40].reshape(-1, 3), axis=0)
    near = np.abs(img.astype(int) - panel).max(axis=2) < 14
    edge = fg & near
    _, lab2 = cv2.connectedComponents(edge.astype(np.uint8))
    border = fg & ~cv2.erode(fg.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
    touching = set(np.unique(lab2[border & edge])) - {0}
    fg = fg & ~np.isin(lab2, list(touching))
    fg = cv2.morphologyEx(fg.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(bool)
    n, lab, st, _ = cv2.connectedComponentsWithStats(fg.astype(np.uint8))
    fg = lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])
    ys, xs = np.where(fg)
    a0, a1, b0, b1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    crop = np.dstack([img, np.where(fg, 255, 0).astype(np.uint8)])[a0:a1, b0:b1]
    port = fit(shrink(Image.fromarray(crop), 92, colors=24), 64, 96)
    port.save(OUT / f"{ref}_combate.png")
    bh = int(crop.shape[0] * 0.42); bust = crop[:bh]
    cols = np.where(bust[..., 3].any(0))[0]; bust = bust[:, cols.min():cols.max() + 1]
    b = shrink(Image.fromarray(bust), 60, colors=24)
    if b.width > 64: b = shrink(Image.fromarray(bust), round(60 * 64 / b.width), colors=24)
    fit(b, 64, 64).save(OUT / f"{ref}_busto.png")
    return port

if __name__ == "__main__":
    ims = [cut(r) for r in GUIA]
    c = Image.new("RGBA", (70 * len(ims), 100), (90, 140, 200, 255))
    for k, im in enumerate(ims): c.alpha_composite(im, (k * 70, 2))
    c.resize((c.width * 3, c.height * 3), Image.NEAREST).save(sys.argv[1] if len(sys.argv) > 1 else "/tmp/ports_fix.png")
    print("OK", len(ims), "retratos")
