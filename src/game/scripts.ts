// Guiones de historia, conversaciones y combates.
import type { Game } from "./game";
import { audio } from "./audio";
import { T as ED } from "./edicion";
import { clubConexion } from "./conexion";
import { curiosidadPara } from "./curiosidades";
import type { Overworld, NpcState } from "./scenes/overworld";
import { BattleScene, battleTrack, type BattleSetup, type BattleOutcome } from "./scenes/battle";
import { ponerMote } from "./scenes/nombre";
import { PetriSweep, WildIntro, CurtainOpen } from "./scenes/transiciones";
import { shopMenu, congeladorMenu, partyMenu, BadgeGet } from "./scenes/menus";
import { evolutionSequence } from "./scenes/battle";
import { SlotMachine, fichas } from "./scenes/casino";
import { HallOfFame, Credits } from "./scenes/creditos";
import { saveGame } from "./state";
import { Battle, Rng, createMicroo, trainerParty, fullHeal, getSpecies, SPECIES, TRAINERS, ITEMS, conjugationEvolution, type Microo } from "../engine";
import { addItem, markCaught, markSeen, obeyCap, levelCap } from "./state";
import { MAPS } from "./world/maps";

const COUNTER: Record<string, string> = { synechoc: "butyricum", butyricum: "paramec", paramec: "synechoc" };

async function darMascara(game: Game) {
  await game.say("Dra. Gajú: Por cierto, toma esto. En la Ruta 4 hay una cueva sin oxígeno llena de metanógenas.");
  addItem(game.state, "mascara-de-gases");
  await game.say("¡{nombre} ha recibido la MÁSCARA DE GASES!");
  await game.say("Dra. Gajú: Con ella podrás entrar en la Cueva Anaeróbica. Y el Túnel Endospórico está a oscuras: ¡usa Quorum Sensing Lux!");
}
/** Tras ganar una medalla: hasta qué nivel obedecen ahora los Microos. */
async function avisoObediencia(game: Game) {
  const c = obeyCap(game.state);
  if (c >= 100) await game.say("¡Con las ocho medallas, todos los Microos te obedecerán, tengan el nivel que tengan!");
  else await game.say(`Con ${game.state.badges.length === 1 ? "esta medalla" : `${game.state.badges.length} medallas`}, los Microos de hasta nivel ${c} te obedecerán en combate.`);
  if (game.state.difficulty === "dificil") {
    const lc = levelCap(game.state);
    await game.say(lc >= 100 ? "Presión Antibiótica: ya no hay límite de nivel." : `Presión Antibiótica: tus Microos ya pueden crecer hasta el nivel ${lc}.`);
  }
}
/** Regala un Microo al jugador (al equipo o al Congelador si está lleno). */
async function giveMicroo(game: Game, sp: string, lv: number) {
  const m = createMicroo(sp, lv, { rng: rng(game) });
  m.originalTrainer = game.state.name;
  markSeen(game.state, sp); markCaught(game.state, sp);
  if (game.state.party.length < 6) game.state.party.push(m); else game.state.box.push(m);
  await game.say(`¡{nombre} ha recibido a ${getSpecies(sp).name}!`);
  await ponerMote(game, m);
  if (game.state.party.at(-1) !== m) await game.say(`${getSpecies(sp).name} se ha enviado al Congelador de cepas.`);
}
const MAPS_EXIST = (id: string) => !!MAPS[id];
const displayNameOf = (m: Microo) => m.nickname ?? getSpecies(m.species).name;

