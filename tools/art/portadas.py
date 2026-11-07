#!/usr/bin/env python3
"""Portadas de las ediciones (assets/reference/portadas/<edición>.png, del usuario) → assets/atlas_ed/<edición>/:
portada.jpg (a 768 px de alto, como la de la V1/V2) y portada_fondo.jpg (la misma imagen ampliada a 1024×768,
desenfocada y oscurecida, para rellenar los lados de la pantalla de título)."""
from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance
ROOT = Path(__file__).resolve().parents[2]
for src in sorted((ROOT / "assets/reference/portadas").glob("*.png")):
    out = ROOT / "assets/atlas_ed" / src.stem; out.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert("RGB")
    p = im.resize((round(im.width * 768 / im.height), 768), Image.LANCZOS)
    p.save(out / "portada.jpg", quality=92)
    k = max(1024 / im.width, 768 / im.height)
    f = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    f = f.crop(((f.width - 1024) // 2, (f.height - 768) // 2, (f.width - 1024) // 2 + 1024, (f.height - 768) // 2 + 768))
    f = ImageEnhance.Brightness(f.filter(ImageFilter.GaussianBlur(28))).enhance(0.75)
    f.save(out / "portada_fondo.jpg", quality=85)
    print("OK", src.stem, p.size)
