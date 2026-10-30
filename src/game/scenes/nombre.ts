// Teclado en pantalla para escribir nombres y motes.
import type { Game } from "../game";
import type { Gfx } from "../gfx";
import { getSpecies } from "../../engine/data";
import type { Microo } from "../../engine/microo";

/** Teclado en pantalla para escribir el nombre (los diálogos del navegador no funcionan en todas partes). */
export class NameEntry {
  /** titulo: qué se está escribiendo (p. ej. «Mote de Butyricum»). */
  constructor(public titulo = "Tu nombre", public max = 10, public cancelable = false) {}
  rows = ["ABCDEFGHIJ", "KLMNÑOPQRS", "TUVWXYZÁÉÍ", "ÓÚabcdefgh", "ijklmnñopq", "rstuvwxyz-"];
  x = 0; y = 0; result = "";
  update(game: Game) {
    const i = game.input;
    if (i.repeat("right")) this.x = (this.x + 1) % 10;
    if (i.repeat("left")) this.x = (this.x + 9) % 10;
    if (i.repeat("down")) this.y = (this.y + 1) % 7;
    if (i.repeat("up")) this.y = (this.y + 6) % 7;
    if (i.pressed("b")) { if (!this.result.length && this.cancelable) return true; this.result = this.result.slice(0, -1); }
    if (i.pressed("start")) return this.result.length > 0;
    if (i.pressed("a")) {
      if (this.y === 6) { if (this.x < 5) this.result = this.result.slice(0, -1); else if (this.result.length) return true; }
      else if (this.result.length < this.max) this.result += [...this.rows[this.y]][this.x];
    }
    return false;
  }
  draw(g: Gfx) {
    g.clear("#283048");
    g.text(this.titulo, 12, 2, "white");
    g.frame(40, 14, 176, 18, "info");
    g.text(this.result + "_", 50, 17);
    g.frame(10, 36, 236, 124, "menu");
    this.rows.forEach((r, j) => [...r].forEach((ch, k) => g.text(ch, 30 + k * 19, 40 + j * 15, this.y === j && this.x === k ? "red" : "dark")));
    g.text("BORRAR", 40, 132, this.y === 6 && this.x < 5 ? "red" : "dark");
    g.text("ACEPTAR", 140, 132, this.y === 6 && this.x >= 5 ? "red" : "dark");
  }
}

/** Pregunta si se quiere poner un mote al Microo y, si sí, lo escribe. Vacío = sin mote. */
export async function ponerMote(game: Game, m: Microo, preguntar = true) {
  const sp = getSpecies(m.species).name;
  if (game.noNicknames) return;
  if (preguntar && !(await game.yesno(`¿Quieres ponerle un mote a ${m.nickname ?? sp}?`))) return;
  const t = (await game.run<string>(new NameEntry(`Mote para ${sp} (B sin escribir: cancelar)`, 12, true))).trim();
  m.nickname = t && t !== sp ? t : null;
  if (m.nickname) await game.say(`¡Ahora se llama ${m.nickname}!`);
}
