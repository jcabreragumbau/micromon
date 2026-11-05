#!/usr/bin/env python3
"""PNJ genéricos a partir de las hojas del usuario (assets/reference/npcs/npcs_*.png): sprites de 4.ª generación,
cada personaje en un bloque de fondo liso con 12 fotogramas de 32×32 (3 columnas × 4 filas).

Los fotogramas no siguen el orden del juego: se clasifican solos.
  - Espalda: (0,0), (0,2), (3,1); frente: (1,2), (2,2), (3,2); derecha: (0,1), (1,1), (2,1); izquierda: (1,0),
    (2,0), (3,0) (orden de las hojas, comprobado por la posición de la piel de la cara en los perfiles).
  - En cada dirección, el fotograma «quieto» es el primero de la lista (los otros dos son pasos).
Si un bloque está recortado (faltan filas), los perfiles se completan con el espejo del lado contrario y la espalda
con el espejo de los pasos que haya.

Escala 4× sin suavizar (píxel art), pies alineados como el resto de personajes. No redibuja ni cambia colores.
Escribe assets/sprites/characters_hd/<id>_hoja.png (384×512: frente, espalda, izquierda, derecha × quieto, paso, paso)
y, si se pasa una ruta como argumento, una hoja de revisión (una fila por PNJ).
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label

ROOT = Path(__file__).resolve().parents[2]
SRC, OUT = ROOT / "assets/reference/npcs", ROOT / "assets/sprites/characters_hd"
F, K, C = 32, 4, 128
# el primero de cada lista es el fotograma quieto (cabeza 1 px más baja que en los pasos)
ESPALDA, FRENTE = [(0, 0), (0, 2), (3, 1)], [(1, 2), (2, 2), (3, 2)]
DERECHA, IZQUIERDA = [(0, 1), (1, 1), (2, 1)], [(2, 0), (1, 0), (3, 0)]


def bloques(path):
    """Bloques de fondo liso (un personaje cada uno). Los vecinos del mismo color se separan por tamaño."""
    a = np.array(Image.open(path).convert("RGB")).astype(np.int32)
    key = (a[..., 0] << 16) | (a[..., 1] << 8) | a[..., 2]
    vals, cnt = np.unique(key, return_counts=True)
    out = []
    for v, c in zip(vals, cnt):
        if c < 1500: continue
        lab, n = label(key == v)
        for k in range(1, n + 1):
            ys, xs = np.where(lab == k)
            if len(ys) < 1500: continue
            x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
            nx, ny = max(1, round((x1 - x0) / 95.5)), max(1, round((y1 - y0) / 127.5))
            for i in range(nx):
                for j in range(ny):
                    bx0 = x0 + round(i * (x1 - x0) / nx); bx1 = x0 + round((i + 1) * (x1 - x0) / nx)
                    by0 = y0 + round(j * (y1 - y0) / ny); by1 = y0 + round((j + 1) * (y1 - y0) / ny)
                    # un rectángulo de la caja que en realidad pertenece a otro bloque (región en L): se descarta
                    if (key[by0:by1, bx0:bx1] == v).mean() < 0.4: continue
                    out.append((v, bx0, bx1, by0, by1))
    out.sort(key=lambda b: (b[3] // 60, b[1]))
    return a, key, out


def fotogramas(a, key, b):
    """Los 12 fotogramas de un bloque como RGBA 32×32 (None si la fila está recortada)."""
    v, x0, x1, y0, y1 = b
    filas = round((y1 - y0) / 32)            # 4, o 3 si el bloque está recortado por arriba
    desfase = 4 - filas
    fw, fh = (x1 - x0) / 3, (y1 - y0) / filas
    res = {}
    for r in range(4):
        for c in range(3):
            rr = r - desfase
            if rr < 0: res[(r, c)] = None; continue
            fx0, fy0 = x0 + round(c * fw), y0 + round(rr * fh)
            sub = a[fy0:fy0 + F, fx0:fx0 + F]; ks = key[fy0:fy0 + F, fx0:fx0 + F]
            im = np.zeros((F, F, 4), np.uint8)
            im[:sub.shape[0], :sub.shape[1], :3] = sub
            # fondo: píxeles parecidos al color del bloque (la hoja 3 viene reescalada y con bordes suavizados)
            # conectados con el borde del fotograma; así no se agujerea ropa de un color parecido al fondo
            bgc = np.array([(v >> 16) & 255, (v >> 8) & 255, v & 255])
            pare = np.abs(sub - bgc).sum(2) < 60
            lab_f, nf = label(pare)
            exterior = set(np.unique(np.concatenate([lab_f[0], lab_f[-1], lab_f[:, 0], lab_f[:, -1]]))) - {0}
            fondo = np.isin(lab_f, list(exterior)) | (ks == v)
            im[:sub.shape[0], :sub.shape[1], 3] = np.where(fondo, 0, 255)
            # quita restos de bloques vecinos de otro color pegados al borde
            lab, n = label(im[..., 3] > 0)
            if n > 1:
                tam = np.bincount(lab.ravel()); tam[0] = 0
                keep = np.isin(lab, [k for k in range(1, n + 1) if tam[k] >= 6 and not borde(lab == k)])
                im[..., 3] = np.where(keep, 255, 0)
            res[(r, c)] = im if im[..., 3].any() else None
    return res


def borde(m):
    ys, xs = np.where(m)
    return xs.min() == 0 or xs.max() == F - 1 or ys.min() == 0


def dist(p, q):
    a, b = p.astype(int), q.astype(int)
    ma, mb = a[..., 3] > 0, b[..., 3] > 0
    return (np.abs(a[..., :3] - b[..., :3]).sum(2) * (ma & mb)).sum() / max(1, (ma | mb).sum()) + 200 * (ma ^ mb).mean()


def espejo(p): return p[:, ::-1].copy()


def personaje(fr):
    """Las cuatro direcciones [frente, espalda, izquierda, derecha] × [quieto, paso, paso]."""
    fre = [fr[p] for p in FRENTE]; esp = [fr[p] for p in ESPALDA]
    izq = [fr[p] for p in IZQUIERDA]; der = [fr[p] for p in DERECHA]
    # cada perfil izquierdo es el espejo del derecho de la misma posición: completa los que falten
    for k in range(3):
        if izq[k] is None and der[k] is not None: izq[k] = espejo(der[k])
        if der[k] is None and izq[k] is not None: der[k] = espejo(izq[k])
    def completa(g):
        h = [x for x in g if x is not None]
        while len(h) < 3: h.append(espejo(h[-1]))
        return h
    return [completa(fre), completa(esp), completa(izq), completa(der)]


def hoja(dirs):
    out = Image.new("RGBA", (3 * C, 4 * C))
    for r, fila in enumerate(dirs):
        for c, f in enumerate(fila):
            im = Image.fromarray(f)
            ys = np.where(f[..., 3].any(1))[0]
            pie = ys.max() + 1
            big = im.resize((F * K, F * K), Image.NEAREST)
            out.alpha_composite(big, (c * C, r * C + (C - 6) - pie * K))
    return out


def main():
    hojas = sorted(SRC.glob("npcs_*.png"))
    todos = []
    for h in hojas:
        a, key, bl = bloques(h)
        for b in bl:
            todos.append(personaje(fotogramas(a, key, b)))
    rev = Image.new("RGBA", (12 * 64, len(todos) * 64), (90, 120, 90, 255))
    for i, dirs in enumerate(todos):
        hoja(dirs).save(OUT / f"npc{i + 1:02d}_hoja.png")
        for r in range(4):
            for c in range(3):
                rev.alpha_composite(Image.fromarray(dirs[r][c]).resize((64, 64), Image.NEAREST), ((r * 3 + c) * 64, i * 64))
    if len(sys.argv) > 1: rev.save(sys.argv[1])         # hoja de revisión opcional
    print("OK", len(todos), "PNJ")


if __name__ == "__main__":
    main()
