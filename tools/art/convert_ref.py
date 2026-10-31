#!/usr/bin/env python3
"""Convierte las ilustraciones de referencia del GDD en sprites de juego.

Detecta en cada hoja las figuras del lado derecho (sprites de mapa) y la figura
grande del lado izquierdo (retrato de combate), quita el fondo, reduce al tamaño
de juego y cuantiza a una paleta corta. Uso:
  python3 tools/art/convert_ref.py assets/reference/image12.jpeg luquin
"""
import sys
from pathlib import Path
import numpy as np
import cv2
from scipy.ndimage import binary_fill_holes
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "sprites" / "characters"

def bg_mask(img: np.ndarray, tol=26) -> np.ndarray:
    """True donde hay figura. El fondo es un gris suave: se rellena por inundación desde los bordes."""
    h, w, _ = img.shape
    f = img.astype(int)
    # gris de fondo: saturación baja y luminosidad alta
    mx, mn = f.max(2), f.min(2)
    near_bg = (mx - mn < 18) & (mx > 150)
    # inundación desde los bordes sobre píxeles «de fondo»
    seen = np.zeros((h, w), bool)
    stack = [(0, x) for x in range(w)] + [(h - 1, x) for x in range(w)] + [(y, 0) for y in range(h)] + [(y, w - 1) for y in range(h)]
    while stack:
        y, x = stack.pop()
        if y < 0 or x < 0 or y >= h or x >= w or seen[y, x] or not near_bg[y, x]:
            continue
        seen[y, x] = True
        stack.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
    return ~seen

def components(mask: np.ndarray, min_area=1500):
    h, w = mask.shape
    lab = np.zeros((h, w), int); n = 0; boxes = []
    for y0 in range(h):
        for x0 in range(w):
            if mask[y0, x0] and not lab[y0, x0]:
                n += 1; stack = [(y0, x0)]; lab[y0, x0] = n; pts = []
                while stack:
                    y, x = stack.pop(); pts.append((y, x))
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                            lab[yy, xx] = n; stack.append((yy, xx))
                if len(pts) >= min_area:
                    ys, xs = zip(*pts)
                    boxes.append((min(xs), min(ys), max(xs) + 1, max(ys) + 1, n, len(pts)))
    return lab, boxes

def shrink(rgba: Image.Image, target_h: int, colors=15) -> Image.Image:
    w, h = rgba.size
    tw = max(1, round(w * target_h / h))
    small = rgba.resize((tw, target_h), Image.BOX)
    a = np.array(small)
    alpha = a[..., 3] > 110
    rgb = Image.fromarray(a[..., :3]).quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
    out = np.zeros((target_h, tw, 4), np.uint8)
    out[..., :3] = np.array(rgb); out[..., 3] = np.where(alpha, 255, 0)
    # contorno oscuro de 1 px
    pad = np.pad(alpha, 1)
    edge = (~alpha) & (pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:])
    out[edge] = (26, 20, 32, 255)
    return Image.fromarray(out)

HD = 4  # factor de la versión en alta resolución (el juego dibuja a 4× la resolución lógica)
OUT_HD = ROOT / "assets" / "sprites" / "characters_hd"

def hd(rgba: Image.Image, target_h: int, max_w: int | None = None) -> Image.Image:
    """Versión fiel a la ilustración original: solo cambia de tamaño (sin reducir colores ni redibujar)."""
    w, h = rgba.size
    tw = max(1, round(w * target_h / h))
    if max_w and tw > max_w: target_h = max(1, round(target_h * max_w / tw)); tw = max_w
    small = rgba.convert("RGBa").resize((tw, target_h), Image.LANCZOS).convert("RGBA")
    a = np.array(small)
    a[..., 3] = np.where(a[..., 3] > 120, 255, 0)
    return Image.fromarray(a)

