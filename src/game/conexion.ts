// Club de Conexión: intercambios y combates entre dos jugadores que tienen abierta la página publicada a la vez.
// Usa la capacidad «room» de la página (mensajes en tiempo real, nada se guarda en ningún servidor). Cada jugador
// conserva su partida en su navegador: solo viajan el Microo que se cambia y las órdenes del combate.
//
// Vestíbulo: cada jugador del Club anuncia su presencia (nombre, edición, avatar). Una invitación («inv») lleva un
// código; si la otra persona acepta («resp»), los dos entran en una sala con ese nombre y solo se oyen entre ellos.
// Combate: los dos ejecutan el mismo combate con la misma semilla (el invitado con `mirror`, ver engine/battle.ts);
// cada turno se envían sus órdenes y una huella del estado para detectar cualquier desincronización.
import type { Game, Overlay } from "./game";
import { Gfx, W, H, TB } from "./gfx";
import { Battle, SPECIES, MOVES, fullHeal, conjugationEvolution, displayName, nuevoUid, type Microo } from "../engine";
import { saveGame, markCaught } from "./state";
import { ed, type Edicion } from "./edicion";
import { partyMenu } from "./scenes/menus";
import { BattleScene, evolutionSequence, battleTrack } from "./scenes/battle";
import { PetriSweep } from "./scenes/transiciones";
import { audio } from "./audio";
import type { Overworld } from "./scenes/overworld";

/** Temas de la sala (deben coincidir con los declarados al publicar: «capabilities.room.topics»). */
export const TEMAS = ["inv", "resp", "of", "ok", "no", "eq", "ac", "rp", "sal"] as const;
type Tema = (typeof TEMAS)[number];

type Msg = { topic: string; data?: any; peer: string; isMe: boolean; sameTab: boolean };
type Peer = { peer: string; isMe: boolean; sameTab: boolean; presence: Record<string, any> };
type Sala = {
  emit(t: string, d?: unknown): Promise<void>; on(t: string, f: (m: Msg) => void): () => void;
  presence(p: Record<string, unknown>): Promise<void>; peers(): readonly Peer[];
  onPeers(f: (c: { peers: readonly Peer[] }) => void): () => void; connected(): boolean;
  join(n: string): Promise<Sala>; leave?(): Promise<void>;
};

let sala: Sala | null | undefined;
/** La sala de la página publicada, o null (abierta en local, sin conexión o sin permiso). */
export async function abrirSala(): Promise<Sala | null> {
  if (sala !== undefined) return sala;
  // window.claude lo pone el visor de claude.ai; puede tardar un poco en aparecer
  let cl = (window as any).claude;
  for (let i = 0; i < 30 && !cl?.use; i++) { await new Promise((r) => setTimeout(r, 100)); cl = (window as any).claude; }
  if (!cl?.use) { sala = null; return null; }
  try { sala = (await cl.use("room")) as Sala | null; } catch { sala = null; }
  return sala ?? null;
}

const codigo = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const huellaMon = (m: Microo) => { let h = 0; for (const c of JSON.stringify(m)) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36); };

/** Buzón: guarda los mensajes de otros que llegan por una sala y deja esperarlos sin bloquear la pantalla. */
class Buzon {
  cola: Msg[] = []; offs: (() => void)[] = [];
  constructor(public s: Sala, temas: readonly string[]) {
    for (const t of temas) this.offs.push(s.on(t, (m) => { if (!m.isMe) this.cola.push(m); }));
  }
  tomar(f: (m: Msg) => boolean): Msg | null {
    const i = this.cola.findIndex(f);
    return i < 0 ? null : this.cola.splice(i, 1)[0];
  }
  cerrar() { for (const o of this.offs) o(); this.offs = []; }
}

