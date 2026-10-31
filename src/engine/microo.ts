// Ejemplares de Microo: estadísticas, naturalezas, experiencia, aprendizaje y evolución.
import { Rng } from "./rng";
import {
  getMove, getSpecies, evolutionsOf, ITEM_EVOLUTION_ID,
  type Growth, type Species, type StatKey, type Stats, type StatusCode,
} from "./data";

export const STAT_KEYS: StatKey[] = ["hp", "atk", "def", "spa", "spd", "spe"];

/** Naturalezas: [nombre, estadística que sube, estadística que baja]. */
export const NATURES: [string, StatKey | null, StatKey | null][] = [
  ["Fuerte", null, null], ["Huraña", "atk", "def"], ["Audaz", "atk", "spe"], ["Firme", "atk", "spa"],
  ["Pícara", "atk", "spd"], ["Osada", "def", "atk"], ["Dócil", null, null], ["Plácida", "def", "spe"],
  ["Agitada", "def", "spa"], ["Floja", "def", "spd"], ["Miedosa", "spe", "atk"], ["Activa", "spe", "def"],
  ["Seria", null, null], ["Alegre", "spe", "spa"], ["Ingenua", "spe", "spd"], ["Modesta", "spa", "atk"],
  ["Afable", "spa", "def"], ["Mansa", "spa", "spe"], ["Tímida", null, null], ["Alocada", "spa", "spd"],
  ["Serena", "spd", "atk"], ["Amable", "spd", "def"], ["Grosera", "spd", "spe"], ["Cauta", "spd", "spa"],
  ["Rara", null, null],
];

export interface MoveSlot { id: string; pp: number; maxPp: number }

export interface Microo {
  uid: number;
  species: string;
  nickname: string | null;
  level: number;
  exp: number;
  nature: number;          // índice en NATURES
  ivs: Stats;
  stats: Stats;
  hp: number;
  status: StatusCode | null;
  sleepTurns: number;      // turnos de latencia restantes
  toxicCounter: number;
  moves: MoveSlot[];
  shiny: boolean;          // cepa fluorescente (GFP)
  originalTrainer: string | null;
}

let nextUid = 1;
/** Garantiza que los uid nuevos no coincidan con los de Microos ya existentes (p. ej. de una partida
 *  guardada: el contador vuelve a 1 cada vez que se abre el juego). */
export function reservarUids(existentes: number[]) { nextUid = Math.max(nextUid, ...existentes.map((u) => u + 1)); }

export function expForLevel(growth: Growth, n: number): number {
  if (n <= 1) return 0;
  switch (growth) {
    case "fast": return Math.floor((4 * n ** 3) / 5);
    case "medium_fast": return n ** 3;
    case "medium_slow": return Math.max(0, Math.floor((6 / 5) * n ** 3 - 15 * n ** 2 + 100 * n - 140));
    case "slow": return Math.floor((5 * n ** 3) / 4);
  }
}

export function calcStats(sp: Species, level: number, ivs: Stats, nature: number): Stats {
  const [, up, down] = NATURES[nature];
  const out = {} as Stats;
  for (const k of STAT_KEYS) {
    const b = sp.baseStats[k];
    if (k === "hp") {
      out.hp = Math.floor(((2 * b + ivs.hp) * level) / 100) + level + 10;
    } else {
      let v = Math.floor(((2 * b + ivs[k]) * level) / 100) + 5;
      if (up === k) v = Math.floor(v * 1.1);
      if (down === k) v = Math.floor(v * 0.9);
      out[k] = v;
    }
  }
  return out;
}

/** Los últimos 4 movimientos aprendidos hasta ese nivel (como un Microo salvaje). */
export function defaultMoves(speciesId: string, level: number): string[] {
  const ls = getSpecies(speciesId).learnset.filter((e) => e.level <= level).map((e) => e.move);
  const uniq = [...new Set(ls)];
  return uniq.slice(-4);
}

export interface CreateOptions {
  rng?: Rng; nature?: number; ivs?: Partial<Stats> | "perfect"; moves?: string[];
  nickname?: string | null; shiny?: boolean; trainer?: string | null;
}

