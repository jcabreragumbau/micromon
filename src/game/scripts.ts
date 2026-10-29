// Guiones de historia, conversaciones y combates.
import type { Game } from "./game";
import { audio } from "./audio";
import { curiosidadPara } from "./curiosidades";
import type { Overworld, NpcState } from "./scenes/overworld";
import { BattleScene, type BattleSetup, type BattleOutcome } from "./scenes/battle";
import { shopMenu, congeladorMenu, partyMenu } from "./scenes/menus";
import { evolutionSequence } from "./scenes/battle";
import { SlotMachine, fichas } from "./scenes/casino";
import { HallOfFame, Credits } from "./scenes/creditos";
import { saveGame } from "./state";
import { Battle, Rng, createMicroo, trainerParty, fullHeal, getSpecies, SPECIES, TRAINERS, ITEMS, conjugationEvolution, type Microo } from "../engine";
import { addItem, markCaught, markSeen } from "./state";
import { MAPS } from "./world/maps";

const COUNTER: Record<string, string> = { synechoc: "butyricum", butyricum: "paramec", paramec: "synechoc" };

async function darMascara(game: Game) {
  await game.say("Dra. Gajú: Por cierto, toma esto. En la Ruta 4 hay una cueva sin oxígeno llena de metanógenas.");
  addItem(game.state, "mascara-de-gases");
  await game.say("¡{nombre} ha recibido la MÁSCARA DE GASES!");
  await game.say("Dra. Gajú: Con ella podrás entrar en la Cueva Anaeróbica. Y el Túnel Endospórico está a oscuras: ¡usa Quorum Sensing Lux!");
}
/** Regala un Microo al jugador (al equipo o al Congelador si está lleno). */
async function giveMicroo(game: Game, sp: string, lv: number) {
  const m = createMicroo(sp, lv, { rng: rng(game) });
  m.originalTrainer = game.state.name;
  markSeen(game.state, sp); markCaught(game.state, sp);
  if (game.state.party.length < 6) game.state.party.push(m); else game.state.box.push(m);
  await game.say(`¡{nombre} ha recibido a ${getSpecies(sp).name}!`);
  if (game.state.party.at(-1) !== m) await game.say(`${getSpecies(sp).name} se ha enviado al Congelador de cepas.`);
}
const MAPS_EXIST = (id: string) => !!MAPS[id];
const displayNameOf = (m: Microo) => m.nickname ?? getSpecies(m.species).name;

// ---------------------------------------------------------------- combates
export { battleFor };
export async function startBattle(game: Game, world: Overworld, setup: Omit<BattleSetup, "env">): Promise<BattleOutcome> {
  const prev = game.scene;
  for (let i = 0; i < 3; i++) { game.blackout = 0.8; await game.wait(4); game.blackout = 0; await game.wait(4); }
  await game.fade(true, 14);
  const scene = new BattleScene(game, { ...setup, env: world.map.env });
  game.scene = scene;
  await game.fade(false, 10);
  const out = await scene.run();
  await game.fade(true, 14);
  game.scene = prev;
  audio.music(world.map.music ?? "ruta");
  await game.fade(false, 10);
  return out;
}
function rng(game: Game) { return new Rng((game.state.seed + game.state.playFrames) >>> 0); }
function battleFor(game: Game, foe: Microo[], wild: boolean, name?: string, foeItems?: Record<string, number>, format: "single" | "double" = "single") {
  return new Battle({ player: game.state.party, foe, wild, format, seed: (game.state.seed ^ game.state.playFrames) >>> 0,
    difficulty: game.state.difficulty, playerName: game.state.name, foeName: name, foeItems,
    inventory: {} });
}

export async function wildBattle(game: Game, world: Overworld, sp: string, lv: number): Promise<BattleOutcome["outcome"]> {
  const m = createMicroo(sp, lv, { rng: rng(game) });
  markSeen(game.state, sp);
  if (world.map.safari) {
    await startBattle(game, world, { battle: battleFor(game, [m], true), wild: true, safari: true });
    if (Number(game.state.flags.safariBalls ?? 0) <= 0) await SCRIPTS.finReserva(game, world);
    return "run";
  }
  const out = await startBattle(game, world, { battle: battleFor(game, [m], true), wild: true });
  if (out.outcome === "lose") await whiteout(game, world);
  return out.outcome;
}

export async function trainerBattle(game: Game, world: Overworld, n: NpcState) {
  const t = n.def.trainer!;
  await game.say(`${t.clase} ${t.name}: ${t.intro}`);
  const r = rng(game);
  const foe = t.team.map(([sp, lv, mv]) => createMicroo(sp, lv, { rng: r, moves: mv }));
  const out = await startBattle(game, world, { battle: battleFor(game, foe, false, `${t.clase} ${t.name}`), wild: false,
    trainer: { name: t.name, clase: t.clase, portrait: t.portrait ?? n.def.sprite, lose: t.lose, money: t.money } });
  if (out.outcome === "lose") { await whiteout(game, world); return; }
  game.state.flags[`entrenador:${n.def.id}`] = true;
}

export async function whiteout(game: Game, world: Overworld) {
  const s = game.state;
  const lost = Math.floor(s.money / 2);
  s.money -= lost;
  await game.say(`¡A {nombre} no le quedan Microos en condiciones de luchar! Pierde ${lost} créditos…`);
  await game.say("{nombre} vuelve corriendo a la última Incubadora…");
  await game.fade(true, 20);
  for (const m of s.party) fullHeal(m);
  world.load(s.lastHeal.map, s.lastHeal.x, s.lastHeal.y, 1);
  await game.fade(false, 20);
}

// ---------------------------------------------------------------- conversaciones
export async function talkNpc(game: Game, world: Overworld, n: NpcState) {
  const d = n.def;
  if (d.trainer) {
    if (game.state.flags[`entrenador:${d.id}`]) {
      const k = CHARLAS.get(d.id) ?? 0; CHARLAS.set(d.id, k + 1);
      if (k % 2 === 0 || !d.trainer.after || d.trainer.leader) await game.say(`${d.trainer.clase} ${d.trainer.name}: ${d.trainer.after}`);
      else await game.say(`${d.trainer.name}: Por cierto, ¿sabías que…? ${curiosidadPara(d.id, k)}`);
    }
    else await trainerBattle(game, world, n);
    return;
  }
  if (d.script) return runScript(game, world, d.script, n);
  const lines = Array.isArray(d.talk) ? d.talk : d.talk ? [d.talk] : [];
  // Primera vez: su frase. Después: una curiosidad de microbiología distinta cada vez.
  const k = (CHARLAS.get(d.id) ?? 0);
  CHARLAS.set(d.id, k + 1);
  if (k === 0 || !lines.length) { for (const l of lines) await game.say(l); if (lines.length) return; }
  await game.say(`¿Sabías que…? ${curiosidadPara(d.id, k)}`);
}
const CHARLAS = new Map<string, number>();

export async function runScript(game: Game, world: Overworld, name: string, npc?: NpcState): Promise<void> {
  const [key, arg] = name.split(":");
  const f = SCRIPTS[key];
  if (!f) { await game.say(`(Guion pendiente: ${name})`); return; }
  await f(game, world, arg, npc);
}

type Script = (game: Game, world: Overworld, arg?: string, npc?: NpcState) => Promise<void>;
const S = (g: Game) => g.state;