// ---------------------------------------------------------------- combates
export { battleFor };
export async function startBattle(game: Game, world: Overworld, setup: Omit<BattleSetup, "env">): Promise<BattleOutcome> {
  const prev = game.scene;
  // la música del combate empieza con la transición (y corta la del mapa, sin solaparse)
  audio.music(battleTrack(setup));
  const trainer = !setup.wild;
  await game.run(trainer ? new PetriSweep(true) : new WildIntro());
  game.blackout = 1;
  const scene = new BattleScene(game, { ...setup, env: world.map.env });
  game.scene = scene;
  await game.wait(6);
  await game.run(trainer ? new PetriSweep(false) : new CurtainOpen());
  game.blackout = 0;
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
    difficulty: game.state.difficulty, playerName: game.state.name, foeName: name, foeItems, obeyCap: game.noObey ? 100 : obeyCap(game.state), levelCap: levelCap(game.state),
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
    await ponerMote(game, m);
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
    // sale por la puerta del laboratorio (alfombra en x 5-6, fila 9): baja, va hacia la puerta y sale
    if (rival) {
      await world.walkNpc(rival, 0, 1);
      await world.walkNpc(rival, 3, Math.max(0, 5 - rival.x));
      await world.walkNpc(rival, 0, Math.max(0, 9 - rival.y));
      audio.sfx("door");
    }
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
    await game.say("Profesora Hesse: Un consejo: los Microos muy crecidos no respetan a un investigador novato. Por encima de nivel 15 no te harán caso…");
    await game.say("Profesora Hesse: …hasta que ganes medallas de gimnasio. Cada medalla demuestra tu experiencia y sube ese límite.");
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
    const stock = (arg ?? "").split(",");
    const plasmidos = stock.every((i) => ITEMS.get(i)?.kind === "tm");
    if (!plasmidos) await game.say("¡Bienvenid{o} a la Tienda de Medios!");
    else await game.say("¡Plásmidos recién transformados y purificados! Se pueden usar todas las veces que quieras.");
    await shopMenu(game, stock);
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
    await game.run(new BadgeGet("probiotico"));
    await avisoObediencia(game);
    s.flags.medalla1 = true;
    await game.say("Dr. Solé: Te has ganado la MEDALLA PROBIÓTICO.");
    await game.say("¡{nombre} ha recibido la MEDALLA PROBIÓTICO del Dr. Solé!");
    await game.say("Dr. Solé: Con ella podrás usar Celulasa fuera de combate para cortar los arbustos que bloquean el camino.");
    await game.say("Dr. Solé: Por cierto… dicen que en el Monte Micelio, al norte, ronda gente con portátiles y muy mala cara. Ten cuidado.");
  },

  // ---------------------------------------------------------------- Monte Micelio y Ciudad Cultivo
  async regaloRuta1(game) {
    const s = S(game);
    if (s.flags.regaloRuta1) { await game.say("Dependiente: ¡Que vaya bien el viaje! Si necesitas más, en Ciudad Viral tenemos tienda."); return; }
    await game.say("Dependiente: ¡Hola! Trabajo en la Tienda de Medios de Ciudad Viral. Estamos regalando muestras.");
    await game.say("Dependiente: Toma, un Medio LB. Recupera 60 PS a un Microo.");
    addItem(s, "medio-lb"); s.flags.regaloRuta1 = true;
    await game.say("¡{nombre} ha recibido un MEDIO LB!");
  },
  async placaKoch(game) {
    const s = S(game);
    if (s.flags.placaKoch) { await game.say("Arqueólogo: Cuídala. Sin esas placas de gelatina, Hesse nunca habría pensado en el agar."); return; }
    await game.say("Arqueólogo: … Shh. Estoy escuchando la roca. Aquí había un laboratorio de campaña hace más de un siglo.");
    await game.say("Arqueólogo: Mira lo que encontré enterrado: una placa de gelatina de 1881. Las usaba Robert Koch, antes del agar.");
    await game.say("Arqueólogo: La gelatina se derretía a 37 °C y algunas bacterias se la comían. Por eso Fanny Hesse propuso el agar de las mermeladas de su madre.");
    addItem(s, "placa-koch"); s.flags.placaKoch = true;
    await game.say("¡{nombre} ha recibido la PLACA DE KOCH!");
  },

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
    await game.say("Dr. Isaac Salazar: ¿Qué quieres?");
    await game.say("{nombre}: …");
    await game.say("Dr. Salazar: Si vienes a quejarte del olor, abre una ventana.");
    await game.say("Dr. Salazar: El servidor funciona. Que tú tengas problemas con el resto de la instalación no es asunto mío.");
    await game.say("Dr. Salazar: Jaime quiere los datos. Yo quiero que me dejen tranquilo.");
    await game.say("Dr. Salazar: No me toques. Y no desenchufes nada.");
    const team = [createMicroo("niger", 15, { rng: rng(game) }), createMicroo("fragilis", 16, { rng: rng(game) }), createMicroo("desulfovib", 17, { rng: rng(game) })];
    const out = await startBattle(game, world, { battle: battleFor(game, team, false, "Dr. Salazar"), wild: false,
      trainer: { name: "Isaac Salazar", clase: "Ejecutivo", portrait: "salazar", lose: "Qué pérdida de tiempo.", money: 400 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    await game.say("Dr. Salazar: Qué pérdida de tiempo. Tengo que volver a revisar los registros.");
    await game.say("Dr. Salazar: La Unidad tiene planes más grandes. Si te interesa seguir molestando, busca a alguien que tenga ganas de hablar.");
    await game.fade(true, 14);
    s.flags.salazar1 = true;
    s.flags.disco = true;
    world.refreshNpcs();
    await game.fade(false, 14);
    await game.say("Al marcharse, el Dr. Salazar ha dejado el disco duro en el suelo. En la carcasa hay una etiqueta: «BACKUP_FINAL_v3_ESTE_SÍ».");
    if (!s.bag["disco-duro"]) addItem(s, "disco-duro");
    await game.say("¡{nombre} ha guardado el DISCO DURO EXTERNO en la mochila!");
    await game.say("Los becarios retenidos han salido corriendo hacia Ciudad Cultivo.");
  },

  async discoDuro(game, world) {
    const s = S(game);
    if (!s.flags.salazar1) { await game.say("Dr. Salazar: No me toques. Y no desenchufes nada."); return; }
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
    await game.say("{rival}: ¿Ves a esos tipos de ahí arriba? Llevan portátiles, mochilas y unas batas que parecen no haber pasado por una lavadora. No sé qué hacen, pero no tienen pinta de excursionistas.");
    await game.say("{rival}: En fin, seguro que no es nada. ¡Vamos, que aún nos queda camino!");
    await game.say("{rival}: Pero antes… he entrenado mucho. ¡Esta vez no tienes nada que hacer!");
    const rv = String(s.flags.rivalStarter ?? "butyricum");
    const evo = [...SPECIES.values()].find((x) => x.evolvesFrom === rv && x.evolution?.method === "level" && (x.evolution.level ?? 99) <= 15);
    const foe = [createMicroo("rhizopupa", 13, { rng: rng(game) }), createMicroo("subtilis", 13, { rng: rng(game) }), createMicroo(evo?.id ?? rv, 15, { rng: rng(game) })];
    const out = await startBattle(game, world, { battle: battleFor(game, foe, false, s.rival), wild: false,
      trainer: { name: s.rival, clase: "Rival", portrait: "rival", lose: "¡¿Otra vez?! ¡Mi cultivo estaba contaminado!", money: 30 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    s.flags.rival3 = true;
    await game.say("{rival}: Voy a cruzar la cueva antes que tú. La líder de Ciudad Cultivo cultiva algas en columnas gigantes… ¡seguro que yo lo entiendo antes!");
    if (r) await world.walkNpc(r, 3, 6);
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
    await game.run(new BadgeGet("tapete"));
    await avisoObediencia(game);
    s.flags.medalla2 = true;
    await game.say("Dra. Gajú: Te has ganado la MEDALLA TAPETE.");
    await game.say("¡{nombre} ha recibido la MEDALLA TAPETE de la Dra. Gajú!");
    await game.say("Dra. Gajú: Con ella podrás usar Quorum Sensing Lux fuera de combate para iluminar los lugares oscuros.");
    await darMascara(game);
  },

  // ---------------------------------------------------------------- Cueva Anaeróbica, Túnel Endospórico y Ciudad Gram
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
    await game.run(new BadgeGet("micelio"));
    await avisoObediencia(game);
    s.flags.medalla3 = true;
    await game.say("Dra. Guàrdia: Te has ganado la MEDALLA MICELIO.");
    await game.say("¡{nombre} ha recibido la MEDALLA MICELIO de la Dra. Guàrdia!");
    await game.say("Dra. Guàrdia: Con ella podrás usar Flagelo Polar fuera de combate cuando lo consigas.");
  },

  // ---------------------------------------------------------------- Ciudad Aerobia, Casino y Torre Prión
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
    await game.say("Dr. Antonio Barbadilla: Ah. Un visitante. Acércate, que no muerdo.");
    await game.say("Dr. Barbadilla: Tienes una expresión muy interesante. ¿Siempre miras así a los investigadores?");
    await game.say("Dr. Barbadilla: Soy el doctor Barbadilla. Quizá hayas oído hablar de mí. He estado en congresos importantes. Algunos muy importantes.");
    await game.say("{nombre}: …");
    await game.say("Dr. Barbadilla: La PCR cuantitativa está muy bien, pero donde esté una buena PCR convencional… La gente se ha vuelto demasiado dependiente de las máquinas.");
    await game.say("Dr. Barbadilla: Eso ya se sabía en los años noventa. Lo que pasa es que ahora nadie lee.");
    await game.say("Dr. Barbadilla: ¿Me estás llevando la contraria? Te recomiendo que leas un poquito más.");
    const team = [createMicroo("volvox", 30, { rng: rng(game) }), createMicroo("spirulmax", 31, { rng: rng(game) }), createMicroo("salinarum", 31, { rng: rng(game) })];
    const out = await startBattle(game, world, { battle: battleFor(game, team, false, "Dr. Barbadilla"), wild: false,
      trainer: { name: "Antonio Barbadilla", clase: "Ejecutivo", portrait: "barbadilla", lose: "¡Imposible! Espera… no te acerques tanto.", money: 500 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    await game.say("Dr. Barbadilla: ¡Imposible! Espera… no te acerques tanto, que necesito comprobar una cosa en el reflejo de esa pantalla.");
    await game.say("El Dr. Barbadilla se mira en el cristal y se arregla el peinado.");
    s.flags.barbadilla1 = true;
    world.refreshNpcs();
  },

  async casillas(game, world) {
    const s = S(game);
    await game.say("Dra. Sonia Casillas: ¡Por fin alguien nuevo! ¿Has comido? Tengo un táper de sobra.");
    await game.say("Dra. Casillas: Los chicos están muy ocupados. Hay que cuidarlos, ¿sabes? A veces se olvidan de comer cuando están con sus análisis.");
    await game.say("Becario: Doctora, hoy habíamos dicho que salíamos a las seis.");
    await game.say("Dra. Casillas: ¿Cómo que a las seis? Si todavía queda muchísimo por hacer. Lo importante es formarte. Ya tendrás tiempo de descansar cuando tengas una plaza.");
    await game.say("Dra. Casillas: No os preocupéis, que yo os organizo. He preparado turnos para que nadie se quede sin cenar.");
    await game.say("Becario: El turno de noche también cuenta como cena, doctora.");
    await game.say("Dra. Casillas: ¡Qué gracioso! Anda, guarda el táper.");
    const team = [createMicroo("kefirgran", 30, { rng: rng(game) }), createMicroo("putida", 30, { rng: rng(game) }), createMicroo("myxococcus", 31, { rng: rng(game) }), createMicroo("crescentus", 31, { rng: rng(game) })];
    const out = await startBattle(game, world, { battle: battleFor(game, team, false, "Dra. Casillas", { "medio-tsb": 1 }, "double"), wild: false,
      trainer: { name: "Sonia Casillas", clase: "Comandante", portrait: "casillas", lose: "No me gusta que te metas con mis chicos.", money: 500 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    await game.say("Dra. Casillas: No me gusta que te metas con mis chicos. Son buenos muchachos. Solo necesitan aprender a comprometerse.");
    s.flags.casillas1 = true;
    world.refreshNpcs();
  },

  async urtaza(game, world) {
    const s = S(game);
    if (!s.flags["disco-roto"]) {
      // ESCENA 6 — el disco duro de campo y el dataset global de Vibrio
      await game.say("El Dr. Jaime Martínez-Urtaza está leyendo un informe. Al ver el disco duro en tus manos, extiende la mano sin levantar la voz.");
      await game.say("Dr. Jaime Martínez-Urtaza: Eso que llevas. Dámelo, por favor.");
      await game.say("Dr. Martínez-Urtaza: Es el disco de campo. Me preguntaba dónde había acabado.");
      await game.say("{nombre}: …");
      await game.say("Dr. Martínez-Urtaza: No es una petición complicada.");
      await game.say("Un becario se acerca a recoger el disco. Al girarse, tropieza con un cable de alimentación… ¡El disco cae al suelo con un golpe seco y la carcasa se abre!");
      await game.say("Becario: ¡Lo siento! ¡Lo siento muchísimo, doctor!");
      await game.say("Jaime recoge el disco y examina la carcasa. Su voz es baja, casi amable.");
      await game.say("Dr. Martínez-Urtaza: Vaya…");
      await game.say("Dr. Martínez-Urtaza: Por suerte tenemos una copia de seguridad, ¿verdad?");
      await game.say("Becario: …");
      await game.say("Dr. Martínez-Urtaza: ¿Verdad?");
      await game.say("Becario: Yo… Pensaba que la sincronización del servidor se había completado.");
      await game.say("Dr. Martínez-Urtaza: No te he preguntado qué pensabas. Te he preguntado si tenemos una copia.");
      await game.say("Becario: No, doctor. No hay copia de seguridad.");
      await game.say("Jaime levanta lentamente la mirada.");
      await game.say("Dr. Martínez-Urtaza: ¿Cómo que no hay copia de seguridad?");
      await game.say("Becario: El servidor estaba dando problemas. La última sincronización no terminó. Pensé que podríamos hacerla después.");
      await game.say("Dr. Martínez-Urtaza: ¿Pensaste que podríamos hacerla después?");
      await game.say("Dr. Martínez-Urtaza: ¡Había registros de distribución, campañas, series temporales, observaciones ambientales! ¡Décadas de trabajo reunidas en un único archivo! ¡Todo mi dataset de Vibrio!");
      await game.say("Dr. Martínez-Urtaza: ¡Treinta años de trabajo! ¡Treinta! ¿Tienes la más mínima idea de lo que acabas de destruir?");
      await game.say("Becario: Lo siento, doctor…");
      await game.say("Dr. Martínez-Urtaza: ¡No! No lo sientes. Si lo sintieras, habrías comprobado el estado de la copia. Te confié una tarea elemental.");
      await game.say("Dr. Martínez-Urtaza: ¡Fuera!");
      await game.say("Becario: Doctor, yo…");
      await game.say("Dr. Martínez-Urtaza: ¡FUERA!");
      await game.fade(true, 12);
      if (s.bag["disco-duro"]) addItem(s, "disco-duro", -1);
      s.flags["disco-roto"] = true;
      world.refreshNpcs();
      await game.fade(false, 12);
      await game.say("Jaime mira los gráficos de Vibrio de la pared. Deja el disco roto sobre la mesa con cuidado y apaga la pantalla.");
      await game.say("Dr. Martínez-Urtaza: Treinta años…");
      await game.say("Dr. Martínez-Urtaza: No voy a improvisar una solución ahora. Fuera de mi despacho.");
      await game.say("Dr. Martínez-Urtaza: No necesito que estés de acuerdo conmigo. Necesito que seas capaz de comprenderlo.");
      await game.say("Dr. Martínez-Urtaza: Ahora, si me disculpas, tengo que ocuparme de este desastre.");
    }
    // ESCENA 7 — combate 1
    await game.say("Jaime se coloca detrás de su mesa. Ya no parece enfadado: ha vuelto a su tono de autoridad.");
    await game.say("Dr. Martínez-Urtaza: No todos estamos hechos para conformarnos con resultados mediocres. Veamos si tienes algo más que suerte.");
    await game.say("Dr. Martínez-Urtaza: He dormido cuatro horas durante años. No necesito que me expliques lo que cuesta llegar a lo más alto.");
    const team = [createMicroo("cholerae", 31, { rng: rng(game) }), createMicroo("klebsi", 31, { rng: rng(game) }), createMicroo("smegmatis", 32, { rng: rng(game) }), createMicroo("aeruginosa", 33, { rng: rng(game) })];
    const out = await startBattle(game, world, { battle: battleFor(game, team, false, "Dr. Martínez-Urtaza", { "medio-tsb": 2 }), wild: false,
      trainer: { name: "Jaime Martínez-Urtaza", clase: "Líder de la Unidad", portrait: "urtaza", lose: "Un resultado atípico. Eso es todo.", money: 800 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    await game.say("Dr. Martínez-Urtaza: Un resultado atípico. Eso es todo. No confundas una anomalía con una conclusión.");
    await game.say("Dr. Martínez-Urtaza: Tengo planes mucho más grandes que este despacho. ¡Fuera de mi vista!");
    await game.say("Jaime se queda solo mirando la pantalla apagada. Ha dejado de intentar reconstruir el trabajo perdido.");
    await game.say("Dr. Martínez-Urtaza (en voz baja): Si no puedo recuperar lo que he perdido, tendré que encontrar algo que esté por encima de todo lo que he hecho hasta ahora.");
    await game.say("Dr. Martínez-Urtaza: El legendario de Isla Conjugada… Si consigo que responda a un modelo, ya no estaré intentando explicar el mundo. Podré cambiarlo.");
    await game.fade(true, 12);
    s.flags.urtaza1 = true;
    world.refreshNpcs();
    await game.fade(false, 12);
    await game.say("Jaime ha abandonado el despacho. Encima de la mesa ha quedado algo…");
    addItem(s, "western-blot");
    s.flags.blot = true;
    await game.say("¡{nombre} ha encontrado el WESTERN BLOT! Con él podrás identificar las proteínas de la Torre Prión.");
  },

  async albaHernandez(game, world) {
    const s = S(game);
    if (s.flags.hernandez1) return;
    const h = world.npc("hernandez");
    if (h) { h.emote = 40; h.dir = 0; await game.wait(30); }
    await game.say("Dra. Alba Hernández: Has llegado más lejos de lo que esperaba. He seguido tus avances. No es habitual encontrar a alguien con tu capacidad a estas alturas del viaje.");
    await game.say("Dra. Hernández: No hace falta que esto termine en un combate. Preferiría que habláramos.");
    await game.say("Dra. Hernández: Jaime siempre ha tenido una visión extraordinaria para detectar oportunidades. También puede ser impulsivo. Parte de mi trabajo consiste en que el proyecto no se desvíe y en que cada persona pueda aportar lo mejor que sabe hacer.");
    await game.say("Dra. Hernández: La Unidad puede ofrecerte recursos, acceso a proyectos de primer nivel y una carrera brillante. No tendrías que abrirte camino a ciegas ni conformarte con oportunidades pequeñas.");
    await game.say("Dra. Hernández: Sé lo que se dice de nosotros. No voy a negar que aquí se trabaja mucho ni que hay cosas que deberían hacerse mejor. Pero también hay talento, medios y proyectos que pueden cambiar tu futuro.");
    await game.say("Dra. Hernández: No te estoy pidiendo que decidas ahora. Solo quiero que veas lo que podrías conseguir si trabajaras con nosotros. Puedo ayudarte a encontrar tu sitio en el proyecto.");
    await game.say("Dra. Hernández: Jaime quiere ir más deprisa de lo que conviene. Yo intento que la ambición tenga dirección, que los equipos funcionen y que no perdamos de vista el objetivo común.");
    await game.say("Dra. Hernández: Podrías unirte. Con tu talento, podrías tener una carrera brillante aquí. No estarías limitad{o} a observar desde fuera.");
    await game.say("{nombre}: …");
    await game.say("Dra. Hernández: Piénsalo. No todas las puertas se abren dos veces. Ya hablaremos cuando hayas visto el proyecto completo.");
    await game.fade(true, 12);
    s.flags.hernandez1 = true;
    world.refreshNpcs();
    await game.fade(false, 12);
    await game.say("La Dra. Hernández ha desaparecido entre la niebla…");
  },

  async jubiladoTorre(game) {
    const s = S(game);
    if (s.flags.plasmidoVir) { await game.say("Investigador jubilado: No sé qué pretende esa gente con sus proyectos, pero no deberían tratar el conocimiento como si fuera propiedad de una sola persona."); return; }
    await game.say("Investigador jubilado: Gracias por abrir la puerta. La doctora Hernández no quería que saliera hasta que le entregara unos materiales.");
    await game.say("Investigador jubilado: Toma. Es un Plásmido Vir. Puede servirte para evolucionar a Cholerae.");
    addItem(s, "plasmido-vir");
    s.flags.plasmidoVir = true;
    await game.say("¡{nombre} ha recibido el PLÁSMIDO VIR! Hace evolucionar a Cholerae.");
    await game.say("Investigador jubilado: No sé qué pretende esa gente con sus proyectos, pero no deberían tratar el conocimiento como si fuera propiedad de una sola persona.");
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
    await game.run(new BadgeGet("catalasa"));
    await avisoObediencia(game);
    s.flags.medalla4 = true;
    await game.say("Dr. Yero: Te has ganado la MEDALLA CATALASA.");
    await game.say("¡{nombre} ha recibido la MEDALLA CATALASA del Dr. Yero!");
  },

  // ---------------------------------------------------------------- Ciudad Agar y Reserva
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
    await game.run(new BadgeGet("quimiostato"));
    await avisoObediencia(game);
    s.flags.medalla5 = true;
    await game.say("Dr. Mas: Te has ganado la MEDALLA QUIMIOSTATO.");
    await game.say("¡{nombre} ha recibido la MEDALLA QUIMIOSTATO del Dr. Mas!");
    await game.say("Dr. Mas: Necesito que vayas al Instituto de Biotecnología, al este. La Unidad de Genética ha tomado el edificio.");
    await game.say("Dr. Mas: El doctor Yero está dentro intentando ayudar al personal. El gimnasio de Conchillo está cerrado y no podemos acceder a la sala de servidores.");
    await game.say("Dr. Mas: No sabemos qué buscan, pero no parece una simple ocupación.");
  },

  // ---------------------------------------------------------------- Instituto de Biotecnología y Ciudad Pili
  async yeroInstituto(game, world) {
    const s = S(game);
    if (!s.flags["yero-equipo"]) {
      await game.say("Dr. Daniel Yero: Menos mal que has llegado. La planta baja está despejada, pero han bloqueado los ascensores.");
      await game.say("Dr. Yero: Te acompañaré. No pienso dejar que conviertan el Instituto en una oficina privada.");
      await game.say("Dr. Yero: Toma, que tu equipo entre en plena forma.");
      for (const m of s.party) fullHeal(m);
      await game.say("¡El equipo de {nombre} se ha recuperado por completo!");
      s.flags["yero-equipo"] = true;
      s.flags.seguidor = "yero";
      world.refreshNpcs();
      world.colocarSeguidor();
      await game.say("¡El Dr. Yero se une a {nombre}!");
      await game.say("Dr. Yero: ¡Adelante! Te sigo de cerca. La sala de servidores está en la planta 5.");
      return;
    }
    await game.say("Dr. Yero: ¡Corre, la sala de servidores está en la planta 5!");
  },

  /** Hablar con quien te acompaña (el Dr. Yero en el Instituto). */
  async hablarSeguidor(game) {
    const s = S(game);
    if (s.flags.seguidor === "yero") {
      await game.say(s.map === "instituto-5" ? "Dr. Yero: ¡Ahí están Antonio y Sonia! Esta vez lucharemos juntos." : "Dr. Yero: ¡Te sigo! La sala de servidores está en la planta 5.");
      return;
    }
    await game.say("…");
  },

  async asedioEjecutivos(game, world) {
    const s = S(game);
    // los dos se giran hacia el jugador
    for (const id of ["i5-barbadilla", "i5-casillas"]) {
      const n = world.npc(id);
      if (n) n.dir = Math.abs(world.px - n.x) > Math.abs(world.py - n.y) ? (world.px > n.x ? 3 : 2) : (world.py > n.y ? 0 : 1);
    }
    await game.say("Dr. Òscar Conchillo: ¡No toquéis ese terminal! Llevo cinco días calculando árboles de diez mil réplicas.");
    await game.say("Dr. Conchillo: Me han bloqueado el acceso administrativo y quieren que les entregue las credenciales del clúster.");
    await game.say("Dr. Barbadilla: Doctor Conchillo, no hace falta ponerse así. Estamos intentando mejorar la gestión del Instituto.");
    await game.say("Dr. Barbadilla: Por cierto, ¿te has fijado en que la luz de esta sala me favorece?");
    await game.say("Dra. Casillas: No os alteréis. He traído algo de comer. Hay que mantener la cabeza despejada.");
    await game.say("Dra. Casillas: Conchillo, cariño, si nos das las claves podremos terminar antes y todos podremos irnos a casa.");
    await game.say("Dr. Conchillo: No voy a entregar las credenciales.");
    await game.say("Dr. Barbadilla: Qué carácter. Deberías leer algo sobre colaboración institucional.");
    await game.say("Dr. Yero: Se acabó. No vais a seguir utilizando a la gente de este Instituto. ¡{nombre}, tú y yo contra ellos dos!");
    const r = rng(game);
    // Barbadilla (vistoso y simétrico) y Casillas (protectora): tres Microos cada uno
    const team = [createMicroo("volvox", 40, { rng: r }), createMicroo("kefirgran", 40, { rng: r }), createMicroo("salinarum", 41, { rng: r }),
      createMicroo("myxococcus", 41, { rng: r }), createMicroo("spirulmax", 41, { rng: r }), createMicroo("aeruginosa", 42, { rng: r })];
    // el Dr. Yero lucha a tu lado con sus levaduras
    const yero = [createMicroo("pichiamax", 42, { rng: r }), createMicroo("neoformans", 41, { rng: r }), createMicroo("auris", 41, { rng: r })];
    const battle = new Battle({ player: game.state.party, foe: team, wild: false, format: "double", seed: (s.seed ^ s.playFrames) >>> 0,
      difficulty: s.difficulty, playerName: s.name, foeName: "Barbadilla y Casillas", foeItems: { "medio-enriquecido": 2 },
      obeyCap: game.noObey ? 100 : obeyCap(s), levelCap: levelCap(s), inventory: {}, ally: { name: "Dr. Yero", microos: yero } });
    const out = await startBattle(game, world, { battle, wild: false, ally: { name: "Dr. Yero" },
      trainer: { name: "Barbadilla y Casillas", clase: "Ejecutivos", portrait: "barbadilla", portrait2: "casillas", lose: "¡Imposible! ¡Esto no estaba previsto!", money: 300 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    await game.say("Dr. Barbadilla: ¡Imposible! ¡Esto no estaba previsto!");
    await game.say("Dra. Casillas: ¡Chicos, atrás! No os preocupéis, luego hablamos de lo ocurrido. Y alguien que recoja los tápers.");
    await game.say("Dr. Yero: ¡Lo hemos conseguido! Formamos buen equipo, {nombre}.");
    await game.fade(true, 12);
    s.flags["conchillo-libre"] = true;
    s.flags.seguidor = "";
    world.seguidor = null;
    world.refreshNpcs();
    await game.fade(false, 12);
    await game.say("Dr. Òscar Conchillo: Gracias. Ya puedo entrar como administrador.");
    await game.say("Dr. Conchillo: Voy a revocar el acceso de la Unidad al clúster. No volverán a usar nuestros recursos.");
    await game.say("La pantalla muestra «credenciales revocadas».");
    await game.say("Dr. Conchillo: Jaime estaba buscando algo en la planta 11. Una especie de dispositivo de conservación. La Criobola Morada.");
    await game.say("Dr. Conchillo: Si todavía no la ha conseguido, no podemos dejar que se la lleve.");
    await game.say("Dr. Conchillo: Cuando termines, ven a mi gimnasio. Te debo un duelo limpio de pura bioinformática.");
  },

  async urtazaInstituto(game, world) {
    const s = S(game);
    if (!s.flags["conchillo-libre"]) {
      await game.say("Dr. Martínez-Urtaza: ¿Tú otra vez? Estoy ocupado. Mis ejecutivos de la planta 5 se encargarán de ti.");
      return;
    }
    await game.say("Jaime examina la Criobola Morada, que sigue dentro de una vitrina.");
    await game.say("Dr. Martínez-Urtaza: Llegas tarde. Este dispositivo es extraordinariamente interesante.");
    await game.say("Dr. Martínez-Urtaza: No es mío todavía, pero lo será. Su capacidad de conservación podría mantener contenido al Microo legendario y permitir que el sistema de control lo sometiera al modelo. No necesito la Criobola como trofeo: necesito lo que puede hacer.");
    await game.say("{nombre}: …");
    await game.say("Dr. Martínez-Urtaza: ¿Los creadores en la autoría? Por favor. La autoría no es un premio de participación.");
    await game.say("Dr. Martínez-Urtaza: La investigación exige resultados. Y los resultados exigen personas dispuestas a tomar decisiones.");
    const r = rng(game);
    const team = [createMicroo("parahaemolyticus", 43, { rng: r }), createMicroo("vulnificus", 43, { rng: r }), createMicroo("tuberculos", 44, { rng: r })];
    const out = await startBattle(game, world, { battle: battleFor(game, team, false, "Dr. Martínez-Urtaza", { "medio-enriquecido": 2 }), wild: false,
      trainer: { name: "Jaime Martínez-Urtaza", clase: "Líder de la Unidad", portrait: "urtaza", lose: "¡Desgraciado sin futuro!", money: 900 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    await game.say("Dr. Martínez-Urtaza: ¡Desgraciado sin futuro!");
    await game.say("Dr. Martínez-Urtaza: No has entendido nada. Esto no termina aquí.");
    await game.fade(true, 12);
    s.flags.urtaza2 = true;
    world.refreshNpcs();
    await game.fade(false, 12);
    await game.say("El Dr. Martínez-Urtaza ha huido hacia la Isla Conjugada sin la Criobola Morada…");
  },

  async directorInstituto(game, world) {
    const s = S(game);
    if (!s.flags.urtaza2) { await game.say("Directora del Instituto: ¡Cuidado! Ese hombre quiere llevarse nuestro prototipo…"); return; }
    if (!s.flags.morada) {
      await game.say("Directora del Instituto: Gracias por impedir que se llevaran esto. La Criobola Morada debe permanecer bajo custodia.");
      await game.say("Directora: No sé qué pretendía Jaime, pero no podemos permitir que se apropie de material del Instituto.");
      await game.say("Directora: Congelación instantánea en nitrógeno líquido: nunca falla. Quédatela tú. Contigo estará a salvo.");
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
    await game.run(new BadgeGet("algoritmo"));
    await avisoObediencia(game);
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

  // ---------------------------------------------------------------- Ruta 9, Ciudad Pili e islas
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
    await game.run(new BadgeGet("ziehl"));
    await avisoObediencia(game);
    s.flags.medalla7 = true;
    await game.say("Dra. Luquin: Te has ganado la MEDALLA ZIEHL-NEELSEN.");
    await game.say("¡{nombre} ha recibido la MEDALLA ZIEHL-NEELSEN de la Dra. Luquin!");
    addItem(s, "billete-ferri");
    await game.say("Dra. Luquin: Necesito pedirte un favor. Han llegado noticias de que Jaime Martínez-Urtaza se ha refugiado en Isla Conjugada.");
    await game.say("Dra. Luquin: La Mansión de las Cepas lleva años cerrada, pero parece que alguien ha reactivado sus instalaciones.");
    await game.say("Dra. Luquin: No sé qué está preparando. Toma este billete de ferri. Si hay alguien capaz de averiguarlo, eres tú.");
    await game.say("¡{nombre} ha recibido el BILLETE DE FERRI!");
  },

  async ferri(game, world) {
    const s = S(game);
    if (!s.bag["billete-ferri"]) { await game.say("Marinero: El ferri a las islas solo admite pasajeros con billete. ¡La Dra. Luquin del gimnasio los reparte!"); return; }
    const all: [string, string, number, number, boolean][] = [
      ["Ciudad Pili", "ciudad-pili", 16, 25, true], ["Islas Esporuladas", "islas-esporuladas", 10, 22, true],
      ["Isla Conjugada", "isla-conjugada", 18, 28, true], ["Calle Selección Natural", "calle-seleccion", 3, 22, s.badges.length >= 8],
    ];
    const opts = all.filter(([, id, , , ok]) => ok && MAPS_EXIST(id) && id !== world.map.id);
    await game.say("Marinero: ¡Todos a bordo! ¿A dónde vamos?", { keep: true });
    const c = await game.choose([...opts.map(([n]) => n), "QUEDARSE"], { x: 120, y: 40, cancel: opts.length });
    game.popKept();
    if (c < 0 || c >= opts.length) return;
    await game.fade(true, 20);
    await game.wait(30);
    // en la V2 las ciudades con puerto guardan su punto de llegada (el embarcadero cambia de sitio)
    const llegada = (MAPS[opts[c][1]] as { puntos?: Record<string, [number, number]> } | undefined)?.puntos?.ferri;
    world.load(opts[c][1], llegada?.[0] ?? opts[c][2], llegada?.[1] ?? opts[c][3], 1);
    await game.fade(false, 20);
    await game.say(`¡Habéis llegado a ${opts[c][0]}!`);
  },


  // ---------------------------------------------------------------- Carlos III y Mansión de las Cepas
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
      await game.say("Investigadora: Has demostrado que sabes cuidar de los Microos. Toma: lo revivimos de un sedimento marino profundo. Es una arquea muy especial.");
      await game.say("Investigadora: Lokiarchaeota… dicen que es pariente de nuestros antepasados eucariotas.");
      s.flags.lokiarca = true;
      await giveMicroo(game, "lokiarca", 45);
      return;
    }
    await game.say("Investigadora: Si encuentras un fósil microbiano, tráemelo. ¡En las Islas Esporuladas hay algunos atrapados en el hielo!");
  },

  async urtazaFinal(game, world) {
    const s = S(game);
    // ESCENA 6 — laboratorio profundo
    await game.say("Dr. Jaime Martínez-Urtaza: Ah. Has llegado.");
    await game.say("Dr. Martínez-Urtaza: Supongo que Campoy te habrá contado su versión. Siempre ha tenido cierta tendencia a confundir cautela con criterio.");
    await game.say("Dra. Campoy: Jaime, no puedes controlar lo que hay ahí dentro.");
    await game.say("Dr. Martínez-Urtaza: No necesito controlarlo todo. Solo necesito que el modelo sea correcto.");
    await game.say("Dr. Martínez-Urtaza: El Proyecto Pandemia Global.");
    await game.say("Dr. Martínez-Urtaza: Durante años he estudiado cómo cambian las poblaciones, cómo se distribuyen, cómo responden a su entorno. Vibrio me enseñó a mirar más allá de una muestra aislada. A pensar en sistemas.");
    await game.say("Dr. Martínez-Urtaza: El dataset global de Vibrio iba a ser la base de un trabajo extraordinario. Su pérdida fue un contratiempo. Nada más. He construido una nueva aproximación con otros registros disponibles y con los conocimientos que conservo.");
    await game.say("Dr. Martínez-Urtaza: Y entonces apareció esto.");
    await game.say("Dr. Martínez-Urtaza: No conseguí la Criobola Morada. Habría sido el medio ideal para mantenerlo contenido y someterlo al sistema. He reproducido parte de sus propiedades en este tanque. Debería bastar.");
    await game.say("Dr. Martínez-Urtaza: No quiero destruir el mundo. Quiero evitar que siga en manos de quienes no saben gestionarlo.");
    await game.say("Dra. Campoy: ¿Y quién decide quién merece quedarse?");
    await game.say("Dr. Martínez-Urtaza: Alguien tiene que decidir. La diferencia es que yo tengo la experiencia, los registros disponibles y la capacidad para hacerlo.");
    await game.say("Dr. Martínez-Urtaza: La ética es importante. Naturalmente. Pero no confundamos la ética con la falta de ambición.");
    await game.say("Dr. Martínez-Urtaza: No todos estamos hechos para conformarnos con resultados mediocres.");
    await game.say("Dr. Martínez-Urtaza: Algún día entenderás que hay personas que nacen para hacer historia y otras que nacen para leerla.");
    await game.say("Dr. Martínez-Urtaza: No necesito tu aprobación. Necesito que dejes de interponerte.");
    const r = rng(game);
    const team = trainerParty("villain", s.difficulty, r);
    const out = await startBattle(game, world, { battle: battleFor(game, team, false, "Dr. Martínez-Urtaza", { "medio-enriquecido": 3 }), wild: false,
      trainer: { name: "Jaime Martínez-Urtaza", clase: "Líder de la Unidad", portrait: "urtaza", lose: "Imposible. Mi modelo tenía un 99 % de precisión.", money: 1200 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    await game.say("Dr. Martínez-Urtaza: Imposible. Mi modelo tenía un 99 % de precisión.");
    await game.say("Dr. Martínez-Urtaza: El margen de error estaba calculado. Esto no puede estar ocurriendo.");
    await game.say("Dr. Martínez-Urtaza: ¡Obedece al script!");
    await game.say("El tanque empieza a vibrar. Las luces del sistema cambian de color. Suena una alarma y en el cristal aparece una grieta luminosa.");
    await game.say("Dr. Martínez-Urtaza: No. No, no, no. La respuesta estaba prevista. ¡Obedece al script!");
    await game.say(ED.tanque);
    await game.say("El Microo legendario ignora las órdenes de Jaime y se vuelve hacia él. El sistema de control deja de responder y Jaime retrocede, incapaz de comprenderlo.");
    await game.say("Dr. Martínez-Urtaza: ¡No! ¡Yo he construido el modelo! ¡Tú no deberías poder hacer eso!");
    await game.say("Dra. Campoy: No era tuyo, Jaime. Nunca lo ha sido.");
    await game.say("Dr. Martínez-Urtaza: ¡Silencio!");
    await game.say("Jaime mira las pantallas. El modelo muestra errores en cascada.");
    await game.say("Dr. Martínez-Urtaza: No. No puede terminar así.");
    await game.say("Dr. Martínez-Urtaza: La historia no recordará quién me detuvo. Recordará que yo estuve a punto de conseguirlo.");
    await game.say("Dr. Martínez-Urtaza: No pienso quedarme en una institución donde todos son una panda de energúmenos. Me iré a otra donde sepan reconocer lo que valgo.");
    await game.fade(true, 14);
    s.flags.urtaza3 = true;
    world.refreshNpcs();
    await game.fade(false, 14);
    await game.say("Jaime se ha marchado de Isla Conjugada. El Microo legendario sigue libre en el laboratorio…");
  },

  /** La Dra. Campoy en la Mansión: antes del combate final explica el plan; tras capturar al legendario se va a su gimnasio. */
  async campoyMansion(game, world) {
    const s = S(game);
    if (!s.flags.urtaza3) {
      await game.say(ED.campoyMansion);
      await game.say("Dra. Campoy: ¡Por fin! Pensaba que no conseguiríamos llegar hasta aquí.");
      await game.say("Dra. Campoy: Jaime está en el laboratorio profundo. Ha conectado el tanque al sistema de control y está preparando el despertar del Microo.");
      await game.say("Dra. Campoy: No quiere estudiarlo. Quiere utilizarlo.");
      await game.say("Dra. Campoy: El dataset global de Vibrio se perdió con el disco. Jaime no lo ha recuperado: ha construido un modelo a partir de otros registros disponibles y de los conocimientos acumulados durante su carrera.");
      await game.say("Dra. Campoy: La Criobola Morada también le interesa. Como no consiguió hacerse con la original, está intentando reproducir sus propiedades para contener al legendario y mantenerlo sometido al sistema de control.");
      await game.say("Dra. Campoy: No sé qué pretende hacer después de despertarlo, pero no podemos dejar que lo descubras demasiado tarde.");
      return;
    }
    if (!s.flags[ED.flagLeg]) { await game.say("Dra. Campoy: El Microo sigue ahí. Si consigues aislarlo, estará más seguro contigo que en cualquier tanque."); return; }
    await game.say("Dra. Campoy: Lo has conseguido. No sé qué habría pasado si Jaime hubiera completado el proceso.");
    await game.say("Dra. Campoy: Gracias por detenerlo. Te estaré esperando en el gimnasio.");
    await game.fade(true, 12);
    s.flags["campoy-gimnasio"] = true;
    world.refreshNpcs();
    await game.fade(false, 12);
  },

  /** Diario personal de Jaime (laboratorio profundo de la Mansión). */
  async diarioJaime(game) {
    await game.say("Un cuaderno cerrado con una nota: «Personal. No archivar».");
    await game.say("«He dedicado treinta años a Vibrio. Treinta años de campañas, muestras, viajes, reuniones y resultados que otros han citado sin entender del todo. He visto cómo cambiaban las costas y cómo se repetían los mismos errores en cada informe».");
    await game.say("«El dataset global de Vibrio debía ser el punto de partida. Era el archivo de toda una vida de trabajo: campañas, registros de distribución, series temporales y observaciones ambientales. No pienso fingir que la pérdida no importa. Pero el trabajo no puede detenerse por un accidente, ni por la incompetencia de alguien que no fue capaz de hacer una copia».");
    await game.say("«El Microo legendario de la Mansión ofrece una oportunidad que no se presenta dos veces. No es un cambio de campo. Es la consecuencia de haber aprendido a leer patrones a una escala que otros ni siquiera contemplan».");
    await game.say("«Hernández habla de perspectiva global. Louis hablaría de límites. Ambos confunden prudencia con virtud. La ciencia no tiene por qué esperar a que el mundo esté preparado».");
    await game.say("«No estoy aquí para pedir permiso. Si el modelo funciona, la discusión sobre los medios será irrelevante. Si funciona, todos tendrán que aceptar que yo vi lo que los demás no supieron ver».");
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
    await game.run(new BadgeGet("lisogenia"));
    await avisoObediencia(game);
    s.flags.medalla8 = true;
    await game.say("Dra. Campoy: Te has ganado la MEDALLA LISOGENIA. ¡Ya tienes las ocho!");
    await game.say("¡{nombre} ha recibido la MEDALLA LISOGENIA de la Dra. Campoy!");
    await game.say("Dra. Campoy: El ferri ya puede llevarte a la Calle Selección Natural. Al final está La UAB… y la Liga Micromón.");
  },

  // ---------------------------------------------------------------- Louis (Pasteur) como mentor
  // Cinco encuentros sin revelar quién es. Las respuestas se guardan en flags.pasteurQ1..Q6 y las recuerda en la Liga.
  async pasteur1(game, world) {
    const s = S(game);
    await game.say("Señor mayor: … … Ah, perdona. Estaba mirando esta placa de agar. ¿Ves estas colonias? Cada una empezó siendo una sola célula.");
    await game.say("Señor mayor: Me llamo Louis. Hace mucho que me jubilé de la Facultad, pero no consigo dejar de mirar.");
    await game.say("Louis: Acabas de ganar tu primera medalla, ¿verdad? Entonces deja que te haga una pregunta. No hay respuestas malas.");
    const r = await game.choose(["DESCUBRIR", "PUBLICAR", "AYUDAR", "NO LO SÉ"], { prompt: "Louis: ¿Qué es para ti la ciencia?" });
    s.flags.pasteurQ1 = Math.max(0, r);
    await game.say([
      "Louis: Descubrir… sí. Esa sensación de ser la primera persona del mundo que sabe algo. No la pierdas nunca.",
      "Louis: Publicar. Es lo que te dirán que importa, y algo importa: lo que no se comparte no existe. Pero un paper es el final de una historia, no la historia.",
      "Louis: Ayudar. Yo empecé con vino, cerveza y gusanos de seda: gente que perdía su sustento. Nunca he tenido un motivo mejor.",
      "Louis: «No lo sé» es la frase más honesta de la ciencia. Casi todo empieza ahí.",
    ][Math.max(0, r)]);
    await game.say("Louis: Seguiremos hablando. La región es pequeña y yo camino despacio.");
    s.flags.pasteur1 = true; world.refreshNpcs();
  },
  async pasteur2(game, world) {
    const s = S(game);
    await game.say("Louis: Has visto a los jóvenes de la Unidad. Algunos apenas han recibido formación y ya les han puesto a procesar datos como si fueran máquinas.");
    await game.say("Louis: La ciencia necesita aprenderse con las manos, con paciencia y con alguien que te enseñe por qué haces cada cosa.");
    const r = Math.max(0, await game.choose(["LO REPITO", "LO ESCONDO", "LO ESTUDIO"], { prompt: "Louis: Si tu experimento sale al revés de lo que esperabas, ¿qué haces?" }));
    s.flags.pasteurQ2 = r;
    await game.say([
      "Louis: Repetir está bien: una réplica no es un capricho. Pero si sale igual tres veces, quizá la naturaleza intenta decirte algo.",
      "Louis: Te entiendo, da miedo. Pero un resultado escondido es un error que otro repetirá. Un experimento que no sale también es un resultado.",
      "Louis: ¡Eso! Mis mejores descubrimientos vinieron de cosas que salieron mal.",
    ][r]);
    await game.say("Louis: Chamberland y sus filtros nos recuerdan que una buena idea puede cambiar la historia. Pero una buena idea no justifica tratar a las personas como material fungible.");
    await game.say("Louis: No confundas trabajar mucho con trabajar bien. Y no confundas obedecer con aprender.");
    s.flags.pasteur2 = true; world.refreshNpcs();
  },
  async pasteur3(game, world) {
    const s = S(game);
    await game.say("Louis: Conocí a Jaime cuando era un doctorando brillante. Trabajaba más que nadie, leía más que nadie y tenía una intuición extraordinaria.");
    await game.say("Louis: No fue su dedicación lo que le perdió. Fue que empezó a confundir la importancia de un descubrimiento con la importancia de que su nombre apareciera en él.");
    await game.say("Louis: Puedes entregar tu vida a la ciencia. Lo que no puedes hacer es exigir que los demás entreguen la suya por ti.");
    await game.say("Louis: Trabajar muchísimo no convierte automáticamente a alguien en una buena persona.");
    await game.say("Louis: La ciencia pertenece a quienes están dispuestos a compartirla.");
    const r = Math.max(0, await game.choose(["TODAS", "LAS NECESARIAS", "OCHO Y A CASA"], { prompt: "Louis: ¿Cuántas horas debería trabajar un buen investigador?" }));
    s.flags.pasteurQ3 = r;
    await game.say([
      "Louis: Yo también lo creí. A los 45 años tuve un ictus y seguí trabajando con medio cuerpo paralizado. Mi mujer, Marie, escribía lo que yo dictaba. No te lo recomiendo.",
      "Louis: Buena respuesta. Pero vigila quién decide cuáles son «las necesarias». A menudo no eres tú.",
      "Louis: Ja, ja. Una mente descansada ve lo que una agotada no ve. Y la vida fuera del laboratorio también te hace mejor científic{o}.",
    ][r]);
    const r2 = Math.max(0, await game.choose(["PARA MÍ", "PARA LOS DEMÁS", "PARA MI CV"], { prompt: "Louis: Y dime: ¿para quién investigas?" }));
    s.flags.pasteurQ4 = r2;
    await game.say([
      "Louis: La curiosidad propia es un motor magnífico. Solo procura que no sea el único.",
      "Louis: Entonces nunca te faltará un motivo, ni siquiera cuando los papers no salgan.",
      "Louis: Al menos eres sincer{o}. El sistema premia el currículum, eso es real. Pero un currículum no te acompaña a casa por la noche.",
    ][r2]);
    s.flags.pasteur3 = true; world.refreshNpcs();
  },
  async pasteur4(game, world) {
    const s = S(game);
    await game.say("Louis: Jaime y yo tuvimos una rivalidad larga. En su momento, ambos queríamos responder preguntas importantes.");
    await game.say("Louis: Una vez me adelantaron con una idea que yo llevaba meses trabajando. Me dolió, por supuesto. Pero una idea no deja de ser valiosa porque otra persona llegue antes.");
    await game.say("Louis: Lo que importa es cómo respondes. Puedes mejorar el trabajo, colaborar o aceptar que alguien más ha llegado a una conclusión. Lo que no puedes hacer es convertir tu frustración en una licencia para pisar a los demás.");
    const r = Math.max(0, await game.choose(["ME ENFADO", "LE ESCRIBO", "ME RINDO"], { prompt: "Louis: Si alguien publica tu idea antes que tú, ¿qué haces?" }));
    s.flags.pasteurQ5 = r;
    await game.say([
      "Louis: Normal. Enfádate un día. Luego lee su trabajo: seguramente vio algo que tú no viste.",
      "Louis: Eso es lo que yo no supe hacer. Una carta a tiempo vale más que diez réplicas en una revista.",
      "Louis: No, no. Que dos grupos lleguen a lo mismo es la mejor prueba de que era verdad. Sigue: tu enfoque tendrá algo que el suyo no tiene.",
    ][r]);
    s.flags.pasteur4 = true; world.refreshNpcs();
  },
  async pasteur5(game, world) {
    const s = S(game);
    await game.say("Louis: Mira el agua. ¿Ves cómo brilla cuando rompe la ola? Es Noctiluca: dinoflagelados que se encienden cuando los mueves.");
    await game.say("Louis: Llevo una hora aquí sentado. No he medido nada, no he apuntado nada. Solo mirar.");
    const r = Math.max(0, await game.choose(["HOY", "NO ME ACUERDO", "ES PERDER EL TIEMPO"], { prompt: "Louis: ¿Cuándo miraste algo por última vez solo porque era bonito?" }));
    s.flags.pasteurQ6 = r;
    await game.say([
      "Louis: Entonces vas bien. Leeuwenhoek pasó años mirando gotas de agua con lentes que pulía él mismo, por puro placer. Y vio, por primera vez, un mundo entero.",
      "Louis: Pues para un momento. Mira. … … ¿Lo ves? Esto también es investigar.",
      "Louis: Eso diría Jaime. Y mira dónde está.",
    ][r]);
    await game.say("Louis: Fíjate bien en qué le ha quedado.");
    await game.say("Louis: Jaime ha dedicado su vida a investigar. No voy a decirte que eso esté mal. Yo también he pasado décadas persiguiendo preguntas.");
    await game.say("Louis: Pero nunca he creído que mis sacrificios me dieran derecho a decidir por los demás.");
    await game.say("Louis: Puedes entregar tu vida a la ciencia. Lo que no puedes hacer es exigir que los demás entreguen la suya por ti.");
    await game.say("Louis: Conocí a Jaime cuando todavía sabía escuchar. Siempre fue brillante, trabajador y ambicioso. Lo que nunca aprendió fue a distinguir entre un descubrimiento importante y que su nombre apareciera en él.");
    await game.say("Louis: Ojalá alguien le hubiera hecho estas preguntas a tiempo.");
    s.flags.pasteur5 = true; world.refreshNpcs();
  },

  // ---------------------------------------------------------------- Epílogo de la Unidad (tras la Liga, en el Instituto)
  async rebeldeIBB(game) {
    const s = S(game);
    if (!s.flags.campeon) {
      await game.say("Doctorando rebelde: Yo puedo distraerlos. Tres años sin contrato y ni siquiera salimos en la guía docente. Ya no tengo mucho que perder.");
      await game.say("Doctorando rebelde: Subid. Intentaré mantenerlos aquí abajo.");
      return;
    }
    await game.say("Doctorando rebelde: ¿Te acuerdas de cuando te dije que llevábamos tres años sin contrato y ni siquiera salíamos en la guía docente?");
    await game.say("Doctorando rebelde: Pues algo ha cambiado. Han revisado las condiciones, han reconocido horas que antes ni aparecían y por fin se están formalizando algunos contratos.");
    await game.say("Doctorando rebelde: No voy a decir que todo esté arreglado. Pero al menos ahora hay gente obligada a escuchar.");
  },
  async pasteurEpilogo(game) {
    await game.say("Dr. Louis Pasteur: El Instituto Carlos III puede ofreceros plazas para continuar vuestra carrera investigadora. No os prometo que todo vaya a ser sencillo, pero sí un marco en el que vuestro trabajo tenga reconocimiento y condiciones claras.");
    await game.say("Dr. Pasteur: También quiero proponeros una colaboración entre microbiólogos y genetistas. No para que una disciplina imponga sus objetivos a la otra, sino para que compartáis preguntas, métodos y responsabilidades.");
    await game.say("Dr. Pasteur: La ciencia avanza mejor cuando nadie tiene que desaparecer detrás del nombre de otra persona.");
  },

  // ---------------------------------------------------------------- Calle Selección Natural y Liga
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
    await game.say("Dra. Alba Hernández: Has llegado.");
    await game.say("Dra. Hernández: Jaime ha perdido. Lo sé.");
    await game.say("Dra. Hernández: No voy a fingir que me sorprende del todo. Siempre confundió la capacidad de imaginar un proyecto con la capacidad de dirigirlo.");
    await game.say("Dra. Hernández: Yo creía que podía corregir sus impulsos. Que bastaba con darle una perspectiva más amplia.");
    await game.say("Dra. Hernández: Pero quizá estaba haciendo lo mismo que él: justificar cualquier decisión en nombre de una idea que consideraba superior.");
    await game.say("Dra. Hernández: Esta vez lo haré yo. No voy a esconderme detrás de un discurso.");
    const r = rng(game);
    const foe = [createMicroo("thiomargar", 57, { rng: r }), createMicroo("mimivir", 57, { rng: r }), createMicroo("tardigrad", 58, { rng: r }),
      createMicroo("cyanofossil", 58, { rng: r }), createMicroo("filovir-z", 59, { rng: r })];
    const out = await startBattle(game, world, { battle: battleFor(game, foe, false, "Dra. Hernández", { "medio-enriquecido": 2 }), wild: false,
      trainer: { name: "Alba Hernández", clase: "Ejecutiva", portrait: "hernandez", lose: "…", money: 700 } });
    if (out.outcome === "lose") { await whiteout(game, world); return; }
    await game.say("Dra. Hernández: Quizás… la miope era yo.");
    await game.say("Dra. Hernández: A veces hay que mirar la placa de cerca para entender el mundo entero.");
    await game.say("Dra. Hernández: Te debo una disculpa por el sermón de la torre. No porque la perspectiva global no importe, sino porque la utilicé para despreciar todo lo que no encajaba en mi discurso.");
    await game.say("Dra. Hernández: No sé qué haré ahora. Por primera vez, creo que tendré que escuchar antes de decidir.");
    await game.say("La Dra. Hernández se aparta y deja libre el paso hacia La UAB.");
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
      ["Dr. Jordi Barbé: La Unidad de Genética ha ensuciado el nombre de la genética. Durante mucho tiempo, algunos confundieron autoridad con conocimiento y obediencia con colaboración.", "Dr. Barbé: La ciencia necesita ambición, sí. Pero también necesita límites, discusión y responsabilidad. Si no, deja de ser una búsqueda compartida y se convierte en el capricho de quien más poder tiene.", "Dr. Barbé: Yo te enseñaré lo que es la verdadera genética microbiana.", "Dr. Barbé: Regulón SOS, RecA, LexA… Mis Microos reparan su ADN más rápido de lo que tú lo dañas."],
      ["Dra. Montserrat Llagostera: Llevo toda una vida en esta Facultad estudiando la virulencia. Patógenos, fagos, sistemas de secreción…", "Dra. Llagostera: Soy la última del Alto Mando. ¡Demuéstrame que mereces ver al Campeón!"],
      [], // Pasteur: ver pasteurLiga()
    ];
    const done = ["Dra. Tusell: Bien hecho. Sigue: te espera el Dr. Martí.", "Dr. Martí: Tienes buenos reflejos. Adelante.", "Dr. Barbé: Eso es genética de verdad. Continúa.",
      "Dra. Llagostera: Excelente. El Campeón te espera en el Rectorado.", "Dr. Pasteur: Ha sido un honor. Abajo, en la fosa abisal, te espera el origen de todo."];
    if (s.flags[`liga${k}`]) { await game.say(done[k - 1]); return; }
    if (k === 5) await pasteurLiga(game); else for (const l of intros[k - 1]) await game.say(l);
    const portrait = ["tusell", "marti", "barbe", "llagostera", "pasteur"][k - 1];
    const tname = TRAINERS.get(ids[k - 1])!.name;
    const out = await startBattle(game, world, { battle: battleFor(game, trainerParty(ids[k - 1], s.difficulty, rng(game)), false, tname, s.difficulty === "facil" ? {} : { "medio-enriquecido": k === 5 ? 3 : 2 }), wild: false,
      trainer: { name: tname.replace(/^Dra?\. /, ""), clase: k === 5 ? "Campeón" : "Alto Mando", portrait, lose: k === 5 ? "Magnifique… ¡Eres el nuevo Campeón!" : "Has superado mi laboratorio.", sendOut: k === 5 ? PASTEUR_EQUIPO : undefined, money: 500 } });
    if (out.outcome === "lose") {
      if (k === 5) await game.say("Dr. Pasteur: Un experimento que no sale también es un resultado. Apúntalo, descansa… y vuelve.");
      for (let j = 1; j <= 5; j++) delete s.flags[`liga${j}`];
      await whiteout(game, world); return;
    }
    s.flags[`liga${k}`] = true;
    world.refreshNpcs();
    if (k < 5) { await game.say(done[k - 1]); return; }
    // ¡Campeón!
    await game.say("Dr. Pasteur: Magnifique. Curiosidad, servicio, cuidado, colaboración, asombro y constancia. Ninguna basta sola; juntas, sí.");
    await game.say("Dr. Pasteur: La investigación no es justa: contratos que se acaban, prisas, métricas… Eso no lo arreglarás en un día.");
    await game.say("Dr. Pasteur: Pero sí puedes decidir qué científic{o} quieres ser dentro de ese mundo. Jaime eligió ganar a cualquier precio, y pagó el precio.");
    await game.say("Dr. Pasteur: Un buen científico no es quien nunca falla. Es quien hace buena ciencia, la comparte y llega entero al final del camino.");
    await game.say("Dr. Pasteur: Ganar o perder hoy era lo de menos. Lo valioso es el camino que hemos compartido.");
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
    world.load("uab", 13, 14, 0);
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

  /** Club de Conexión (Incubadoras): intercambios y combates con otra persona conectada. */
  async club(game, world) { await clubConexion(game, world); },

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

/** Frases de Pasteur al sacar cada Microo: su equipo es su respuesta a qué es un buen investigador. */
const PASTEUR_EQUIPO: Record<string, string> = {
  pyrolobus: "Dr. Pasteur: Curiosidad. Pyrolobus vive a 113 °C, donde nadie pensaba buscar vida. Mira donde los demás no miran.",
  alexandrium: "Dr. Pasteur: Servicio. Sus mareas rojas cierran las bateas del Delta. Lo que investigas tiene que servirle a alguien.",
  pichiamax: "Dr. Pasteur: Cuidado. Esta levadura lleva mi nombre y creció despacio, sin prisas. Como todo lo que vale la pena.",
  tuberculos: "Dr. Pasteur: Colaboración. El bacilo de Koch. Ojalá lo hubiera estudiado con él y no contra él.",
  volvox: "Dr. Pasteur: Asombro. Leeuwenhoek lo vio en 1700 sin buscar ningún paper. Solo porque era bonito.",
  pandoravir: "Dr. Pasteur: Constancia. Hice la vacuna de la rabia sin poder ver nunca el virus. De error en error… ¡hasta acertar!",
};

/** Presentación de Pasteur en la Liga: se revela como Louis y recuerda las respuestas de los encuentros. */
async function pasteurLiga(game: Game) {
  const s = S(game), f = s.flags;
  const vio = [1, 2, 3, 4, 5].some((i) => f[`pasteur${i}`]);
  await game.say("Dr. Louis Pasteur: Bonjour. … Mira dónde nos trae la vida.");
  if (vio) {
    await game.say("Dr. Pasteur: Sí: el señor mayor de la bata era yo. Louis Pasteur, Campeón de la Liga. Perdona el misterio; quería conocerte sin una medalla de por medio.");
    const q = (k: string) => (f[k] === undefined ? -1 : Number(f[k]));
    const rec: [string, number, string[]][] = [
      ["En Ciudad Petri me dijiste que la ciencia era", q("pasteurQ1"), ["descubrir.", "publicar.", "ayudar a la gente.", "algo que aún no sabías definir."]],
      ["En Ciudad Cultivo, que si un experimento te salía al revés", q("pasteurQ2"), ["lo repetirías.", "lo esconderías.", "lo estudiarías."]],
      ["En Ciudad Aerobia, que un buen investigador debía trabajar", q("pasteurQ3"), ["todas las horas.", "las horas necesarias.", "ocho horas e irse a casa."]],
      ["Y que investigabas", q("pasteurQ4"), ["para ti.", "para los demás.", "para tu currículum."]],
      ["En el puerto de Ciudad Pili, que si alguien publicaba tu idea antes", q("pasteurQ5"), ["te enfadarías.", "le escribirías.", "te rendirías."]],
      ["Y en la Isla Conjugada, que mirar algo solo porque es bonito", q("pasteurQ6"), ["lo habías hecho ese mismo día.", "no recordabas cuándo lo hiciste.", "era perder el tiempo."]],
    ];
    for (const [pre, r, ops] of rec) if (r >= 0) await game.say(`Dr. Pasteur: ${pre} ${ops[r]}`);
    await game.say("Dr. Pasteur: Puede que hoy respondieras distinto. Eso significa que has aprendido algo por el camino.");
  } else {
    await game.say("Dr. Pasteur: Soy Louis Pasteur, Campeón de la Liga. Te he visto pasar por toda la región, aunque nunca te detuviste a charlar con este viejo.");
  }
  await game.say("Dr. Pasteur: Ya conoces la otra respuesta: la de Jaime. Dormir cuatro horas, publicar antes que nadie, dejarlo todo atrás. Funciona… hasta que no queda nadie a tu lado.");
  const r = await game.choose(["CREO QUE SÍ", "TODAVÍA NO"], { prompt: "Dr. Pasteur: Dime: ¿sabes ya qué es ser un buen científico?", cancel: 1 });
  await game.say(r === 0
    ? "Dr. Pasteur: Entonces demuéstramelo. Mi equipo es mi respuesta: seis Microos y ninguno por encima de los demás."
    : "Dr. Pasteur: Bien. Quien cree saberlo todo ha dejado de investigar. Mi equipo es mi respuesta: busca la tuya en este combate.");
  await game.say("Dr. Pasteur: «La suerte favorece a la mente preparada.» ¡Comencemos!");
}
