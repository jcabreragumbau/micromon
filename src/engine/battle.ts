// Motor de combate de Micromón. Puro: no dibuja nada, solo emite eventos.
// Soporta Cultivo Axénico (1v1) y Co-cultivo (2v2), combates salvajes y contra entrenadores.
import { Rng } from "./rng";
import {
  getMove, getSpecies, typeEffectiveness, MOVES, ITEMS,
  type BoostKey, type MoveData, type StatKey, type StatusCode, type TypeName,
} from "./data";
import { displayName, gainExp, levelEvolution, STAT_KEYS, type Microo, type LevelUpResult } from "./microo";

export type Difficulty = "facil" | "normal" | "dificil";
export type Format = "single" | "double";

export interface Ref { side: 0 | 1; slot: number }

export type Action =
  | { kind: "move"; slot: number; move: number; target?: Ref }
  | { kind: "switch"; slot: number; party: number }
  | { kind: "item"; slot: number; item: string; party?: number }
  | { kind: "run"; slot: number };

export interface BattleEvent { type: string; text: string; [k: string]: unknown }

interface Volatiles {
  confusion: number; flinch: boolean; trap: { turns: number; by: Ref } | null; leechSeed: Ref | null;
  substitute: number; focusEnergy: boolean; rage: boolean; disabled: { move: string; turns: number } | null;
  recharge: boolean; charging: string | null; semi: string | null;
  locked: { move: string; turns: number } | null; bide: { turns: number; damage: number; from: Ref | null } | null;
  transform: { types: TypeName[]; stats: Record<StatKey, number>; moves: Microo["moves"]; species: string } | null;
  types: TypeName[] | null; mimic: { index: number; original: Microo["moves"][number] } | null;
  lastMove: string | null; damagedBy: { amount: number; category: string; from: Ref } | null;
}
const freshVolatiles = (): Volatiles => ({
  confusion: 0, flinch: false, trap: null, leechSeed: null, substitute: 0, focusEnergy: false, rage: false,
  disabled: null, recharge: false, charging: null, semi: null, locked: null, bide: null, transform: null,
  types: null, mimic: null, lastMove: null, damagedBy: null,
});
const freshBoosts = (): Record<BoostKey, number> => ({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 });

interface Battler { mon: Microo; party: number; side: 0 | 1; slot: number; boosts: Record<BoostKey, number>; vol: Volatiles }
interface Side {
  party: Microo[]; active: (Battler | null)[]; reflect: number; lightScreen: number; mist: number;
  name: string; itemsUsed: number; participants: Map<number, Set<number>>; // uid rival -> uids propios
}

export interface BattleOptions {
  player: Microo[]; foe: Microo[]; format?: Format; wild?: boolean; seed?: number;
  difficulty?: Difficulty; playerName?: string; foeName?: string; levelCap?: number;
  /** Nivel máximo al que obedecen los Microos del jugador (según sus medallas). */
  obeyCap?: number;
  inventory?: Record<string, number>; foeItems?: Record<string, number>;
}

const STATUS_NAME: Record<StatusCode, string> = {
  brn: "desnaturalizado", frz: "congelado a -80 °C", par: "paralizado", psn: "intoxicado",
  tox: "gravemente intoxicado", slp: "en fase de latencia",
};
const BOOST_NAME: Record<BoostKey, string> = {
  atk: "Ataque", def: "Defensa", spa: "Ataque Especial", spd: "Defensa Especial", spe: "Velocidad",
  accuracy: "Precisión", evasion: "Evasión",
};
const POWDER = new Set(["sleeppowder", "stunspore", "poisonpowder", "spore"]);
const NO_METRONOME = new Set(["metronome", "struggle", "mirrormove", "mimic", "transform", "counter", "bide"]);

export class Battle {
  sides: [Side, Side];
  format: Format;
  wild: boolean;
  rng: Rng;
  difficulty: Difficulty;
  levelCap: number;
  obeyCap: number;
  turn = 0;
  log: BattleEvent[] = [];
  ended = false;
  winner: 0 | 1 | null = null;
  outcome: "win" | "lose" | "run" | "capture" | "foeFled" | null = null;
  captured: Microo | null = null;
  payDay = 0;
  runAttempts = 0;
  inventory: Record<string, number>;
  foeItems: Record<string, number>;
  levelUps: { uid: number; result: LevelUpResult }[] = [];

  constructor(o: BattleOptions) {
    this.format = o.format ?? "single";
    this.wild = o.wild ?? false;
    this.rng = new Rng(o.seed ?? 1);
    this.difficulty = o.difficulty ?? "normal";
    this.levelCap = o.levelCap ?? 100;
    this.obeyCap = o.obeyCap ?? 100;
    this.inventory = o.inventory ?? {};
    this.foeItems = o.foeItems ?? {};
    const n = this.format === "double" ? 2 : 1;
    const mk = (party: Microo[], name: string): Side => ({
      party, active: Array(n).fill(null), reflect: 0, lightScreen: 0, mist: 0, name, itemsUsed: 0, participants: new Map(),
    });
    this.sides = [mk(o.player, o.playerName ?? "Tú"), mk(o.foe, o.foeName ?? (this.wild ? "" : "tu rival"))];
    for (const s of [0, 1] as const) {
      let slot = 0;
      for (let i = 0; i < this.sides[s].party.length && slot < n; i++) {
        if (this.sides[s].party[i].hp > 0) this.sendOut(s, slot++, i, true);
      }
    }
    this.markParticipants();
  }

  // ---------------------------------------------------------------- utilidades
  emit(type: string, text: string, extra: object = {}) { this.log.push({ type, text, ...extra }); }
  /** Devuelve y vacía los eventos pendientes (para la interfaz). */
  drain(): BattleEvent[] { const l = this.log; this.log = []; return l; }
  battler(r: Ref): Battler | null { return this.sides[r.side].active[r.slot] ?? null; }
  refOf(b: Battler): Ref { return { side: b.side, slot: b.slot }; }
  name(b: Battler): string {
    const r = this.refOf(b);
    const n = displayName(b.mon);
    if (r.side === 0) return n;
    return this.wild ? `${n} salvaje` : `${n} rival`;
  }
  typesOf(b: Battler): TypeName[] { return b.vol.types ?? b.vol.transform?.types ?? getSpecies(b.mon.species).types; }
  stat(b: Battler, k: Exclude<StatKey, "hp">, crit = false): number {
    const base = b.vol.transform ? b.vol.transform.stats[k] : b.mon.stats[k];
    let st = b.boosts[k];
    if (crit) st = (k === "atk" || k === "spa") ? Math.max(0, st) : Math.min(0, st);
    let v = Math.floor(base * (st >= 0 ? (2 + st) / 2 : 2 / (2 - st)));
    if (k === "spe" && b.mon.status === "par") v = Math.floor(v / 4);
    return Math.max(1, v);
  }
  allActive(): Battler[] { return [...this.sides[0].active, ...this.sides[1].active].filter((b): b is Battler => !!b && b.mon.hp > 0); }
  foesOf(r: Ref): Battler[] { return this.sides[1 - r.side].active.filter((b): b is Battler => !!b && b.mon.hp > 0); }
  allyOf(r: Ref): Battler | null {
    const a = this.sides[r.side].active[1 - r.slot];
    return a && a.mon.hp > 0 && this.format === "double" ? a : null;
  }
  usable(side: 0 | 1): Microo[] { return this.sides[side].party.filter((m) => m.hp > 0); }

