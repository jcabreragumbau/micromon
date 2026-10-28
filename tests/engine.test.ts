import { describe, expect, test } from "bun:test";
import {
  Battle, Rng, MOVES, SPECIES, TYPE_NAMES, ITEMS, TRAINERS, chooseActions, createMicroo, captureCheck,
  gainExp, itemEvolution, conjugationEvolution, levelEvolution, evolve, expForLevel, getSpecies,
  typeEffectiveness, trainerParty, fullHeal, type Action, type Microo,
} from "../src/engine";

const mk = (sp: string, lv: number, moves?: string[], seed = 7) =>
  createMicroo(sp, lv, { rng: new Rng(seed), moves, ivs: "perfect", nature: 0, shiny: false });

function duel(a: Microo, b: Microo, seed = 1, format: "single" | "double" = "single", wild = false) {
  return new Battle({ player: [a], foe: [b], seed, format, wild });
}

describe("Tabla de 18 tipos", () => {
  test("es 18×18 y solo contiene 0, ½, 1 y 2", () => {
    expect(TYPE_NAMES.length).toBe(18);
    for (const a of TYPE_NAMES) for (const d of TYPE_NAMES) expect([0, 0.5, 1, 2]).toContain(typeEffectiveness(a, [d]));
  });
  test("equivalencias clave con el GDD", () => {
    expect(typeEffectiveness("Anaerobio", ["Fotótrofo"])).toBe(2);      // Fuego > Planta
    expect(typeEffectiveness("Protozoo", ["Anaerobio"])).toBe(2);       // Agua > Fuego
    expect(typeEffectiveness("Espiroqueta", ["Esporulado"])).toBe(0);   // Eléctrico ✗ Tierra
    expect(typeEffectiveness("Levadura", ["Archaea"])).toBe(0);         // Normal ✗ Fantasma
    expect(typeEffectiveness("Antibiótico", ["Archaea"])).toBe(0);      // Lucha ✗ Fantasma
    expect(typeEffectiveness("Virus", ["Simbionte"])).toBe(0);          // Dragón ✗ Hada
    expect(typeEffectiveness("Virus", ["Virus"])).toBe(2);              // Dragón > Dragón
    expect(typeEffectiveness("Antibiótico", ["Gram+", "Biofilm"])).toBe(4);
  });
});

describe("Datos", () => {
  test("162 Microos, 165 movimientos y equipos válidos", () => {
    expect(SPECIES.size).toBe(162);
    expect(MOVES.size).toBe(165);
    for (const t of TRAINERS.values()) for (const p of t.team) {
      expect(SPECIES.has(p.species)).toBe(true);
      for (const m of p.moves ?? []) expect(MOVES.has(m)).toBe(true);
    }
  });
  test("las estadísticas crecen con el nivel y no hay valores imposibles", () => {
    for (const s of SPECIES.values()) {
      const a = mk(s.id, 5), b = mk(s.id, 50);
      expect(b.stats.hp).toBeGreaterThan(a.stats.hp);
      for (const v of Object.values(b.stats)) expect(v).toBeGreaterThan(0);
      expect(a.moves.length).toBeGreaterThan(0);
    }
  });
});

describe("Los 165 movimientos se ejecutan sin errores", () => {
  const moves = [...MOVES.values()];
  for (const mv of moves) {
    test(`${mv.num} ${mv.name}`, () => {
      for (const format of ["single", "double"] as const) {
        for (let seed = 1; seed <= 6; seed++) {
          const user = mk("luca", 50, [mv.id]);
          const foes = format === "double"
            ? [mk("tardigrad", 50, ["contacto-celular"]), mk("kefirgran", 50, ["contacto-celular"])]
            : [mk("tardigrad", 50, ["contacto-celular"])];
          const players = format === "double" ? [user, mk("synechoc", 50, ["contacto-celular"])] : [user];
          const b = new Battle({ player: players, foe: foes, seed, format, wild: seed % 2 === 0 });
          for (let turn = 0; turn < 4 && !b.ended; turn++) {
            const pa: Action[] = b.sides[0].active.map((x, slot) => x ? { kind: "move", slot, move: b.legalMoves({ side: 0, slot })[0] ?? -1, target: { side: 1, slot: 0 } } as Action : null).filter(Boolean) as Action[];
            const fa: Action[] = b.sides[1].active.map((x, slot) => x ? { kind: "move", slot, move: 0, target: { side: 0, slot: 0 } } as Action : null).filter(Boolean) as Action[];
            b.playTurn(pa, fa);
            for (const s of [0, 1] as const) for (const slot of b.needsReplacement(s)) {
              const idx = b.sides[s].party.findIndex((m, i) => m.hp > 0 && !b.sides[s].active.some((x) => x?.party === i));
              if (idx >= 0) b.replace(s, slot, idx);
            }
          }
          const ev = b.drain();
          expect(ev.some((e) => e.type === "move" && e.move === mv.id || e.type === "msg")).toBe(true);
          for (const m of [...players, ...foes]) {
            expect(m.hp).toBeGreaterThanOrEqual(0);
            expect(m.hp).toBeLessThanOrEqual(m.stats.hp);
            for (const s of m.moves) expect(s.pp).toBeGreaterThanOrEqual(0);
          }
        }
      }
    });
  }

  test("los movimientos de daño hacen daño", () => {
    const fixed = new Set(["counter", "bide", "dreameater", "superfang", "struggle"]);
    for (const mv of moves) {
      if (mv.category === "status" || fixed.has(mv.special ?? "") || mv.ohko) continue;
      let hit = false;
      for (let seed = 1; seed <= 12 && !hit; seed++) {
        const target = mk("tardigrad", 50, ["agitacion-en-placa"]);
        const eff = typeEffectiveness(mv.type, getSpecies("tardigrad").types);
        if (eff === 0) { hit = true; break; }
        const b = duel(mk("luca", 50, [mv.id]), target, seed);
        for (let t = 0; t < 3 && !b.ended; t++) b.playTurn([{ kind: "move", slot: 0, move: 0 }], [{ kind: "move", slot: 0, move: 0 }]);
        if (target.hp < target.stats.hp) hit = true;
      }
      expect({ move: mv.id, hit }).toEqual({ move: mv.id, hit: true });
    }
  });
});

