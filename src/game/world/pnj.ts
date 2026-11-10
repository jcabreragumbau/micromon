// Aspecto de los PNJ genéricos con los sprites de 4.ª generación del usuario (npc01…npc37, de tools/art/npcs_ds.py).
// Los personajes con nombre propio (líderes, Alto Mando, Unidad de Genética, Koch, la profesora, el rival, la madre
// del jugador) y los oficios con uniforme propio (enfermeras, dependientes de tienda) conservan su sprite.
// Los entrenadores solo usan los modelos que tienen sprite de combate (COMBATE_F / COMBATE_M).
import { MAPS } from "./maps";
import type { NpcDef } from "./builder";

const n = (...k: number[]) => k.map((i) => `npc${String(i).padStart(2, "0")}`);

// Personajes de las hojas, por grupos
const CHICAS = n(1, 19, 20, 22, 24, 26, 28, 30, 32);
const CHICOS = n(5, 6, 7, 9, 10, 13, 14, 16, 17, 29, 31, 33);
const MUJERES = n(18, 19, 22, 30, 4);
const MAYORES_H = n(2, 15, 35, 34);
const MAYORES_M = n(36, 37);          // el npc23 no se usa (a petición del usuario)
const CIENTIFICOS_H = n(3), CIENTIFICAS = n(4);
const POLICIA = n(25), MARINERO = n(27);
// Solo estos modelos dan combate (tienen sprite de combate del usuario: tools/art/npcs_combate.py)
const COMBATE_F = n(1, 4, 18, 20, 22, 24, 26, 28);
const COMBATE_M = n(2, 3, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 21, 25, 27, 31, 32, 33);
// los de aspecto muy de oficio (granjero, marinero, pescador, karateca…) solo para su oficio
const GENERAL_M = n(3, 6, 7, 8, 9, 31, 32, 33);
const GENERICOS = new Set(["chica", "chico", "estudiante", "becario", "madre", "jubilado", "dependiente", "enfermera"]);

/** Oficio del entrenador -> aspecto (por palabras de la clase). */
const POR_OFICIO: [RegExp, string[]][] = [
  [/Excursionista|Montañer|Espeleólog/, n(21, 11)],
  [/Culturista/, n(13)],
  [/Agrónom|Granjer|Salinero/, n(12)],
  [/Biólogo de campo|Paleomicro|Arqueólog/, n(11)],
  [/Limnólog|Ecólog|Geomicro|de Suelos/, n(9, 11, 24)],
  [/Micólog|Coleccionista de Esporas/, n(8)],
  [/Surfista|Pescador/, n(14, 28)],
  [/Oceanógraf|Marin/, n(27, 28)],
  [/Catedrático Emérito|Jubilad/, n(15, 2)],
  [/Becari|Investigador|Técnic|Doctorand/, n(3, 4)],
  [/Fotógraf|Periodist|Reporter/, n(10)],
];

/** Mujer u hombre: por el sprite que tenía (chica/chico) o, si no, por el género del oficio. */
function femenina(d: NpcDef): boolean {
  if (d.sprite === "chica" || d.sprite === "madre") return true;
  if (d.sprite === "chico") return false;
  const [a, b = ""] = (d.trainer?.clase ?? "").split(" ");
  return a.endsWith("ista") ? b.endsWith("a") : a.endsWith("a");
}

function opciones(m: string, d: NpcDef): string[] | null {
  const talk = Array.isArray(d.talk) ? d.talk.join(" ") : d.talk ?? "";
  const clase = d.trainer?.clase ?? "";
  if (!GENERICOS.has(d.sprite) || d.sprite === "enfermera") return null;   // los reclutas de la Unidad, etc., no se tocan
  if (d.id.startsWith("i1-descanso")) return null;                       // el corrillo del Instituto: bata propia
  if (d.sprite === "madre" && m === "casa-jugador") return null;
  if (d.sprite === "dependiente") {
    if (d.script === "ferri" || /marinero/.test(d.id)) return MARINERO;
    if (/guarda/.test(d.id) || talk.startsWith("Guarda")) return POLICIA;
    return null;                                     // dependientes de tienda y del casino: uniforme propio
  }
  if (d.trainer) {
    const f = femenina(d);
    for (const [re, pool] of POR_OFICIO) if (re.test(clase)) {
      const p = pool.filter((s) => f === COMBATE_F.includes(s));
      if (p.length) return p;
    }
    return f ? COMBATE_F : GENERAL_M;
  }
  switch (d.sprite) {
    case "becario": return CIENTIFICOS_H.concat(CIENTIFICAS);
    case "chica": return CHICAS;
    case "chico": return CHICOS;
    case "madre": return MUJERES;
    case "jubilado": return MAYORES_H.concat(MAYORES_M);
    case "estudiante": return CHICOS.concat(CHICAS);
    default: return null;
  }
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Sustituye los sprites genéricos por los nuevos. Determinista (por id), sin repetir aspecto dentro de un mapa
 *  mientras haya opciones y repartiendo por igual entre todo el juego (se elige el menos usado hasta el momento). */
export function asignarAspectos() {
  const total = new Map<string, number>();
  for (const m of Object.values(MAPS)) {
    const usados = new Set<string>();
    for (const d of m.npcs) {
      const op = opciones(m.id, d);
      if (!op?.length) continue;
      const h = hash(d.id + "@" + m.id);
      let elegido = "", mejor = Infinity;
      for (let k = 0; k < op.length; k++) {
        const c = op[(h + k) % op.length];
        const coste = (usados.has(c) ? 1000 : 0) + (total.get(c) ?? 0);
        if (coste < mejor) { mejor = coste; elegido = c; }
      }
      usados.add(elegido);
      total.set(elegido, (total.get(elegido) ?? 0) + 1);
      d.sprite = elegido;
    }
  }
}