  private sendOut(side: 0 | 1, slot: number, partyIndex: number, silent = false) {
    const mon = this.sides[side].party[partyIndex];
    const b: Battler = { mon, party: partyIndex, side, slot, boosts: freshBoosts(), vol: freshVolatiles() };
    this.sides[side].active[slot] = b;
    {
      const who = side === 0 ? `¡Adelante, ${displayName(mon)}!` : this.wild ? `¡Un ${displayName(mon)} salvaje aparece en la placa!` : `${this.sides[1].name} saca a ${displayName(mon)}.`;
      this.emit("switch", who, { side, slot, species: mon.species, party: partyIndex });
    }
  }
  private withdraw(b: Battler) {
    // Deshacer cambios temporales
    if (b.vol.transform) b.mon.moves = b.vol.transform.moves;
    if (b.vol.mimic) b.mon.moves[b.vol.mimic.index] = b.vol.mimic.original;
    b.vol.transform = null; b.vol.mimic = null;
    const r = this.refOf(b);
    if (this.sides[r.side].active[r.slot] === b) this.sides[r.side].active[r.slot] = null;
  }
  private markParticipants() {
    for (const f of this.sides[1].active) {
      if (!f) continue;
      const set = this.sides[0].participants.get(f.mon.uid) ?? new Set<number>();
      for (const p of this.sides[0].active) if (p && p.mon.hp > 0) set.add(p.mon.uid);
      this.sides[0].participants.set(f.mon.uid, set);
    }
  }

  // ---------------------------------------------------------------- estado de elección
  /** Movimientos que puede elegir el Microo de esa casilla (índices); vacío = Agotamiento de Nutrientes. */
  legalMoves(r: Ref): number[] {
    const b = this.battler(r); if (!b) return [];
    return b.mon.moves.map((m, i) => ({ m, i }))
      .filter(({ m }) => m.pp > 0 && b.vol.disabled?.move !== m.id).map(({ i }) => i);
  }
  /** ¿Está obligado a repetir acción (carga, recarga, bloqueo, Resistencia Persister)? */
  forced(r: Ref): boolean {
    const b = this.battler(r); if (!b) return false;
    return !!(b.vol.recharge || b.vol.charging || b.vol.locked || b.vol.bide);
  }
  canSwitch(r: Ref): boolean {
    const b = this.battler(r); if (!b) return false;
    return !b.vol.trap && !this.forced(r);
  }
  /** Casillas propias vacías que hay que rellenar tras un debilitamiento. */
  needsReplacement(side: 0 | 1): number[] {
    const benched = this.sides[side].party.filter((m, i) => m.hp > 0 && !this.sides[side].active.some((b) => b?.party === i));
    const empty = this.sides[side].active.map((b, i) => (!b || b.mon.hp <= 0 ? i : -1)).filter((i) => i >= 0);
    return empty.slice(0, benched.length);
  }
  replace(side: 0 | 1, slot: number, party: number) {
    const m = this.sides[side].party[party];
    if (!m || m.hp <= 0 || this.sides[side].active.some((b) => b?.party === party)) throw new Error("Cambio no válido");
    this.sendOut(side, slot, party);
    this.markParticipants();
  }

  // ---------------------------------------------------------------- turno
  /** Ejecuta un turno completo con las acciones de ambos bandos. */
  playTurn(player: Action[], foe: Action[]) {
    if (this.ended) throw new Error("El combate ha terminado");
    this.turn++;
    for (const b of this.allActive()) { b.vol.flinch = false; b.vol.damagedBy = null; }
    type Q = { side: 0 | 1; a: Action; b: Battler | null; prio: number; spe: number; tie: number };
    const queue: Q[] = [];
    for (const [side, acts] of [[0, player], [1, foe]] as const) {
      for (const a of acts) {
        const b = this.sides[side].active[a.slot];
        if (!b || b.mon.hp <= 0) continue;
        let prio = 0;
        if (a.kind === "switch") prio = 7;
        else if (a.kind === "item" || a.kind === "run") prio = 6;
        else prio = this.chosenMove(b, a).priority;
        queue.push({ side, a, b, prio, spe: this.stat(b, "spe"), tie: this.rng.next() });
      }
    }
    queue.sort((x, y) => y.prio - x.prio || y.spe - x.spe || x.tie - y.tie);
    for (const q of queue) {
      if (this.ended) break;
      const b = q.b!;
      if (b.mon.hp <= 0 || !this.sides[q.side].active.includes(b)) continue;
      const a = q.a;
      if (a.kind === "switch") this.doSwitch(q.side, a.slot, a.party);
      else if (a.kind === "item") this.doItem(q.side, a);
      else if (a.kind === "run") this.doRun(b);
      else this.runMove(b, a);
      this.checkEnd();
    }
    if (!this.ended) this.endOfTurn();
    this.checkEnd();
  }

  private chosenMove(b: Battler, a: Extract<Action, { kind: "move" }>): MoveData {
    if (b.vol.locked) return getMove(b.vol.locked.move);
    if (b.vol.charging) return getMove(b.vol.charging);
    const slot = b.mon.moves[a.move];
    if (!slot || slot.pp <= 0 || a.move < 0) return MOVES.get("agotamiento-de-nutrientes")!;
    return getMove(slot.id);
  }

  private doSwitch(side: 0 | 1, slot: number, party: number) {
    const b = this.sides[side].active[slot]!;
    const m = this.sides[side].party[party];
    if (!m || m.hp <= 0 || this.sides[side].active.some((x) => x?.party === party)) return;
    this.emit("withdraw", side === 0 ? `¡${displayName(b.mon)}, vuelve a la Criobola!` : `${this.sides[1].name} retira a ${displayName(b.mon)}.`, { side, slot });
    this.withdraw(b);
    this.sendOut(side, slot, party);
    this.markParticipants();
  }

  private doRun(b: Battler) {
    if (!this.wild) { this.emit("msg", "¡No puedes huir de un combate contra un entrenador!"); return; }
    if (b.vol.trap) { this.emit("msg", `¡${this.name(b)} está atrapado y no puede huir!`); return; }
    this.runAttempts++;
    const foe = this.foesOf(this.refOf(b))[0];
    const a = this.stat(b, "spe"), f = foe ? this.stat(foe, "spe") : 1;
    const odds = Math.floor((a * 128) / Math.max(1, f) + 30 * this.runAttempts) % 256;
    if (a >= f || this.rng.int(0, 255) < odds) {
      this.emit("run", "¡Escapas sin problemas!"); this.ended = true; this.outcome = "run";
    } else this.emit("msg", "¡No has podido escapar!");
  }

