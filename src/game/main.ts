// Punto de entrada del juego en el navegador.
import { Game } from "./game";
import { loadAssets } from "./assets";
import { TitleScene, enterWorld } from "./scenes/title";
import { runScript, wildBattle } from "./scripts";
import { MAPS } from "./world/maps";
import * as engine from "../engine";

async function boot() {
  const canvas = document.getElementById("pantalla") as HTMLCanvasElement;
  const game = new Game(canvas);
  game.input.attach(window);
  const pad = document.getElementById("mando");
  if (pad) game.input.attachTouch(pad);
  await loadAssets();
  game.scene = new TitleScene();
  game.start();
  (window as unknown as { micromon: Game }).micromon = game;   // para pruebas automáticas
  (window as unknown as { micromonDebug: unknown }).micromonDebug = { runScript, wildBattle, enterWorld, MAPS, engine };
  const fit = () => {
    const s = Math.max(1, Math.floor(Math.min(window.innerWidth / 240, (window.innerHeight - (pad && getComputedStyle(pad).display !== "none" ? 170 : 0)) / 160)));
    canvas.style.width = `${240 * s}px`; canvas.style.height = `${160 * s}px`;
  };
  window.addEventListener("resize", fit); fit();
}
boot().catch((e) => { document.body.insertAdjacentHTML("beforeend", `<pre style="color:#f88">${String(e)}</pre>`); });
