// Estado de la partida y guardado en el navegador.
import type { Microo } from "../engine/microo";
import type { Difficulty } from "../engine/battle";

export interface GameState {
  version: 1;
  name: string;
  rival: string;
  money: number;
  badges: string[];
  flags: Record<string, boolean | number | string>;
  party: Microo[];
  box: Microo[];
  bag: Record<string, number>;
  seen: string[];
  caught: string[];
  map: string; x: number; y: number; dir: number;
  lastHeal: { map: string; x: number; y: number };
  difficulty: Difficulty;
  playFrames: number;
  textSpeed: 1 | 2 | 4;
  seed: number;
}

export function newState(): GameState {
  return {
    version: 1, name: "Ana", rival: "Koch", money: 3000, badges: [], flags: {},
    party: [], box: [], bag: { "medio-lb": 1 }, seen: [], caught: [],
    map: "casa-jugador", x: 4, y: 5, dir: 0, lastHeal: { map: "casa-jugador", x: 4, y: 5 },
    difficulty: "normal", playFrames: 0, textSpeed: 2, seed: (Math.random() * 2 ** 31) >>> 0,
  };
}

const KEY = "micromon-partida-1";

export function saveGame(s: GameState): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; }
}
export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return s.version === 1 ? s : null;
  } catch { return null; }
}
export function hasSave(): boolean { return loadGame() !== null; }
/** Copia de la partida como archivo descargable (para no depender del navegador). */
export function exportSave(s: GameState): string { return JSON.stringify(s); }

export function addItem(s: GameState, id: string, n = 1) { s.bag[id] = (s.bag[id] ?? 0) + n; if (s.bag[id] <= 0) delete s.bag[id]; }
export function markSeen(s: GameState, sp: string) { if (!s.seen.includes(sp)) s.seen.push(sp); }
export function markCaught(s: GameState, sp: string) { markSeen(s, sp); if (!s.caught.includes(sp)) s.caught.push(sp); }
export function playTime(s: GameState): string {
  const m = Math.floor(s.playFrames / 3600);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}