/** Enlace con la otra persona dentro de su sala privada (lo usan el intercambio y el combate). */
export class Enlace {
  buzon: Buzon; perdido = false; offPeers: () => void;
  /** Por qué terminó la última espera sin respuesta: la otra persona se fue (o se rindió) o se perdió la conexión. */
  motivo: "sal" | "rinde" | "perdido" | "no" | null = null;
  constructor(public s: Sala, public rival: string, public rivalAvatar: string, public host: boolean, public otro: string) {
    this.buzon = new Buzon(s, TEMAS);
    // se da por perdida la conexión si la otra persona sale de la sala después de haber entrado
    let estuvo = false;
    this.offPeers = s.onPeers(({ peers }) => { if (peers.some((p) => p.peer === otro)) estuvo = true; else if (estuvo) this.perdido = true; });
  }
  enviar(t: Tema, d: unknown) { void this.s.emit(t, d); }
  /** Espera a que la otra persona haya entrado en la sala privada (antes no oiría nada de lo que se envía). */
  async juntos(game: Game): Promise<boolean> {
    let t = 0;
    const r = await game.run<boolean | null>(new Esperando(`Conectando con ${this.rival}`, () => {
      if (this.s.peers().some((p) => p.peer === this.otro && !p.isMe)) return true;
      return ++t > 60 * 15 ? false : undefined;
    }, true));
    return !!r;
  }
  /** Espera un mensaje que cumpla la condición. null si se pierde la conexión, la otra persona abandona o se
   *  cancela con B (si se permite). */
  async esperar(game: Game, t: Tema, cond: (d: any) => boolean = () => true, texto = `Esperando a ${this.rival}…`, cancelable = true): Promise<any | null> {
    const r = await game.run<Msg | "no" | null>(new Esperando(texto, () => {
      const sal = this.buzon.tomar((m) => m.topic === "sal");
      if (sal) { this.motivo = sal.data?.rinde ? "rinde" : "sal"; return "no"; }
      if (t !== "no" && this.buzon.tomar((m) => m.topic === "no")) { this.motivo = "no"; return "no"; }
      const m = this.buzon.tomar((m) => m.topic === t && cond(m.data));
      if (m) return m;
      if (this.perdido || !this.s.connected()) { this.motivo = "perdido"; return "no"; }
      return undefined;
    }, cancelable));
    if (!r || r === "no") return null;
    return (r as Msg).data;
  }
  async cerrar() { this.offPeers(); this.buzon.cerrar(); try { await this.s.leave?.(); } catch { /* ya fuera */ } }
}

/** Mensaje de espera en la caja de texto; se cierra cuando `listo` devuelve algo o (si se puede) con B. */
class Esperando implements Overlay {
  t = 0; result: unknown = null;
  constructor(public texto: string, public listo: () => unknown, public cancelable: boolean) {}
  update(game: Game) {
    this.t++;
    const r = this.listo();
    if (r !== undefined) { this.result = r; return true; }
    if (this.cancelable && game.input.pressed("b")) { this.result = null; return true; }
    return false;
  }
  draw(g: Gfx) {
    g.frame(0, TB, W, H - TB, "oscuro");
    g.text(this.texto + ".".repeat(Math.floor(this.t / 20) % 4), 10, TB + 10, "white");
    if (this.cancelable) g.text("B: cancelar", 10, TB + 28, "gray", false);
  }
}

// ---------------------------------------------------------------- vestíbulo del Club
interface Persona { peer: string; nombre: string; edicion: Edicion; avatar: string }
const NOM_ED: Record<Edicion, string> = { escherichia: "Ed. Escherichia", salmonella: "Ed. Salmonella" };

/** Lista de quién está en el Club. Devuelve la persona elegida, una invitación recibida o null (B). */
class ListaClub implements Overlay {
  sel = 0; t = 0; result: { persona?: Persona; inv?: Msg } | null = null;
  constructor(public s: Sala, public buzon: Buzon) {}
  gente(): Persona[] {
    return this.s.peers().filter((p) => !p.isMe && p.presence?.club).map((p) => ({ peer: p.peer, nombre: String(p.presence.n ?? "¿?").slice(0, 12), edicion: p.presence.e === "salmonella" ? "salmonella" : "escherichia", avatar: p.presence.a === "chica" ? "chica" : "chico" }));
  }
  update(game: Game) {
    this.t++;
    const inv = this.buzon.tomar((m) => m.topic === "inv");
    if (inv) { this.result = { inv }; return true; }
    const g = this.gente(), i = game.input;
    if (this.sel >= g.length) this.sel = Math.max(0, g.length - 1);
    if (i.pressed("up") && this.sel > 0) this.sel--;
    if (i.pressed("down") && this.sel < g.length - 1) this.sel++;
    if (i.pressed("a") && g.length) { this.result = { persona: g[this.sel] }; return true; }
    if (i.pressed("b")) { this.result = null; return true; }
    return false;
  }
  draw(g: Gfx) {
    g.frame(8, 8, W - 16, H - 16, "oscuro");
    g.text("Club de Conexión", 18, 16, "white");
    const gente = this.gente();
    if (!this.s.connected()) g.text("Conectando…", 18, 40, "gray");
    else if (!gente.length) {
      g.text("No hay nadie más en el Club.", 18, 40, "gray");
      g.text("Pide a tu amigo que abra esta página", 18, 58, "gray", false);
      g.text("y hable con la técnica del Club.", 18, 70, "gray", false);
    }
    gente.slice(0, 7).forEach((p, k) => {
      const y = 38 + k * 18, on = k === this.sel;
      if (on) g.round(14, y - 3, W - 28, 16, 4, "#3a4a78");
      g.text(p.nombre, 22, y, "white");
      g.text(NOM_ED[p.edicion], W - 22 - g.measure(NOM_ED[p.edicion]), y + 1, p.edicion === "salmonella" ? "blue" : "orange", false);
    });
    g.text("A: invitar · B: salir", 18, H - 24, "gray", false);
  }
}