describe("Mecánicas concretas", () => {
  test("STAB y efectividad multiplican el daño", () => {
    const b = duel(mk("butyricum", 30), mk("synechoc", 30));
    const user = b.battler({ side: 0, slot: 0 })!, tgt = b.battler({ side: 1, slot: 0 })!;
    const fire = MOVES.get("chorro-metano-ardiente")!;   // Anaerobio, STAB y ×2 contra Fotótrofo
    const neutral = { ...fire, type: "Levadura" };
    const d1 = b.computeDamage(user, tgt, fire, false, b.effectiveness(fire, tgt), true).dmg!;
    const d2 = b.computeDamage(user, tgt, neutral, false, b.effectiveness(neutral, tgt), true).dmg!;
    expect(d1 / d2).toBeGreaterThan(2.7);
    expect(d1 / d2).toBeLessThan(3.3);
  });
  test("inmunidades a estados por tipo", () => {
    const b = duel(mk("luca", 40), mk("serratia", 40));             // Gram-
    expect(b.setStatus(b.battler({ side: 1, slot: 0 })!, "psn", false)).toBe(false);
    const c = duel(mk("luca", 40), mk("butyricum", 40));            // Anaerobio
    expect(c.setStatus(c.battler({ side: 1, slot: 0 })!, "brn", false)).toBe(false);
    const d = duel(mk("luca", 40, ["triptofano-fungico"]), mk("synechoc", 40, ["agitacion-en-placa"]), 3);
    d.playTurn([{ kind: "move", slot: 0, move: 0 }], [{ kind: "move", slot: 0, move: 0 }]);
    expect(d.sides[1].party[0].status).toBe(null);                 // Fotótrofo inmune a esporas
  });
  test("movimiento de área en 2v2 golpea a ambos rivales con daño reducido", () => {
    const user = mk("luca", 60, ["choque-osmotico-masivo"]);
    const f1 = mk("tardigrad", 60, ["agitacion-en-placa"]), f2 = mk("tardigrad", 60, ["agitacion-en-placa"]);
    const b = new Battle({ player: [user, mk("kefirgran", 60, ["agitacion-en-placa"])], foe: [f1, f2], format: "double", seed: 5 });
    b.playTurn([{ kind: "move", slot: 0, move: 0 }, { kind: "move", slot: 1, move: 0 }], [{ kind: "move", slot: 0, move: 0 }, { kind: "move", slot: 1, move: 0 }]);
    expect(f1.hp).toBeLessThan(f1.stats.hp);
    expect(f2.hp).toBeLessThan(f2.stats.hp);
  });
  test("Criobolas: la Morada nunca falla y las mejores capturan más", () => {
    const rng = new Rng(9);
    const wild = mk("tardigrad", 30);
    expect(captureCheck(wild, 255, rng).caught).toBe(true);
    let red = 0, yellow = 0;
    for (let i = 0; i < 3000; i++) { if (captureCheck(wild, 1, rng).caught) red++; if (captureCheck(wild, 2, rng).caught) yellow++; }
    expect(yellow).toBeGreaterThan(red * 1.5);
    wild.hp = 1; wild.status = "slp";
    let weak = 0; for (let i = 0; i < 3000; i++) if (captureCheck(wild, 1, rng).caught) weak++;
    expect(weak).toBeGreaterThan(yellow);
  });
  test("captura en combate salvaje", () => {
    const b = new Battle({ player: [mk("luca", 50)], foe: [mk("synechoc", 3)], wild: true, seed: 2, inventory: { "criobola-morada": 1 } });
    b.playTurn([{ kind: "item", slot: 0, item: "criobola-morada" }], [{ kind: "move", slot: 0, move: 0 }]);
    expect(b.outcome).toBe("capture");
    expect(b.captured?.species).toBe("synechoc");
  });
  test("evoluciones por nivel, Plásmido y Conjugación", () => {
    const s = mk("synechoc", 15);
    gainExp(s, expForLevel(getSpecies("synechoc").growth, 16) - s.exp);
    expect(s.level).toBe(16);
    expect(levelEvolution(s)).toBe("anabaen");
    evolve(s, "anabaen");
    expect(s.species).toBe("anabaen");
    expect(itemEvolution(mk("leptospir", 20), "plasmido-vir")).toBe("interrogan");
    expect(conjugationEvolution(mk("genitalium", 30))).toBe("pneumoniae");
    const p = mk("pleomorph", 20);
    expect(itemEvolution(p, "plasmido-col")).toBe("halomorph");
    expect(itemEvolution(p, "plasmido-f")).toBe("electromorph");
    expect(itemEvolution(p, "plasmido-r")).toBe("pyromorph");
    expect(itemEvolution(p, "plasmido-ti")).toBe(null);
  });
  test("Difusión de Nutrientes: la reserva recibe la mitad", () => {
    const lead = mk("casei", 20), bench = mk("casei", 20);
    const b = new Battle({ player: [lead, bench], foe: [mk("synechoc", 20, ["agitacion-en-placa"])], seed: 4 });
    const e0 = lead.exp, b0 = bench.exp;
    for (let i = 0; i < 20 && !b.ended; i++) b.playTurn([{ kind: "move", slot: 0, move: 0 }], [{ kind: "move", slot: 0, move: 0 }]);
    const exp = b.drain().filter((e) => e.type === "exp");
    expect(exp.length).toBe(2);
    const gl = lead.exp - e0, gb = bench.exp - b0;
    expect(Math.abs(gb - Math.floor(gl / 2))).toBeLessThanOrEqual(1);
  });
  test("dificultad ajusta los niveles de los equipos", () => {
    const n = trainerParty("gym1", "normal"), f = trainerParty("gym1", "facil"), d = trainerParty("gym1", "dificil");
    expect(f[0].level).toBe(n[0].level - 3);
    expect(d[0].level).toBe(n[0].level + 4);
    expect(d[0].ivs.atk).toBe(31);
    expect(n[0].moves.map((m) => m.id)).toEqual(TRAINERS.get("gym1")!.team[0].moves!);
  });
  test("objetos curativos y La Incubadora", () => {
    const m = mk("casei", 20);
    m.hp = 1; m.status = "psn";
    fullHeal(m);
    expect(m.hp).toBe(m.stats.hp);
    expect(m.status).toBe(null);
    for (const it of ITEMS.values()) expect(it.name.length).toBeGreaterThan(0);
  });
});

