#!/usr/bin/env python3
"""Asigna a cada Microo su familia morfológica y parámetros, y genera los atlas de sprites.

Salida:
  assets/sprites/microos/<id>_frente.png, _espalda.png, _icono.png
  assets/atlas/microos_frente.png  (13 columnas × 64 px), microos_espalda.png, microos_iconos.png (64×32 por especie)
  assets/atlas/microos.json        (índice de cada especie en los atlas)
"""
import json, sys
from pathlib import Path
from PIL import Image
sys.path.insert(0, str(Path(__file__).parent))
from families import draw
from microos import DESIGNS
from pix import back_view

ROOT = Path(__file__).resolve().parents[2]

ART = {
 "anabaen": ("filamento", {"beads": 6, "heterocisto": 3}),
 "spirulmax": ("filamento", {"helice": True}),
 "acetobuty": ("bacilo", {"len": 0.34, "spore": "central", "flag": "peri"}),
 "thermocel": ("bacilo", {"chain": 2, "thick": 0.15, "spore": "terminal", "flag": "peri"}),
 "vorticel": ("ciliado", {"form": "campana"}),
 "stentorox": ("ciliado", {"form": "trompeta", "rayas": True}),
 "mucorin": ("moho", {"head": "esporangio"}),
 "rhizopupa": ("moho", {"head": "esporangio", "stalks": 2, "negro": True}),
 "griseus": ("actinomiceto", {}), "coelicol": ("actinomiceto", {"r2": "Protozoo"}), "avermitil": ("actinomiceto", {"r2": "Antibiótico"}),
 "sacchari": ("levadura", {"buds": 1}), "pastorian": ("levadura", {"buds": 2}), "pichiamax": ("levadura", {"buds": 3, "vacuola": True}),
 "epidermi": ("coco", {"arr": "racimo"}), "aureus": ("coco", {"arr": "racimo", "capsula": True, "r1": "brillo"}),
 "navicula": ("diatomea", {}), "pinnularia": ("diatomea", {}),
 "mirabilis": ("bacilo", {"flag": "peri"}), "vulgaris": ("bacilo", {"flag": "peri", "capsula": True, "chain": 2}),
 "leptospir": ("espirilo", {"turns": 3.5, "amp": 0.06, "thick": 0.04}), "interrogan": ("espirilo", {"turns": 4, "amp": 0.09}),
 "micrococ": ("coco", {"arr": "tetrada", "r1": "brillo"}), "sarcina": ("coco", {"arr": "cubo"}),
 "subtilis": ("bacilo", {"flag": "peri", "spore": "central"}), "lichenifor": ("bacilo", {"chain": 2, "spore": "central"}),
 "thuringien": ("bacilo", {"spore": "central", "thick": 0.15, "len": 0.36, "flag": "peri"}),
 "cereus": ("bacilo", {"chain": 2, "spore": "central"}), "mycoides": ("bacilo", {"chain": 3, "len": 0.2}),
 "anthracis": ("bacilo", {"chain": 3, "len": 0.2, "capsula": True, "spore": "central", "fierce": True}),
 "casei": ("bacilo", {"chain": 2, "len": 0.22}), "acidophilus": ("bacilo", {"chain": 3, "len": 0.2}),
 "thermus": ("bacilo", {"len": 0.42, "thick": 0.1, "r1": "Extremófilo", "r2": "Anaerobio"}), "aquaticus": ("bacilo", {"chain": 2, "thick": 0.1, "stripes": True}),
 "bifidum": ("bacilo", {"chain": 2, "tilt": 0.3}), "longum": ("bacilo", {"chain": 3, "tilt": 0.2, "len": 0.2}),
 "serratia": ("bacilo", {"flag": "peri"}), "marcescens": ("bacilo", {"flag": "peri", "r1": "Antibiótico", "r2": "Gram-"}),
 "rhizobi": ("bacilo", {"flag": "polar"}), "meliloti": ("bacilo", {"flag": "lofo"}), "agrobacter": ("bacilo", {"flag": "peri", "pili": True}),
 "roqueforti": ("moho", {"head": "pincel", "r2": "Protozoo"}), "chrysogenum": ("moho", {"head": "pincel", "stalks": 2}),
 "niger": ("moho", {"head": "conidios", "r2": "esporangio"}), "flavus": ("moho", {"head": "conidios", "stalks": 2, "r2": "Hongo"}),
 "bacteroid": ("bacilo", {"capsula": True}), "fragilis": ("bacilo", {"chain": 2, "capsula": True}),
 "albicans": ("levadura", {"hifas": True}), "auris": ("levadura", {"buds": 2, "capsula": True}),
 "euglena": ("flagelado", {"cloro": True}), "volvox": ("colonia", {"r1": "Fotótrofo", "r2": "Protozoo"}),
 "zymomonas": ("bacilo", {"flag": "lofo"}), "mobilis": ("bacilo", {"flag": "lofo", "chain": 2}),
 "cholerae": ("vibrio", {}), "parahaemolyticus": ("vibrio", {"thick": 0.15, "fierce": True}),
 "proteus-am": ("ameba", {"pods": 4}), "entamoeba": ("ameba", {"pods": 5}), "naegleria": ("ameba", {"pods": 6}),
 "mycoplas": ("coco", {"r": 0.17}), "genitalium": ("coco", {"pili": True}), "pneumoniae": ("coco", {"arr": "diplo", "pili": False}),
 "mutans": ("coco", {"arr": "cadena"}), "pyogenes": ("coco", {"arr": "cadena", "r": 0.14}), "agalactiae": ("coco", {"arr": "cadena", "capsula": True}),
 "noctiluca": ("dinoflagelado", {"glow": True}), "ceratium": ("dinoflagelado", {"cuernos": True}),
 "alexandrium": ("dinoflagelado", {"cuernos": True, "glow": True, "r1": "Antibiótico"}),
 "smegmatis": ("bacilo", {"thick": 0.12, "stripes": True}), "bovis": ("bacilo", {"chain": 2, "stripes": True}),
 "tuberculos": ("bacilo", {"chain": 3, "len": 0.2, "capsula": True, "stripes": True}),
 "borrelia": ("espirilo", {"turns": 3}), "treponema": ("espirilo", {"turns": 5, "amp": 0.07, "thick": 0.045}),
 "geobacter": ("bacilo", {"pili": True}), "sulfurreduc": ("bacilo", {"pili": True, "chain": 2}),
 "radiodurans": ("coco", {"arr": "tetrada", "fierce": True}),
 "perfringens": ("bacilo", {"thick": 0.16, "capsula": True}), "tetani": ("bacilo", {"spore": "terminal", "thick": 0.1, "len": 0.36}),
 "psychrobac": ("coco", {"arr": "diplo"}), "colwellia": ("vibrio", {}),
 "putida": ("bacilo", {"flag": "lofo"}), "aeruginosa": ("bacilo", {"flag": "polar", "capsula": True, "capsula_ramp": "Alga"}),
 "giardia": ("flagelado", {}), "cryptospor": ("coco", {"capsula": True, "halo2": True}),
 "methanococ": ("arquea", {}), "methanosar": ("coco", {"arr": "racimo"}), "pyrolobus": ("arquea", {"llama": True, "r2": "Anaerobio"}),
 "magnetospir": ("espirilo", {"turns": 2}),
 "rickettsia": ("bacilo", {"len": 0.22}), "prowazekii": ("bacilo", {"chain": 2, "len": 0.22}),
 "halobacter": ("arquea", {"form": "cuadrada"}), "salinarum": ("arquea", {"form": "cuadrada", "r1": "Intracelular"}),
 "neisseria": ("coco", {"arr": "diplo"}), "meningitid": ("coco", {"arr": "diplo", "capsula": True}),
 "cryptococ": ("levadura", {"capsula": True, "buds": 0}), "neoformans": ("levadura", {"capsula": True, "buds": 2}),
 "bdellovib": ("vibrio", {"thick": 0.1}), "bacteriovor": ("vibrio", {"thick": 0.12, "fierce": True}),
 "nocardia": ("actinomiceto", {}), "actinomyces": ("actinomiceto", {}),
 "vulnificus": ("vibrio", {"glow": True}),
 "desulfovib": ("vibrio", {}), "thiomargar": ("coco", {"arr": "cadena", "r": 0.15, "halo2": True}),
 "baylyi": ("coco", {"arr": "diplo"}), "baumannii": ("coco", {"arr": "diplo", "capsula": True}),
 "kefirgran": ("colonia", {"r1": "Levadura", "r2": "Simbionte"}),
 "spirogyra": ("filamento", {"helice": True}), "mixotricha": ("ciliado", {"rayas": True}),
 "caulobac": ("vibrio", {}), "crescentus": ("vibrio", {"thick": 0.15}),
 "leishmania": ("flagelado", {}), "trypanosom": ("flagelado", {"form": "tripanosoma"}),
 "acantharia": ("radiolario", {"spines": 10}), "radiolaria": ("radiolario", {"spines": 20}),
 "chlamydia": ("coco", {"halo2": True}), "plasmodium": ("ameba", {"pods": 3}), "toxoplasma": ("flagelado", {}),
 "shewanella": ("bacilo", {"flag": "polar", "pili": True}), "sulfolobus": ("arquea", {"pili": True}),
 "yersinia": ("bacilo", {"len": 0.24, "capsula": True, "fierce": True}), "listeria": ("bacilo", {"flag": "peri", "len": 0.26}),
 "phage-x174": ("fago", {"tail": "ninguna", "head": 0.2}), "lambda-v": ("fago", {"tail": "larga", "fibers": False, "rings": False, "head": 0.15}),
 "rous-v": ("virus_env", {}), "lentivir": ("virus_env", {}), "retrovir-x": ("virus_env", {"fierce": True}),
 "lyssavir": ("virus_env", {"form": "bala"}), "marburg-v": ("virus_env", {"form": "filamento"}), "filovir-z": ("virus_env", {"form": "filamento", "fierce": True}),
 "poxvir": ("virus_env", {"form": "ladrillo"}), "mimivir": ("virus_env", {}), "pandoravir": ("virus_env", {"form": "anfora", "fierce": True}),
 "coli-k12": ("bacilo", {"flag": "peri", "mouth": "open"}), "coli-bl21": ("bacilo", {"flag": "peri", "chain": 2, "capsula": True, "fierce": True}),
 "diatomax": ("diatomea", {"form": "radial"}), "myxococcus": ("arquea", {"r1": "Simbionte"}),
 "pleomorph": ("arquea", {"r1": "Levadura"}), "halomorph": ("arquea", {"form": "cuadrada", "r1": "Protozoo"}),
 "electromorph": ("espirilo", {"turns": 3, "r1": "Espiroqueta"}), "pyromorph": ("arquea", {"llama": True, "r1": "Anaerobio"}),
 "stromatol": ("colonia", {"r1": "Gram+", "r2": "Fotótrofo"}), "cyanofossil": ("filamento", {"beads": 6, "heterocisto": 2}),
 "amberspor": ("coco", {"r1": "carotenoide", "halo2": True}), "palaeobacil": ("bacilo", {"spore": "central", "r1": "carotenoide"}),
 "lokiarca": ("arquea", {"pili": True}), "tardigrad": ("tardigrado", {"r1": "Esporulado"}),
 "prion-sc": ("prion", {}), "viroid-cad": ("viroide", {}), "sputnik-v": ("fago", {"tail": "ninguna", "shape": "iso", "head": 0.18}),
 "deinococ": ("coco", {"arr": "tetrada"}), "pyrococcus": ("arquea", {"llama": True}),
 "ecoli-o157": ("legendario", {"aura": "Virus"}), "salmonella-typhimurium": ("legendario", {"aura": "Intracelular"}),
 "luca": ("luca", {}),
 "pelagibac": ("vibrio", {"thick": 0.09}), "prochloron": ("coco", {"r": 0.22, "halo2": True}),
 "klebsi": ("bacilo", {"capsula": True, "len": 0.26}), "pneumonia-k": ("bacilo", {"capsula": True, "chain": 2, "capsula_ramp": "Gram-"}),
}
LEGENDARY = {"prion-sc", "viroid-cad", "sputnik-v", "ecoli-o157", "salmonella-typhimurium", "luca"}