  // ---------------------------------------------------------------- objetos
  private doItem(side: 0 | 1, a: Extract<Action, { kind: "item" }>) {
    const inv = side === 0 ? this.inventory : this.foeItems;
    const it = ITEMS.get(a.item);
    if (!it || (inv[a.item] ?? 0) <= 0) { this.emit("msg", "No te quedan."); return; }
    inv[a.item]--;
    this.sides[side].itemsUsed++;
    const who = side === 0 ? this.sides[0].name : this.sides[1].name;
    if (it.kind === "ball") { this.throwBall(it.id, it.ball ?? 1); return; }
    const target = a.party !== undefined ? this.sides[side].party[a.party] : this.sides[side].active[a.slot]?.mon;
    if (!target) return;
    this.emit("item", `${who} usa ${it.name}.`, { side, item: it.id });
    applyItemOutOfBattleLike(target, it.id, (t) => this.emit("msg", t));
    const act = this.sides[side].active.find((b) => b?.mon === target);
    if (act) this.emit("hp", "", { ...this.refOf(act), hp: target.hp, max: target.stats.hp });
  }

  /** Lanzar una Criobola (fórmula de captura de la 4.ª generación). */
  private throwBall(ballId: string, mult: number) {
    const ballName = ITEMS.get(ballId)!.name;
    this.emit("ball", `¡Lanzas una ${ballName}!`, { item: ballId });
    if (!this.wild) { this.emit("msg", "¡No puedes aislar el Microo de otro investigador!"); return; }
    const foes = this.foesOf({ side: 0, slot: 0 });
    if (foes.length !== 1) { this.emit("msg", "¡Hay demasiados Microos en la placa para apuntar bien!"); return; }
    const f = foes[0];
    const res = captureCheck(f.mon, mult, this.rng);
    this.emit("shake", "", { shakes: res.shakes });
    if (res.caught) {
      this.emit("capture", `¡Has aislado a ${displayName(f.mon)}!`, { species: f.mon.species });
      this.captured = f.mon; this.ended = true; this.outcome = "capture"; this.winner = 0;
    } else {
      this.emit("msg", ["¡Oh, no! ¡El Microo se ha liberado!", "¡Vaya! ¡Parecía que lo tenías!", "¡Argh! ¡Casi lo consigues!", "¡Rayos! ¡Por muy poco!"][res.shakes]);
    }
  }

  // ---------------------------------------------------------------- movimientos
  private runMove(b: Battler, a: Extract<Action, { kind: "move" }>) {
    const r = this.refOf(b);
    // Recarga
    if (b.vol.recharge) { b.vol.recharge = false; this.emit("msg", `¡${this.name(b)} necesita recargar energía!`); return; }
    // Estados que impiden actuar
    if (b.mon.status === "slp") {
      if (b.mon.sleepTurns > 0) b.mon.sleepTurns--;
      if (b.mon.sleepTurns > 0) { this.emit("msg", `${this.name(b)} sigue en fase de latencia.`); b.vol.locked = null; return; }
      b.mon.status = null; this.emit("cure", `¡${this.name(b)} sale de la fase de latencia!`, r);
    }
    if (b.mon.status === "frz") {
      if (this.rng.chance(0.2)) { b.mon.status = null; this.emit("cure", `¡${this.name(b)} se ha descongelado!`, r); }
      else { this.emit("msg", `¡${this.name(b)} está congelado a -80 °C!`); return; }
    }
    if (b.vol.flinch) { this.emit("msg", `¡${this.name(b)} retrocedió y no pudo moverse!`); b.vol.charging = null; b.vol.semi = null; return; }
    if (b.vol.confusion > 0) {
      b.vol.confusion--;
      if (b.vol.confusion === 0) this.emit("msg", `¡${this.name(b)} ya no está confuso!`);
      else {
        this.emit("msg", `¡${this.name(b)} está confuso!`);
        if (this.rng.chance(1 / 3)) {
          const dmg = this.rawDamage(b, b, 40, "physical", false);
          this.emit("msg", "¡Está tan confuso que se ha herido a sí mismo!");
          this.applyDamage(b, dmg, null); b.vol.locked = null; b.vol.charging = null; return;
        }
      }
    }
    if (b.mon.status === "par" && this.rng.chance(0.25)) {
      this.emit("msg", `¡${this.name(b)} está paralizado! ¡No se puede mover!`); b.vol.charging = null; b.vol.semi = null; b.vol.locked = null; return;
    }
    // Resistencia Persister (Venganza)
    if (b.vol.bide) {
      b.vol.bide.turns--;
      if (b.vol.bide.turns > 0) { this.emit("msg", `${this.name(b)} está acumulando energía.`); return; }
      const bide = b.vol.bide; b.vol.bide = null;
      this.emit("msg", `¡${this.name(b)} libera la energía acumulada!`);
      const tgt = bide.from ? this.battler(bide.from) : null;
      if (!bide.damage || !tgt || tgt.mon.hp <= 0) { this.emit("msg", "¡Pero ha fallado!"); return; }
      this.applyDamage(tgt, bide.damage * 2, b); return;
    }
    // Obediencia: por encima del nivel que permiten las medallas, el Microo puede ir por libre
    if (r.side === 0 && b.mon.level > this.obeyCap && !b.vol.locked && !b.vol.charging) {
      const roll = Math.floor(this.rng.next() * 256), A = Math.floor(((b.mon.level + this.obeyCap) * roll) / 256);
      if (A >= this.obeyCap) {
        const n = this.name(b), q = this.rng.int(0, 3);
        const otros = b.mon.moves.map((m, i) => i).filter((i) => i !== a.move && b.mon.moves[i].pp > 0);
        if (q === 0 && !b.mon.status) {
          this.emit("msg", `¡${n} no te hace caso y se pone a dormir la siesta!`);
          b.mon.status = "slp"; b.mon.sleepTurns = this.rng.int(1, 3);
          this.emit("status", "", { ...r, status: "slp" });
          return;
        }
        if (q === 1) {
          this.emit("msg", `¡${n} no te hace caso!`);
          this.emit("msg", "¡Se ha liado y se ha herido a sí mismo!");
          this.applyDamage(b, this.rawDamage(b, b, 40, "physical", false), null);
          return;
        }
        if (q === 2 && otros.length) {
          this.emit("msg", `¡${n} no te hace caso y hace lo que le da la gana!`);
          a = { ...a, move: otros[this.rng.int(0, otros.length - 1)] };
        } else {
          this.emit("msg", [`¡${n} pasa de tus órdenes!`, `${n} se hace el remolón…`, `¡${n} está mirando a otra parte!`][this.rng.int(0, 2)]);
          return;
        }
      }
    }
    let move = this.chosenMove(b, a);
    const continuing = !!(b.vol.locked || b.vol.charging);
    // PP
    if (!continuing && move.id !== "agotamiento-de-nutrientes") {
      const slot = b.mon.moves[a.move];
      if (slot) slot.pp = Math.max(0, slot.pp - 1);
    }
    if (move.id === "agotamiento-de-nutrientes" && !continuing) this.emit("msg", `¡A ${this.name(b)} no le quedan movimientos!`);
    this.useMove(b, move, a.target, continuing);
  }

