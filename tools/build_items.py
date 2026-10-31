#!/usr/bin/env python3
"""Genera data/items.json: Criobolas, Plásmidos, medios curativos y objetos clave."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
items = [
 # Criobolas (multiplicador de captura del GDD)
 {"id":"criobola-roja","name":"Criobola Roja","kind":"ball","ball":1,"price":200,"desc":"Ratio de captura estándar (×1)."},
 {"id":"criobola-azul","name":"Criobola Azul","kind":"ball","ball":1.5,"price":600,"desc":"Ratio mejorado (×1,5)."},
 {"id":"criobola-amarilla","name":"Criobola Amarilla","kind":"ball","ball":2,"price":1200,"desc":"Ratio superior para cepas esquivas (×2)."},
 {"id":"criobola-morada","name":"Criobola Morada","kind":"ball","ball":255,"price":0,"desc":"Congelación instantánea en nitrógeno líquido. No falla nunca."},
 {"id":"criobola-verde","name":"Criobola Verde","kind":"ball","ball":1.5,"price":0,"desc":"Exclusiva de la Reserva Microbiana (Ciudad Agar)."},
 # Plásmidos (evolución)
 {"id":"plasmido-r","name":"Plásmido R","kind":"evolution","price":2100,"desc":"Plásmido de resistencia. Hace evolucionar a ciertos Microos."},
 {"id":"plasmido-f","name":"Plásmido F","kind":"evolution","price":2100,"desc":"Plásmido de fertilidad. Hace evolucionar a ciertos Microos."},
 {"id":"plasmido-ti","name":"Plásmido Ti","kind":"evolution","price":2100,"desc":"Plásmido inductor de tumores. Hace evolucionar a ciertos Microos."},
 {"id":"plasmido-col","name":"Plásmido Col","kind":"evolution","price":2100,"desc":"Plásmido de colicinas. Hace evolucionar a ciertos Microos."},
 {"id":"plasmido-vir","name":"Plásmido Vir","kind":"evolution","price":2100,"desc":"Plásmido de virulencia. Hace evolucionar a ciertos Microos."},
 # Medios curativos
 {"id":"caldo-nutritivo","name":"Caldo Nutritivo","kind":"heal","heal":20,"price":300,"desc":"Restaura 20 PS."},
 {"id":"medio-lb","name":"Medio LB","kind":"heal","heal":60,"price":700,"desc":"Restaura 60 PS."},
 {"id":"medio-tsb","name":"Medio TSB","kind":"heal","heal":120,"price":1200,"desc":"Restaura 120 PS."},
 {"id":"medio-enriquecido","name":"Medio Enriquecido","kind":"heal","heal":9999,"price":2500,"desc":"Restaura todos los PS."},
 {"id":"solucion-salina","name":"Solución Salina","kind":"cure","price":600,"desc":"Elimina cualquier contaminación (estado alterado)."},
 {"id":"glicerol","name":"Glicerol Crioprotector","kind":"revive","revive":0.5,"price":1500,"desc":"Reanima a un Microo debilitado con la mitad de sus PS."},
 # Repelentes: desinfectante Virkon pulverizado alrededor; los Microos salvajes de menor nivel que el primero del equipo no se acercan
 {"id":"virkon","name":"Virkon","kind":"repel","repel":100,"price":350,"desc":"Desinfectante de amplio espectro. Durante 100 pasos no se acercan Microos salvajes de menor nivel que el primero del equipo."},
 {"id":"virkon-concentrado","name":"Virkon Concentrado","kind":"repel","repel":250,"price":550,"desc":"Virkon al 2 %. Durante 250 pasos no se acercan Microos salvajes de menor nivel que el primero del equipo."},
 {"id":"atp-concentrado","name":"ATP Concentrado","kind":"pp","pp":10,"price":1200,"desc":"Recupera 10 PP de cada movimiento."},
 # Objetos clave
 {"id":"microscopio-optico","name":"Microscopio Óptico","kind":"key","price":0,"desc":"Registra los Microos vistos y aislados (Microdex)."},
 {"id":"mascara-de-gases","name":"Máscara de Gases","kind":"key","price":0,"desc":"Permite entrar en la Cueva Anaeróbica."},
 {"id":"disco-duro","name":"Disco Duro Externo","kind":"key","price":0,"desc":"Un disco duro atado con celo. Pone «BACKUP_FINAL_v3_ESTE_SÍ». Alguien lo tiró en el Monte Micelio."},
 {"id":"pulverizador","name":"Pulverizador de Agua","kind":"key","price":0,"desc":"Agua destilada a presión. Rehidrata a los tardígrados en estado tun."},
 {"id":"billete-ferri","name":"Billete de Ferri","kind":"key","price":0,"desc":"Billete del ferri de Ciudad Pili a las Islas Esporuladas y la Isla Conjugada."},
 {"id":"fosil-estromatolito","name":"Fósil de Estromatolito","kind":"key","price":0,"desc":"Capas de cianobacterias de hace millones de años. En el Instituto Carlos III pueden revivirlo."},
 {"id":"ambar-mioceno","name":"Ámbar del Mioceno","kind":"key","price":0,"desc":"Una gota de resina fósil con una endospora dentro. En el Instituto Carlos III pueden revivirla."},
 {"id":"western-blot","name":"Western Blot","kind":"key","price":0,"desc":"Identifica los priones de la Torre Prión."},
]
# Plásmidos de movimiento (las «Máquinas Técnicas» de Micromón): uno por cada movimiento.
# Reutilizables. El tramo (1-5) dice en qué parte del juego aparecen: a más potencia, más tarde.
moves = json.loads((ROOT/"data"/"moves.json").read_text(encoding="utf-8"))
def tramo(m):
    pw = m.get("power")
    if pw is None:
        if m["category"] != "status":   # golpes fulminantes al final; daño fijo a mitad de juego
            return 5 if m.get("ohko") else 3
        return 1 + (m["num"] * 7) % 4   # movimientos de estado: repartidos entre los tramos 1-4
    pw *= m.get("multihit") and 2.5 or 1
    return 1 if pw <= 45 else 2 if pw <= 65 else 3 if pw <= 85 else 4 if pw <= 110 else 5
for m in moves:
    t = tramo(m)
    items.append({"id": f"plasmido-{m['id']}", "name": f"P{m['num']:03d} {m['name']}", "kind": "tm", "move": m["id"], "tier": t,
                  "price": [0, 1500, 2500, 4000, 6000, 9000][t] + (m["num"] % 5) * 100,
                  "desc": f"Plásmido con el gen de {m['name']} (tipo {m['type']}). Enseña el movimiento y no se gasta."})
(ROOT/"data"/"items.json").write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")
print("OK", len(items), "objetos")
