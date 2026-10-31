// Carga y tipa los datos generados en data/. Ningún otro módulo lee los JSON directamente.
import microdexJson from "../../data/microdex.json";
import speciesJson from "../../data/species.json";
import movesJson from "../../data/moves.json";
import typesJson from "../../data/types.json";
import itemsJson from "../../data/items.json";
import trainersJson from "../../data/trainers.json";

export type TypeName = string;
export type StatKey = "hp" | "atk" | "def" | "spa" | "spd" | "spe";
export type BoostKey = "atk" | "def" | "spa" | "spd" | "spe" | "accuracy" | "evasion";
export type Stats = Record<StatKey, number>;
export type StatusCode = "brn" | "frz" | "par" | "psn" | "tox" | "slp";
export type Growth = "fast" | "medium_fast" | "medium_slow" | "slow";

export interface Evolution { method: "level" | "item" | "conjugation"; level?: number; item?: string }

export interface Species {
  id: string; dex: number; name: string; organism: string; scientific: string; entry: string; types: TypeName[];
  evolvesFrom: string | null; evolution: Evolution | null;
  baseStats: Stats; bst: number; growth: Growth; catchRate: number; expYield: number;
  size: number; stage: number; learnset: { level: number; move: string }[]; mo: string[];
}

export interface Secondary {
  chance: number; status?: StatusCode; volatileStatus?: string;
  boosts?: Partial<Record<BoostKey, number>>; self?: { boosts?: Partial<Record<BoostKey, number>> };
}

export interface MoveData {
  num: number; id: string; name: string; orig: string; type: TypeName;
  category: "physical" | "special" | "status"; power: number | null;
  accuracy: number | true; pp: number; priority: number; target: string; desc: string;
  contact: boolean; hm?: string; multihit?: number | [number, number]; drain?: [number, number];
  recoil?: [number, number]; critRatio?: number; ohko?: boolean; damage?: number | "level";
  selfdestruct?: string; boosts?: Partial<Record<BoostKey, number>>; volatileStatus?: string;
  status?: StatusCode; heal?: [number, number]; forceSwitch?: boolean; sideCondition?: string;
  hasCrashDamage?: boolean; self?: { volatileStatus?: string; boosts?: Partial<Record<BoostKey, number>> };
  secondary?: Secondary; charge?: boolean; recharge?: boolean; semiInvulnerable?: string; special?: string;
}

export interface ItemData {
  id: string; name: string; kind: "ball" | "evolution" | "heal" | "cure" | "revive" | "pp" | "key" | "tm" | "repel";
  /** Plásmidos de movimiento: el movimiento que enseñan y el tramo del juego (1-5) en que aparecen. */
  move?: string; tier?: number;
  price: number; desc: string; ball?: number; heal?: number; revive?: number; pp?: number;
  /** Repelentes (Virkon): pasos que dura el efecto. */
  repel?: number;
}

export interface TrainerData {
  id: string; name: string; role: string; badge: string | null;
  team: { species: string; level: number; moves?: string[] }[];
}

const dexById = new Map((microdexJson as any[]).map((m) => [m.id, m]));
export const SPECIES: Map<string, Species> = new Map(
  (speciesJson as any[]).map((s) => {
    const m = dexById.get(s.id)!;
    return [s.id, {
      id: s.id, dex: m.dex, name: m.name, organism: m.organism, scientific: m.scientific, entry: m.entry, types: m.types,
      evolvesFrom: m.evolves_from, evolution: m.evolution,
      baseStats: s.baseStats, bst: s.bst, growth: s.growth, catchRate: s.catchRate,
      expYield: s.expYield, size: s.size, stage: s.stage, learnset: s.learnset, mo: s.mo,
    } as Species];
  }),
);
export const MOVES: Map<string, MoveData> = new Map((movesJson as MoveData[]).map((m) => [m.id, m]));
export const MOVES_BY_ORIG: Map<string, MoveData> = new Map((movesJson as MoveData[]).map((m) => [m.orig, m]));
export const ITEMS: Map<string, ItemData> = new Map((itemsJson as ItemData[]).map((i) => [i.id, i]));
export const TRAINERS: Map<string, TrainerData> = new Map((trainersJson as TrainerData[]).map((t) => [t.id, t]));
export const TYPE_NAMES: TypeName[] = (typesJson as any).types.map((t: any) => t.name);
const TYPE_INDEX = new Map(TYPE_NAMES.map((n, i) => [n, i]));
const CHART: number[][] = (typesJson as any).chart_attacker_by_defender;

/** Multiplicador de un tipo atacante contra uno o dos tipos defensores. */
export function typeEffectiveness(attack: TypeName, defend: TypeName[]): number {
  const a = TYPE_INDEX.get(attack);
  if (a === undefined) return 1; // movimientos sin tipo
  return defend.reduce((acc, d) => acc * CHART[a][TYPE_INDEX.get(d)!], 1);
}

export function getSpecies(id: string): Species {
  const s = SPECIES.get(id);
  if (!s) throw new Error(`Especie desconocida: ${id}`);
  return s;
}
export function getMove(id: string): MoveData {
  const m = MOVES.get(id);
  if (!m) throw new Error(`Movimiento desconocido: ${id}`);
  return m;
}

/** Evoluciones posibles de una especie. */
export function evolutionsOf(id: string): Species[] {
  return [...SPECIES.values()].filter((s) => s.evolvesFrom === id);
}

export const ITEM_EVOLUTION_ID: Record<string, string> = {
  "Plásmido R": "plasmido-r", "Plásmido F": "plasmido-f", "Plásmido Ti": "plasmido-ti",
  "Plásmido Col": "plasmido-col", "Plásmido Vir": "plasmido-vir",
};