def main():
    dex = json.load(open(ROOT / "data/microdex.json", encoding="utf-8"))
    sp = {s["id"]: s for s in json.load(open(ROOT / "data/species.json", encoding="utf-8"))}
    by = {m["id"]: m for m in dex}
    def maxstage(i):
        r = i
        while by[r]["evolves_from"]: r = by[r]["evolves_from"]
        def d(x): return 1 + max([d(c["id"]) for c in dex if c["evolves_from"] == x] or [0])
        return d(r)
    missing = [m["id"] for m in dex if m["id"] not in ART and m["id"] not in DESIGNS]
    if missing:
        sys.exit(f"Faltan diseños: {missing}")
    out = ROOT / "assets/sprites/microos"; out.mkdir(parents=True, exist_ok=True)
    at = ROOT / "assets/atlas"; at.mkdir(parents=True, exist_ok=True)
    cols = 13; rows = (len(dex) + cols - 1) // cols
    A = Image.new("RGBA", (cols * 64, rows * 64)); B = Image.new("RGBA", (cols * 64, rows * 64)); I = Image.new("RGBA", (cols * 64, rows * 32))
    index = {}
    for k, m in enumerate(dex):
        i = m["id"]
        if i in DESIGNS:
            f = DESIGNS[i]
            fr, bk, ic = f(64).image(), back_view(f(64, face=False).image()), f(32).image()
        else:
            fam, P = ART[i]
            st, ms = sp[i]["stage"], maxstage(i)
            kw = dict(legendary=i in LEGENDARY)
            fr = draw(i, m["types"], st, ms, fam, P, 64, True, **kw).image()
            bk = back_view(draw(i, m["types"], st, ms, fam, P, 64, False, **kw).image())
            ic = draw(i, m["types"], st, ms, fam, P, 32, True, **kw).image()
        strip = Image.new("RGBA", (64, 32)); strip.alpha_composite(ic, (0, 0)); strip.alpha_composite(ic.crop((0, 1, 32, 32)), (32, 0))
        fr.save(out / f"{i}_frente.png"); bk.save(out / f"{i}_espalda.png"); strip.save(out / f"{i}_icono.png")
        x, y = (k % cols) * 64, (k // cols)
        A.alpha_composite(fr, (x, y * 64)); B.alpha_composite(bk, (x, y * 64)); I.alpha_composite(strip, (x, y * 32))
        index[i] = k
    A.save(at / "microos_frente.png"); B.save(at / "microos_espalda.png"); I.save(at / "microos_iconos.png")
    json.dump({"cols": cols, "index": index}, open(at / "microos.json", "w"))
    print("OK", len(index), "Microos")

if __name__ == "__main__":
    main()
