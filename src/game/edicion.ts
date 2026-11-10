// Ediciones Escherichia y Salmonella (ambas sobre la V2). Cada una tiene su legendario de la historia, su portada y
// cinco Microos exclusivos; el legendario de la otra edición solo se consigue conectándose con ella.
// Sin edición (V1 y V2) el juego es la Edición Escherichia de siempre. En la página con las dos ediciones
// (EDICION = "ambas") se elige al abrir el juego con `elegirEdicion`, antes de crear el mundo.
import { EDICION } from "./assets_data";
import { MAPS } from "./world/maps";
import { SPECIES } from "../engine";

export type Edicion = "escherichia" | "salmonella";
/** ¿Esta página trae las dos ediciones (se elige al empezar)? */
export const AMBAS = EDICION === "ambas";
let actual: Edicion = EDICION === "salmonella" ? "salmonella" : "escherichia";
/** Edición en curso. */
export function ed(): Edicion { return actual; }

/** Exclusivos: cada par tiene el mismo poder (BST 330 → 485 en las líneas; 500 frente a 481 el suelto).
 *  Cholerae → Parahaemolyticus no es exclusivo: el Plásmido Vir de la Torre Prión sirve en las dos ediciones.
 *  Su sitio en Salmonella lo ocupa Proteus (Mirabilis → Vulgaris), enterobacteria como la Salmonella. */
export const EXCLUSIVOS: Record<Edicion, string[]> = {
  escherichia: ["perfringens", "tetani", "klebsi", "pneumonia-k", "pyrococcus"],
  salmonella: ["mirabilis", "vulgaris", "psychrobac", "colwellia", "vulnificus"],
};

/** Textos de la historia que dependen del legendario de la edición (guion final: docs/guion_unidad_genetica.pdf). */
const TEXTOS = {
  salmonella: {
  nombre: "Edición Salmonella",
  legendario: "salmonella-typhimurium", flagLeg: "salmonella",
  tanque: "El tanque se rompe y el Microo legendario emerge envuelto en un brillo azulado.",
  brillo: "#58a8ff",
  campoyMansion: "Dra. Susana Campoy: Ha utilizado el fago P22 en el proceso que ha dado lugar a una Salmonella distinta.",
  diarios: [
    "Diario, 5 de julio: «LT2 es una cepa de laboratorio de comportamiento dócil. Su estabilidad la convierte en una referencia para nuestras observaciones».",
    "Diario, 12 de agosto: «Los registros asociados al fago P22 coinciden con cambios inesperados en las características heredables de la población».",
    "Diario, 3 de septiembre: «La nueva variante presenta un perfil muy distinto al de partida. La llamaremos Typhimurium».",
  ],
},
  escherichia: {
  nombre: "Edición Escherichia",
  legendario: "ecoli-o157", flagLeg: "o157",
  tanque: "El tanque se rompe y el Microo legendario emerge envuelto en un brillo rojizo.",
  brillo: "#ff5a48",
  campoyMansion: "Dra. Susana Campoy: Ha usado un fago con la toxina Shiga para crear una cepa nueva.",
  diarios: [
    "Diario, 5 de julio: «La cepa K-12 se comporta de forma dócil en nuestras observaciones. Es un punto de partida útil para comprender qué ocurre cuando una población adquiere características que no estaban presentes en su estado inicial».",
    "Diario, 12 de agosto: «La presencia de un elemento asociado a un fago coincide con un cambio extraordinario en el comportamiento de la cepa. Los registros no encajan con nuestras previsiones».",
    "Diario, 3 de septiembre: «La nueva cepa produce una toxina que altera por completo su perfil. La llamaremos O157:H7».",
  ],
},
};
/** Textos de la edición en curso (el objeto se rellena de nuevo al elegir edición). */
export const T = { ...TEXTOS[actual] };

/** Ajusta mapas y Microdex a la edición. Solo actúa en las ediciones (V1 y V2 no cambian). */
export function aplicarEdicion() {
  if (!EDICION || AMBAS) return;
  aplicar();
}
let aplicada = false;
/** Página con las dos ediciones: fija la edición elegida y ajusta el mundo (una sola vez por carga). */
export function elegirEdicion(e: Edicion) {
  if (aplicada) return;
  actual = e; Object.assign(T, TEXTOS[e]);
  aplicar();
}
function aplicar() {
  aplicada = true;
  const SAL = actual === "salmonella", ED = actual;
  // los exclusivos de la otra edición se sustituyen por su pareja de esta, en el mismo sitio y nivel
  const mios = EXCLUSIVOS[ED], suyos = EXCLUSIVOS[SAL ? "escherichia" : "salmonella"];
  const cambio = new Map(suyos.map((s, i) => [s, mios[i]]));
  for (const m of Object.values(MAPS)) for (const e of m.grass) { const n = cambio.get(e.sp); if (n) e.sp = n; }
  if (!SAL) return;
  // Mansión de las Cepas: diarios, la Dra. Campoy y el legendario
  const m1 = MAPS["mansion-1"];
  m1?.signs.forEach((s, i) => { if (i < 3) s.text = T.diarios[i]; });
  for (const m of Object.values(MAPS)) for (const n of m.npcs)
    if (n.id === "o157-legendario") Object.assign(n, { sprite: `@microo:${T.legendario}`, script: `estatico:${T.legendario}|60|${T.flagLeg}`, hideIf: T.flagLeg });
  // Microdex: la Salmonella es la que da nombre a la edición
  const sal = SPECIES.get("salmonella-typhimurium"), eco = SPECIES.get("ecoli-o157");
  if (sal) sal.entry = "Inyecta proteínas con su jeringa molecular y obliga a la célula a tragársela. La Salmonella rebelde que da nombre a esta edición.";
  if (eco) eco.entry = "Lleva la toxina Shiga, robada a un fago. Prima lejana de la Salmonella y tan temida como ella.";
}