export function createMicroo(speciesId: string, level: number, opts: CreateOptions = {}): Microo {
  const rng = opts.rng ?? new Rng();
  const sp = getSpecies(speciesId);
  const ivs = {} as Stats;
  for (const k of STAT_KEYS) {
    ivs[k] = opts.ivs === "perfect" ? 31 : (opts.ivs as Partial<Stats> | undefined)?.[k] ?? rng.int(0, 31);
  }
  const nature = opts.nature ?? rng.int(0, NATURES.length - 1);
  const stats = calcStats(sp, level, ivs, nature);
  const moveIds = (opts.moves && opts.moves.length ? opts.moves : defaultMoves(speciesId, level)).slice(0, 4);
  return {
    uid: nextUid++, species: speciesId, nickname: opts.nickname ?? null, level,
    exp: expForLevel(sp.growth, level), nature, ivs, stats, hp: stats.hp,
    status: null, sleepTurns: 0, toxicCounter: 0,
    moves: moveIds.map((id) => { const m = getMove(id); return { id, pp: m.pp, maxPp: m.pp }; }),
    shiny: opts.shiny ?? rng.chance(1 / 4096), originalTrainer: opts.trainer ?? null,
  };
}

export function displayName(m: Microo): string { return m.nickname ?? getSpecies(m.species).name; }

export function recalcStats(m: Microo): void {
  const old = m.stats.hp;
  m.stats = calcStats(getSpecies(m.species), m.level, m.ivs, m.nature);
  if (m.hp > 0) m.hp = Math.max(1, Math.min(m.stats.hp, m.hp + (m.stats.hp - old)));
}

/** Curación completa (La Incubadora). */
export function fullHeal(m: Microo): void {
  m.hp = m.stats.hp; m.status = null; m.sleepTurns = 0; m.toxicCounter = 0;
  for (const s of m.moves) s.pp = s.maxPp;
}

export interface LevelUpResult { newLevel: number; learned: string[]; pending: string[]; canEvolveTo: string | null }

/**
 * Suma experiencia. Aprende automáticamente si hay hueco; si no, deja los movimientos
 * en `pending` para que la interfaz pregunte qué olvidar.
 */
export function gainExp(m: Microo, amount: number, levelCap = 100): LevelUpResult[] {
  const sp = getSpecies(m.species);
  const results: LevelUpResult[] = [];
  m.exp += amount;
  while (m.level < Math.min(100, levelCap) && m.exp >= expForLevel(sp.growth, m.level + 1)) {
    m.level++;
    recalcStats(m);
    const res: LevelUpResult = { newLevel: m.level, learned: [], pending: [], canEvolveTo: null };
    for (const e of getSpecies(m.species).learnset.filter((e) => e.level === m.level)) {
      if (m.moves.some((s) => s.id === e.move)) continue;
      if (m.moves.length < 4) { const mv = getMove(e.move); m.moves.push({ id: e.move, pp: mv.pp, maxPp: mv.pp }); res.learned.push(e.move); }
      else res.pending.push(e.move);
    }
    res.canEvolveTo = levelEvolution(m);
    results.push(res);
  }
  if (m.level >= levelCap) m.exp = Math.min(m.exp, expForLevel(sp.growth, levelCap));
  return results;
}

/** ¿Puede aprender este movimiento con un Plásmido? Si es de su tipo, si lo aprende por nivel,
 *  o si es de tipo Levadura (movimientos básicos que cualquier célula puede expresar). */
export function plasmidCompatible(m: Microo, moveId: string): boolean {
  const sp = getSpecies(m.species), mv = getMove(moveId);
  return sp.types.includes(mv.type) || sp.learnset.some((e) => e.move === moveId) || mv.type === "Levadura";
}

export function replaceMove(m: Microo, forgetIndex: number, moveId: string): void {
  const mv = getMove(moveId);
  m.moves[forgetIndex] = { id: moveId, pp: mv.pp, maxPp: mv.pp };
}

export function levelEvolution(m: Microo): string | null {
  for (const e of evolutionsOf(m.species)) {
    if (e.evolution?.method === "level" && m.level >= (e.evolution.level ?? 101)) return e.id;
  }
  return null;
}
export function itemEvolution(m: Microo, itemId: string): string | null {
  for (const e of evolutionsOf(m.species)) {
    if (e.evolution?.method === "item" && ITEM_EVOLUTION_ID[e.evolution.item ?? ""] === itemId) return e.id;
  }
  return null;
}
export function conjugationEvolution(m: Microo): string | null {
  for (const e of evolutionsOf(m.species)) if (e.evolution?.method === "conjugation") return e.id;
  return null;
}
export function evolve(m: Microo, to: string): void {
  m.species = to;
  recalcStats(m);
}