/** Script de la técnica del Club (Incubadoras). */
export async function clubConexion(game: Game, world: Overworld) {
  await game.say("Técnica del Club: ¡Bienvenid{o} al Club de Conexión! Aquí puedes intercambiar Microos o combatir con otra persona que tenga el juego abierto ahora mismo.");
  const s = await abrirSala();
  if (!s) { await game.say("Técnica del Club: Vaya… La conexión solo funciona en la página publicada del juego, y con permiso para interactuar con ella."); return; }
  const st = game.state;
  const yo = { n: st.name, e: ed(), a: st.avatar };
  await s.presence({ club: 1, ...yo });
  const buzon = new Buzon(s, ["inv", "resp"]);
  try {
    for (;;) {
      const r = await game.run<{ persona?: Persona; inv?: Msg } | null>(new ListaClub(s, buzon));
      if (!r) return;
      if (r.inv) {
        // invitación recibida
        const d = r.inv.data ?? {};
        const de = String(d.n ?? "Alguien").slice(0, 12), tipo = d.tipo === "combate" ? "combate" : "intercambio";
        const ok = await game.yesno(`${de} te invita a un ${tipo === "combate" ? "combate" : "intercambio"}. ¿Aceptas?`);
        if (!ok) { void s.emit("resp", { to: r.inv.peer, id: d.id, ok }); continue; }
        // primero se entra en la sala privada y se abre el buzón; luego se responde
        const sub = await s.join(`m-${String(d.id).replace(/[^a-z0-9]/g, "").slice(0, 40)}`);
        const en = new Enlace(sub, de, d.a === "chica" ? "chica" : "chico", false, r.inv.peer);
        void s.emit("resp", { to: r.inv.peer, id: d.id, ok });
        await sesion(game, world, en, tipo);
        continue;
      }
      const p = r.persona!;
      const c = await game.choose(["INTERCAMBIAR", "COMBATIR", "VOLVER"], { prompt: `¿Qué quieres hacer con ${p.nombre}?`, cancel: 2 });
      if (c === 2 || c < 0) continue;
      const tipo = c === 0 ? "intercambio" : "combate";
      const id = codigo();
      const sub = await s.join(`m-${id}`);       // se entra antes, para no perder sus primeros mensajes
      const en = new Enlace(sub, p.nombre, p.avatar, true, p.peer);
      void s.emit("inv", { to: p.peer, id, tipo, ...yo });
      const resp = await game.run<Msg | null>(new Esperando(`Esperando a que ${p.nombre} acepte`, () => buzon.tomar((m) => m.topic === "resp" && m.data?.id === id && m.peer === p.peer) ?? (s.peers().some((x) => x.peer === p.peer) ? undefined : null), true));
      if (!resp || !resp.data?.ok) { await game.say(resp ? `${p.nombre} no puede ahora.` : "Invitación cancelada."); await en.cerrar(); continue; }
      await sesion(game, world, en, tipo);
    }
  } finally {
    buzon.cerrar();
    void s.presence({ club: null, n: null, e: null, a: null });
  }
}

async function sesion(game: Game, world: Overworld, en: Enlace, tipo: "intercambio" | "combate") {
  try {
    if (!(await en.juntos(game))) { await game.say(`No se ha podido conectar con ${en.rival}.`); return; }
    if (tipo === "intercambio") await intercambio(game, en);
    else await combate(game, world, en);
  } finally { en.enviar("sal", {}); await en.cerrar(); }
}

// ---------------------------------------------------------------- intercambio
/** Comprueba que un Microo recibido es válido (especie y movimientos existentes, valores con sentido). */
function valido(m: any): m is Microo {
  return m && typeof m === "object" && SPECIES.has(m.species) && Number.isInteger(m.level) && m.level >= 1 && m.level <= 100
    && Array.isArray(m.moves) && m.moves.length >= 1 && m.moves.length <= 4 && m.moves.every((x: any) => MOVES.has(x?.id)) && m.stats && typeof m.hp === "number";
}

