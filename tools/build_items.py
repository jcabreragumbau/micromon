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
 {"id":"atp-concentrado","name":"ATP Concentrado","kind":"pp","pp":10,"price":1200,"desc":"Recupera 10 PP de cada movimiento."},
 # Objetos clave
 {"id":"microscopio-optico","name":"Microscopio Óptico","kind":"key","price":0,"desc":"Registra los Microos vistos y aislados (Microdex)."},
 {"id":"mascara-de-gases","name":"Máscara de Gases","kind":"key","price":0,"desc":"Permite entrar en la Cueva Anaeróbica."},
 {"id":"disco-duro","name":"Disco Duro Externo","kind":"key","price":0,"desc":"Un disco duro atado con celo. Pone «BACKUP_FINAL_v3_ESTE_SÍ». Alguien lo tiró en el Monte Micelio."},
 {"id":"western-blot","name":"Western Blot","kind":"key","price":0,"desc":"Identifica los priones de la Torre Prión."},
]
(ROOT/"data"/"items.json").write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")
print("OK", len(items), "objetos")
