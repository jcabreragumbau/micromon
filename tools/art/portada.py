#!/usr/bin/env python3
"""Portada del juego (assets/reference/props/portada.png, del usuario) para la pantalla de título.

portada.jpg: la ilustración tal cual, a 768 px de alto (4× los 192 de la pantalla).
portada_fondo.jpg: versión desenfocada y oscurecida para rellenar los laterales.
"""
from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance

ROOT = Path(__file__).resolve().parents[2]
src = Image.open(ROOT / "assets/reference/props/portada.png").convert("RGB")
out = ROOT / "assets/atlas"
h = 768
src.resize((round(src.width * h / src.height), h), Image.LANCZOS).save(out / "portada.jpg", quality=90)
w = 1024
bg = src.resize((w, round(src.height * w / src.width)), Image.LANCZOS)
top = (bg.height - h) // 2
bg = bg.crop((0, top, w, top + h)).filter(ImageFilter.GaussianBlur(18))
ImageEnhance.Brightness(bg).enhance(0.55).save(out / "portada_fondo.jpg", quality=80)
print("OK portada")