  /** Usa un movimiento (también lo usan Mutagénesis al Azar y Plásmido Espejo). */
  private useMove(b: Battler, move: MoveData, chosen: Ref | undefined, continuing = false, called = false) {
    const r = this.refOf(b);
    // Movimientos de dos turnos
    if (move.charge && b.vol.charging !== move.id) {
      b.vol.charging = move.id;
      this.emit("move", `¡${this.name(b)} usó ${move.name}!`, { ...r, move: move.id });
      const texts: Record<string, string> = {
        solarbeam: "está absorbiendo luz", razorwind: "está generando un aerosol", skyattack: "está rodeado de esporas brillantes",
        skullbash: "se encoge dentro de su cápside", fly: "se dispersa en el aire", dig: "se enquista bajo el sustrato",
      };
      this.emit("msg", `¡${this.name(b)} ${texts[move.orig] ?? "se está preparando"}!`);
      if (move.orig === "skullbash") this.boost(b, { def: 1 }, b);
      if (move.semiInvulnerable) b.vol.semi = move.semiInvulnerable;
      return;
    }
    if (b.vol.charging === move.id) { b.vol.charging = null; b.vol.semi = null; }
    else this.emit("move", `¡${this.name(b)} usó ${move.name}!`, { ...r, move: move.id });
    if (!called) b.vol.lastMove = move.id;
    if (move.orig !== "rage") b.vol.rage = false;

    // Bloqueo (Fase Exponencial / Floración Algal)
    if (move.self?.volatileStatus === "lockedmove" && !b.vol.locked) b.vol.locked = { move: move.id, turns: this.rng.int(2, 3) };

    if (this.specialBefore(b, move, chosen)) return;

    const targets = this.resolveTargets(b, move, chosen);
    if (!targets.length) { this.emit("msg", "¡Pero no hay objetivo!"); return; }
    const spread = targets.filter((t) => t.side !== r.side || move.target !== "self").length > 1;
    let anyHit = false;
    for (const tr of targets) {
      const t = this.battler(tr);
      if (!t || t.mon.hp <= 0) continue;
      if (b.mon.hp <= 0 && move.selfdestruct !== "always") break;
      const hit = this.moveOnTarget(b, t, move, spread);
      anyHit = anyHit || hit;
    }
    // Efectos posteriores
    if (move.selfdestruct === "always" && b.mon.hp > 0) this.faintNow(b, true);
    if (move.recharge && anyHit) b.vol.recharge = true;
    if (!anyHit && move.hasCrashDamage && b.mon.hp > 0) {
      this.emit("msg", `¡${this.name(b)} ha fallado y se ha lesionado!`);
      this.applyDamage(b, Math.floor(b.mon.stats.hp / 2), null);
    }
    if (move.orig === "struggle" && b.mon.hp > 0) {
      this.emit("msg", `¡${this.name(b)} se resiente del esfuerzo!`);
      this.applyDamage(b, Math.max(1, Math.floor(b.mon.stats.hp / 4)), null);
    }
    if (b.vol.locked) {
      b.vol.locked.turns--;
      if (b.vol.locked.turns <= 0 || !anyHit) {
        b.vol.locked = null;
        if (b.mon.hp > 0 && b.vol.confusion === 0) { b.vol.confusion = this.rng.int(2, 5); this.emit("msg", `¡${this.name(b)} se confunde por agotamiento del medio!`); }
      }
    }
    if (move.orig === "rage") b.vol.rage = true;
  }

  private resolveTargets(b: Battler, move: MoveData, chosen?: Ref): Ref[] {
    const r = this.refOf(b);
    const foes = this.foesOf(r).map((x) => this.refOf(x));
    const ally = this.allyOf(r);
    switch (move.target) {
      case "self": case "allySide": case "all": return [r];
      case "allAdjacentFoes": return foes;
      case "allAdjacent": return ally ? [...foes, this.refOf(ally)] : foes;
      case "randomNormal": return foes.length ? [this.rng.pick(foes)] : [];
      case "scripted": return b.vol.damagedBy ? [b.vol.damagedBy.from] : foes.slice(0, 1);
      default: {
        if (chosen) {
          const t = this.battler(chosen);
          if (t && t.mon.hp > 0 && !(chosen.side === r.side && chosen.slot === r.slot)) return [chosen];
          // Si el objetivo cayó, se redirige a otro rival
          if (chosen.side !== r.side && foes.length) return [foes[0]];
        }
        return foes.length ? [this.rng.pick(foes)] : [];
      }
    }
  }

  /** Movimientos con lógica previa a elegir objetivo. Devuelve true si ya terminó. */
  private specialBefore(b: Battler, move: MoveData, chosen?: Ref): boolean {
    const r = this.refOf(b);
    switch (move.special) {
      case "metronome": {
        const pool = [...MOVES.values()].filter((m) => !NO_METRONOME.has(m.orig));
        const m = this.rng.pick(pool);
        this.emit("msg", `¡Mutagénesis al azar! ¡Sale ${m.name}!`);
        this.useMove(b, m, undefined, false, true); return true;
      }
      case "mirrormove": {
        const t = chosen ? this.battler(chosen) : this.foesOf(r)[0];
        const last = t?.vol.lastMove ? getMove(t.vol.lastMove) : null;
        if (!last || last.special === "mirrormove") { this.emit("msg", "¡Pero ha fallado!"); return true; }
        this.useMove(b, last, chosen, false, true); return true;
      }
      case "splash": this.emit("msg", "¡Pero no pasa nada!"); return true;
      case "teleport":
        if (this.wild && r.side === 0) { this.emit("run", `¡${this.name(b)} se transduce fuera de la placa!`); this.ended = true; this.outcome = "run"; }
        else if (this.wild && r.side === 1) { this.emit("run", `¡${this.name(b)} ha huido!`); this.ended = true; this.outcome = "foeFled"; }
        else this.emit("msg", "¡Pero ha fallado!");
        return true;
      case "bide": b.vol.bide = { turns: 2, damage: 0, from: null }; this.emit("msg", `¡${this.name(b)} empieza a acumular energía!`); return true;
      case "haze":
        for (const x of this.allActive()) x.boosts = freshBoosts();
        this.emit("msg", "¡Se han eliminado todos los cambios de características!"); return true;
      case "focusenergy":
        if (b.vol.focusEnergy) { this.emit("msg", "¡Pero ha fallado!"); return true; }
        b.vol.focusEnergy = true; this.emit("msg", `¡${this.name(b)} se está concentrando!`); return true;
      case "reflect": case "lightscreen": {
        const s = this.sides[r.side];
        const key = move.special === "reflect" ? "reflect" : "lightScreen";
        if (s[key] > 0) { this.emit("msg", "¡Pero ha fallado!"); return true; }
        s[key] = 5;
        this.emit("msg", move.special === "reflect" ? "¡La pared de peptidoglicano reduce el daño físico!" : "¡La membrana externa reduce el daño especial!");
        return true;
      }
      case "rest":
        if (b.mon.hp === b.mon.stats.hp) { this.emit("msg", "¡Pero ha fallado!"); return true; }
        b.mon.status = "slp"; b.mon.sleepTurns = 3; b.mon.hp = b.mon.stats.hp; b.mon.toxicCounter = 0; b.vol.confusion = 0;
        this.emit("msg", `¡${this.name(b)} entra en criopreservación y se recupera por completo!`);
        this.emit("hp", "", { ...r, hp: b.mon.hp, max: b.mon.stats.hp }); this.emit("status", "", { ...r, status: "slp" });
        return true;
      case "substitute": {
        const cost = Math.floor(b.mon.stats.hp / 4);
        if (b.vol.substitute > 0 || b.mon.hp <= cost) { this.emit("msg", "¡Pero ha fallado!"); return true; }
        b.mon.hp -= cost; b.vol.substitute = cost;
        this.emit("msg", `¡${this.name(b)} ha creado un señuelo vesicular!`);
        this.emit("hp", "", { ...r, hp: b.mon.hp, max: b.mon.stats.hp }); return true;
      }
      case "conversion": {
        const t = getMove(b.mon.moves[0].id).type;
        b.vol.types = [t]; this.emit("msg", `¡${this.name(b)} cambia su serotipo a ${t}!`); return true;
      }
      case "minimize": case "defensecurl": return false;
    }
    if (move.sideCondition === "mist") {
      const s = this.sides[r.side];
      if (s.mist > 0) { this.emit("msg", "¡Pero ha fallado!"); return true; }
      s.mist = 5; this.emit("msg", "¡El tampón protege a tu equipo de las bajadas de características!"); return true;
    }
    return false;
  }

