// API pública del motor.
export * from "./data";
export * from "./rng";
export * from "./microo";
export * from "./battle";
export * from "./ai";
import { Rng } from "./rng";
import { createMicroo, type Microo } from "./microo";
import { TRAINERS } from "./data";
import type { Difficulty } from "./battle";

/** Equipo de un entrenador del GDD ajustado a la dificultad elegida. */
export function trainerParty(id: string, difficulty: Difficulty, rng = new Rng(1)): Microo[] {
  const t = TRAINERS.get(id);
  if (!t) throw new Error(`Entrenador desconocido: ${id}`);
  const delta = difficulty === "facil" ? -3 : difficulty === "dificil" ? 4 : 0;
  return t.team.map((p) => createMicroo(p.species, Math.max(2, Math.min(100, p.level + delta)), {
    rng, moves: p.moves, ivs: difficulty === "dificil" ? "perfect" : undefined, trainer: t.name,
  }));
}