def fit(im: Image.Image, w: int, h: int) -> Image.Image:
    c = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    c.paste(im, ((w - im.width) // 2, h - im.height), im)
    return c

def portrait_mask(img: np.ndarray, mask: np.ndarray):
    H, W, _ = img.shape
    gc = np.full((H, W), cv2.GC_BGD, np.uint8)
    left = mask.copy(); left[:, int(W * 0.55):] = False; left[: int(H * 0.11)] = False
    if left.sum() < H * W * 0.05:
        return None
    gc[left] = cv2.GC_PR_BGD
    feet = left[int(H * 0.85):int(H * 0.98)]
    fx = np.where(feet)[1]
    cx = float(np.median(fx)) if fx.size else W * 0.3
    cy = H * 0.55
    yy, xx = np.mgrid[0:H, 0:W]
    ell = ((xx - cx) / (W * 0.16)) ** 2 + ((yy - cy) / (H * 0.42)) ** 2 < 1
    gc[left & ell] = cv2.GC_PR_FGD
    gc[int(H * 0.2):int(H * 0.9), int(cx) - 8:int(cx) + 8][left[int(H * 0.2):int(H * 0.9), int(cx) - 8:int(cx) + 8]] = cv2.GC_FGD
    bgd, fgd = np.zeros((1, 65)), np.zeros((1, 65))
    cv2.grabCut(cv2.cvtColor(img, cv2.COLOR_RGB2BGR), gc, None, bgd, fgd, 10, cv2.GC_INIT_WITH_MASK)
    fg = ((gc == 1) | (gc == 3)).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(fg)
    if n < 2:
        return None
    fg = (lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    return binary_fill_holes(fg.astype(bool))

# Hojas con distribución propia: vista -> índice de componente (en el orden de components()); "-k" = espejo de k
MANUAL = {
    "ref24": {"frente": 1, "espalda": 2, "derecha": 3, "izquierda": 4, "frente2": 5},
    "ref25": {"frente": 1, "espalda": 2, "derecha": 3, "izquierda": 4, "frente2": 5},
    "ref26": {"frente": 1, "espalda": 3, "izquierda": 2, "derecha": "-2", "frente2": 4},
    "ref27": {"frente": 1, "espalda": 2, "derecha": 3, "izquierda": "-3", "frente2": 6},
}

def main_manual(src: str, name: str):
    img = np.array(Image.open(src).convert("RGB"))
    mask = bg_mask(img)
    lab, boxes = components(mask)
    rgba = np.dstack([img, np.where(mask, 255, 0).astype(np.uint8)])
    OUT.mkdir(parents=True, exist_ok=True); OUT_HD.mkdir(parents=True, exist_ok=True)
    def crop(k):
        x0, y0, x1, y1, n, _ = boxes[k]
        c = rgba[y0:y1, x0:x1].copy()
        c[..., 3] = np.where(lab[y0:y1, x0:x1] == n, c[..., 3], 0)
        return Image.fromarray(c)
    for view, k in MANUAL[name].items():
        mirror = isinstance(k, str)
        im = crop(abs(int(k)))
        if mirror: im = im.transpose(Image.FLIP_LEFT_RIGHT)
        fit(shrink(im, 26, colors=12), 32, 32).save(OUT / f"{name}_mapa_{view}.png")
        fit(hd(im, 28 * HD, 32 * HD), 32 * HD, 32 * HD).save(OUT_HD / f"{name}_mapa_{view}.png")
    # retrato: la figura grande (fondo liso, basta la máscara)
    big = max(range(len(boxes)), key=lambda k: boxes[k][5])
    x0, y0, x1, y1, n, _ = boxes[big]
    m = binary_fill_holes(lab[y0:y1, x0:x1] == n)
    c = rgba[y0:y1, x0:x1].copy(); c[..., 3] = np.where(m, 255, 0)
    im = Image.fromarray(c)
    fit(shrink(im, 92, colors=24), 64, 96).save(OUT / f"{name}_combate.png")
    fit(hd(im, 94 * HD, 64 * HD), 64 * HD, 96 * HD).save(OUT_HD / f"{name}_combate.png")
    print(name, "manual OK")

# Hojas nuevas del usuario con fondo transparente (y a veces un panel gris o rótulos):
# retrato = la figura más grande; los 5 sprites de mapa se leen por filas como en las del GDD.
LIMPIAS = {"ref1": "image28.png", "ref2": "image29.png", "ref3": "image30.png"}

def main_limpia(src: str, name: str):
    im = Image.open(src).convert("RGBA")
    fondo = Image.new("RGBA", im.size, (214, 214, 214, 255)); fondo.alpha_composite(im)
    img = np.array(fondo.convert("RGB"))
    H, W, _ = img.shape
    mask = bg_mask(img)
    lab, boxes = components(mask)
    big = max(range(len(boxes)), key=lambda k: boxes[k][5])
    px0, py0, px1, py1, pn, _ = boxes[big]
    sprites = [b for k, b in enumerate(boxes) if k != big and (b[0] + b[2]) / 2 > px1 - 20]
    sprites.sort(key=lambda b: (b[1] + b[3]) / 2)
    rows, cur = [], []
    for b in sprites:
        if cur and (b[1] + b[3]) / 2 - (cur[-1][1] + cur[-1][3]) / 2 > H * 0.08: rows.append(cur); cur = []
        cur.append(b)
    if cur: rows.append(cur)
    ordered = [b for r in rows for b in sorted(r, key=lambda b: b[0])]
    if len(ordered) != 5: raise SystemExit(f"{name}: se esperaban 5 sprites de mapa y hay {len(ordered)}")
    rgba = np.dstack([img, np.where(mask, 255, 0).astype(np.uint8)])
    OUT.mkdir(parents=True, exist_ok=True); OUT_HD.mkdir(parents=True, exist_ok=True)
    for (x0, y0, x1, y1, n, _), nm in zip(ordered, ["frente", "espalda", "derecha", "izquierda", "frente2"]):
        c = rgba[y0:y1, x0:x1].copy(); c[..., 3] = np.where(binary_fill_holes(lab[y0:y1, x0:x1] == n), 255, 0)
        fr = Image.fromarray(c)
        fit(shrink(fr, 26, colors=12), 32, 32).save(OUT / f"{name}_mapa_{nm}.png")
        fit(hd(fr, 28 * HD, 32 * HD), 32 * HD, 32 * HD).save(OUT_HD / f"{name}_mapa_{nm}.png")
    m = binary_fill_holes(lab[py0:py1, px0:px1] == pn)
    c = rgba[py0:py1, px0:px1].copy(); c[..., 3] = np.where(m, 255, 0)
    fr = Image.fromarray(c)
    fit(shrink(fr, 92, colors=24), 64, 96).save(OUT / f"{name}_combate.png")
    fit(hd(fr, 94 * HD, 64 * HD), 64 * HD, 96 * HD).save(OUT_HD / f"{name}_combate.png")
    print(name, "hoja limpia OK")

def main(src: str, name: str):
    if name in MANUAL: return main_manual(src, name)
    if name in LIMPIAS and Path(src).name == LIMPIAS[name]: return main_limpia(src, name)
    img = np.array(Image.open(src).convert("RGB"))
    H, W, _ = img.shape
    mask = bg_mask(img)
    lab, boxes = components(mask)
    right = [b for b in boxes if b[0] > W * 0.58 and b[1] > H * 0.12]
    left = [b for b in boxes if b[0] < W * 0.58 and (b[3] - b[1]) > H * 0.5]
    OUT.mkdir(parents=True, exist_ok=True)
    rgba = np.dstack([img, np.where(mask, 255, 0).astype(np.uint8)])
    # Sprites de mapa: agrupar por filas según el centro vertical y leer de izquierda a derecha
    right.sort(key=lambda b: (b[1] + b[3]) / 2)
    rows, cur = [], []
    for b in right:
        if cur and (b[1] + b[3]) / 2 - (cur[-1][1] + cur[-1][3]) / 2 > H * 0.08:
            rows.append(cur); cur = []
        cur.append(b)
    if cur: rows.append(cur)
    ordered = [b for r in rows for b in sorted(r, key=lambda b: b[0])]
    frames, hd_frames = [], []
    for (x0, y0, x1, y1, n, _) in ordered[:5]:
        crop = rgba[y0:y1, x0:x1].copy()
        crop[..., 3] = np.where(lab[y0:y1, x0:x1] == n, crop[..., 3], 0)
        frames.append(fit(shrink(Image.fromarray(crop), 26, colors=12), 32, 32))
        OUT_HD.mkdir(parents=True, exist_ok=True)
        hd_frames.append(fit(hd(Image.fromarray(crop), 28 * HD, 32 * HD), 32 * HD, 32 * HD))
    # En las hojas: fila 1 = frente y espalda; fila 2 = perfil que mira a la derecha y a la izquierda; fila 3 = frente (paso)
    names = ["frente", "espalda", "derecha", "izquierda", "frente2"]
    for f, nm in zip(frames, names):
        f.save(OUT / f"{name}_mapa_{nm}.png")
    for f, nm in zip(hd_frames, names):
        f.save(OUT_HD / f"{name}_mapa_{nm}.png")
    # Retrato de combate: GrabCut con una silueta previa en el centro del panel izquierdo
    port = portrait_mask(img, mask)
    if port is not None:
        ys, xs = np.where(port)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        crop = rgba[y0:y1, x0:x1].copy()
        crop[..., 3] = np.where(port[y0:y1, x0:x1], 255, 0)
        fit(shrink(Image.fromarray(crop), 92, colors=24), 64, 96).save(OUT / f"{name}_combate.png")
        fit(hd(Image.fromarray(crop), 94 * HD, 64 * HD), 64 * HD, 96 * HD).save(OUT_HD / f"{name}_combate.png")
        # Busto para diálogos: parte superior del retrato con más detalle en la cara
        bh = int(crop.shape[0] * 0.42)
        bust = crop[:bh]
        cols = np.where(bust[..., 3].any(0))[0]
        bust = bust[:, cols.min():cols.max() + 1]
        b = shrink(Image.fromarray(bust), 60, colors=24)
        if b.width > 64:
            b = shrink(Image.fromarray(bust), round(60 * 64 / b.width), colors=24)
        fit(b, 64, 64).save(OUT / f"{name}_busto.png")
    print(name, "mapa:", len(frames), "retrato:", port is not None)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