  /** Aplica un movimiento a un objetivo. Devuelve true si impactó. */
  private moveOnTarget(b: Battler, t: Battler, move: MoveData, spread: boolean): boolean {
    const r = this.refOf(b);
    const self = t === b;
    // Semi-invulnerable
    if (!self && t.vol.semi) {
      const hits = (t.vol.semi === "fly" && ["gust", "thunder", "skyattack"].includes(move.orig)) ||
                   (t.vol.semi === "dig" && ["earthquake", "fissure"].includes(move.orig));
      if (!hits) { this.emit("miss", `¡${this.name(t)} ha esquivado el ataque!`); return false; }
    }
    // Inmunidad de tipo para movimientos de daño
    const eff = move.category === "status" && !move.damage ? 1 : this.effectiveness(move, t);
    if (!self && move.category !== "status" && eff === 0) { this.emit("immune", `No afecta a ${this.name(t)}...`); return false; }
    if (!self && move.orig === "thunderwave" && typeEffectiveness(move.type, this.typesOf(t)) === 0) { this.emit("immune", `No afecta a ${this.name(t)}...`); return false; }
    // OHKO
    if (move.ohko) {
      if (t.mon.level > b.mon.level) { this.emit("msg", "¡No le afecta!"); return false; }
      const acc = 30 + b.mon.level - t.mon.level;
      if (!this.rng.chance(acc / 100)) { this.emit("miss", "¡El ataque ha fallado!"); return false; }
      this.applyDamage(t, t.mon.hp, b, move); this.emit("msg", "¡Golpe fulminante!"); return true;
    }
    // Precisión
    if (!self && move.accuracy !== true) {
      const st = Math.max(-6, Math.min(6, b.boosts.accuracy - t.boosts.evasion));
      const mod = st >= 0 ? (3 + st) / 3 : 3 / (3 - st);
      if (!this.rng.chance((move.accuracy * mod) / 100)) { this.emit("miss", `¡El ataque de ${this.name(b)} ha fallado!`); return false; }
    }
    // animación del movimiento (la interfaz la dibuja; no afecta al combate)
    const fr = this.refOf(b), to = this.refOf(t);
    this.emit("anim", "", { move: move.id, moveType: move.type, category: move.category, side: fr.side, slot: fr.slot, toSide: to.side, toSlot: to.slot });
    // Movimientos de estado
    if (move.category === "status") return this.statusMove(b, t, move);
    // Movimientos de daño
    const hits = this.hitCount(move);
    let total = 0; let landed = 0; let crits = 0;
    for (let i = 0; i < hits; i++) {
      if (t.mon.hp <= 0) break;
      const res = this.computeDamage(b, t, move, spread, eff);
      if (res.dmg === null) { this.emit("msg", "¡Pero ha fallado!"); return false; }
      if (res.crit) crits++;
      // primero el golpe y la bajada de PS; después «crítico» y la eficacia; y por último, si cae, el debilitamiento
      const dealt = this.applyDamage(t, res.dmg, b, move, () => {
        if (res.crit) this.emit("crit", "¡Un golpe crítico!");
        if (hits === 1) this.effMsg(eff);
      });
      total += dealt; landed++;
      if (move.orig === "payday") this.payDay += 5 * b.mon.level;
    }
    if (hits > 1) this.emit("msg", landed === 1 ? "¡Ha golpeado 1 vez!" : `¡Ha golpeado ${landed} veces!`);
    if (hits > 1) this.effMsg(eff);
    // Drenaje y retroceso
    if (move.drain && total > 0 && b.mon.hp > 0) {
      const heal = Math.max(1, Math.floor((total * move.drain[0]) / move.drain[1]));
      this.heal(b, heal); this.emit("msg", `¡${this.name(t)} ha perdido nutrientes!`);
    }
    if (move.recoil && total > 0 && b.mon.hp > 0) {
      this.emit("msg", `¡${this.name(b)} se ha dañado con el retroceso!`);
      this.applyDamage(b, Math.max(1, Math.floor((total * move.recoil[0]) / move.recoil[1])), null);
    }
    // Efectos secundarios
    if (t.mon.hp > 0 && total > 0 && !(t.vol.substitute > 0 && !self)) this.secondary(b, t, move);
    if (move.secondary?.self?.boosts && b.mon.hp > 0 && this.rng.chance(move.secondary.chance / 100)) this.boost(b, move.secondary.self.boosts, b);
    if (move.self?.boosts && b.mon.hp > 0) this.boost(b, move.self.boosts, b);
    // Atrapar
    if (move.volatileStatus === "partiallytrapped" && t.mon.hp > 0 && !t.vol.trap) {
      t.vol.trap = { turns: this.rng.int(4, 5), by: r };
      this.emit("msg", `¡${this.name(t)} ha quedado atrapado!`);
    }
    // Forzar cambio con daño (no hay en esta lista) / Furia
    if (move.special === "dreameater" && total === 0) return false;
    return total > 0 || landed > 0;
  }

  private hitCount(move: MoveData): number {
    if (!move.multihit) return 1;
    if (typeof move.multihit === "number") return move.multihit;
    const x = this.rng.next();
    return x < 3 / 8 ? 2 : x < 6 / 8 ? 3 : x < 7 / 8 ? 4 : 5;
  }

  effectiveness(move: MoveData, t: Battler): number {
    if (move.orig === "struggle") return 1;
    const e = typeEffectiveness(move.type, this.typesOf(t));
    if (move.damage !== undefined || ["superfang", "psywave"].includes(move.special ?? "")) return e === 0 ? 0 : 1;
    return e;
  }

