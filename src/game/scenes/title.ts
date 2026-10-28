// Pantalla de título, presentación de la Profesora y creación de partida.
import type { Game, Scene } from "../game";
import { Gfx, W, H } from "../gfx";
import { Overworld } from "./overworld";
import { newState, loadGame, hasSave } from "../state";
import { runScript } from "../scripts";

export class TitleScene implements Scene {
  t = 0; busy = false;
  update(game: Game) {
    this.t++;
    if (this.busy) return;
    if (game.input.pressed("a") || game.input.pressed("start")) { this.busy = true; this.menu(game).finally(() => (this.busy = false)); }
  }
  async menu(game: Game) {
    const opts = hasSave() ? ["CONTINUAR", "NUEVA PARTIDA"] : ["NUEVA PARTIDA"];
    const c = await game.choose(opts, { x: 80, y: 96, cancel: 999 });
    if (c < 0) return;
    if (opts[c] === "CONTINUAR") {
      const s = loadGame();
      if (s) { game.state = s; return enterWorld(game, s.map, s.x, s.y, s.dir); }
    }
    await newGame(game);
  }
  draw(g: Gfx, game: Game) {
    for (let y = 0; y < H; y++) g.rect(0, y, W, 1, `hsl(${150 + y / 4}, 45%, ${78 - y / 6}%)`);
    const species = ["synechoc", "butyricum", "paramec"];
    species.forEach((sp, i) => g.microo(sp, "frente", 24 + i * 64, 62 + Math.round(Math.sin((this.t + i * 20) / 20) * 3)));
    g.frame(30, 10, 180, 46, "info");
    const title = "MICROMÓN";
    let x = 120 - g.measure(title) * 1.5;
    g.ctx.save(); g.ctx.scale(3, 3);
    g.text(title, (120 - g.measure(title) * 1.5) / 3, 16 / 3, "red");
    g.ctx.restore(); void x;
    g.text("Edición Escherichia", 120 - g.measure("Edición Escherichia") / 2, 42, "blue");
    if (Math.floor(this.t / 30) % 2 === 0 && !game.overlays.length) g.text("Pulsa A para empezar", 120 - g.measure("Pulsa A para empezar") / 2, 136, "white");
  }
}

class IntroScene implements Scene {
  sp = "casei";
  update() {}
  draw(g: Gfx) {
    g.clear("#101828");
    g.ctx.save(); g.ctx.scale(2, 2); g.character("profesora", 0, 0, 22, 8); g.ctx.restore();
    g.microo(this.sp, "frente", 136, 34);
  }
}

async function newGame(game: Game) {
  game.state = newState();
  const intro = new IntroScene();
  await game.fade(true, 12);
  game.scene = intro;
  await game.fade(false, 12);
  const say = (t: string) => game.say(t);
  await say("¡Hola! ¡Bienvenido/a al mundo de los Microos! Soy la Profesora Fanny Hesse.");
  await say("Este mundo está habitado por criaturas diminutas llamadas Microos: bacterias, hongos, protozoos, algas… ¡y hasta virus!");
  await say("Algunos nos ayudan a hacer pan y yogur. Otros causan enfermedades. Y todos tienen algo que enseñarnos.");
  await say("Yo dedico mi vida a cultivarlos y estudiarlos. Pero antes… háblame de ti.");
  const n = await game.choose(["Ana", "Leo", "Iris", "Escribir…"], { prompt: "¿Cómo te llamas?", x: 160, y: 20, cancel: 999 });
  let name = ["Ana", "Leo", "Iris"][n] ?? "Ana";
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
