// Registro de Cepas Tipo de La UAB (salón de la fama) y créditos finales.
import type { Game, Overlay } from "../game";
import { Gfx, W, H } from "../gfx";
import { displayName, type Microo } from "../../engine/microo";
import { getSpecies } from "../../engine/data";

/** Muestra los Microos del equipo uno a uno, como en el Salón de la Fama. */
export class HallOfFame implements Overlay {
  t = 0;
  constructor(public party: Microo[], public name: string) {}
  update(game: Game) {
    this.t++;
    const per = 110, total = this.party.length * per + 160;
    if (game.input.pressed("a") && this.t > 40) this.t = Math.max(this.t, Math.ceil(this.t / per) * per);
    return this.t > total;
  }
  draw(g: Gfx, game: Game) {
    g.pattern("#2a1848", "#34205a", game.frame, "#100820");
    g.panel(8, 6, W - 16, 22, "#f8d860", "#c89020", "#5a3a08", 5);
    const title = "REGISTRO DE CEPAS TIPO · LA UAB";
    g.text(title, W / 2 - g.measure(title) / 2, 10, "dark");
    const per = 110, i = Math.floor(this.t / per);
    if (i < this.party.length) {
      const m = this.party[i], k = (this.t % per) / per;
      const x = W / 2 - 40 + Math.round((1 - Math.min(1, k * 4)) * 120);
      g.alpha(0.25, () => g.round(W / 2 - 34, 118, 68, 14, 7, "#000"));
      g.microo(m.species, "frente", x, 38);
      g.panel(40, 136, W - 80, 40, "#ffffff", "#e8e8f0", "#384058", 6);
      const t1 = `${displayName(m)}  Nv${m.level}`, t2 = getSpecies(m.species).organism || getSpecies(m.species).name;
      g.text(t1, W / 2 - g.measure(t1) / 2, 141);
      g.text(g.fit(t2, W - 96), W / 2 - g.measure(g.fit(t2, W - 96)) / 2, 157, "gray");
    } else {
      // todos juntos
      this.party.forEach((m, j) => g.icon(m.species, Math.floor(game.frame / 12) % 2, 20 + j * 38, 70));
      const t1 = `¡${this.name}, Catedrátic${game.state.avatar === "chica" ? "a" : "o"} Campeón${game.state.avatar === "chica" ? "a" : ""}!`;
      g.panel(20, 120, W - 40, 40, "#ffffff", "#e8e8f0", "#384058", 6);
      g.text(t1, W / 2 - g.measure(t1) / 2, 126, "red");
      const t2 = "Doctor Honoris Causa por La UAB";
      g.text(t2, W / 2 - g.measure(t2) / 2, 142);
    }
  }
}

const CREDITOS = [
  "MICROMÓN", "Edición Escherichia", "",
  "— Diseño del juego —", "El documento de diseño original", "y sus 150 Microos (+12 virus)", "",
  "— Programación, motor y combates —", "Claude Opus 5.5", "",
  "— Arte: Microos, personajes y mapas —", "Dibujado en código por Claude Opus 5.5", "",
  "— Personajes del mundo —", "Profesora Fanny Hesse", "Dr. Antoni Solé · Dra. Núria Gajú", "Dra. Laia Guàrdia · Dr. Daniel Yero",
  "Dr. Jordi Mas · Dr. Òscar Conchillo", "Dra. Marina Luquin · Dra. Susana Campoy", "", "— Alto Mando —", "Dra. Laura Tusell · Dr. Joaquim Martí",
  "Dr. Jordi Barbé · Dra. Montserrat Llagostera", "", "— Campeón —", "Dr. Louis Pasteur", "",
  "— La Unidad de Genética —", "Dr. Jaime Martínez-Urtaza", "Dr. Antonio Barbadilla · Dra. Sonia Casillas", "Dr. Isaac Salazar · Dra. Alba Hernández", "",
  "Gracias a todos los becarios y doctorandos", "que algún día saldrán en la guía docente.", "", "", "FIN", "", "…¿o no? Dicen que en el fondo", "del Rectorado hay una fosa abisal…",
];
export class Credits implements Overlay {
  y = H + 10;
  update(game: Game) {
    this.y -= game.input.down("a") ? 1.5 : 0.5;
    return this.y < -CREDITOS.length * 16 - 20;
  }
  draw(g: Gfx) {
    g.clear("#0a0614");
    for (let i = 0; i < 40; i++) g.rect((i * 97) % W, (i * 53 + Math.floor(this.y / 3)) % H, 1, 1, "#6a5a9a");
    CREDITOS.forEach((l, i) => {
      const y = Math.round(this.y + i * 16);
      if (y < -12 || y > H) return;
      const head = l.startsWith("—") || l === "MICROMÓN" || l === "FIN";
      g.text(l, W / 2 - g.measure(l) / 2, y, head ? "orange" : "white", !head);
    });
  }
}