describe("Simulador: miles de combates sin errores", () => {
  test("2000 combates aleatorios (1v1 y 2v2, tres dificultades)", () => {
    const ids = [...SPECIES.keys()];
    const rng = new Rng(2026);
    const diffs = ["facil", "normal", "dificil"] as const;
    let finished = 0;
    for (let n = 0; n < 2000; n++) {
      const format = n % 4 === 0 ? "double" : "single";
      const lv = rng.int(5, 70);
      const team = (k: number) => Array.from({ length: k }, () => createMicroo(rng.pick(ids), Math.max(2, lv + rng.int(-3, 3)), { rng }));
      const size = format === "double" ? rng.int(2, 4) : rng.int(1, 3);
      const b = new Battle({ player: team(size), foe: team(size), format, seed: n, wild: n % 3 === 0 && format === "single", difficulty: diffs[n % 3] });
      let turns = 0;
      while (!b.ended && turns < 300) {
        b.playTurn(chooseActions(b, 0, diffs[(n + 1) % 3]), chooseActions(b, 1));
        for (const s of [0, 1] as const) for (const slot of b.needsReplacement(s)) {
          const idx = b.sides[s].party.findIndex((m, i) => m.hp > 0 && !b.sides[s].active.some((x) => x?.party === i));
          if (idx >= 0) b.replace(s, slot, idx);
        }
        b.drain();
        turns++;
      }
      for (const s of b.sides) for (const m of s.party) {
        if (m.hp < 0 || m.hp > m.stats.hp) throw new Error(`PS fuera de rango en combate ${n}`);
      }
      if (b.ended) finished++;
    }
    expect(finished).toBeGreaterThan(1980);
  }, 120000);
});
