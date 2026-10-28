#!/usr/bin/env python3
"""Hoja de revisión del estilo (fase 2): Microos, personajes convertidos, personajes nuevos y maqueta de combate."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[2]
SP = ROOT / "assets" / "sprites"
F = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 15)
BG = (238, 240, 230)
def up(im, s): return im.resize((im.width * s, im.height * s), Image.NEAREST)

W = 1600
blocks = []
# 1. Microos
mic = ["synechoc", "butyricum", "paramec", "t4-titan", "pilobolus"]
names = ["Synechoc · Fotótrofo", "Butyricum · Anaerobio", "Paramec · Protozoo", "T4-Titan · Virus/Biofilm", "Pilobolus · Hongo/Alga"]
b = Image.new("RGBA", (W, 520), BG); d = ImageDraw.Draw(b)
d.text((20, 10), "1 · Microos generados por código (frontal 64 px, trasera 64 px, icono 32 px) — aumentados ×3", font=F, fill=(30, 30, 40))
for i, m in enumerate(mic):
    x = 20 + i * 315
    b.alpha_composite(up(Image.open(SP / "microos" / f"{m}_frente.png"), 3), (x, 50))
    b.alpha_composite(up(Image.open(SP / "microos" / f"{m}_espalda.png"), 3), (x, 250))
    b.alpha_composite(up(Image.open(SP / "microos" / f"{m}_icono.png"), 2), (x + 185, 120))
    d.text((x, 450), names[i], font=f, fill=(30, 30, 40))
blocks.append(b)
# 2. Personajes convertidos desde el arte del GDD
refs = ["ref1", "ref6", "ref8", "ref9", "ref4", "ref23", "luquin"]
b = Image.new("RGBA", (W, 470), BG); d = ImageDraw.Draw(b)
d.text((20, 10), "2 · Tus personajes convertidos automáticamente: retrato de combate, busto de diálogo y mapa (×3)", font=F, fill=(30, 30, 40))
x = 20
for r in refs:
    p = up(Image.open(SP / "characters" / f"{r}_combate.png"), 3)
    b.alpha_composite(p, (x, 50))
    b.alpha_composite(up(Image.open(SP / "characters" / f"{r}_mapa_frente.png"), 3), (x + 30, 350))
    x += 225
blocks.append(b)
# 3. Personajes nuevos dibujados a mano
b = Image.new("RGBA", (W, 430), BG); d = ImageDraw.Draw(b)
d.text((20, 10), "3 · Personajes sin arte de referencia, dibujados en rejilla: protagonista y becario (3 pasos × 4 direcciones, ×3)", font=F, fill=(30, 30, 40))
b.alpha_composite(up(Image.open(SP / "characters" / "protagonista_mapa.png"), 3), (20, 45))
b.alpha_composite(up(Image.open(SP / "characters" / "becario_mapa.png"), 3), (360, 45))
d.text((720, 80), "Escala de mapa: el protagonista junto a tu", font=f, fill=(30, 30, 40))
d.text((720, 100), "Dra. Luquin convertida (×4)", font=f, fill=(30, 30, 40))
b.alpha_composite(up(Image.open(SP / "characters" / "protagonista_mapa.png").crop((0, 0, 32, 32)), 4), (720, 140))
b.alpha_composite(up(Image.open(SP / "characters" / "luquin_mapa_frente.png"), 4), (860, 140))
b.alpha_composite(up(Image.open(SP / "characters" / "becario_mapa.png").crop((0, 0, 32, 32)), 4), (1000, 140))
blocks.append(b)
# 4. Maqueta de combate
mock = Image.open(ROOT / "assets" / "mock_combate.png")
b = Image.new("RGBA", (W, mock.height + 60), BG); d = ImageDraw.Draw(b)
d.text((20, 10), "4 · Maqueta de pantalla de combate (240×160, ×3)", font=F, fill=(30, 30, 40))
b.alpha_composite(mock, ((W - mock.width) // 2, 45))
blocks.append(b)
H = sum(x.height for x in blocks)
out = Image.new("RGBA", (W, H), BG); y = 0
for x in blocks: out.alpha_composite(x, (0, y)); y += x.height
out.convert("RGB").save(ROOT / "docs" / "prototipo_estilo.png", optimize=True)
print(out.size)
