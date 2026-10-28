#!/usr/bin/env python3
"""Genera data/trainers.json con los equipos de líderes, Alto Mando, Campeón y villano final."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
T = [
 ("gym1","Dr. Antoni Solé","Gimnasio Alimento · Ciudad Petri","Medalla Probiótico",[("casei",12),("cereus",12),("listeria",14)]),
 ("gym2","Dra. Núria Gajú","Gimnasio Ambiental · Ciudad Cultivo","Medalla Tapete",[("navicula",18),("desulfovib",19),("anabaen",21)]),
 ("gym3","Dra. Laia Guàrdia","Gimnasio Hongo · Ciudad Gram","Medalla Micelio",[("pilobolus",24),("flavus",25),("chrysogenum",27)]),
 ("gym4","Dr. Daniel Yero","Gimnasio Levadura · Ciudad Aerobia","Medalla Gemación",[("pastorian",29),("neoformans",30),("auris",32)]),
 ("gym5","Dr. Jordi Mas","Gimnasio Industrial · Ciudad Agar","Medalla Quimiostato",[("mobilis",35),("acetobuty",36),("avermitil",38),("coli-bl21",40)]),
 ("gym6","Dr. Òscar Conchillo","Gimnasio Bioinfo · Instituto de Biotecnología","Medalla Algoritmo",[("pneumoniae",41),("aquaticus",42),("radiolaria",43),("pyrolobus",45)]),
 ("gym7","Dra. Marina Luquin","Gimnasio Clínico · Ciudad Pili","Medalla Ziehl-Neelsen",[("nocardia",45),("aeruginosa",46),("baumannii",47),("tuberculos",49)]),
 ("gym8","Dra. Susana Campoy","Gimnasio Fago · Isla Conjugada","Medalla Lisogenia",[("lambda-v",49),("bacteriovor",50),("marburg-v",51),("t4-titan",53)]),
 ("elite1","Dra. Laura Tusell","Alto Mando 1 · La UAB",None,[("chlamydia",53),("trypanosom",54),("toxoplasma",54),("naegleria",55),("plasmodium",56)]),
 ("elite2","Dr. Joaquim Martí","Alto Mando 2 · La UAB",None,[("treponema",55),("tetani",56),("alexandrium",56),("meningitid",57),("prion-sc",58)]),
 ("elite3","Dr. Jordi Barbé","Alto Mando 3 · La UAB",None,[("agrobacter",57),("sulfolobus",58),("shewanella",58),("pyrococcus",59),("radiodurans",60)]),
 ("elite4","Dra. Montserrat Llagostera","Alto Mando 4 · La UAB",None,[("yersinia",59),("anthracis",60),("retrovir-x",60),("filovir-z",61),("pandoravir",62)]),
 ("champion","Dr. Louis Pasteur","Campeón · La UAB",None,[("pichiamax",63),("thermocel",63),("agalactiae",64),("cholerae",64),("anthracis",65),("lyssavir",67)]),
 ("villain","Dr. Jaime Martínez-Urtaza","Líder de la Unidad de Genética · Isla Conjugada",None,[("parahaemolyticus",52),("vulnificus",53),("tuberculos",54),("t4-titan",55),("pandoravir",57)]),
]
import re, difflib
gdd = (ROOT/"docs"/"gdd.txt").read_text(encoding="utf-8").splitlines()
dex = {m["id"]: m for m in json.load(open(ROOT/"data"/"microdex.json", encoding="utf-8"))}
mvs = json.load(open(ROOT/"data"/"moves.json", encoding="utf-8"))
names = {m["name"]: m["id"] for m in mvs}
HEAD = {"gym1":"Gimnasio 1: Ciudad Petri","gym2":"Gimnasio 2: Ciudad Cultivo","gym3":"Gimnasio 3: Ciudad Gram",
        "gym4":"Gimnasio 4: Ciudad Aerobia","gym5":"Gimnasio 5: Ciudad Agar","gym6":"Gimnasio 6:",
        "gym7":"Gimnasio 7: Ciudad Pili","gym8":"Gimnasio 8: Isla Conjugada","elite1":"Alto Mando 1:",
        "elite2":"Alto Mando 2:","elite3":"Alto Mando 3:","elite4":"Alto Mando 4:",
        "champion":"El Campeón de la Liga","villain":"5. Equipo Definitivo"}
ALIAS = {"cholerae": "Cholerae"}
unmatched = []
def section(tid):
    st = next(i for i, l in enumerate(gdd) if l.startswith(HEAD[tid]))
    return gdd[st:st + 40]
def moves_for(tid, sp, lv):
    disp = dex[sp]["name"]
    for l in section(tid):
        if disp in l and re.search(rf"Nv\.\s*{lv}\b", l):
            if "|" in l: txt = l.split("|")[-1]
            elif "] —" in l: txt = l.split("] —")[-1]
            elif tid not in ("champion", "villain"): return []
            else: txt = re.split(r"\.\s+(?=[A-ZÁÉÍÓÚ][^.]*,)", l.strip())[-1]
            res = []
            for tok in [t.strip(" .") for t in txt.split(",")]:
                tok = re.sub(r"\s*\(.*?\)", "", tok).replace("H₂S", "").strip()
                if not tok: continue
                c = difflib.get_close_matches(tok, names.keys(), n=1, cutoff=0.6) or [n for n in names if n.startswith(tok)]
                if c: res.append(names[c[0]])
                else: unmatched.append((tid, sp, tok))
            return res[:4]
    return []
out = []
for i,n,r,b,team in T:
    tm = []
    for s_,l in team:
        e = {"species": s_, "level": l}
        mm = moves_for(i, s_, l)
        if mm: e["moves"] = mm
        tm.append(e)
    out.append({"id":i,"name":n,"role":r,"badge":b,"team":tm})
if unmatched: print("Sin coincidencia:", unmatched)
(ROOT/"data"/"trainers.json").write_text(json.dumps(out,ensure_ascii=False,indent=1),encoding="utf-8")
print(len(out),"entrenadores")
