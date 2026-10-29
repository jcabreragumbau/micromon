// Pantalla de título, presentación de la Profesora y creación de partida.
import type { Game, Scene } from "../game";
import { audio } from "../audio";
import { Gfx, W, H } from "../gfx";
import { IMG } from "../assets";
import { Overworld } from "./overworld";
import { newState, loadGame, hasSave, AVATAR_SPRITE, type Avatar } from "../state";
import { runScript } from "../scripts";

export class TitleScene implements Scene {
  t = 0; busy = false;
  update(game: Game) {
    this.t++;
    if (this.t === 1) audio.music("ciudad");
    if (this.busy) return;
    if (game.input.pressed("a") || game.input.pressed("start")) { this.busy = true; this.menu(game).finally(() => (this.busy = false)); }
  }
  async menu(game: Game) {
    const opts = hasSave() ? ["CONTINUAR", "NUEVA PARTIDA"] : ["NUEVA PARTIDA"];
    const c = await game.choose(opts, { x: W - 106, y: 112, cancel: 999 });
    if (c < 0) return;
    if (opts[c] === "CONTINUAR") {
      const s = loadGame();
      if (s) { game.state = s; audio.musicOn = !s.flags.sinMusica; audio.sfxOn = !s.flags.sinEfectos; return enterWorld(game, s.map, s.x, s.y, s.dir); }
    }
    await newGame(game);
  }
  draw(g: Gfx, game: Game) {
    // Portada del juego: la ilustración entera en el centro y una versión desenfocada a los lados
    const c = g.ctx;
    c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
    if (IMG.portada_fondo) c.drawImage(IMG.portada_fondo, 0, 0, W, H); else g.clear("#200806");
    const cw = IMG.portada ? (H * IMG.portada.width) / IMG.portada.height : 0, cx = (W - cw) / 2;
    if (IMG.portada) {
      g.alpha(0.5, () => g.rect(cx - 2, 0, cw + 4, H, "#000"));
      c.drawImage(IMG.portada, cx, 0, cw, H);
    }
    c.restore();
    // ascuas que suben por toda la pantalla
    for (let i = 0; i < 26; i++) {
      const sp = 0.25 + (i % 5) * 0.09, x = (i * 53 + Math.sin((this.t + i * 40) / 37) * 8) % W;
      const y = H - ((this.t * sp + i * 71) % (H + 20)) + 10;
      g.alpha(0.5 + 0.5 * Math.sin((this.t + i * 13) / 9), () => g.rect(x, y, i % 3 ? 1 : 2, i % 3 ? 1 : 2, i % 2 ? "#ffd060" : "#ff7a20"));
    }
    // fundido de entrada
    if (this.t < 40) g.alpha(1 - this.t / 40, () => g.rect(0, 0, W, H, "#000"));
    if (Math.floor(this.t / 30) % 2 === 0 && !game.overlays.length && this.t > 40) {
      const t = "Pulsa A para empezar", w = g.measure(t) + 12;
      g.alpha(0.7, () => g.round(W / 2 - w / 2, H - 17, w, 14, 6, "#140404"));
      g.text(t, W / 2 - w / 2 + 6, H - 16, "white");
    }
  }
}

class IntroScene implements Scene {
  sp = "casei";
  update() {}
  draw(g: Gfx) {
    g.clear("#101828");
    g.portrait("hesse", 36, 20);
    g.microo(this.sp, "frente", 150, 40);
  }
}

async function newGame(game: Game) {
  game.state = newState();
  const intro = new IntroScene();
  await game.fade(true, 12);
  game.scene = intro;
  await game.fade(false, 12);
  const say = (t: string) => game.say(t);
  await say("¡Hola! ¡Te doy la bienvenida al mundo de los Microos! Soy la Profesora Fanny Hesse.");
  await say("Este mundo está habitado por criaturas diminutas llamadas Microos: bacterias, hongos, protozoos, algas… ¡y hasta virus!");
  await say("Algunos nos ayudan a hacer pan y yogur. Otros causan enfermedades. Y todos tienen algo que enseñarnos.");
  await say("Yo dedico mi vida a cultivarlos y estudiarlos. Pero antes… háblame de ti.");
  await game.say("Las gafas no me dejan verte bien. Dime, ¿cómo eres?", { keep: true });
  const av = AVATARS[await game.run<number>(new AvatarSelect())].id;
  game.popKept();
  game.state.avatar = av;
  if (av === "apache") {
    await say("…¿Un helicóptero de combate? ¿De verdad?");
    await say("Bueno… la ciencia no juzga. Eso sí: en el laboratorio, el rotor apagado. ¡Las placas de Petri vuelan!");
  } else await say(av === "chica" ? "¡Una futura microbióloga! Me encanta." : "¡Un futuro microbiólogo! Me encanta.");
  const names = { chico: ["Leo", "Hugo", "Marc"], chica: ["Ana", "Iris", "Lucía"], apache: ["AH-64", "Rotor", "Halcón"] }[av];
  const n = await game.choose([...names, "Escribir…"], { prompt: "¿Cómo te llamas?", x: 160, y: 20, cancel: 999 });
  let name = names[n] ?? names[0];
  if (n === 3) { const typed = await game.run<string>(new NameEntry()); if (typed.trim()) name = typed.trim(); }
  game.state.name = name;
  await say(`¡Así que te llamas ${name}! Encantada.`);
  const d = await game.choose(["Fácil · Medio Rico", "Normal · Medio Selectivo", "Difícil · Presión Antibiótica"], { prompt: "¿Qué condiciones de incubación prefieres? (Dificultad)", x: 60, y: 30, cancel: 999 });
  game.state.difficulty = (["facil", "normal", "dificil"] as const)[d < 0 ? 1 : d];
  await say("Y este es mi otro alumno. Siempre ha competido contigo… ¿Cómo se llamaba? ¡Ah, sí! Se llama Koch.");
  await say(`¡${name}! Tu aventura con los Microos está a punto de empezar. ¡Te espero en mi laboratorio!`);
  await enterWorld(game, "casa-jugador", 4, 4, 0);
}