const SCRIPTS: Record<string, Script> = {
  async madre(game) {
    if (!S(game).flags.inicial) {
      await game.say("Madre: ¡Buenos días, {nombre}! La Profesora Hesse ha llamado. Dice que hoy es tu gran día.");
      await game.say("Madre: Su laboratorio está al sur del pueblo. ¡No la hagas esperar!");
      if (S(game).avatar === "apache") await game.say("Madre: Y esta vez aterriza en el jardín, que las macetas aún no se han recuperado.");
      return;
    }
    await game.say("Madre: ¡Qué bien te veo con tu Microo! Descansad un poco.");
    await game.fade(true, 12);
    for (const m of S(game).party) fullHeal(m);
    await game.wait(30); await game.fade(false, 12);
    await game.say("Madre: ¡Listo! Ya estáis como nuevos. ¡Cuídate mucho!");
  },

  async bloqueoSalida(game, world) {
    if (S(game).flags.inicial) return;
    await game.say("Ayudante: ¡Eh, espera! ¡No salgas a la hierba alta sin un Microo!");
    await game.say("Ayudante: Los Microos salvajes podrían infectarte. La Profesora Hesse te espera en el laboratorio.");
    await world.walkPlayer(0, 1);
  },

  async entrarLab(game) {
    const s = S(game);
    if (s.flags.inicial || s.flags.labIntro) return;
    s.flags.labIntro = true;
    await game.wait(10);
    await game.say("Profesora Hesse: ¡Ah, {nombre}! Te estaba esperando.");
    await game.say("Profesora Hesse: Soy Fanny Hesse. Hace mucho tiempo descubrí que el agar era perfecto para cultivar Microos.");
    await game.say("Profesora Hesse: En la mesa tienes tres Inóculos Iniciales en sus Criobolas. Elige el que más te guste.");
    await game.say("{rival}: ¡Eh! ¿Y yo qué? ¡Llevo aquí desde las siete de la mañana!");
    await game.say("Profesora Hesse: Paciencia, {rival}. Elegirás después de {nombre}.");
  },

  async profesora(game) {
    const s = S(game);
    if (!s.flags.inicial) { await game.say("Profesora Hesse: Elige uno de los tres Inóculos de la mesa. Acércate y pulsa A."); return; }
    if (!s.flags.microdex) { await SCRIPTS.darMicrodex(game, undefined as never); return; }
    if (s.flags.campeon && !s.flags.iniciales2) {
      s.flags.iniciales2 = true;
      await game.say(`Profesora Hesse: ¡${s.avatar === "chica" ? "Campeona" : "Campeón"} de La UAB! Estoy orgullosísima. Toma: los dos Inóculos que no elegiste aquel primer día.`);
      for (const sp of ["synechoc", "butyricum", "paramec"]) if (sp !== s.flags.starter) await giveMicroo(game, sp, 5);
      await game.say("Profesora Hesse: Por cierto… dicen que una Salmonella muy rara ronda los jardines de La UAB desde tu victoria.");
      return;
    }
    if (s.caught.length >= 162) { await game.say("Profesora Hesse: ¡162 especies! ¡Has completado la Microdex! Eres la persona que más sabe de microbios del mundo."); return; }
    await game.say(`Profesora Hesse: Llevas ${s.caught.length} especies aisladas. ¡Hay muchísimas más ahí fuera!`);
    await game.say("Profesora Hesse: Debilita a los Microos salvajes antes de lanzar una Criobola. Y si los dejas en latencia, mejor aún.");
  },

  async elegir(game, world, sp) {
    const s = S(game);
    if (s.flags.inicial || !sp) return;
    const spc = getSpecies(sp);
    await game.say(`Es un Inóculo de ${spc.name}, un Microo de tipo ${spc.types.join(" / ")}.`, { keep: true });
    const ok = await game.choose(["SÍ", "NO"], { prompt: `¿Eliges a ${spc.name}?`, x: 180, y: 76, cancel: 1 });
    game.popKept();
    if (ok !== 0) return;
    const m = createMicroo(sp, 5, { rng: rng(game), trainer: s.name });
    s.party.push(m);
    markCaught(s, sp);
    s.flags.inicial = true; s.flags.starter = sp;
    world.refreshNpcs();
    await game.say(`¡{nombre} ha recibido un ${spc.name}!`);
    // El rival elige el que tiene ventaja
    const rv = COUNTER[sp];
    s.flags.rivalStarter = rv;
    const rival = world.npc("rival-lab");
    await game.say(`{rival}: ¡Pues yo me quedo con este! ¡${getSpecies(rv).name}!`);
    if (rival) { await world.walkNpc(rival, 0); rival.dir = 3; }
    await game.say("{rival}: ¡{nombre}! ¡Vamos a ver qué tal funcionan nuestros cultivos!");
    const foe = [createMicroo(rv, 5, { rng: rng(game) })];
    const out = await startBattle(game, world, { battle: battleFor(game, foe, false, s.rival), wild: false,
      trainer: { name: s.rival, clase: "Rival", portrait: "rival", lose: "¿Qué? ¡Seguro que mi placa estaba contaminada!", money: 10 } });
    for (const p of s.party) fullHeal(p);
    if (out.outcome === "lose") await game.say("{rival}: ¡Ja! ¡Mi cepa es más virulenta! Ya aprenderás.");
    s.flags.rival1 = true;
    await game.say("{rival}: Me voy a la Ruta 1 a aislar más Microos. ¡Nos vemos, {nombre}!");
    if (rival) { await world.walkNpc(rival, 0, 3); }
    world.refreshNpcs();
    await SCRIPTS.darMicrodex(game, world);
  },

  async darMicrodex(game) {
    const s = S(game);
    if (s.flags.microdex) return;
    await game.say("Profesora Hesse: ¡Qué combate! Toma, {nombre}. Esto es un Microscopio Óptico.");
    s.flags.microdex = true; addItem(s, "microscopio-optico");
    await game.say("¡{nombre} ha recibido el MICROSCOPIO ÓPTICO! Registra cada Microo que veas en la Microdex.");
    addItem(s, "criobola-roja", 5);
    await game.say("¡Y también 5 Criobolas Rojas! Sirven para aislar Microos salvajes.");
    await game.say("Profesora Hesse: Tu misión: viajar por la región, aislar todas las especies y desafiar a los gimnasios.");
    await game.say("Profesora Hesse: El primero está en Ciudad Petri, pasando Ciudad Viral y el Bosque Viral. ¡Buena suerte!");
  },

  async rivalLab(game) {
    if (!S(game).flags.inicial) await game.say("{rival}: ¡{nombre}! La Profe dice que eliges tú primero… ¡Date prisa!");
  },

  async incubadora(game) {
    const s = S(game);
    await game.say("¡Hola! Bienvenid{o} a la Incubadora. Aquí cultivamos a tus Microos a 37 °C con agitación orbital.");
    if (!s.party.length) { await game.say("Vaya, no llevas ningún Microo. ¡Vuelve cuando tengas uno!"); return; }
    if (!(await game.yesno("¿Quieres que incube a tus Microos?"))) { await game.say("¡Vuelve cuando quieras!"); return; }
    await game.say("Muy bien. Déjame tus Criobolas un momento…");
    await game.fade(true, 10);
    for (const m of s.party) fullHeal(m);
    audio.sfx("heal");
    await game.wait(40);
    await game.fade(false, 10);
    s.lastHeal = { map: s.map, x: 5, y: 3 };
    await game.say("¡Gracias por esperar! Tus Microos están en plena fase exponencial. ¡Vuelve cuando quieras!");
  },
  async registrarIncubadora() {},

  async tienda(game, _w, arg) {
    await game.say("¡Bienvenid{o} a la Tienda de Medios!");
    await shopMenu(game, (arg ?? "").split(","));
    await game.say("¡Vuelve pronto!");
  },

  async regaloCaldo(game) {
    const s = S(game);
    if (s.flags.regaloCaldo) { await game.say("El caldo nutritivo de mi receta es el mejor. ¡Ni un grumo!"); return; }
    await game.say("¡Hola, joven investigador! Toma, te regalo esto. Lo preparo yo misma con extracto de levadura.");
    s.flags.regaloCaldo = true; addItem(s, "caldo-nutritivo", 3);
    await game.say("¡{nombre} ha recibido 3 Caldos Nutritivos!");
  },

  async academia(game) {
    const s = S(game);
    await game.say("Profesora de la Academia: ¡Bienvenid{o} a la Academia de Infección y Estados!");
    const c = await game.choose(["Contaminaciones", "Tipos", "Captura", "Nada"], { prompt: "¿Sobre qué quieres aprender?", x: 130, y: 20, cancel: 3 });
    const t: Record<number, string[]> = {
      0: ["Hay seis contaminaciones: desnaturalizado, congelado, paralizado, intoxicado, gravemente intoxicado y fase de latencia.",
          "Desnaturalizado reduce el daño físico a la mitad. Paralizado reduce la velocidad y a veces impide atacar.",
          "Los Anaerobios no se desnaturalizan, los Ácido-Alcohol resistentes no se congelan y los Espiroquetas no se paralizan."],
      1: ["Hay 18 tipos de Microo. Anaerobio vence a Fotótrofo, Protozoo vence a Anaerobio y Fotótrofo vence a Protozoo.",
          "Los Virus solo temen a otros Virus, a los Ácido-Alcohol resistentes y a los Simbiontes, que además son inmunes a ellos."],
      2: ["Cuanto menos PS tenga un Microo salvaje, más fácil es aislarlo.", "La fase de latencia y la congelación son las contaminaciones que más ayudan a la captura."],
    };
    for (const l of t[c] ?? ["¡Vuelve cuando quieras repasar!"]) await game.say(l);
    if (c >= 0 && c < 3 && !s.flags.premioAcademia) {
      s.flags.premioAcademia = true; addItem(s, "solucion-salina", 2);
      await game.say("¡Muy atent{o}! Toma, para que practiques. ¡{nombre} ha recibido 2 Soluciones Salinas!");
    }
  },

  async rivalBosque(game, world) {
    const s = S(game);
    if (s.flags.rival2) return;
    const r = world.npc("rival-bosque");
    if (r) { r.emote = 40; r.dir = 2; await game.wait(30); }
    await game.say("{rival}: ¡{nombre}! ¿Tú también vas a Ciudad Petri? ¡Pues primero tendrás que superarme!");
    const rv = String(s.flags.rivalStarter ?? "butyricum");
    const foe = [createMicroo("mucorin", 8, { rng: rng(game) }), createMicroo(rv, 10, { rng: rng(game) })];
    const out = await startBattle(game, world, { battle: battleFor(game, foe, false, s.rival), wild: false,
      trainer: { name: s.rival, clase: "Rival", portrait: "rival", lose: "¡Bah! ¡Ha sido un golpe de suerte!", money: 15 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    s.flags.rival2 = true;
    await game.say("{rival}: El líder de Ciudad Petri usa Microos de los alimentos. ¡Seguro que yo gano la medalla antes que tú!");
    if (r) { await world.walkNpc(r, 3, 2); }
    world.refreshNpcs();
  },

  async liderSole(game, world) {
    const s = S(game);
    if (s.badges.includes("probiotico")) {
      await game.say("Dr. Solé: La Microbiología de los Alimentos está en todo: el pan, el queso, el yogur… ¡y en las latas abombadas!");
      await game.say("Dr. Solé: Más allá de Ciudad Petri te espera el Monte Micelio. ¡Sigue investigando!");
      return;
    }
    await game.say("Dr. Solé: ¡Bienvenid{o} a mi planta piloto! Soy Antoni Solé, líder del Gimnasio de Ciudad Petri.");
    await game.say("Dr. Solé: Mis Microos fermentan la leche, conservan el queso… y a veces estropean una lata. ¡Veamos de qué está hecho tu cultivo!");
    const out = await startBattle(game, world, { battle: battleFor(game, trainerParty("gym1", s.difficulty, rng(game)), false, "Dr. Solé", s.difficulty === "normal" ? { "medio-lb": 2 } : {}), wild: false,
      trainer: { name: "Antoni Solé", clase: "Líder", portrait: "sole", lose: "¡Increíble! Has superado el control de calidad.", money: 100 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    s.badges.push("probiotico");
    s.flags.medalla1 = true;
    await game.say("Dr. Solé: Te has ganado la MEDALLA PROBIÓTICO.");
    await game.say("¡{nombre} ha recibido la MEDALLA PROBIÓTICO del Dr. Solé!");
    await game.say("Dr. Solé: Con ella podrás usar Celulasa fuera de combate para cortar los arbustos que bloquean el camino.");
    await game.say("Dr. Solé: Por cierto… dicen que en el Monte Micelio, al norte, ronda gente con portátiles y muy mala cara. Ten cuidado.");
  },

  // ---------------------------------------------------------------- segundo tramo
  async cortarHifas(game, world) {
    const s = S(game);
    if (!s.badges.includes("probiotico")) {
      await game.say("Una maraña de hifas blancas tapa la entrada de la cueva. Es dura como el cartón.");
      await game.say("Con la Celulasa que enseña el líder de Ciudad Petri se podría cortar.");
      return;
    }
    await game.say("Una maraña de hifas tapa la entrada de la cueva. ¿Quieres usar Celulasa?", { keep: true });
    const ok = await game.choose(["SÍ", "NO"], { x: 200, y: 96, cancel: 1 });
    game.popKept();
    if (ok !== 0) return;
    await game.say(s.avatar === "apache" ? "¡{nombre} usó Celulasa! …Y, por si acaso, también el rotor." : "¡{nombre} usó Celulasa! Las paredes de las hifas se deshacen.");
    s.flags["hifas-r2"] = true;
    world.refreshNpcs();
  },

  async salazar(game, world) {
    const s = S(game);
    await game.say("Dr. Salazar: …¿Eh? ¿Quién eres tú? No, no me levanto. Se está muy bien sentado.");
    await game.say("Dr. Salazar: Alguien ha tirado un disco duro al suelo. ¿Lo ves ahí? Pues yo no pienso hacer nada.");
    await game.say("Dr. Salazar: ¿Que los becarios están picando datos de 16S sin supervisión? Ya aprenderán. Yo aprendí así… creo.");
    await game.say("Dr. Salazar: ¿Quieres pasar? Uf… vale, te gano desde la silla.");
    const team = [createMicroo("niger", 15, { rng: rng(game) }), createMicroo("fragilis", 16, { rng: rng(game) }), createMicroo("desulfovib", 17, { rng: rng(game) })];
    const out = await startBattle(game, world, { battle: battleFor(game, team, false, "Dr. Salazar"), wild: false,
      trainer: { name: "Isaac Salazar", clase: "Ejecutivo", portrait: "salazar", lose: "Bah… tampoco me importaba tanto.", money: 400 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    await game.say("Dr. Salazar: Pfff. Vale, vale. Me voy a mi cuarto de servidores, que ahí no me molesta nadie.");
    await game.say("Dr. Salazar: Y llevaos a los becarios, que ya hacen mucho ruido. La Unidad de Genética tiene planes más grandes…");
    await game.fade(true, 14);
    s.flags.salazar1 = true;
    world.refreshNpcs();
    await game.fade(false, 14);
    await game.say("Los becarios secuestrados han salido corriendo hacia Ciudad Cultivo.");
  },

  async discoDuro(game, world) {
    const s = S(game);
    if (!s.flags.salazar1) { await game.say("Dr. Salazar: Ni lo toques. Bueno… en realidad me da igual. Pero no lo toques."); return; }
    await game.say("Es un disco duro externo atado con celo. Pone «BACKUP_FINAL_v3_ESTE_SÍ».");
    addItem(s, "disco-duro");
    s.flags.disco = true;
    world.refreshNpcs();
    await game.say("¡{nombre} ha guardado el DISCO DURO EXTERNO en la mochila!");
  },

  async rivalRuta3(game, world) {
    const s = S(game);
    if (s.flags.rival3) return;
    const r = world.npc("r3-rival");
    if (r) { r.emote = 40; r.dir = 0; await game.wait(30); }
    await game.say("{rival}: ¡{nombre}! ¿Has cruzado el Monte Micelio? Yo he visto a unos tipos raros con portátiles… ¡pero no me han dado ningún miedo!");
    await game.say("{rival}: He entrenado mucho. ¡Esta vez no tienes nada que hacer!");
    const rv = String(s.flags.rivalStarter ?? "butyricum");
    const evo = [...SPECIES.values()].find((x) => x.evolvesFrom === rv && x.evolution?.method === "level" && (x.evolution.level ?? 99) <= 19);
    const foe = [createMicroo("rhizopupa", 16, { rng: rng(game) }), createMicroo("subtilis", 16, { rng: rng(game) }), createMicroo(evo?.id ?? rv, 19, { rng: rng(game) })];
    const out = await startBattle(game, world, { battle: battleFor(game, foe, false, s.rival), wild: false,
      trainer: { name: s.rival, clase: "Rival", portrait: "rival", lose: "¡¿Otra vez?! ¡Mi cultivo estaba contaminado!", money: 30 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    s.flags.rival3 = true;
    await game.say("{rival}: La líder de Ciudad Cultivo cultiva algas en columnas gigantes. ¡Seguro que yo lo entiendo antes que tú!");
    if (r) await world.walkNpc(r, 1, 6);
    world.refreshNpcs();
  },

  async liderGaju(game, world) {
    const s = S(game);
    if (s.badges.includes("tapete")) {
      if (!s.bag["mascara-de-gases"]) { await darMascara(game); return; }
      await game.say("Dra. Gajú: Cada capa de una columna de Winogradsky es un ecosistema. Arriba la luz, abajo el azufre… ¡y en medio, la vida!");
      return;
    }
    await game.say("Dra. Gajú: ¡Hola! Soy Núria Gajú, líder del Gimnasio de Ciudad Cultivo. Estudio los tapetes microbianos del Delta del Ebro.");
    await game.say("Dra. Gajú: Mis Microos viven en gradientes de luz, oxígeno y sulfuro. ¿Sabrás adaptarte tú?");
    const out = await startBattle(game, world, { battle: battleFor(game, trainerParty("gym2", s.difficulty, rng(game)), false, "Dra. Gajú", s.difficulty === "normal" ? { "medio-lb": 2 } : {}), wild: false,
      trainer: { name: "Núria Gajú", clase: "Líder", portrait: "gaju", lose: "¡Qué buena adaptación! Como una cianobacteria al sol.", money: 160 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    s.badges.push("tapete");
    s.flags.medalla2 = true;
    await game.say("Dra. Gajú: Te has ganado la MEDALLA TAPETE.");
    await game.say("¡{nombre} ha recibido la MEDALLA TAPETE de la Dra. Gajú!");
    await game.say("Dra. Gajú: Con ella podrás usar Quorum Sensing Lux fuera de combate para iluminar los lugares oscuros.");
    await darMascara(game);
  },

  // ---------------------------------------------------------------- tercer tramo
  async guardaCueva(game, world) {
    const s = S(game);
    if (!s.bag["mascara-de-gases"]) {
      await game.say("Guarda: ¡Alto! Ahí dentro no hay oxígeno: solo metano y sulfuro de hidrógeno.");
      await game.say("Guarda: Sin una Máscara de Gases no puedo dejarte pasar. Dicen que la Dra. Gajú tiene una.");
      return;
    }
    await game.say("Guarda: ¿Eso es una Máscara de Gases? ¡Perfecto! Adelante, pero no te la quites.");
    s.flags["mascara-ok"] = true;
    world.refreshNpcs();
  },

  async entrarCuevaAnaerobica(game) {
    await game.say(S(game).avatar === "apache" ? "{nombre} sella las tomas de aire del motor. Un olor a huevo podrido se filtra igualmente." : "{nombre} se ajusta la Máscara de Gases. Huele a huevo podrido incluso a través del filtro.");
  },

  async entrarTunel(game, world) {
    const s = S(game);
    if (!s.badges.includes("tapete")) {
      await game.say("Está oscurísimo. Apenas se ve a un palmo… Con la Medalla Tapete podrías usar Quorum Sensing Lux.");
      return;
    }
    await game.say("Está oscurísimo. ¿Usar Quorum Sensing Lux para iluminar el túnel?", { keep: true });
    const c = await game.choose(["SÍ", "NO"], { x: 200, y: 96, cancel: 1 });
    game.popKept();
    if (c !== 0) return;
    const lead = s.party.find((m) => m.hp > 0);
    await game.say(lead ? `¡${displayNameOf(lead)} emite luz por quorum sensing! El túnel se ilumina.` : "¡El túnel se ilumina!");
    world.lux = true;
  },

  async liderGuardia(game, world) {
    const s = S(game);
    if (s.badges.includes("micelio")) {
      await game.say("Dra. Guàrdia: Los hongos descomponen, curan y envenenan. Sin ellos no habría pan, ni penicilina… ni bosques.");
      return;
    }
    await game.say("Dra. Laia Guàrdia: Bienvenid{o} a mi placa de Sabouraud. Soy la líder del Gimnasio de Ciudad Gram, y estudio los hongos.");
    await game.say("Dra. Guàrdia: Mohos, levaduras, micotoxinas… Mis Microos crecen despacio, pero no paran nunca. ¡Veamos si aguantas!");
    const out = await startBattle(game, world, { battle: battleFor(game, trainerParty("gym3", s.difficulty, rng(game)), false, "Dra. Guàrdia", s.difficulty === "normal" ? { "medio-tsb": 2 } : {}), wild: false,
      trainer: { name: "Laia Guàrdia", clase: "Líder", portrait: "guardia", lose: "¡Increíble! Has atravesado mi micelio.", money: 220 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    s.badges.push("micelio");
    s.flags.medalla3 = true;
    await game.say("Dra. Guàrdia: Te has ganado la MEDALLA MICELIO.");
    await game.say("¡{nombre} ha recibido la MEDALLA MICELIO de la Dra. Guàrdia!");
    await game.say("Dra. Guàrdia: Con ella podrás usar Flagelo Polar fuera de combate cuando lo consigas.");
    await game.say("— Fin del tercer tramo de Micromón. ¡La aventura continuará en Pueblo Levadura y la Torre Prión! —");
  },

  // ---------------------------------------------------------------- cuarto tramo
  async venderFichas(game) {
    const s = S(game);
    await game.say(`Casino Mutagénesis: ¡Hola! Tienes ${fichas(game)} fichas. 50 fichas cuestan 1000 créditos.`, { keep: true });
    const c = await game.choose(["50 FICHAS", "NO, GRACIAS"], { x: 170, y: 90, cancel: 1 });
    game.popKept();
    if (c !== 0) return;
    if (s.money < 1000) { await game.say("Casino Mutagénesis: No tienes suficientes créditos."); return; }
    s.money -= 1000; s.flags.fichas = fichas(game) + 50;
    await game.say("¡{nombre} ha comprado 50 fichas!");
  },

  async tragaperras(game) {
    if (fichas(game) < 3) { await game.say("Es una tragaperras con Microos en los rodillos. Necesitas fichas: se compran en el mostrador."); return; }
    await game.run(new SlotMachine(game));
  },

  async premiosCasino(game) {
    const s = S(game);
    const prizes: [string, number, () => Promise<void>][] = [
      ["Myxococcus Nv25", 2500, () => giveMicroo(game, "myxococcus", 25)],
      ["Pleomorph Nv25", 1800, () => giveMicroo(game, "pleomorph", 25)],
      ["Plásmido F", 700, async () => { addItem(s, "plasmido-f"); await game.say("¡{nombre} ha recibido un PLÁSMIDO F!"); }],
      ["Criobola Amarilla ×3", 400, async () => { addItem(s, "criobola-amarilla", 3); await game.say("¡{nombre} ha recibido 3 CRIOBOLAS AMARILLAS!"); }],
    ];
    await game.say(`Premios: ¡Canjea tus fichas! Tienes ${fichas(game)}.`, { keep: true });
    const c = await game.choose([...prizes.map(([n, cost]) => `${n} · ${cost}`), "SALIR"], { x: 96, y: 14, cancel: prizes.length });
    game.popKept();
    if (c < 0 || c >= prizes.length) return;
    const [, cost, give] = prizes[c];
    if (fichas(game) < cost) { await game.say("Premios: No tienes suficientes fichas."); return; }
    s.flags.fichas = fichas(game) - cost;
    await give();
  },

  async posterCasino(game, world) {
    const s = S(game);
    if (s.flags.guarida) { await game.say("Un póster de una portada de Nature. Detrás hay un interruptor ya pulsado."); return; }
    if (!s.flags["entrenador:casino-recluta"]) { await game.say("Recluta: ¡Eh! ¡Deja ese póster en paz!"); return; }
    await game.say("Es un póster de una portada de Nature… ¡Detrás hay un interruptor!");
    await game.say("¡{nombre} pulsa el interruptor! Se oye un zumbido y una tragaperras se desliza hacia un lado…");
    s.flags.guarida = true;
    world.refreshNpcs();
  },

  async barbadilla(game, world) {
    const s = S(game);
    await game.say("Dr. Antonio Barbadilla: ¿Has visto mi reflejo en esa cabina de flujo? Impecable. Como mis Microos: simétricos y vistosos.");
    await game.say("Dr. Barbadilla: ¿Qué es eso de la bioinformática moderna? Bah, yo me encargo de las malas noticias financieras. ¡Y tú eres una de ellas!");
    const team = [createMicroo("volvox", 30, { rng: rng(game) }), createMicroo("spirulmax", 31, { rng: rng(game) }), createMicroo("salinarum", 31, { rng: rng(game) })];
    const out = await startBattle(game, world, { battle: battleFor(game, team, false, "Dr. Barbadilla"), wild: false,
      trainer: { name: "Antonio Barbadilla", clase: "Ejecutivo", portrait: "barbadilla", lose: "¡Mi peinado! ¡Me has despeinado la simetría!", money: 500 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    await game.say("Dr. Barbadilla: Tengo que retocarme. Abajo está Jaime… y no le gusta que le interrumpan.");
    s.flags.barbadilla1 = true;
    world.refreshNpcs();
  },

  async casillas(game, world) {
    const s = S(game);
    await game.say("Dra. Sonia Casillas: ¡¿Tú eres quien está estresando a mis becarios?! ¿Han comido? ¿Has comido tú? ¡Da igual!");
    await game.say("Dra. Casillas: ¡Mis niños están aprendiendo muchísimo! ¡Y no voy a dejar que nadie les ponga nerviosos! ¡Combate doble!");
    const team = [createMicroo("kefirgran", 30, { rng: rng(game) }), createMicroo("putida", 30, { rng: rng(game) }), createMicroo("myxococcus", 31, { rng: rng(game) }), createMicroo("crescentus", 31, { rng: rng(game) })];
    const out = await startBattle(game, world, { battle: battleFor(game, team, false, "Dra. Casillas", { "medio-tsb": 1 }, "double"), wild: false,
      trainer: { name: "Sonia Casillas", clase: "Comandante", portrait: "casillas", lose: "¡Mis pobres becarios! ¡Os haré un caldito!", money: 500 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    await game.say("Dra. Casillas: Venga, niños, a casa a descansar. Y tú… ¡abrígate, que en el sótano hace frío!");
    s.flags.casillas1 = true;
    world.refreshNpcs();
  },

  async urtaza(game, world) {
    const s = S(game);
    await game.say("Dr. Jaime Martínez-Urtaza: Así que tú eres quien ha bajado hasta aquí. He visto tu plan de análisis.");
    await game.say("Dr. Martínez-Urtaza: Es basura. Sin control de calidad, sin réplicas, sin un mal árbol filogenético. ¿Y te llamas investigador?");
    await game.say("Dr. Martínez-Urtaza: Los Microos son solo datos. Y yo tengo los mejores datos del mundo. ¡Te lo demostraré!");
    const team = [createMicroo("cholerae", 31, { rng: rng(game) }), createMicroo("klebsi", 31, { rng: rng(game) }), createMicroo("smegmatis", 32, { rng: rng(game) }), createMicroo("lambda-v", 33, { rng: rng(game) })];
    const out = await startBattle(game, world, { battle: battleFor(game, team, false, "Dr. Martínez-Urtaza", { "medio-tsb": 2 }), wild: false,
      trainer: { name: "Jaime Martínez-Urtaza", clase: "Líder de la Unidad", portrait: "urtaza", lose: "Esto… esto es un outlier. ¡No cuenta!", money: 800 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    await game.say("Dr. Martínez-Urtaza: Hmpf. Disfruta tu victoria estadísticamente insignificante. La Unidad de Genética tiene planes mucho más grandes.");
    await game.say("¡El Dr. Martínez-Urtaza sale del despacho dando un portazo!");
    await game.fade(true, 12);
    s.flags.urtaza1 = true;
    world.refreshNpcs();
    await game.fade(false, 12);
    await game.say("Con las prisas, se ha dejado algo encima de la mesa…");
    addItem(s, "western-blot");
    s.flags.blot = true;
    await game.say("¡{nombre} ha encontrado el WESTERN BLOT! Con él podrás identificar las proteínas de la Torre Prión.");
  },

  async albaHernandez(game, world) {
    const s = S(game);
    if (s.flags.hernandez1) return;
    const h = world.npc("hernandez");
    if (h) { h.emote = 40; h.dir = 0; await game.wait(30); }
    await game.say("Dra. Alba Hernández: Alto ahí. No, no voy a luchar contigo. Yo no me mancho las manos.");
    await game.say("Dra. Hernández: Pero ¿sabes cuál es tu problema? Que no tienes perspectiva global. Los microbiólogos sois unos miopes: solo veis la placa.");
    await game.say("Dra. Hernández: El plan de Vibrio parahaemolyticus en el mar se ha descartado. Todo el mundo sabe que los Vibrios siguen las corrientes superficiales… aunque nadie lo haya probado.");
    await game.say("Dra. Hernández: Ahora vamos a por algo mucho mayor. Deberías callarte, agradecer la oportunidad y unirte a nosotros. Piénsalo.");
    await game.fade(true, 12);
    s.flags.hernandez1 = true;
    world.refreshNpcs();
    await game.fade(false, 12);
    await game.say("La Dra. Hernández ha desaparecido entre la niebla…");
  },

  async jubiladoTorre(game) {
    const s = S(game);
    if (s.flags.plasmidoVir) { await game.say("Investigador jubilado: Esa mujer… siempre mirando desde la barandilla. Ten cuidado con la Unidad de Genética."); return; }
    await game.say("Investigador jubilado: ¡Gracias por llegar hasta aquí! Llevaba días atrapado entre la niebla. Esa doctora no me dejaba bajar.");
    await game.say("Investigador jubilado: Toma. Lo guardé de mis tiempos en el laboratorio de Vibrios. Un plásmido de virulencia…");
    addItem(s, "plasmido-vir");
    s.flags.plasmidoVir = true;
    await game.say("¡{nombre} ha recibido el PLÁSMIDO VIR! Hace evolucionar a Cholerae.");
  },

  async regaloPleomorph(game) {
    const s = S(game);
    if (s.flags.pleomorph) { await game.say("¿Cómo está Pleomorph? Sin pared fija, puede convertirse en casi cualquier cosa."); return; }
    await game.say("¡Hola! Encontré esta bacteria sin pared en una placa olvidada. Cambia de forma según dónde la cultives.");
    await game.say("Yo no tengo sitio en el laboratorio. ¿Te la quedas?");
    s.flags.pleomorph = true;
    await giveMicroo(game, "pleomorph", 25);
  },

  async liderYero(game, world) {
    const s = S(game);
    if (s.badges.includes("catalasa")) {
      await game.say("Dr. Yero: Las levaduras son eucariotas como tú y como yo. ¡Por eso es tan difícil encontrar fármacos contra ellas!");
      return;
    }
    await game.say("Dr. Daniel Yero: ¡Bienvenid{o}! Soy el líder del Gimnasio de Ciudad Aerobia. Estudio levaduras y eucariotas unicelulares.");
    await game.say("Dr. Yero: Mi amigo Òscar Conchillo dice que todo es bioinformática. Yo digo que sin cultivo no hay datos. ¡Demuéstrame qué sabes!");
    const out = await startBattle(game, world, { battle: battleFor(game, trainerParty("gym4", s.difficulty, rng(game)), false, "Dr. Yero", s.difficulty === "normal" ? { "medio-tsb": 2 } : {}), wild: false,
      trainer: { name: "Daniel Yero", clase: "Líder", portrait: "yero", lose: "¡Fermentación completa! Has ganado.", money: 260 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    s.badges.push("catalasa");
    s.flags.medalla4 = true;
    await game.say("Dr. Yero: Te has ganado la MEDALLA CATALASA.");
    await game.say("¡{nombre} ha recibido la MEDALLA CATALASA del Dr. Yero!");
    await game.say("— Fin del cuarto tramo de Micromón. ¡La aventura continuará en Ciudad Agar y el Instituto de Biotecnología! —");
  },

  // ---------------------------------------------------------------- quinto tramo
  async entrarReserva(game, world) {
    const s = S(game);
    await game.say("Recepción: ¡Bienvenid{o} a la Reserva Microbiana! Aquí viven extremófilos y protozoos que no verás en ningún otro sitio.");
    await game.say("Recepción: Por 500 créditos te damos 30 Criobolas Verdes y 500 pasos. Dentro no se lucha: se ofrecen Medios de Enriquecimiento.", { keep: true });
    const c = await game.choose(["ENTRAR · 500", "NO"], { x: 160, y: 90, cancel: 1 });
    game.popKept();
    if (c !== 0) return;
    if (s.money < 500) { await game.say("Recepción: Vaya, no tienes suficientes créditos."); return; }
    s.money -= 500; s.flags.safariBalls = 30; s.flags.safariSteps = 500;
    await game.say("¡{nombre} ha recibido 30 CRIOBOLAS VERDES! ¡Buena suerte!");
    await game.fade(true, 12);
    world.load("reserva-microbiana", 14, 26, 1);
    await game.fade(false, 12);
  },

  async finReserva(game, world) {
    const s = S(game);
    await game.say(Number(s.flags.safariBalls ?? 0) <= 0 ? "Altavoz: ¡Te has quedado sin Criobolas Verdes! Tu visita ha terminado." : "Altavoz: ¡Ding-dong! Se acabó el tiempo en la Reserva Microbiana.");
    s.flags.safariBalls = 0; s.flags.safariSteps = 0;
    await game.fade(true, 12);
    world.load("reserva-entrada", 5, 2, 0);
    await game.fade(false, 12);
    await game.say("Recepción: ¿Qué tal ha ido? ¡Vuelve cuando quieras!");
  },

  async salirReserva(game) {
    const s = S(game);
    if (Number(s.flags.safariSteps ?? 0) > 0) {
      s.flags.safariBalls = 0; s.flags.safariSteps = 0;
      await game.say("Recepción: ¿Ya has terminado? ¡Vuelve cuando quieras!");
    }
  },

  async guardaReserva(game) {
    const s = S(game);
    if (s.flags.plasmidoTi) { await game.say("Guarda: Aquí cada Microo es único. Cuídalos bien."); return; }
    await game.say("Guarda: ¡Has llegado hasta la caseta del fondo! Pocos lo consiguen. Toma, se le cayó a un botánico.");
    addItem(s, "plasmido-ti"); s.flags.plasmidoTi = true;
    await game.say("¡{nombre} ha recibido un PLÁSMIDO TI! Es el plásmido que usa Agrobacterium para modificar plantas.");
  },

  async liderMas(game, world) {
    const s = S(game);
    if (s.badges.includes("quimiostato")) {
      await game.say("Dr. Mas: Escalar un cultivo de un matraz a 10.000 litros es todo un arte. ¡Oxígeno, pH, temperatura… y paciencia!");
      return;
    }
    await game.say("Dr. Jordi Mas: ¡Bienvenid{o} a mi nave de biorreactores! Soy el líder del Gimnasio de Ciudad Agar: Microbiología Industrial.");
    await game.say("Dr. Mas: Mis Microos producen solventes, antibióticos y proteínas a escala industrial. ¿Aguantará tu cultivo la presión?");
    const out = await startBattle(game, world, { battle: battleFor(game, trainerParty("gym5", s.difficulty, rng(game)), false, "Dr. Mas", s.difficulty === "normal" ? { "medio-enriquecido": 1, "medio-tsb": 1 } : {}), wild: false,
      trainer: { name: "Jordi Mas", clase: "Líder", portrait: "mas", lose: "¡Producción detenida! Has superado mi escalado.", money: 300 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    s.badges.push("quimiostato");
    s.flags.medalla5 = true;
    await game.say("Dr. Mas: Te has ganado la MEDALLA QUIMIOSTATO.");
    await game.say("¡{nombre} ha recibido la MEDALLA QUIMIOSTATO del Dr. Mas!");
    await game.say("Dr. Mas: Mi amigo Daniel Yero me ha dicho que la Unidad de Genética ha tomado el Instituto de Biotecnología, al este. ¡Tienes que ayudarles!");
  },

  // ---------------------------------------------------------------- sexto tramo
  async yeroInstituto(game, world) {
    const s = S(game);
    if (!s.flags["yero-equipo"]) {
      await game.say("Dr. Daniel Yero: ¡{nombre}! Menos mal que has venido. La Unidad de Genética tiene a Òscar encerrado en la sala de servidores.");
      await game.say("Dr. Yero: Lleva días calculando árboles de 10.000 réplicas mientras Jaime le dice «pues vaya bioinformático estás hecho». ¡No hay derecho!");
      await game.say("Dr. Yero: Yo distraigo a los reclutas de la puerta. Toma, que tu equipo llegue en plena forma.");
      for (const m of s.party) fullHeal(m);
      await game.say("¡El equipo de {nombre} se ha recuperado por completo!");
      s.flags["yero-equipo"] = true;
      world.refreshNpcs();
      await game.say("Dr. Yero: ¡Adelante! Os sigo de cerca.");
      return;
    }
    await game.say("Dr. Yero: ¡Corre, la sala de servidores está en la planta 5!");
  },

  async asedioEjecutivos(game, world) {
    const s = S(game);
    await game.say("Dr. Barbadilla: ¡Otra vez tú! Mira cómo me has dejado el flequillo la última vez.");
    await game.say("Dra. Casillas: ¡Y encima vienes a estresar al pobre Òscar! ¿Ha comido? ¡Nadie le ha preguntado si ha comido!");
    await game.say("Dr. Yero: ¡{nombre}, yo cubro la puerta! ¡Vosotros dos contra ellos dos!");
    const r = rng(game);
    const team = [createMicroo("volvox", 40, { rng: r }), createMicroo("kefirgran", 40, { rng: r }), createMicroo("salinarum", 41, { rng: r }),
      createMicroo("myxococcus", 41, { rng: r }), createMicroo("spirulmax", 41, { rng: r }), createMicroo("aeruginosa", 42, { rng: r })];
    const out = await startBattle(game, world, { battle: battleFor(game, team, false, "Barbadilla y Casillas", { "medio-enriquecido": 2 }, "double"), wild: false,
      trainer: { name: "Barbadilla y Casillas", clase: "Ejecutivos", portrait: "casillas", lose: "¡Retirada! ¡Pero abrígate al salir!", money: 300 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    await game.say("Dr. Barbadilla: Me voy a retocar. Esto no ha pasado.");
    await game.say("Dra. Casillas: ¡Niños, nos vamos! ¡Coged los táperes!");
    await game.fade(true, 12);
    s.flags["conchillo-libre"] = true;
    world.refreshNpcs();
    await game.fade(false, 12);
    await game.say("Dr. Òscar Conchillo: ¡Libre! Y ahora… ¡acceso al clúster revocado para toda la Unidad de Genética! ¡Ja!");
    await game.say("Dr. Conchillo: Gracias, de verdad. Cuando termines aquí, ven a mi gimnasio. Te debo un duelo limpio de pura bioinformática.");
    await game.say("Dr. Conchillo: Jaime está en la planta 11. Va a por el prototipo de la Criobola Morada. ¡Corre!");
  },

  async urtazaInstituto(game, world) {
    const s = S(game);
    if (!s.flags["conchillo-libre"]) {
      await game.say("Dr. Martínez-Urtaza: ¿Tú otra vez? Estoy ocupado. Mis ejecutivos de la planta 5 se encargarán de ti.");
      return;
    }
    await game.say("Dr. Martínez-Urtaza: Así que has liberado a Òscar. Da igual: la Criobola Morada y la pipeline definitiva ya son mías.");
    await game.say("Dr. Martínez-Urtaza: ¿Los creadores en la autoría? Por favor. Las ideas son de quien las publica primero.");
    const r = rng(game);
    const team = [createMicroo("parahaemolyticus", 43, { rng: r }), createMicroo("vulnificus", 43, { rng: r }), createMicroo("tuberculos", 44, { rng: r })];
    const out = await startBattle(game, world, { battle: battleFor(game, team, false, "Dr. Martínez-Urtaza", { "medio-enriquecido": 2 }), wild: false,
      trainer: { name: "Jaime Martínez-Urtaza", clase: "Líder de la Unidad", portrait: "urtaza", lose: "¡¡DESGRACIADO SIN FUTURO!!", money: 900 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    await game.say("Dr. Martínez-Urtaza: ¡¡DESGRACIADO SIN FUTURO!! ¡Esto no acaba aquí! ¡En la Isla Conjugada lo verás!");
    await game.fade(true, 12);
    s.flags.urtaza2 = true;
    world.refreshNpcs();
    await game.fade(false, 12);
    await game.say("El Dr. Martínez-Urtaza ha huido hacia la Isla Conjugada…");
  },

  async directorInstituto(game, world) {
    const s = S(game);
    if (!s.flags.urtaza2) { await game.say("Directora del Instituto: ¡Cuidado! Ese hombre quiere llevarse nuestro prototipo…"); return; }
    if (!s.flags.morada) {
      await game.say("Directora del Instituto: ¡Lo has conseguido! Has salvado el Instituto. Y el prototipo sigue aquí.");
      await game.say("Directora: Es la Criobola Morada: congelación instantánea en nitrógeno líquido. Nunca falla. Quédatela: estará más segura contigo.");
      addItem(s, "criobola-morada"); s.flags.morada = true;
      await game.say("¡{nombre} ha recibido la CRIOBOLA MORADA!");
      s.flags["instituto-libre"] = true;
      world.refreshNpcs();
      await game.say("Directora: Y toma esto también. En la Ruta 9 hay un tardígrado gigante en estado tun que bloquea el camino.");
      addItem(s, "pulverizador");
      await game.say("¡{nombre} ha recibido el PULVERIZADOR DE AGUA! Rehidrata a los tardígrados deshidratados.");
      return;
    }
    if (!s.bag["pulverizador"]) {
      await game.say("Directora: Por cierto, en la Ruta 9 hay un tardígrado gigante en estado tun bloqueando el camino a Ciudad Pili.");
      addItem(s, "pulverizador");
      await game.say("¡{nombre} ha recibido el PULVERIZADOR DE AGUA! Rehidrata a los tardígrados deshidratados.");
      return;
    }
    await game.say("Directora: Usa la Criobola Morada con cabeza. Solo hay una.");
  },

  async liderConchillo(game, world) {
    const s = S(game);
    if (s.badges.includes("algoritmo")) {
      await game.say("Dr. Conchillo: Un buen análisis empieza por buenos datos. Y los buenos datos empiezan en la placa. ¡Daniel tenía razón!");
      return;
    }
    await game.say("Dr. Òscar Conchillo: ¡Bienvenid{o}! Sin servidores al 90% ni scripts ajenos. Por fin un duelo limpio de pura bioinformática.");
    await game.say("Dr. Conchillo: Genomas mínimos, ensamblaje de novo, predicción de estructuras… ¡A ver si tu equipo compila!");
    const out = await startBattle(game, world, { battle: battleFor(game, trainerParty("gym6", s.difficulty, rng(game)), false, "Dr. Conchillo", s.difficulty === "normal" ? { "medio-enriquecido": 2 } : {}), wild: false,
      trainer: { name: "Òscar Conchillo", clase: "Líder", portrait: "conchillo", lose: "Compilado sin errores. ¡Bien hecho!", money: 340 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    s.badges.push("algoritmo");
    s.flags.medalla6 = true;
    await game.say("Dr. Conchillo: Te has ganado la MEDALLA ALGORITMO.");
    await game.say("¡{nombre} ha recibido la MEDALLA ALGORITMO del Dr. Conchillo!");
    await game.say("Dr. Conchillo: La costa del este lleva a Ciudad Pili. Y por el camino, la Central Metabólica… dicen que allí vive algo muy raro.");
  },

  /** Encuentro fijo (legendarios, Tardigrad dormido…): «estatico:especie:nivel:bandera». */
  async estatico(game, world, arg) {
    const [sp, lv, flag] = String(arg).split("|");
    const name = getSpecies(sp).name;
    await game.say(`¡${name} te mira fijamente!`);
    const out = await wildBattle(game, world, sp, Number(lv));
    if (out === "capture" || out === "win") { game.state.flags[flag] = true; world.refreshNpcs(); }
    else if (out === "foeFled") { game.state.flags[flag] = true; world.refreshNpcs(); await game.say(`${name} ha desaparecido…`); }
  },

  // ---------------------------------------------------------------- séptimo tramo
  async tardigrado(game, world) {
    const s = S(game);
    await game.say("Un tardígrado gigante en estado tun bloquea el camino. Está completamente deshidratado y no se mueve.");
    if (!s.bag["pulverizador"]) { await game.say("Haría falta agua para despertarlo…"); return; }
    await game.say("¿Usar el Pulverizador de Agua?", { keep: true });
    const c = await game.choose(["SÍ", "NO"], { x: 200, y: 96, cancel: 1 });
    game.popKept();
    if (c !== 0) return;
    await game.say("¡{nombre} rocía al tardígrado! Se hincha, estira sus ocho patas… ¡y se despierta de muy mal humor!");
    await SCRIPTS.estatico(game, world, "tardigrad|40|tardigrado");
    if (!s.flags.tardigrado) { s.flags.tardigrado = true; world.refreshNpcs(); await game.say("El tardígrado se aleja pesadamente hacia el mar."); }
  },

  async liderLuquin(game, world) {
    const s = S(game);
    if (s.badges.includes("ziehl")) {
      await game.say("Dra. Luquin: Las micobacterias crecen despacio, pero no se rinden nunca. Como un buen investigador.");
      return;
    }
    await game.say("Dra. Marina Luquin: Bienvenid{o} a mi laboratorio BSL-3. Aquí entran Microos que resisten al alcohol, al ácido… y a casi todo.");
    await game.say("Dra. Luquin: Tinción de Ziehl-Neelsen, fucsina caliente y mucha paciencia. ¿Estás preparad{o}?");
    const out = await startBattle(game, world, { battle: battleFor(game, trainerParty("gym7", s.difficulty, rng(game)), false, "Dra. Luquin", s.difficulty === "normal" ? { "medio-enriquecido": 2 } : {}), wild: false,
      trainer: { name: "Marina Luquin", clase: "Líder", portrait: "luquin", lose: "¡Has resistido como una buena micobacteria!", money: 380 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    s.badges.push("ziehl");
    s.flags.medalla7 = true;
    await game.say("Dra. Luquin: Te has ganado la MEDALLA ZIEHL-NEELSEN.");
    await game.say("¡{nombre} ha recibido la MEDALLA ZIEHL-NEELSEN de la Dra. Luquin!");
    addItem(s, "billete-ferri");
    await game.say("Dra. Luquin: Y toma este billete. El ferri del puerto te llevará a las islas. Dicen que Jaime se esconde en la Isla Conjugada…");
    await game.say("¡{nombre} ha recibido el BILLETE DE FERRI!");
  },

  async ferri(game, world) {
    const s = S(game);
    if (!s.bag["billete-ferri"]) { await game.say("Marinero: El ferri a las islas solo admite pasajeros con billete. ¡La Dra. Luquin del gimnasio los reparte!"); return; }
    const all: [string, string, number, number, boolean][] = [
      ["Ciudad Pili", "ciudad-pili", 13, 18, true], ["Islas Esporuladas", "islas-esporuladas", 10, 22, true],
      ["Isla Conjugada", "isla-conjugada", 13, 21, true], ["Calle Selección Natural", "calle-seleccion", 3, 22, s.badges.length >= 8],
    ];
    const opts = all.filter(([, id, , , ok]) => ok && MAPS_EXIST(id) && id !== world.map.id);
    await game.say("Marinero: ¡Todos a bordo! ¿A dónde vamos?", { keep: true });
    const c = await game.choose([...opts.map(([n]) => n), "QUEDARSE"], { x: 120, y: 40, cancel: opts.length });
    game.popKept();
    if (c < 0 || c >= opts.length) return;
    await game.fade(true, 20);
    await game.wait(30);
    world.load(opts[c][1], opts[c][2], opts[c][3], 1);
    await game.fade(false, 20);
    await game.say(`¡Habéis llegado a ${opts[c][0]}!`);
  },


  // ---------------------------------------------------------------- octavo tramo
  async fosil(game, world, arg) {
    const s = S(game);
    const name = arg === "ambar-mioceno" ? "un ÁMBAR DEL MIOCENO con una espora dentro" : "un FÓSIL DE ESTROMATOLITO";
    await game.say(`Dentro del hielo hay ${name}. ¿Te lo llevas? (Solo puedes llevarte uno.)`, { keep: true });
    const c = await game.choose(["SÍ", "NO"], { x: 200, y: 96, cancel: 1 });
    game.popKept();
    if (c !== 0) return;
    addItem(s, String(arg)); s.flags.fosil = true;
    world.refreshNpcs();
    await game.say(`¡{nombre} ha recogido ${name}!`);
  },

  async carlosIII(game) {
    const s = S(game);
    for (const [item, sp] of [["fosil-estromatolito", "stromatol"], ["ambar-mioceno", "amberspor"]] as const) {
      if (s.bag[item]) {
        await game.say("Investigadora del Carlos III: ¡Eso es un fósil microbiano! Dame un momento… lo rehidratamos, le damos nutrientes y…");
        addItem(s, item, -1);
        await game.fade(true, 14); await game.wait(40); await game.fade(false, 14);
        await game.say("Investigadora: ¡Ha revivido después de millones de años! Es tuyo.");
        await giveMicroo(game, sp, 35);
        return;
      }
    }
    if (!s.flags.lokiarca && s.flags.urtaza3) {
      await game.say("Investigadora: Gracias por detener a ese hombre. Toma: lo revivimos de un sedimento marino profundo. Es una arquea muy especial.");
      await game.say("Investigadora: Lokiarchaeota… dicen que es pariente de nuestros antepasados eucariotas.");
      s.flags.lokiarca = true;
      await giveMicroo(game, "lokiarca", 45);
      return;
    }
    await game.say("Investigadora: Si encuentras un fósil microbiano, tráemelo. ¡En las Islas Esporuladas hay algunos atrapados en el hielo!");
  },

  async urtazaFinal(game, world) {
    const s = S(game);
    await game.say("Dr. Jaime Martínez-Urtaza: Llegas tarde. Las muestras de Cádiz, el fago con la toxina Shiga y mi modelo de Machine Learning… ya está hecho.");
    await game.say("Dr. Martínez-Urtaza: El «Proyecto PopBugGenie Global». Selección poblacional quirúrgica contra quien no cite bien el Lancet Countdown.");
    await game.say("Dr. Martínez-Urtaza: Y tú, con tus placas de Petri, no vas a detener la genómica de poblaciones. ¡Última lección!");
    const r = rng(game);
    const team = trainerParty("villain", s.difficulty, r);
    const out = await startBattle(game, world, { battle: battleFor(game, team, false, "Dr. Martínez-Urtaza", { "medio-enriquecido": 3 }), wild: false,
      trainer: { name: "Jaime Martínez-Urtaza", clase: "Líder de la Unidad", portrait: "urtaza", lose: "Imposible… mi modelo tenía un 99% de precisión…", money: 1200 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    await game.say("Dr. Martínez-Urtaza: No… ¡El modelo decía que ganaría! ¡Los datos no mienten!");
    await game.say("Del tanque central sale un brillo rojizo. ¡La cepa O157:H7 ha roto el cristal!");
    await game.say("Dr. Martínez-Urtaza: ¡Quieta! ¡Obedece al script! ¡Te he programado yo!");
    await game.say("La cepa se revuelve contra él. La biología real no cabe en un script mal hecho.");
    await game.say("Dr. Martínez-Urtaza: … … Me retiro. Pero esto no ha terminado: la Unidad de Genética volverá.");
    await game.fade(true, 14);
    s.flags.urtaza3 = true;
    world.refreshNpcs();
    await game.fade(false, 14);
    await game.say("Dra. Campoy: ¡Se ha ido! Pero la cepa O157 sigue ahí… ¡Tienes que aislarla o detenerla, {nombre}! Después te espero en mi gimnasio.");
  },

  async liderCampoy(game, world) {
    const s = S(game);
    if (s.badges.includes("lisogenia")) {
      await game.say("Dra. Campoy: Los fagos son los seres más abundantes del planeta. ¡Hay más fagos que estrellas en el universo!");
      return;
    }
    await game.say("Dra. Susana Campoy: ¡Bienvenid{o} a mi coliseo! Gracias por lo de la Mansión. Pero aquí no hay favores: esta es la última prueba.");
    await game.say("Dra. Campoy: Ciclo lítico, lisogenia, transducción… ¡Que empiece la infección!");
    const out = await startBattle(game, world, { battle: battleFor(game, trainerParty("gym8", s.difficulty, rng(game)), false, "Dra. Campoy", s.difficulty === "normal" ? { "medio-enriquecido": 2 } : {}), wild: false,
      trainer: { name: "Susana Campoy", clase: "Líder", portrait: "campoy", lose: "¡Lisogenia rota! Eres digno de la Liga.", money: 420 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    s.badges.push("lisogenia");
    s.flags.medalla8 = true;
    await game.say("Dra. Campoy: Te has ganado la MEDALLA LISOGENIA. ¡Ya tienes las ocho!");
    await game.say("¡{nombre} ha recibido la MEDALLA LISOGENIA de la Dra. Campoy!");
    await game.say("Dra. Campoy: El ferri ya puede llevarte a la Calle Selección Natural. Al final está La UAB… y la Liga Micromón.");
  },

  // ---------------------------------------------------------------- noveno tramo: Calle Selección Natural y Liga
  async rivalFinal(game, world) {
    const s = S(game);
    if (s.flags.rival4) return;
    const r = world.npc("csn-rival");
    if (r) { r.emote = 40; r.dir = 1; await game.wait(30); }
    await game.say("{rival}: ¡{nombre}! Sabía que llegarías hasta aquí. Yo también tengo las ocho medallas.");
    await game.say("{rival}: Desde el laboratorio de la Profesora Hesse siempre has ido un paso por delante. Hoy se acaba. ¡Combate final!");
    const rv = String(s.flags.rivalStarter ?? "butyricum");
    const line = [rv];
    for (let k = 0; k < 2; k++) { const nx = [...SPECIES.values()].find((x) => x.evolvesFrom === line[line.length - 1]); if (nx) line.push(nx.id); }
    const r2 = rng(game);
    const foe = [createMicroo("avermitil", 57, { rng: r2 }), createMicroo("lichenifor", 56, { rng: r2 }), createMicroo("interrogan", 57, { rng: r2 }),
      createMicroo("genitalium", 56, { rng: r2 }), createMicroo("t4-titan", 58, { rng: r2 }), createMicroo(line[line.length - 1], 60, { rng: r2 })];
    const out = await startBattle(game, world, { battle: battleFor(game, foe, false, s.rival, { "medio-enriquecido": 2 }), wild: false,
      trainer: { name: s.rival, clase: "Rival", portrait: "rival", lose: "Vaya… Lo has hecho genial. De verdad.", money: 60 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    s.flags.rival4 = true;
    await game.say("{rival}: Me has ganado limpiamente. Ve a La UAB y demuéstrales lo que aprendimos con la Profesora Hesse.");
    await game.say("{rival}: Y oye… gracias por ser mi rival. Me has hecho mejor investigador.");
    if (r) await world.walkNpc(r, 0, 2);
    world.refreshNpcs();
  },

  async hernandezFinal(game, world) {
    const s = S(game);
    await game.say("Dra. Alba Hernández: Tú otra vez. Has desmantelado la Unidad, has humillado a Jaime… y sigues sin tener perspectiva global.");
    await game.say("Dra. Hernández: Siempre he dejado que peleen los becarios. Pero esta vez lo haré yo. Te voy a enseñar lo que es ver el panorama completo.");
    const r = rng(game);
    const foe = [createMicroo("thiomargar", 57, { rng: r }), createMicroo("mimivir", 57, { rng: r }), createMicroo("tardigrad", 58, { rng: r }),
      createMicroo("cyanofossil", 58, { rng: r }), createMicroo("filovir-z", 59, { rng: r })];
    const out = await startBattle(game, world, { battle: battleFor(game, foe, false, "Dra. Hernández", { "medio-enriquecido": 2 }), wild: false,
      trainer: { name: "Alba Hernández", clase: "Ejecutiva", portrait: "hernandez", lose: "… Quizás… la miope era yo.", money: 700 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    await game.say("Dra. Hernández: Está bien. Me rindo. A veces hay que mirar la placa de cerca para entender el mundo entero.");
    await game.say("Dra. Hernández: Ve a La UAB. Y… perdona por el sermón de la torre.");
    s.flags.hernandez2 = true;
    world.refreshNpcs();
  },

  async guardaLiga(game, world) {
    const s = S(game);
    if (s.badges.length < 8) { await game.say("Bedel de la Liga: Solo pueden pasar quienes tengan las ocho medallas de gimnasio. Te faltan algunas."); return; }
    await game.say("Bedel de la Liga: ¡Ocho medallas! Adelante. Te esperan el Alto Mando de La UAB y el Campeón.");
    await game.say("Bedel: Una vez dentro, no podrás volver a curar a tus Microos hasta el final. ¡Mucha suerte!");
    s.flags["liga-abierta"] = true;
    world.refreshNpcs();
  },

  async liga(game, world, arg) {
    const s = S(game);
    const k = Number(arg);
    const ids = ["elite1", "elite2", "elite3", "elite4", "champion"];
    const intros: string[][] = [
      ["Dra. Laura Tusell: Bienvenid{o} a la Liga. Soy Laura Tusell, del Alto Mando. Mi especialidad: el ciclo celular… y los parásitos que lo secuestran.", "Dra. Tusell: El huso mitótico no perdona errores. ¡Yo tampoco!"],
      ["Dr. Joaquim Martí: Toxinas que paralizan, espiroquetas que invaden el sistema nervioso, priones… Bienvenid{o} a la neurobiología infecciosa.", "Dr. Martí: Veamos si tus neuronas aguantan."],
      ["Dr. Jordi Barbé: Así que vienes a hablarme de genética. La Unidad de Urtaza ensució ese nombre. Yo te enseñaré lo que es la verdadera genética microbiana.", "Dr. Barbé: Regulón SOS, RecA, LexA… Mis Microos reparan su ADN más rápido de lo que tú lo dañas."],
      ["Dra. Montserrat Llagostera: Llevo toda una vida en esta Facultad estudiando la virulencia. Patógenos, fagos, sistemas de secreción…", "Dra. Llagostera: Soy la última del Alto Mando. ¡Demuéstrame que mereces ver al Campeón!"],
      ["Dr. Louis Pasteur: Bonjour. Así que tú eres quien ha llegado hasta aquí. Mis matraces de cuello de cisne demostraron que la vida no surge de la nada.", "Dr. Pasteur: Fermentación, anaerobiosis, vacunas… Y ahora, el último experimento: tú. «La suerte favorece a la mente preparada.» ¡Comencemos!"],
    ];
    const done = ["Dra. Tusell: Bien hecho. Sigue: te espera el Dr. Martí.", "Dr. Martí: Tienes buenos reflejos. Adelante.", "Dr. Barbé: Eso es genética de verdad. Continúa.",
      "Dra. Llagostera: Excelente. El Campeón te espera en el Rectorado.", "Dr. Pasteur: Ha sido un honor. Abajo, en la fosa abisal, te espera el origen de todo."];
    if (s.flags[`liga${k}`]) { await game.say(done[k - 1]); return; }
    for (const l of intros[k - 1]) await game.say(l);
    const portrait = ["tusell", "marti", "barbe", "llagostera", "pasteur"][k - 1];
    const tname = TRAINERS.get(ids[k - 1])!.name;
    const out = await startBattle(game, world, { battle: battleFor(game, trainerParty(ids[k - 1], s.difficulty, rng(game)), false, tname, s.difficulty === "facil" ? {} : { "medio-enriquecido": 2 }), wild: false,
      trainer: { name: tname.replace(/^Dra?\. /, ""), clase: k === 5 ? "Campeón" : "Alto Mando", portrait, lose: k === 5 ? "Magnifique… ¡Eres el nuevo Campeón!" : "Has superado mi laboratorio.", money: 500 } });
    if (out.outcome === "lose") {
      for (let j = 1; j <= 5; j++) delete s.flags[`liga${j}`];
      await whiteout(game, world); return;
    }
    s.flags[`liga${k}`] = true;
    world.refreshNpcs();
    if (k < 5) { await game.say(done[k - 1]); return; }
    // ¡Campeón!
    await game.say("Dr. Pasteur: Por la autoridad de la Facultad de Biociencias, te nombro Doctor Honoris Causa y Campeón de la Liga Micromón.");
    await game.say("Dr. Pasteur: Inscribiremos tu nombre y el de tus Microos en el Registro de Cepas Tipo de La UAB.");
    s.flags.campeon = true;
    await game.fade(true, 30);
    await game.run(new HallOfFame(s.party.slice(), s.name));
    await game.run(new Credits());
    s.lastHeal = { map: "casa-jugador", x: 4, y: 5 };
    world.load("casa-jugador", 4, 4, 0);
    saveGame(s);
    await game.fade(false, 30);
    await game.say(`Madre: ¡{nombre}! ¡Te he visto por la tele! ¡${s.avatar === "chica" ? "Campeona" : "Campeón"} de la Liga! Estoy orgullosísima.`);
    await game.say("(La partida se ha guardado. En el Rectorado de La UAB, la escalera del fondo baja a una fosa abisal…)");
  },

  async salirFosa(game, world) {
    await game.fade(true, 12);
    world.load("uab", 10, 8, 0);
    await game.fade(false, 12);
  },

  async congelador(game) {
    await congeladorMenu(game);
  },

  /** Recompensas del ayudante de la Profesora según las especies aisladas. */
  async ayudanteDex(game) {
    const s = S(game);
    const PREMIOS: [number, string, number][] = [[15, "criobola-azul", 5], [40, "criobola-amarilla", 5], [80, "medio-enriquecido", 5], [120, "atp-concentrado", 5], [150, "criobola-morada", 1]];
    const done = Number(s.flags.premiosDex ?? 0);
    const next = PREMIOS[done];
    if (!next) { await game.say(`Ayudante: ¡${s.caught.length} especies! Ya no me quedan premios. La Profesora dice que eres una leyenda.`); return; }
    if (s.caught.length < next[0]) {
      await game.say(`Ayudante: Llevas ${s.caught.length} especies aisladas. Cuando llegues a ${next[0]}, te daré un regalo de parte del laboratorio.`);
      return;
    }
    s.flags.premiosDex = done + 1;
    addItem(s, next[1], next[2]);
    audio.sfx("capture");
    await game.say(`Ayudante: ¡${next[0]} especies aisladas! Toma, te lo has ganado.`);
    await game.say(`¡{nombre} ha recibido ${next[2] > 1 ? next[2] + " × " : ""}${ITEMS.get(next[1])!.name}!`);
  },

  /** Intercambio con un PNJ: "quiere|da|mote". */
  async intercambio(game, _w, arg) {
    const s = S(game);
    const [need, give, nick] = (arg ?? "").split("|");
    const key = `trade-${give}`;
    const nn = getSpecies(need).name, gn = getSpecies(give).name;
    if (s.flags[key]) { await game.say(`¿Qué tal está ${nick}? ¡Seguro que te está dando mucha guerra! Cuídalo bien.`); return; }
    if (!(await game.yesno(`Estoy buscando un ${nn}. ¿Me cambias uno por mi ${gn}?`))) { await game.say("Vaya… Si cambias de idea, aquí estaré."); return; }
    const i = await partyMenu(game, { mode: "item", prompt: `¿Qué ${nn} me das?` });
    if (i < 0) return;
    const m = s.party[i];
    if (m.species !== need) { await game.say(`Eso no es un ${nn}… ¡Yo quiero un ${nn}!`); return; }
    const got = createMicroo(give, m.level, { rng: rng(game), nickname: nick });
    got.originalTrainer = "Vecino";
    s.party[i] = got;
    markSeen(s, give); markCaught(s, give);
    s.flags[key] = true;
    await game.say(`${displayNameOf(m)} se marcha… ¡y llega ${nick}!`);
    audio.sfx("capture");
    await game.say(`¡Gracias! Cuida de ${nick}, es muy especial para mí.`);
  },

  /** Examen sorpresa de microbiología (recompensa única). */
  async examen(game) {
    const s = S(game);
    if (s.flags.examen) { await game.say("Catedrático jubilado: ¡Mi mejor alumn{o}! Sigue estudiando, que la microbiología nunca se acaba."); return; }
    await game.say("Catedrático jubilado: Cuarenta años poniendo exámenes… ¿Te atreves con cinco preguntas? Si las aciertas todas, tendrás premio.");
    if (!(await game.yesno("¿Empezamos el examen?"))) return;
    const Q: [string, string[], number][] = [
      ["¿De qué color quedan las Gram+ tras la tinción de Gram?", ["Violeta", "Rosa", "Verde"], 0],
      ["¿Quién descubrió la penicilina en 1928?", ["Pasteur", "Fleming", "Koch"], 1],
      ["¿De qué bacteria sale la Taq polimerasa de la PCR?", ["E. coli", "B. subtilis", "T. aquaticus"], 2],
      ["¿Qué estructura permite la conjugación bacteriana?", ["El pilus", "El flagelo", "La cápsula"], 0],
      ["¿Qué usaba Fanny Hesse para solidificar los medios?", ["Gelatina", "Agar", "Almidón"], 1],
    ];
    let ok = 0;
    for (const [q, opts, right] of Q) {
      const r = await game.choose(opts, { prompt: q, cancel: -1 });
      if (r === right) { ok++; audio.sfx("ok"); } else audio.sfx("bump");
    }
    if (ok < Q.length) { await game.say(`Catedrático: ${ok} de ${Q.length}… Suspenso. ¡A septiembre! Vuelve cuando hayas repasado.`); return; }
    s.flags.examen = true;
    addItem(s, "criobola-amarilla", 3); addItem(s, "medio-enriquecido", 2);
    await game.say("Catedrático: ¡Matrícula de Honor! Toma, para tus prácticas de campo.");
    await game.say("¡{nombre} ha recibido 3 × Criobola Amarilla y 2 × Medio Enriquecido!");
  },

  /** Estación de Conjugación: evoluciones que en el GDD requieren intercambio (conjugación bacteriana). */
  async conjugacion(game, world) {
    const s = S(game);
    await game.say("Técnica de Conjugación: ¡Hola! Aquí ponemos a tu Microo junto a una cepa donadora. Con un pilus de conjugación, ¡pasan genes de una a otra!");
    await game.say("Técnica: Algunos Microos solo evolucionan así: Genitalium, Pyogenes, Bovis y Methanosar. ¿Probamos con alguno?");
    const i = await partyMenu(game, { mode: "item", prompt: "¿Qué Microo pones a conjugar?" });
    if (i < 0) return;
    const m = s.party[i];
    const to = conjugationEvolution(m);
    if (!to) { await game.say(`Técnica: Vaya… ${displayNameOf(m)} no ha aceptado ningún plásmido nuevo. No evoluciona por conjugación.`); return; }
    await game.say("Técnica: ¡El pilus se ha extendido! Transfiriendo el plásmido…");
    await evolutionSequence(game, m, to);
  },
};
