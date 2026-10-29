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
from convert_ref import shrink, fit, hd, HD, OUT_HD

ROOT = Path(__file__).resolve().parents[2]
SRC, OUT = ROOT / "assets/reference", ROOT / "assets/sprites/characters"
# ref: (imagen, caja del personaje, franja central, zonas de fondo)
GUIA = {
    "ref8": ("image8.jpeg", (55, 40, 505, 905), (185, 130, 330, 880), [(0, 130, 122, 420), (122, 130, 172, 238), (122, 312, 190, 418), (0, 420, 98, 790)], [(130, 250, 200, 300)]),
    "ref9": ("image9.jpeg", (150, 125, 565, 905), (255, 165, 360, 880), [(0, 110, 248, 330), (248, 110, 445, 138), (0, 330, 150, 860)]),
    "ref10": ("image10.jpeg", (115, 95, 525, 905), (260, 120, 340, 880), [(350, 105, 560, 250), (350, 250, 420, 282), (448, 250, 575, 360), (0, 95, 105, 880), (105, 95, 228, 262), (105, 560, 138, 860), (525, 250, 575, 905)], [(100, 392, 232, 492), (150, 470, 215, 520)]),
    "ref11": ("image11.jpeg", (75, 105, 515, 895), (190, 125, 330, 880), [(0, 140, 165, 335), (0, 440, 85, 900), (470, 450, 560, 760)]),
    "ref13": ("image13.jpeg", (70, 105, 470, 925), (238, 150, 318, 900), [(0, 95, 215, 320), (0, 600, 80, 900), (0, 330, 55, 580), (470, 100, 565, 800)], [(400, 320, 452, 388)]),
    "ref7": ("image7.jpeg", (60, 120, 500, 860), (230, 150, 350, 840), [(0, 130, 190, 300), (0, 300, 95, 345), (0, 390, 68, 760)], [(75, 355, 165, 440)]),
    "ref23": ("image23.jpeg", (95, 115, 520, 735), (225, 140, 330, 720), [(0, 330, 150, 550), (0, 545, 178, 705), (298, 60, 527, 220), (0, 60, 95, 330), (95, 60, 200, 165), (0, 735, 527, 880)], [(105, 170, 200, 300)]),
    "ref14": ("image14.jpeg", (55, 95, 425, 830), (215, 140, 330, 800), [(0, 110, 195, 238), (0, 340, 105, 660), (0, 670, 160, 820), (420, 140, 500, 640)], [(62, 248, 112, 298)]),
    "ref15": ("image15.jpeg", (110, 110, 445, 850), (232, 140, 315, 820), [(0, 105, 226, 236), (322, 105, 400, 228), (226, 105, 322, 121), (150, 236, 205, 262), (0, 236, 112, 370), (0, 370, 140, 650), (0, 650, 165, 820), (445, 170, 520, 680)]),
    "ref19": ("image19.png", (130, 137, 614, 1214), (311, 188, 477, 1156), [(0, 159, 286, 344), (0, 344, 133, 477), (0, 491, 188, 954), (0, 961, 267, 1199), (607, 224, 722, 954)], [(144, 368, 209, 433), (202, 405, 311, 477)]),
    "ref22": ("image22.jpeg", (115, 115, 445, 885), (240, 140, 340, 860), [(0, 100, 105, 300), (0, 480, 165, 885), (455, 100, 560, 800)]),
}

def cut(ref):
    f, (x0, y0, x1, y1), (cx0, cy0, cx1, cy1), bgs, *extra = GUIA[ref]
    fgs = extra[0] if extra else []
    img = np.array(Image.open(SRC / f).convert("RGB"))
    H, W, _ = img.shape
    gc = np.full((H, W), cv2.GC_BGD, np.uint8)
    gc[y0:y1, x0:x1] = cv2.GC_PR_BGD
    yy, xx = np.mgrid[0:H, 0:W]
    ell = (((xx - (x0 + x1) / 2) / ((x1 - x0) * 0.42)) ** 2 + ((yy - (y0 + y1) / 2) / ((y1 - y0) * 0.5)) ** 2) < 1
    gc[ell & (gc == cv2.GC_PR_BGD)] = cv2.GC_PR_FGD
    for (a, b, c, d) in bgs: gc[b:d, a:c] = cv2.GC_BGD
    gc[cy0:cy1, cx0:cx1] = cv2.GC_FGD
    for (a, b, c, d) in fgs: gc[b:d, a:c] = cv2.GC_FGD
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
    # cielo y gradas del estadio (solo Pasteur): azules claros
    if ref == "ref23":
        f = img.astype(int)
        sky = (f[..., 2] > f[..., 0] + 30) & (f[..., 1] > f[..., 0] + 5) & (f.sum(2) > 330)
        fg = fg & ~sky
        fg = cv2.morphologyEx(fg.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(bool)
    # sombra del suelo: grises claros y poco saturados en el 10 % inferior
    ys, xs = np.where(fg); top, bot = ys.min(), ys.max()
    f = img.astype(int); grey = ((f.max(2) - f.min(2)) < 16) & (f.max(2) > 140)
    floor = np.zeros_like(fg); floor[int(bot - (bot - top) * 0.10):] = True
    fg = fg & ~(grey & floor)
    n, lab, st, _ = cv2.connectedComponentsWithStats(fg.astype(np.uint8))
    fg = lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])
    ys, xs = np.where(fg)
    a0, a1, b0, b1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    crop = np.dstack([img, np.where(fg, 255, 0).astype(np.uint8)])[a0:a1, b0:b1]
    port = fit(shrink(Image.fromarray(crop), 92, colors=24), 64, 96)
    port.save(OUT / f"{ref}_combate.png")
    OUT_HD.mkdir(parents=True, exist_ok=True)
    fit(hd(Image.fromarray(crop), 94 * HD, 64 * HD), 64 * HD, 96 * HD).save(OUT_HD / f"{ref}_combate.png")
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
