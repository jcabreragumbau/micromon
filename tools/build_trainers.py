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
out = [{"id":i,"name":n,"role":r,"badge":b,"team":[{"species":s,"level":l} for s,l in team]} for i,n,r,b,team in T]
(ROOT/"data"/"trainers.json").write_text(json.dumps(out,ensure_ascii=False,indent=1),encoding="utf-8")
print(len(out),"entrenadores")
