import { describe, expect, test } from "bun:test";
import { Battle, Rng, createMicroo, SPECIES, type Action } from "../src/engine";

// Combate de conexión: el anfitrión y el invitado ejecutan el mismo combate cada uno en su pantalla (el invitado
// con los bandos al revés y `mirror`). Con la misma semilla y las mismas órdenes, el resultado debe ser idéntico.
const ids = [...SPECIES.keys()];
function equipo(r: Rng, n: number) { return Array.from({ length: n }, () => createMicroo(r.pick(ids), r.int(20, 60), { rng: r })); }
const clon = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const flip = (acts: Action[]): Action[] => acts.map((a) => (a.kind === "move" && a.target ? { ...a, target: { side: (1 - a.target.side) as 0 | 1, slot: a.target.slot } } : a));
function elegir(b: Battle, side: 0 | 1, r: Rng): Action[] {
  const out: Action[] = [];
  b.sides[side].active.forEach((x, slot) => {
    if (!x || x.mon.hp <= 0) return;
    const legal = b.legalMoves({ side, slot });
    out.push({ kind: "move", slot, move: legal.length ? r.pick(legal) : -1, target: { side: (1 - side) as 0 | 1, slot: 0 } });
  });
  return out;
}
const huella = (b: Battle, yo: 0 | 1) => [b.sides[yo], b.sides[1 - yo]].map((s) => s.party.map((m) => `${m.species}:${m.hp}:${m.status ?? ""}`).join(",")).join("|");

describe("combates de conexión", () => {
  test("anfitrión e invitado calculan el mismo combate", () => {
    for (let k = 0; k < 60; k++) {
      const r = new Rng(1000 + k);
      const A = equipo(r, 1 + (k % 6)), B = equipo(r, 1 + ((k * 7) % 6));
      const seed = r.int(1, 1e9);
      const host = new Battle({ player: clon(A), foe: clon(B), seed, link: true, foeName: "B", playerName: "A" });
      const guest = new Battle({ player: clon(B), foe: clon(A), seed, link: true, mirror: true, foeName: "A", playerName: "B" });
      const ra = new Rng(k * 3 + 1), rb = new Rng(k * 5 + 2);
      for (let t = 0; t < 200 && !host.ended; t++) {
        const aA = elegir(host, 0, ra), aB = elegir(guest, 0, rb);
        host.playTurn(aA, flip(aB));
        guest.playTurn(aB, flip(aA));
        expect(huella(guest, 1)).toBe(huella(host, 0));
        // cambios tras debilitarse: cada uno elige el primero disponible y se aplica en el orden del anfitrión
        if (!host.ended) {
          const hA = host.needsReplacement(0), hB = host.needsReplacement(1);
          for (const slot of hA) { const p = host.benchFor(slot)[0]; host.replace(0, slot, p); guest.replace(1, slot, p); }
          for (const slot of hB) { const p = guest.benchFor(slot)[0]; host.replace(1, slot, p); guest.replace(0, slot, p); }
        }
        expect(huella(guest, 1)).toBe(huella(host, 0));
      }
      expect(guest.ended).toBe(host.ended);
      if (host.ended) expect(guest.winner).toBe(host.winner === null ? null : ((1 - host.winner) as 0 | 1));
    }
  });
});
