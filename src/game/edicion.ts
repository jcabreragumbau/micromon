// Ediciones Escherichia y Salmonella (ambas sobre la V2). Cada una tiene su legendario de la historia, su portada y
// cinco Microos exclusivos; el legendario de la otra edición aparece tras ganar la Liga.
// Sin edición (V1 y V2) el juego es la Edición Escherichia de siempre.
import { EDICION } from "./assets_data";
import { MAPS } from "./world/maps";
import { SPECIES } from "../engine";

export type Edicion = "escherichia" | "salmonella";
export const ED: Edicion = (EDICION as Edicion | null) ?? "escherichia";
const SAL = ED === "salmonella";

/** Exclusivos: cada par tiene el mismo poder (BST 330 → 485 en las líneas; 500 frente a 481 el suelto). */
export const EXCLUSIVOS: Record<Edicion, string[]> = {
  escherichia: ["perfringens", "tetani", "klebsi", "pneumonia-k", "pyrococcus"],
  salmonella: ["cholerae", "parahaemolyticus", "psychrobac", "colwellia", "vulnificus"],
};

/** Textos de la historia que dependen del legendario de la edición. */
export const T = SAL ? {
  nombre: "Edición Salmonella",
  legendario: "salmonella-typhimurium", flagLeg: "salmonella",
  postLiga: "ecoli-o157", flagPost: "o157",
  rumorPostLiga: "Profesora Hesse: Por cierto… dicen que una E. coli muy rara ronda los jardines de La UAB desde tu victoria.",
  urtaza1: "Dr. Jaime Martínez-Urtaza: Llegas tarde. Las muestras de Cádiz, el fago P22 con los genes de virulencia y mi modelo de Machine Learning… ya está hecho.",
  tanque: "Del tanque central sale un brillo azulado. ¡La cepa Typhimurium ha roto el cristal!",
  campoyFin: "Dra. Campoy: ¡Se ha ido! Pero la cepa Typhimurium sigue ahí… ¡Tienes que aislarla o detenerla, {nombre}! Después te espero en mi gimnasio.",
  campoyMansion: "Dra. Susana Campoy: ¡Ha usado el fago P22 para devolverle la virulencia a una Salmonella de laboratorio! Yo no puedo detenerle sola… ¡Ayúdame!",
  diarios: [
    "Diario, 5 de julio: Nuestra cepa LT2 de Salmonella crece de maravilla. Atenuada y docilísima. Perfecta para el laboratorio.",
    "Diario, 12 de agosto: Un fago P22 ha transducido genes de virulencia a un cultivo. La cepa ha cambiado…",
    "Diario, 3 de septiembre: La nueva cepa inyecta proteínas con su jeringa molecular y se cuela en cualquier célula. Ya no podemos controlarla.",
  ],
} : {
  nombre: "Edición Escherichia",
  legendario: "ecoli-o157", flagLeg: "o157",
  postLiga: "salmonella-typhimurium", flagPost: "salmonella",
  rumorPostLiga: "Profesora Hesse: Por cierto… dicen que una Salmonella muy rara ronda los jardines de La UAB desde tu victoria.",
  urtaza1: "Dr. Jaime Martínez-Urtaza: Llegas tarde. Las muestras de Cádiz, el fago con la toxina Shiga y mi modelo de Machine Learning… ya está hecho.",
  tanque: "Del tanque central sale un brillo rojizo. ¡La cepa O157:H7 ha roto el cristal!",
  campoyFin: "Dra. Campoy: ¡Se ha ido! Pero la cepa O157 sigue ahí… ¡Tienes que aislarla o detenerla, {nombre}! Después te espero en mi gimnasio.",
  campoyMansion: "Dra. Susana Campoy: ¡Ha usado un fago con la toxina Shiga para crear una cepa nueva! Yo no puedo detenerle sola… ¡Ayúdame!",
  diarios: [
    "Diario, 5 de julio: Nuestra cepa K-12 crece de maravilla. Docilísima. Perfecta para el laboratorio.",
    "Diario, 12 de agosto: Un fago portador de la toxina Shiga se ha colado en un cultivo. La cepa ha cambiado…",
    "Diario, 3 de septiembre: La nueva cepa produce toxina. La llamamos O157:H7. Ya no podemos controlarla.",
  ],
};

/** Ajusta mapas y Microdex a la edición. Solo actúa en las ediciones (V1 y V2 no cambian). */
export function aplicarEdicion() {
  if (!EDICION) return;
  // los exclusivos de la otra edición se sustituyen por su pareja de esta, en el mismo sitio y nivel
  const mios = EXCLUSIVOS[ED], suyos = EXCLUSIVOS[SAL ? "escherichia" : "salmonella"];
  const cambio = new Map(suyos.map((s, i) => [s, mios[i]]));
  for (const m of Object.values(MAPS)) for (const e of m.grass) { const n = cambio.get(e.sp); if (n) e.sp = n; }
  if (!SAL) return;
  // Mansión de las Cepas: diarios, la Dra. Campoy y el legendario
  const m1 = MAPS["mansion-1"];
  m1?.signs.forEach((s, i) => { if (i < 3) s.text = T.diarios[i]; });
  for (const m of Object.values(MAPS)) for (const n of m.npcs) {
    if (n.id === "m2-campoy") n.talk = T.campoyMansion;
    if (n.id === "o157-legendario") Object.assign(n, { sprite: `@microo:${T.legendario}`, script: `estatico:${T.legendario}|60|${T.flagLeg}`, hideIf: T.flagLeg });
    if (n.id === "salmonella-legendario") Object.assign(n, { sprite: `@microo:${T.postLiga}`, script: `estatico:${T.postLiga}|70|${T.flagPost}`, hideIf: T.flagPost });
  }
  // Microdex: la Salmonella es la que da nombre a la edición
  const sal = SPECIES.get("salmonella-typhimurium"), eco = SPECIES.get("ecoli-o157");
  if (sal) sal.entry = "Inyecta proteínas con su jeringa molecular y obliga a la célula a tragársela. La Salmonella rebelde que da nombre a esta edición.";
  if (eco) eco.entry = "Lleva la toxina Shiga, robada a un fago. Prima lejana de la Salmonella y tan temida como ella.";
}