export async function enterWorld(game: Game, map: string, x: number, y: number, dir: number) {
  await game.fade(true, 12);
  const w = new Overworld(game);
  w.load(map, x, y, dir);
  game.scene = w;
  await game.fade(false, 12);
  void runScript;
}

const AVATARS: { id: Avatar; label: string }[] = [
  { id: "chico", label: "Chico" }, { id: "chica", label: "Chica" }, { id: "apache", label: "Apache" },
];
/** Elección del personaje: tres tarjetas con el sprite animado. Devuelve el índice. */
class AvatarSelect {
  sel = 1; result = 1; t = 0; transparent = true;
  update(game: Game) {
    this.t++;
    if (game.input.repeat("right")) this.sel = (this.sel + 1) % 3;
    if (game.input.repeat("left")) this.sel = (this.sel + 2) % 3;
    if (game.input.pressed("a")) { this.result = this.sel; return true; }
    return false;
  }
  draw(g: Gfx, game: Game) {
    g.pattern("#283860", "#304070", this.t, "#182038");
    game.keptDialog?.draw(g, game);
    AVATARS.forEach((a, i) => {
      const x = 14 + i * 80, y = 22, on = i === this.sel;
      g.panel(x, y, 68, 100, on ? "#fff0b0" : "#d8e4f0", on ? "#f8b848" : "#8098b8", on ? "#c06818" : "#283048", 6);
      g.alpha(0.2, () => g.round(x + 14, y + 72, 40, 8, 4, "#000"));
      const heli = a.id === "apache";
      const fr = heli ? Math.floor(this.t / 3) % 3 : on ? [0, 1, 0, 2][Math.floor(this.t / 10) % 4] : 0;
      g.ctx.save(); g.ctx.translate(x + 2, y + 10 + (on && !heli ? 0 : 0)); g.ctx.scale(2, 2);
      g.character(AVATAR_SPRITE[a.id], 0, fr, 0, heli ? -Math.round(Math.sin(this.t / 12)) : 0);
      g.ctx.restore();
      g.text(a.label, x + 34 - g.measure(a.label) / 2, y + 84, on ? "dark" : "white", on);
    });
    if (Math.floor(this.t / 20) % 2) { g.text("◀", 4, 66, "white"); g.text("▶", W - 10, 66, "white"); }
  }
}

/** Teclado en pantalla para escribir el nombre (los diálogos del navegador no funcionan en todas partes). */
class NameEntry {
  rows = ["ABCDEFGHIJ", "KLMNÑOPQRS", "TUVWXYZÁÉÍ", "ÓÚabcdefgh", "ijklmnñopq", "rstuvwxyz-"];
  x = 0; y = 0; result = "";
  update(game: Game) {
    const i = game.input;
    if (i.repeat("right")) this.x = (this.x + 1) % 10;
    if (i.repeat("left")) this.x = (this.x + 9) % 10;
    if (i.repeat("down")) this.y = (this.y + 1) % 7;
    if (i.repeat("up")) this.y = (this.y + 6) % 7;
    if (i.pressed("b")) this.result = this.result.slice(0, -1);
    if (i.pressed("start")) return this.result.length > 0;
    if (i.pressed("a")) {
      if (this.y === 6) { if (this.x < 5) this.result = this.result.slice(0, -1); else if (this.result.length) return true; }
      else if (this.result.length < 10) this.result += [...this.rows[this.y]][this.x];
    }
    return false;
  }
  draw(g: Gfx) {
    g.clear("#283048");
    g.frame(40, 6, 160, 22, "info");
    g.text(this.result + "_", 50, 12);
    g.frame(10, 32, 220, 124, "menu");
    this.rows.forEach((r, j) => [...r].forEach((ch, k) => g.text(ch, 30 + k * 19, 40 + j * 15, this.y === j && this.x === k ? "red" : "dark")));
    g.text("BORRAR", 40, 132, this.y === 6 && this.x < 5 ? "red" : "dark");
    g.text("ACEPTAR", 140, 132, this.y === 6 && this.x >= 5 ? "red" : "dark");
  }
}