  /** Daño de un golpe. dmg = null si el movimiento falla por sus condiciones. */
  computeDamage(b: Battler, t: Battler, move: MoveData, spread: boolean, eff: number, avg = false): { dmg: number | null; crit: boolean } {
    // Daños fijos y especiales
    if (move.damage === "level") return { dmg: b.mon.level, crit: false };
    if (typeof move.damage === "number") return { dmg: move.damage, crit: false };
    switch (move.special) {
      case "psywave": return { dmg: Math.max(1, Math.floor((b.mon.level * (avg ? 1 : this.rng.int(5, 15))) / 10)), crit: false };
      case "superfang": return { dmg: Math.max(1, Math.floor(t.mon.hp / 2)), crit: false };
      case "counter": {
        const d = b.vol.damagedBy;
        if (!d || d.category !== "physical" || d.amount <= 0) return { dmg: null, crit: false };
        return { dmg: d.amount * 2, crit: false };
      }
      case "dreameater": if (t.mon.status !== "slp") return { dmg: null, crit: false }; break;
    }
    let power = move.power ?? 0;
    if (move.special === "lowkick") power = [20, 40, 60, 80, 100, 120][Math.max(0, Math.min(5, getSpecies(t.mon.species).size - 1))];
    if (move.orig === "earthquake" && t.vol.semi === "dig") power *= 2;
    if (move.orig === "gust" && t.vol.semi === "fly") power *= 2;
    if (power <= 0) return { dmg: null, crit: false };
    let stage = (move.critRatio ?? 1) - 1 + (b.vol.focusEnergy ? 2 : 0);
    const critChance = [1 / 16, 1 / 8, 1 / 4, 1 / 3, 1 / 2][Math.min(4, stage)];
    const crit = !avg && this.rng.chance(critChance);
    const cat = move.category as "physical" | "special";
    let dmg = this.rawDamage(b, t, power, cat, crit, move.type, avg);
    if (spread) dmg = Math.floor(dmg * 0.75);
    dmg = Math.floor(dmg * eff);
    if (!crit) {
      const side = this.sides[this.refOf(t).side];
      if ((cat === "physical" && side.reflect > 0) || (cat === "special" && side.lightScreen > 0)) {
        dmg = Math.floor(dmg * (this.format === "double" ? 2 / 3 : 0.5));
      }
    }
    return { dmg: Math.max(eff > 0 ? 1 : 0, dmg), crit };
  }

  /** Fórmula de daño base (5.ª gen.) con STAB, aleatorio, crítico y quemadura. */
  rawDamage(b: Battler, t: Battler, power: number, cat: "physical" | "special", crit: boolean, type?: TypeName, avg = false): number {
    const A = this.stat(b, cat === "physical" ? "atk" : "spa", crit);
    const D = this.stat(t, cat === "physical" ? "def" : "spd", crit);
    let d = Math.floor(Math.floor((Math.floor((2 * b.mon.level) / 5 + 2) * power * A) / D) / 50) + 2;
    if (crit) d = Math.floor(d * 2);
    d = Math.floor(d * (avg ? 0.925 : this.rng.int(85, 100) / 100));
    if (type && this.typesOf(b).includes(type)) d = Math.floor(d * 1.5);
    if (cat === "physical" && b.mon.status === "brn") d = Math.floor(d / 2);
    return d;
  }

  private applyDamage(t: Battler, amount: number, src: Battler | null, move?: MoveData, after?: () => void): number {
    const r = this.refOf(t);
    if (src && move && t.vol.substitute > 0 && src !== t) {
      const d = Math.min(t.vol.substitute, amount);
      t.vol.substitute -= d;
      this.emit("msg", "¡El señuelo vesicular recibe el daño!");
      if (t.vol.substitute <= 0) { t.vol.substitute = 0; this.emit("msg", `¡El señuelo de ${this.name(t)} se ha roto!`); }
      after?.();
      return d;
    }
    const dealt = Math.min(t.mon.hp, Math.max(0, Math.floor(amount)));
    t.mon.hp -= dealt;
    this.emit("damage", "", { ...r, amount: dealt, hp: t.mon.hp, max: t.mon.stats.hp });
    if (src && move && src !== t) {
      t.vol.damagedBy = { amount: dealt, category: move.category, from: this.refOf(src) };
      if (t.vol.bide) { t.vol.bide.damage += dealt; t.vol.bide.from = this.refOf(src); }
      if (t.vol.rage && t.mon.hp > 0) { this.emit("msg", `¡La Respuesta SOS de ${this.name(t)} aumenta!`); this.boost(t, { atk: 1 }, t); }
      if (t.mon.status === "frz" && move.type === "Anaerobio" && t.mon.hp > 0) { t.mon.status = null; this.emit("cure", `¡${this.name(t)} se ha descongelado!`, r); }
    }
    after?.();
    if (t.mon.hp <= 0) this.faintNow(t);
    return dealt;
  }

  private heal(b: Battler, amount: number) {
    const before = b.mon.hp;
    b.mon.hp = Math.min(b.mon.stats.hp, b.mon.hp + Math.floor(amount));
    if (b.mon.hp !== before) this.emit("hp", "", { ...this.refOf(b), hp: b.mon.hp, max: b.mon.stats.hp });
  }

  private effMsg(eff: number) {
    if (eff > 1) this.emit("effective", "¡Es muy eficaz!");
    else if (eff < 1 && eff > 0) this.emit("effective", "No es muy eficaz...");
  }
  private faintNow(b: Battler, self = false) {
    const r = this.refOf(b);
    if (self) { b.mon.hp = 0; this.emit("damage", "", { ...r, amount: 0, hp: 0, max: b.mon.stats.hp }); }
    b.mon.status = null;
    this.emit("faint", `¡${this.name(b)} se ha debilitado!`, r);
    if (r.side === 1) this.awardExp(b.mon);
    this.withdraw(b);
  }

