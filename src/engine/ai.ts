// Inteligencia artificial de los rivales según la dificultad (Condiciones de Incubación).
import { Battle, type Action, type Difficulty, type Ref } from "./battle";
import { getMove, typeEffectiveness, ITEMS } from "./data";

/** Elige las acciones de todas las casillas activas de un bando. */
export function chooseActions(battle: Battle, side: 0 | 1, difficulty: Difficulty = battle.difficulty): Action[] {
  const acts: Action[] = [];
  battle.sides[side].active.forEach((b, slot) => {
    if (!b || b.mon.hp <= 0) return;
    acts.push(chooseFor(battle, { side, slot }, difficulty));
  });
  return acts;
}

function chooseFor(battle: Battle, r: Ref, diff: Difficulty): Action {
  const b = battle.battler(r)!;
  const legal = battle.legalMoves(r);
  if (battle.forced(r) || !legal.length) return { kind: "move", slot: r.slot, move: legal[0] ?? -1 };
  const foes = battle.foesOf(r);
  // Medios curativos (Normal: hasta 2 por combate; Difícil: ninguno, llevan objetos equipados)
  if (diff === "normal" && !battle.wild && battle.sides[r.side].itemsUsed < 2 && b.mon.hp < b.mon.stats.hp * 0.25) {
    const it = Object.keys(battle.foeItems).find((k) => (battle.foeItems[k] ?? 0) > 0 && ITEMS.get(k)?.kind === "heal");
    if (it) return { kind: "item", slot: r.slot, item: it };
  }
  if (diff === "facil" || !foes.length) {
    return { kind: "move", slot: r.slot, move: battle.rng.pick(legal), target: foes.length ? battle.refOf(battle.rng.pick(foes)) : undefined };
  }
  // Puntuar cada movimiento contra cada rival
  let best: { score: number; move: number; target?: Ref } = { score: -Infinity, move: legal[0] };
  for (const i of legal) {
    const mv = getMove(b.mon.moves[i].id);
    for (const t of foes) {
      let score: number;
      if (mv.category === "status") {
        score = statusScore(battle, b, t, mv.id);
      } else {
        const eff = battle.effectiveness(mv, t);
        const res = battle.computeDamage(b, t, mv, false, eff, true);
        const dmg = res.dmg ?? 0;
        const acc = mv.accuracy === true ? 1 : mv.accuracy / 100;
        score = Math.min(dmg, t.mon.hp) * acc;
        if (dmg >= t.mon.hp) score += 60 + (mv.priority > 0 ? 40 : 0);
        if (mv.recharge || mv.charge) score *= 0.75;
        if (mv.selfdestruct) score *= b.mon.hp < b.mon.stats.hp * 0.3 ? 1.2 : 0.2;
        if (mv.recoil) score *= 0.9;
        if (mv.ohko) score = t.mon.level > b.mon.level ? 0 : t.mon.hp * 0.3;
      }
      if (diff === "normal") score *= 0.85 + battle.rng.next() * 0.3;
      if (score > best.score) best = { score, move: i, target: battle.refOf(t) };
    }
  }
  // Difícil: cambiar si el Microo actual no puede hacer nada útil y hay uno mejor en reserva
  if (diff === "dificil" && best.score < 5 && battle.canSwitch(r)) {
    const party = battle.sides[r.side].party;
    const foeTypes = foes.flatMap((f) => battle.typesOf(f));
    let bestP = -1, bestEff = 1;
    party.forEach((m, i) => {
      if (m.hp <= 0 || battle.sides[r.side].active.some((x) => x?.party === i)) return;
      for (const s of m.moves) {
        const e = typeEffectiveness(getMove(s.id).type, foeTypes.slice(0, 2));
        if (getMove(s.id).category !== "status" && e > bestEff) { bestEff = e; bestP = i; }
      }
    });
    if (bestP >= 0) return { kind: "switch", slot: r.slot, party: bestP };
  }
  return { kind: "move", slot: r.slot, move: best.move, target: best.target };
}

function statusScore(battle: Battle, b: NonNullable<ReturnType<Battle["battler"]>>, t: NonNullable<ReturnType<Battle["battler"]>>, id: string): number {
  const mv = getMove(id);
  if (mv.status) return t.mon.status ? 0 : mv.status === "slp" ? 45 : mv.status === "tox" ? 35 : 28;
  if (mv.volatileStatus === "confusion") return t.vol.confusion ? 0 : 22;
  if (mv.heal) return b.mon.hp < b.mon.stats.hp / 2 ? 50 : 0;
  if (mv.special === "rest") return b.mon.hp < b.mon.stats.hp / 3 ? 45 : 0;
  if (mv.volatileStatus === "leechseed") return t.vol.leechSeed ? 0 : 25;
  if (mv.special === "substitute") return b.vol.substitute ? 0 : b.mon.hp > b.mon.stats.hp * 0.6 ? 20 : 0;
  if (mv.special === "reflect" || mv.special === "lightscreen") return 18;
  if (mv.boosts) {
    const self = mv.target === "self";
    const tgt = self ? b : t;
    const total = Object.entries(mv.boosts).reduce((a, [k, v]) => {
      const cur = tgt.boosts[k as keyof typeof tgt.boosts] * Math.sign(v as number);
      return a + (cur >= 2 ? 0 : Math.abs(v as number) * (cur >= 1 ? 0.4 : 1));
    }, 0);
    return total * (self ? (b.mon.hp > b.mon.stats.hp * 0.6 ? 12 : 3) : 8);
  }
  if (mv.special === "splash") return 0;
  return 8;
}
