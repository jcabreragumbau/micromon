#!/usr/bin/env python3
"""Maqueta de pantalla de combate (240×160, resolución de GBA) para revisar el estilo."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[2]
SP = ROOT / "assets" / "sprites"
FONT = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 8)

def text(d, xy, s, fill=(40, 40, 48)):
    d.fontmode = "1"
    d.text((xy[0] + 1, xy[1] + 1), s, font=FONT, fill=(200, 200, 208))
    d.text(xy, s, font=FONT, fill=fill)

def hpbox(d, x, y, name, lv, frac, show_hp=None):
    d.rounded_rectangle((x, y, x + 100, y + (32 if show_hp else 26)), 4, fill=(248, 248, 232), outline=(40, 40, 48), width=2)
    text(d, (x + 6, y + 3), name)
    text(d, (x + 74, y + 3), f"Nv{lv}")
    d.rectangle((x + 30, y + 16, x + 94, y + 20), fill=(60, 60, 60))
    col = (88, 208, 120) if frac > 0.5 else (240, 200, 40) if frac > 0.2 else (232, 72, 72)
    d.rectangle((x + 31, y + 17, x + 31 + int(62 * frac), y + 19), fill=col)
    text(d, (x + 8, y + 13), "PS", (232, 120, 40))
    if show_hp: text(d, (x + 54, y + 21), show_hp)

def main(foe="t4-titan", ally="butyricum", out=None):
    W, H = 240, 160
    im = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    d = ImageDraw.Draw(im)
    # fondo: agar de placa de Petri con degradado
    for y in range(112):
        t = y / 112
        d.line((0, y, W, y), fill=(int(214 - 30 * t), int(232 - 20 * t), int(196 - 40 * t)))
    # plataformas: discos de agar
    d.ellipse((128, 52, 228, 76), fill=(178, 196, 128), outline=(120, 140, 80))
    d.ellipse((8, 96, 128, 124), fill=(178, 196, 128), outline=(120, 140, 80))
    f = Image.open(SP / "microos" / f"{foe}_frente.png")
    a = Image.open(SP / "microos" / f"{ally}_espalda.png").resize((80, 80), Image.NEAREST)
    im.alpha_composite(f, (146, 6))
    im.alpha_composite(a, (28, 32))
    hpbox(d, 10, 10, "T4-Titan", 53, 0.72)
    hpbox(d, 130, 78, "Butyricum", 12, 0.35, "13/ 37")
    # caja de texto y menú
    d.rectangle((0, 112, W, H), fill=(40, 48, 72))
    d.rounded_rectangle((3, 115, 122, 157), 4, fill=(248, 248, 240), outline=(200, 80, 72), width=2)
    text(d, (10, 121), "¿Qué debe hacer")
    text(d, (10, 134), "Butyricum?")
    d.rounded_rectangle((125, 115, 237, 157), 4, fill=(248, 248, 240), outline=(80, 96, 136), width=2)
    for i, s in enumerate(["LUCHAR", "MOCHILA", "MICROOS", "HUIR"]):
        text(d, (138 + (i % 2) * 50, 122 + (i // 2) * 16), s)
    text(d, (130, 122), "▶")
    big = im.resize((W * 3, H * 3), Image.NEAREST)
    big.save(out or (ROOT / "assets" / "mock_combate.png"))
    return big

if __name__ == "__main__":
    main()