  // ---------------------------------------------------------------- estados
  private statusMove(b: Battler, t: Battler, move: MoveData): boolean {
    const r = this.refOf(b);
    const self = t === b;
    if (!self && t.vol.substitute > 0 && (move.status || move.volatileStatus || move.boosts)) {
      this.emit("msg", "¡El señuelo bloquea el efecto!"); return false;
    }
    if (move.status) {
      if (POWDER.has(move.orig) && this.typesOf(t).includes("Fotótrofo")) { this.emit("immune", `No afecta a ${this.name(t)}...`); return false; }
      return this.setStatus(t, move.status, true);
    }
    if (move.heal) {
      if (b.mon.hp === b.mon.stats.hp) { this.emit("msg", "¡Pero ha fallado!"); return false; }
      this.heal(b, (b.mon.stats.hp * move.heal[0]) / move.heal[1]); this.emit("msg", `¡${this.name(b)} se ha regenerado!`); return true;
    }
    if (move.volatileStatus === "confusion") {
      if (t.vol.confusion > 0) { this.emit("msg", `¡${this.name(t)} ya está confuso!`); return false; }
      t.vol.confusion = this.rng.int(2, 5); this.emit("msg", `¡${this.name(t)} se ha confundido!`); return true;
    }
    if (move.volatileStatus === "leechseed") {
      if (this.typesOf(t).includes("Fotótrofo") || t.vol.leechSeed) { this.emit("msg", "¡Pero ha fallado!"); return false; }
      t.vol.leechSeed = r; this.emit("msg", `¡Las hifas se extienden sobre ${this.name(t)}!`); return true;
    }
    if (move.volatileStatus === "disable") {
      const last = t.vol.lastMove;
      if (!last || t.vol.disabled || !t.mon.moves.some((m) => m.id === last)) { this.emit("msg", "¡Pero ha fallado!"); return false; }
      t.vol.disabled = { move: last, turns: 4 }; this.emit("msg", `¡Se ha reprimido ${getMove(last).name} de ${this.name(t)}!`); return true;
    }
    switch (move.special) {
      case "mimic": {
        const last = t.vol.lastMove;
        const idx = b.mon.moves.findIndex((m) => m.id === move.id);
        if (!last || idx < 0 || b.mon.moves.some((m) => m.id === last)) { this.emit("msg", "¡Pero ha fallado!"); return false; }
        b.vol.mimic = { index: idx, original: b.mon.moves[idx] };
        b.mon.moves[idx] = { id: last, pp: 5, maxPp: 5 };
        this.emit("msg", `¡${this.name(b)} ha copiado ${getMove(last).name}!`); return true;
      }
      case "transform": {
        if (b.vol.transform || t.vol.transform) { this.emit("msg", "¡Pero ha fallado!"); return false; }
        const ts = t.mon.stats;
        b.vol.transform = { types: [...this.typesOf(t)], stats: { ...ts, hp: b.mon.stats.hp }, moves: b.mon.moves, species: t.mon.species };
        b.mon.moves = t.mon.moves.map((m) => ({ id: m.id, pp: 5, maxPp: 5 }));
        b.boosts = { ...t.boosts };
        this.emit("transform", `¡${this.name(b)} imita a ${displayName(t.mon)}!`, { ...r, species: t.mon.species }); return true;
      }
    }
    if (move.forceSwitch) {
      const tr = this.refOf(t);
      if (this.wild) {
        this.emit("run", `¡${this.name(t)} ha salido despedido de la placa!`);
        this.ended = true; this.outcome = tr.side === 1 ? "foeFled" : "run"; return true;
      }
      const bench = this.sides[tr.side].party.map((m, i) => i).filter((i) => this.sides[tr.side].party[i].hp > 0 && !this.sides[tr.side].active.some((x) => x?.party === i));
      if (!bench.length) { this.emit("msg", "¡Pero ha fallado!"); return false; }
      const p = this.rng.pick(bench);
      this.withdraw(t); this.sendOut(tr.side, tr.slot, p); this.markParticipants(); return true;
    }
    if (move.boosts) {
      const target = move.target === "self" ? b : t;
      return this.boost(target, move.boosts, b);
    }
    this.emit("msg", "¡Pero ha fallado!");
    return false;
  }

  private secondary(b: Battler, t: Battler, move: MoveData) {
    if (move.special === "triattack") {
      if (this.rng.chance(0.2)) this.setStatus(t, this.rng.pick(["brn", "frz", "par"] as StatusCode[]), false);
      return;
    }
    const s = move.secondary;
    if (!s || !this.rng.chance(s.chance / 100)) return;
    if (s.status) this.setStatus(t, s.status, false);
    if (s.volatileStatus === "flinch") t.vol.flinch = true;
    if (s.volatileStatus === "confusion" && t.vol.confusion === 0) { t.vol.confusion = this.rng.int(2, 5); this.emit("msg", `¡${this.name(t)} se ha confundido!`); }
    if (s.boosts) this.boost(t, s.boosts, b);
  }

  /** Aplica un estado alterado (contaminación). */
  setStatus(t: Battler, st: StatusCode, announceFail: boolean): boolean {
    const types = this.typesOf(t);
    const immune =
      ((st === "psn" || st === "tox") && (types.includes("Gram-") || types.includes("Biofilm"))) ||
      (st === "brn" && types.includes("Anaerobio")) ||
      (st === "frz" && types.includes("Ácido-Alc.")) ||
      (st === "par" && types.includes("Espiroqueta"));
    if (t.mon.status || immune || t.mon.hp <= 0) { if (announceFail) this.emit("msg", "¡Pero ha fallado!"); return false; }
    t.mon.status = st;
    if (st === "slp") t.mon.sleepTurns = this.rng.int(2, 4);
    if (st === "tox") t.mon.toxicCounter = 0;
    this.emit("status", `¡${this.name(t)} está ${STATUS_NAME[st]}!`, { ...this.refOf(t), status: st });
    return true;
  }

  boost(t: Battler, boosts: Partial<Record<BoostKey, number>>, src: Battler): boolean {
    let changed = false;
    const tr = this.refOf(t);
    for (const [k, v] of Object.entries(boosts) as [BoostKey, number][]) {
      if (v < 0 && src !== t && this.sides[tr.side].mist > 0) { this.emit("msg", `¡El tampón protege a ${this.name(t)}!`); continue; }
      const before = t.boosts[k];
      t.boosts[k] = Math.max(-6, Math.min(6, before + v));
      if (t.boosts[k] === before) { this.emit("msg", `¡${BOOST_NAME[k]} de ${this.name(t)} no puede ${v > 0 ? "subir" : "bajar"} más!`); continue; }
      changed = true;
      const how = Math.abs(v) >= 2 ? (v > 0 ? "ha subido mucho" : "ha bajado mucho") : v > 0 ? "ha subido" : "ha bajado";
      this.emit("boost", `¡${BOOST_NAME[k]} de ${this.name(t)} ${how}!`, { ...tr, stat: k, amount: v });
    }
    return changed;
  }