async function intercambio(game: Game, en: Enlace) {
  const st = game.state;
  if (st.party.length < 2) { await game.say("Necesitas al menos dos Microos en el equipo para intercambiar uno."); return; }
  const i = await partyMenu(game, { mode: "item", prompt: "¿Qué Microo ofreces?" });
  if (i < 0) return;
  const mio = st.party[i], hMio = huellaMon(mio);
  en.enviar("of", { mon: mio, h: hMio });
  const of = await en.esperar(game, "of", (d) => valido(d?.mon), `Esperando la oferta de ${en.rival}`);
  if (!of) { await game.say("El intercambio se ha cancelado."); return; }
  const suyo = of.mon as Microo, hSuyo = String(of.h);
  const nomSp = SPECIES.get(suyo.species)!.name;
  await game.say(`${en.rival} ofrece a ${displayName(suyo)} (${nomSp}, Nv ${suyo.level}). Tú das a ${displayName(mio)} (Nv ${mio.level}).`, { keep: true });
  const c = await game.choose(["CAMBIAR", "CANCELAR"], { cancel: 1 });
  game.popKept();
  if (c !== 0) { en.enviar("no", {}); await game.say("Has cancelado el intercambio."); return; }
  en.enviar("ok", { mio: hMio, suyo: hSuyo });
  const ok = await en.esperar(game, "ok", (d) => d?.mio === hSuyo && d?.suyo === hMio, `Esperando la confirmación de ${en.rival}`, false);
  if (!ok) { await game.say(`${en.rival} ha cancelado el intercambio.`); return; }
  // se cambian: el recibido entra con un uid nuevo y se guarda la partida enseguida
  const k = st.party.indexOf(mio);
  if (k < 0) return;
  const nuevo: Microo = { ...JSON.parse(JSON.stringify(suyo)), uid: nuevoUid() };
  nuevo.originalTrainer ??= en.rival;
  st.party.splice(k, 1, nuevo);
  markCaught(st, nuevo.species);
  saveGame(st);
  audio.sfx("ball");
  await game.say(`¡Adiós, ${displayName(mio)}! ¡Has recibido a ${displayName(nuevo)} de ${en.rival}!`);
  // como en la Estación de Conjugación: algunos Microos solo evolucionan al cambiar de investigador
  const to = conjugationEvolution(nuevo);
  if (to) { await evolutionSequence(game, nuevo, to); saveGame(st); }
}

// ---------------------------------------------------------------- combate
async function combate(game: Game, world: Overworld, en: Enlace) {
  const st = game.state;
  // cada uno envía su equipo (curado) Microo a Microo (cada mensaje cabe de sobra en los 4 KB)
  const mios = st.party.map((m) => { const c: Microo = JSON.parse(JSON.stringify(m)); fullHeal(c); return c; });
  const semilla = (Math.random() * 2 ** 31) >>> 0;
  en.enviar("eq", { n: mios.length, semilla, nombre: st.name, avatar: st.avatar });
  mios.forEach((m, i) => en.enviar("eq", { i, mon: m }));
  const cab = await en.esperar(game, "eq", (d) => typeof d?.n === "number" && d.n >= 1 && d.n <= 6, `Esperando el equipo de ${en.rival}`);
  if (!cab) { await game.say("El combate se ha cancelado."); return; }
  const suyos: Microo[] = [];
  for (let i = 0; i < cab.n; i++) {
    const d = await en.esperar(game, "eq", (x) => x?.i === i && valido(x.mon), `Esperando el equipo de ${en.rival}`);
    if (!d) { await game.say("El combate se ha cancelado."); return; }
    suyos.push(d.mon);
  }
  const seed = (semilla ^ (cab.semilla >>> 0)) >>> 0 || 1;
  // el equipo de la partida no se toca: durante el combate el jugador maneja copias curadas
  const original = st.party;
  st.party = mios;
  try {
    const battle = new Battle({ player: mios, foe: suyos, seed, link: true, mirror: !en.host, playerName: st.name, foeName: en.rival, wild: false, difficulty: "normal" });
    const trainer = { name: en.rival, clase: en.rivalAvatar === "chica" ? "Investigadora" : "Investigador", portrait: en.rivalAvatar === "chica" ? "protagonista-chica" : "protagonista" };
    audio.music(battleTrack({ wild: false, trainer }));
    await game.run(new PetriSweep(true));
    game.blackout = 1;
    const prev = game.scene;
    const scene = new BattleScene(game, { battle, wild: false, trainer, env: world.map.env, link: en });
    game.scene = scene;
    await game.wait(6);
    await game.run(new PetriSweep(false));
    game.blackout = 0;
    await scene.run();
    await game.fade(true, 14);
    game.scene = prev;
    audio.music(world.map.music ?? "ruta");
    await game.fade(false, 10);
  } finally {
    st.party = original;
  }
}