  // ---------------------------------------------------------------- fin de turno
  private endOfTurn() {
    const order = this.allActive().sort((x, y) => this.stat(y, "spe") - this.stat(x, "spe"));
    for (const b of order) {
      if (b.mon.hp <= 0 || this.ended) continue;
      const max = b.mon.stats.hp;
      if (b.vol.leechSeed) {
        const src = this.battler(b.vol.leechSeed);
        const d = Math.max(1, Math.floor(max / 8));
        this.emit("msg", `¡El micelio drena nutrientes de ${this.name(b)}!`);
        const dealt = this.applyDamage(b, d, null);
        if (src && src.mon.hp > 0) this.heal(src, dealt);
        if (b.mon.hp <= 0) continue;
      }
      if (b.mon.status === "brn") { this.emit("msg", `¡${this.name(b)} sufre por la desnaturalización!`); this.applyDamage(b, Math.max(1, Math.floor(max / 16)), null); }
      else if (b.mon.status === "psn") { this.emit("msg", `¡La toxina daña a ${this.name(b)}!`); this.applyDamage(b, Math.max(1, Math.floor(max / 8)), null); }
      else if (b.mon.status === "tox") { b.mon.toxicCounter++; this.emit("msg", `¡La exotoxina daña a ${this.name(b)}!`); this.applyDamage(b, Math.max(1, Math.floor((max * b.mon.toxicCounter) / 16)), null); }
      if (b.mon.hp <= 0) continue;
      if (b.vol.trap) {
        b.vol.trap.turns--;
        if (b.vol.trap.turns <= 0 || !this.battler(b.vol.trap.by)) { b.vol.trap = null; this.emit("msg", `¡${this.name(b)} se ha liberado!`); }
        else { this.emit("msg", `¡${this.name(b)} sufre el atrapamiento!`); this.applyDamage(b, Math.max(1, Math.floor(max / 8)), null); }
      }
      if (b.vol.disabled && --b.vol.disabled.turns <= 0) { b.vol.disabled = null; this.emit("msg", `¡${this.name(b)} ya puede usar todos sus movimientos!`); }
    }
    for (const s of this.sides) {
      if (s.reflect > 0 && --s.reflect === 0) this.emit("msg", "La pared de peptidoglicano se ha disipado.");
      if (s.lightScreen > 0 && --s.lightScreen === 0) this.emit("msg", "La membrana externa se ha disipado.");
      if (s.mist > 0) s.mist--;
    }
  }

  private checkEnd() {
    if (this.ended && this.outcome) { this.cleanup(); this.finishEvolutions(); return; }
    const alive = [this.usable(0).length, this.usable(1).length];
    if (alive[1] === 0) { this.ended = true; this.winner = 0; this.outcome = "win"; this.emit("end", this.wild ? "" : `¡Has vencido a ${this.sides[1].name}!`, { winner: 0 }); }
    else if (alive[0] === 0) { this.ended = true; this.winner = 1; this.outcome = "lose"; this.emit("end", "¡No te quedan Microos en condiciones de luchar!", { winner: 1 }); }
    if (this.ended) { this.cleanup(); this.finishEvolutions(); }
  }
  /** Deshace transformaciones y movimientos copiados al acabar. */
  private cleanup() {
    for (const s of this.sides) for (const b of s.active) {
      if (!b) continue;
      if (b.vol.transform) b.mon.moves = b.vol.transform.moves;
      if (b.vol.mimic) b.mon.moves[b.vol.mimic.index] = b.vol.mimic.original;
      b.vol.transform = null; b.vol.mimic = null;
    }
  }
  evolutionsPending: { uid: number; to: string }[] = [];
  private finishEvolutions() {
    if (this.evolutionsPending.length) return;
    for (const m of this.sides[0].party) {
      if (m.hp <= 0) continue;
      const to = levelEvolution(m);
      if (to && this.levelUps.some((l) => l.uid === m.uid)) this.evolutionsPending.push({ uid: m.uid, to });
    }
  }

  // ---------------------------------------------------------------- experiencia
  /** Difusión de Nutrientes: 100 % a los participantes y 50 % al resto del equipo. */
  private awardExp(fainted: Microo) {
    const sp = getSpecies(fainted.species);
    const parts = this.sides[0].participants.get(fainted.uid) ?? new Set<number>();
    const a = this.wild ? 1 : 1.5;
    const mult = this.difficulty === "facil" ? 1.2 : 1;
    for (const m of this.sides[0].party) {
      if (m.hp <= 0 || m.level >= this.levelCap) continue;
      const L = fainted.level, Lp = m.level;
      const base = ((a * sp.expYield * L) / 5) * Math.pow((2 * L + 10) / (L + Lp + 10), 2.5) + 1;
      const share = parts.has(m.uid) ? 1 : 0.5;
      const amount = Math.max(1, Math.floor(base * share * mult));
      this.emit("exp", `¡${displayName(m)} ha ganado ${amount} puntos de experiencia!`, { uid: m.uid, amount });
      for (const res of gainExp(m, amount, this.levelCap)) {
        this.levelUps.push({ uid: m.uid, result: res });
        this.emit("levelup", `¡${displayName(m)} ha subido al nivel ${res.newLevel}!`, { uid: m.uid, level: res.newLevel });
        for (const l of res.learned) this.emit("learn", `¡${displayName(m)} ha aprendido ${getMove(l).name}!`, { uid: m.uid, move: l });
        for (const l of res.pending) this.emit("learnPending", `${displayName(m)} quiere aprender ${getMove(l).name}.`, { uid: m.uid, move: l });
      }
      const act = this.sides[0].active.find((x) => x?.mon === m);
      if (act) this.emit("hp", "", { ...this.refOf(act), hp: m.hp, max: m.stats.hp });
    }
  }
}

// ---------------------------------------------------------------- funciones sueltas

/** Comprobación de captura (4.ª gen.): devuelve sacudidas (0-3) y si se aísla. */
export function captureCheck(m: Microo, ball: number, rng: Rng): { caught: boolean; shakes: number } {
  if (ball >= 255) return { caught: true, shakes: 3 };
  const sp = getSpecies(m.species);
  const statusBonus = m.status === "slp" || m.status === "frz" ? 2 : m.status ? 1.5 : 1;
  const a = Math.floor((((3 * m.stats.hp - 2 * m.hp) * sp.catchRate * ball) / (3 * m.stats.hp)) * statusBonus);
  if (a >= 255) return { caught: true, shakes: 3 };
  const b = Math.floor(1048560 / Math.sqrt(Math.sqrt(16711680 / Math.max(1, a))));
  let shakes = 0;
  for (let i = 0; i < 4; i++) { if (rng.int(0, 65535) >= b) return { caught: false, shakes: Math.min(3, shakes) }; shakes++; }
  return { caught: true, shakes: 3 };
}

/** Efecto de un objeto curativo sobre un Microo (dentro o fuera de combate). */
export function applyItemOutOfBattleLike(m: Microo, itemId: string, say: (t: string) => void = () => {}): boolean {
  const it = ITEMS.get(itemId);
  if (!it) return false;
  const n = displayName(m);
  switch (it.kind) {
    case "heal":
      if (m.hp <= 0 || m.hp >= m.stats.hp) { say("No tendría ningún efecto."); return false; }
      { const before = m.hp; m.hp = Math.min(m.stats.hp, m.hp + (it.heal ?? 0)); say(`${n} ha recuperado ${m.hp - before} PS.`); }
      return true;
    case "cure":
      if (!m.status || m.hp <= 0) { say("No tendría ningún efecto."); return false; }
      m.status = null; m.sleepTurns = 0; m.toxicCounter = 0; say(`${n} está libre de contaminación.`); return true;
    case "revive":
      if (m.hp > 0) { say("No tendría ningún efecto."); return false; }
      m.hp = Math.max(1, Math.floor(m.stats.hp * (it.revive ?? 0.5))); say(`¡${n} se ha reanimado!`); return true;
    case "pp":
      for (const s of m.moves) s.pp = Math.min(s.maxPp, s.pp + (it.pp ?? 10));
      say(`Se han recuperado los PP de ${n}.`); return true;
    default: return false;
  }
}

export { STAT_KEYS };
