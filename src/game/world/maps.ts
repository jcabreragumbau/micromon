// Mapas del primer tramo: Pueblo Plaqueta → Ruta 1 → Ciudad Viral → Bosque Viral → Ciudad Petri.
import { MapBuilder, type MapDef } from "./builder";

export const MAPS: Record<string, MapDef> = {};
const add = (m: MapDef) => { MAPS[m.id] = m; };

// ---------------------------------------------------------------- interiores reutilizables
function casa(id: string, name: string, back: { to: string; x: number; y: number }, npcs: MapDef["npcs"] = []) {
  const b = new MapBuilder(id, name, 8, 7, "m", "interior", false);
  b.fill(0, 0, 8, 1, "w").fill(0, 1, 8, 1, "W").set(1, 1, "e").set(2, 1, "e").set(6, 2, "b").set(2, 3, "t").set(2, 4, "t").set(7, 5, "n");
  b.fill(3, 6, 2, 1, "a");
  b.warp({ x: 3, y: 6, w: 2, to: back.to, tx: back.x, ty: back.y + 1, dir: 0 });
  npcs.forEach((n) => b.npc(n));
  return b.done();
}
function incubadora(id: string, ciudad: string, back: { to: string; x: number; y: number }) {
  const b = new MapBuilder(id, `Incubadora de ${ciudad}`, 11, 8, "L", "interior", false);
  b.fill(0, 0, 11, 1, "w").fill(0, 1, 11, 1, "W").set(1, 1, "i").set(2, 1, "i").set(8, 1, "i").set(9, 1, "i");
  b.fill(3, 2, 5, 1, "c").set(10, 3, "P").set(0, 6, "n").set(10, 6, "n");
  b.fill(4, 7, 3, 1, "a");
  b.npc({ id: "enfermera", x: 5, y: 1, sprite: "enfermera", dir: 0, script: "incubadora" });
  b.npc({ id: "pc-info", x: 10, y: 3, sprite: "", talk: "Es el Congelador de cepas. Aquí se guardan los Microos que no caben en tu equipo (llegará en la próxima versión)." });
  b.warp({ x: 4, y: 7, w: 3, to: back.to, tx: back.x, ty: back.y + 1, dir: 0 });
  return b.done({ onEnter: "registrarIncubadora" });
}
function tienda(id: string, ciudad: string, back: { to: string; x: number; y: number }, stock: string[]) {
  const b = new MapBuilder(id, `Tienda de medios de ${ciudad}`, 10, 8, "L", "interior", false);
  b.fill(0, 0, 10, 1, "w").fill(0, 1, 10, 1, "W").set(0, 1, "e").set(1, 1, "e").set(8, 1, "e").set(9, 1, "e");
  b.fill(1, 3, 3, 1, "c").set(6, 4, "e").set(7, 4, "e").set(6, 5, "e").set(7, 5, "e");
  b.fill(4, 7, 2, 1, "a");
  b.npc({ id: "dependiente", x: 2, y: 2, sprite: "dependiente", dir: 0, script: `tienda:${stock.join(",")}` });
  b.warp({ x: 4, y: 7, w: 2, to: back.to, tx: back.x, ty: back.y + 1, dir: 0 });
  return b.done();
}

// ---------------------------------------------------------------- Pueblo Plaqueta
{
  const b = new MapBuilder("pueblo-plaqueta", "Pueblo Plaqueta", 20, 18);
  b.trees(0, 0, 8, 2).trees(10, 0, 10, 2).trees(0, 0, 2, 18).trees(18, 0, 2, 18).trees(0, 16, 20, 2);
  b.fill(8, 0, 2, 7, "p").fill(4, 6, 13, 1, "p").fill(5, 6, 1, 1, "p").fill(8, 7, 2, 6, "p").fill(9, 13, 1, 1, "p");
  b.fill(14, 11, 3, 3, "~").fill(3, 8, 2, 1, "f").fill(15, 8, 2, 1, "f").fill(3, 13, 2, 1, "f");
  b.building(3, 3, { kind: "casa", w: 5, door: 2, to: "casa-jugador", tx: 3, ty: 5 });
  b.building(12, 3, { kind: "casa", w: 5, color: "azul", door: 2, to: "casa-vecina", tx: 3, ty: 5 });
  b.building(5, 9, { kind: "lab", w: 8, door: 4, to: "laboratorio", tx: 5, ty: 8 });
  b.sign(7, 7, "Pueblo Plaqueta. «Donde germinan las grandes cepas».");
  b.sign(11, 13, "Laboratorio de Microbiología de la Profesora Hesse.");
  b.npc({ id: "chico-plaqueta", x: 12, y: 8, sprite: "chico", move: "pasear", talk: "¿Sabías que los Microos viven en todas partes? ¡Hasta en tu nevera!" });
  b.npc({ id: "chica-plaqueta", x: 13, y: 12, sprite: "chica", dir: 3, talk: ["El estanque está lleno de algas y protozoos.", "Sin un Microo propio no es seguro meterse en la hierba alta."] });
  b.trigger({ x: 8, y: 1, w: 2, script: "bloqueoSalida" });
  b.warp({ x: 8, y: 0, w: 2, to: "ruta-1", tx: 6, ty: 28, dir: 1, keep: "x" });
  add(b.done({ music: "pueblo" }));
}
add(casa("casa-jugador", "Tu casa", { to: "pueblo-plaqueta", x: 5, y: 5 }, [
  { id: "madre", x: 1, y: 4, sprite: "madre", dir: 3, script: "madre" },
]));
add(casa("casa-vecina", "Casa vecina", { to: "pueblo-plaqueta", x: 14, y: 5 }, [
  { id: "vecino", x: 5, y: 3, sprite: "estudiante", dir: 0, talk: ["Mi abuela hacía yogur con un fermento que nunca se moría.", "Dice que es un Microo Simbionte… ¡y que hay que cuidarlo como a una mascota!"] },
]));
{
  const b = new MapBuilder("laboratorio", "Laboratorio de la Profesora Hesse", 11, 10, "L", "laboratorio", false);
  b.fill(0, 0, 11, 1, "w").fill(0, 1, 11, 1, "W").fill(0, 1, 3, 1, "e").fill(8, 1, 3, 1, "e");
  b.set(0, 4, "M").set(0, 5, "B").set(10, 4, "B").set(10, 5, "i").set(0, 8, "n").set(10, 8, "n").set(4, 1, "P");
  b.fill(4, 4, 3, 1, "t");
  b.fill(5, 9, 2, 1, "a");
  b.npc({ id: "profesora", x: 5, y: 3, sprite: "profesora", dir: 0, script: "profesora" });
  b.npc({ id: "rival-lab", x: 3, y: 6, sprite: "rival", dir: 3, script: "rivalLab", hideIf: "rival1" });
  b.npc({ id: "ayudante", x: 9, y: 6, sprite: "becario", dir: 2, talk: ["Soy el ayudante de la Profesora.", "Cuidamos las cepas a 37 °C. ¡Ni un grado más!"] });
  b.npc({ id: "ball-synechoc", x: 4, y: 4, sprite: "@criobola", script: "elegir:synechoc", hideIf: "inicial", solid: true });
  b.npc({ id: "ball-butyricum", x: 5, y: 4, sprite: "@criobola", script: "elegir:butyricum", hideIf: "inicial", solid: true });
  b.npc({ id: "ball-paramec", x: 6, y: 4, sprite: "@criobola", script: "elegir:paramec", hideIf: "inicial", solid: true });
  b.warp({ x: 5, y: 9, w: 2, to: "pueblo-plaqueta", tx: 9, ty: 13, dir: 0 });
  add(b.done({ onEnter: "entrarLab" }));
}

// ---------------------------------------------------------------- Ruta 1
{
  const b = new MapBuilder("ruta-1", "Ruta 1", 14, 30);
  b.trees(0, 0, 2, 30).trees(12, 0, 2, 30).trees(2, 0, 4, 2).trees(8, 0, 4, 2);
  b.fill(6, 0, 2, 30, "p");
  b.fill(2, 22, 4, 5, "g").fill(8, 18, 4, 4, "g").fill(2, 8, 4, 6, "g").fill(8, 4, 4, 5, "g");
  b.fill(2, 16, 4, 1, "v").fill(8, 12, 4, 1, "v");
  b.trees(2, 18, 4, 2).trees(8, 24, 4, 2);
  b.fill(10, 14, 2, 2, "f").set(3, 3, "f").set(4, 3, "f");
  b.sign(5, 27, "Ruta 1. Al norte: Ciudad Viral.");
  b.item(9, 6, "criobola-roja", "item:r1-criobola", 2);
  b.item(3, 24, "caldo-nutritivo", "item:r1-caldo");
  b.npc({ id: "r1-estudiante", x: 8, y: 15, sprite: "estudiante", dir: 2, trainer: {
    name: "Pablo", clase: "Estudiante", team: [["sacchari", 4], ["casei", 4]], sight: 4, money: 20,
    intro: "¡Eh! ¡Acabo de aprobar Microbiología General! ¡Luchemos!", lose: "Vaya… tendré que repasar el temario.", after: "En la hierba alta aparecen Microos salvajes. ¡Debilítalos antes de lanzar una Criobola!" } });
  b.npc({ id: "r1-chica", x: 9, y: 26, sprite: "chica", move: "girar", talk: "Si tu Microo está débil, vuelve a una Incubadora. ¡Es gratis!" });
  b.warp({ x: 6, y: 29, w: 2, to: "pueblo-plaqueta", tx: 8, ty: 1, dir: 0, keep: "x" });
  b.warp({ x: 6, y: 0, w: 2, to: "ciudad-viral", tx: 11, ty: 18, dir: 1, keep: "x" });
  b.encounters([
    { sp: "mucorin", min: 2, max: 4, w: 30 }, { sp: "sacchari", min: 2, max: 4, w: 25 }, { sp: "casei", min: 3, max: 4, w: 12 },
    { sp: "navicula", min: 2, max: 4, w: 10 }, { sp: "epidermi", min: 3, max: 5, w: 10 }, { sp: "coli-k12", min: 2, max: 5, w: 8 },
    { sp: "proteus-am", min: 3, max: 4, w: 5 },
  ]);
  add(b.done({ music: "ruta" }));
}

// ---------------------------------------------------------------- Ciudad Viral
{
  const b = new MapBuilder("ciudad-viral", "Ciudad Viral", 24, 20);
  b.trees(0, 0, 24, 2).trees(0, 0, 2, 20).trees(0, 18, 10, 2).trees(14, 18, 10, 2).trees(22, 0, 2, 8).trees(22, 12, 2, 8);
  b.fill(11, 6, 2, 14, "p").fill(2, 9, 20, 2, "p").fill(22, 9, 2, 2, "p").fill(5, 7, 1, 2, "p").fill(16, 7, 1, 2, "p").fill(10, 18, 4, 2, "p");
  b.building(3, 4, { kind: "incubadora", w: 5, door: 2, to: "incubadora-viral", tx: 5, ty: 6 });
  b.building(15, 4, { kind: "tienda", w: 4, door: 1, to: "tienda-viral", tx: 4, ty: 6 });
  b.building(3, 12, { kind: "casa", w: 6, color: "morado", door: 2, to: "academia", tx: 4, ty: 6 });
  b.building(15, 13, { kind: "casa", w: 5, color: "verde", door: 2, to: "casa-viral", tx: 3, ty: 5 });
  b.fill(5, 15, 1, 3, "p").fill(17, 16, 1, 2, "p").fill(2, 17, 16, 1, "p");
  b.fill(19, 2, 2, 2, "f").fill(8, 16, 2, 2, "f");
  b.sign(13, 16, "Ciudad Viral. Hogar de la Academia de Infección y Estados.");
  b.sign(9, 13, "Academia de Infección: ¡aprende a manejar los estados alterados!");
  b.npc({ id: "viral-1", x: 14, y: 8, sprite: "estudiante", move: "pasear", talk: ["Al este está el Bosque Viral. Está lleno de bacteriófagos.", "Los fagos de tipo Virus son fuertes contra Fotótrofos y bacterias Gram."] });
  b.npc({ id: "viral-2", x: 8, y: 10, sprite: "chico", dir: 2, talk: "La Incubadora cura a tus Microos a 37 °C con agitación orbital. ¡Y no cobra nada!" });
  b.npc({ id: "viral-3", x: 19, y: 11, sprite: "becario", dir: 0, talk: ["Dicen que en Ciudad Petri hay un gimnasio lleno de quesos.", "El líder, el Dr. Solé, es un experto en Microbiología de los Alimentos."] });
  b.warp({ x: 10, y: 19, w: 4, to: "ruta-1", tx: 6, ty: 1, dir: 0 });
  b.warp({ x: 23, y: 9, h: 2, to: "bosque-viral", tx: 1, ty: 9, dir: 3, keep: "y" });
  add(b.done({ music: "ciudad" }));
}
add(incubadora("incubadora-viral", "Ciudad Viral", { to: "ciudad-viral", x: 5, y: 6 }));
add(tienda("tienda-viral", "Ciudad Viral", { to: "ciudad-viral", x: 16, y: 6 }, ["criobola-roja", "caldo-nutritivo", "medio-lb", "solucion-salina"]));
add(casa("casa-viral", "Casa de Ciudad Viral", { to: "ciudad-viral", x: 17, y: 15 }, [
  { id: "abuelo-viral", x: 5, y: 3, sprite: "becario", dir: 0, script: "regaloCaldo" },
]));
{
  const b = new MapBuilder("academia", "Academia de Infección", 10, 8, "m", "interior", false);
  b.fill(0, 0, 10, 1, "w").fill(0, 1, 10, 1, "W").fill(3, 1, 4, 1, "e");
  b.fill(2, 3, 2, 1, "t").fill(6, 3, 2, 1, "t").fill(2, 5, 2, 1, "t").fill(6, 5, 2, 1, "t");
  b.fill(4, 7, 2, 1, "a");
  b.npc({ id: "profe-academia", x: 4, y: 1, sprite: "profesora", dir: 0, script: "academia" });
  b.npc({ id: "alumno-1", x: 2, y: 4, sprite: "chica", dir: 1, talk: ["La contaminación «intoxicado» quita PS al final de cada turno.", "Los Gram- y los Biofilm son inmunes a las toxinas."] });
  b.npc({ id: "alumno-2", x: 7, y: 6, sprite: "chico", dir: 1, talk: ["Un Microo en fase de latencia no puede atacar durante unos turnos.", "¡Es el mejor momento para lanzar una Criobola!"] });
  b.warp({ x: 4, y: 7, w: 2, to: "ciudad-viral", tx: 5, ty: 15, dir: 0 });
  add(b.done());
}

// ---------------------------------------------------------------- Bosque Viral
{
  const b = new MapBuilder("bosque-viral", "Bosque Viral", 30, 24, ",", "bosque");
  b.trees(0, 0, 30, 2, "V").trees(0, 22, 30, 2, "V").trees(0, 0, 2, 8, "V").trees(0, 12, 2, 12, "V").trees(28, 0, 2, 14, "V").trees(28, 18, 2, 6, "V");
  // laberinto de árboles
  b.trees(4, 2, 2, 12, "V").trees(4, 16, 2, 4, "V").trees(8, 6, 6, 2, "V").trees(10, 10, 2, 10, "V").trees(14, 2, 2, 6, "V");
  b.trees(14, 12, 6, 2, "V").trees(18, 4, 2, 6, "V").trees(22, 8, 2, 10, "V").trees(18, 18, 6, 2, "V").trees(24, 2, 2, 4, "V");
  b.fill(2, 9, 2, 2, "p").fill(0, 9, 2, 2, "p").fill(28, 14, 2, 4, "p");
  b.fill(6, 2, 2, 4, "G").fill(2, 14, 2, 6, "G").fill(6, 14, 4, 6, "G").fill(12, 8, 6, 4, "G").fill(16, 2, 2, 4, "G").fill(20, 10, 2, 8, "G").fill(24, 14, 4, 4, "G").fill(24, 6, 4, 2, "G");
  b.sign(3, 8, "Bosque Viral. ¡Cuidado con los bacteriófagos!");
  b.item(7, 20, "criobola-roja", "item:bv-criobola", 3);
  b.item(26, 3, "solucion-salina", "item:bv-salina");
  b.item(12, 4, "medio-lb", "item:bv-lb");
  b.npc({ id: "bv-becario1", x: 7, y: 9, sprite: "becario", dir: 0, trainer: {
    name: "Raúl", clase: "Becario", team: [["phage-x174", 6], ["phage-x174", 6]], sight: 4, money: 25,
    intro: "¡Estoy aislando fagos para mi tesis! ¡Los tuyos servirán de hospedador!", lose: "Mis fagos… lisados.", after: "Los fagos no tienen metabolismo propio. Necesitan una célula para replicarse." } });
  b.npc({ id: "bv-becaria", x: 16, y: 10, sprite: "chica", dir: 2, trainer: {
    name: "Marta", clase: "Becaria", team: [["griseus", 7], ["mucorin", 7]], sight: 4, money: 25,
    intro: "¡Shh! Estoy tomando muestras de suelo. ¡Ahora verás lo que he encontrado!", lose: "¡Mis estreptomicetos!", after: "Casi todos los antibióticos naturales vienen de bacterias del suelo como mi Griseus." } });
  b.npc({ id: "bv-micologo", x: 25, y: 11, sprite: "estudiante", dir: 2, trainer: {
    name: "Íñigo", clase: "Micólogo", team: [["mucorin", 7], ["rhizopupa", 8]], sight: 3, money: 30,
    intro: "¡Las hifas lo invaden todo! ¡Prepárate!", lose: "Me has dejado sin esporas.", after: "Más adelante está Ciudad Petri. Su líder usa Microos de los alimentos." } });
  b.npc({ id: "rival-bosque", x: 27, y: 15, sprite: "rival", dir: 2, script: "rivalBosque", hideIf: "rival2" });
  b.trigger({ x: 28, y: 14, h: 4, script: "rivalBosque", once: "rival2" });
  b.warp({ x: 0, y: 9, h: 2, to: "ciudad-viral", tx: 22, ty: 9, dir: 2, keep: "y" });
  b.warp({ x: 29, y: 14, h: 4, to: "ciudad-petri", tx: 1, ty: 13, dir: 3, keep: "y" });
  b.encounters([
    { sp: "phage-x174", min: 4, max: 7, w: 30 }, { sp: "mucorin", min: 5, max: 7, w: 14 }, { sp: "griseus", min: 4, max: 6, w: 14 },
    { sp: "leptospir", min: 5, max: 7, w: 10 }, { sp: "micrococ", min: 5, max: 7, w: 10 }, { sp: "subtilis", min: 5, max: 7, w: 10 },
    { sp: "rhizopupa", min: 7, max: 8, w: 5 }, { sp: "mycoplas", min: 5, max: 6, w: 7 },
  ]);
  add(b.done({ music: "bosque" }));
}

// ---------------------------------------------------------------- Ciudad Petri
{
  const b = new MapBuilder("ciudad-petri", "Ciudad Petri", 24, 20);
  b.trees(0, 0, 24, 2).trees(0, 0, 2, 12).trees(0, 18, 24, 2).trees(22, 0, 2, 20).trees(0, 18, 2, 2);
  b.fill(0, 12, 2, 6, ".");
  b.fill(0, 13, 22, 2, "p").fill(11, 8, 2, 5, "p").fill(5, 9, 1, 4, "p").fill(18, 10, 1, 3, "p");
  b.building(8, 3, { kind: "gimnasio", w: 7, door: 3, to: "gimnasio-petri", tx: 5, ty: 13 });
  b.building(3, 6, { kind: "incubadora", w: 5, door: 2, to: "incubadora-petri", tx: 5, ty: 6 });
  b.building(16, 7, { kind: "tienda", w: 4, door: 2, to: "tienda-petri", tx: 4, ty: 6 });
  b.building(16, 14, { kind: "casa", w: 5, color: "rojo", door: 2, to: "casa-petri", tx: 3, ty: 5 });
  b.fill(3, 15, 4, 3, "~").fill(2, 2, 3, 2, "f");
  b.sign(14, 12, "Ciudad Petri. «Todo empieza en una placa».");
  b.sign(10, 8, "Gimnasio de Ciudad Petri. Líder: Dr. Antoni Solé, Microbiología de los Alimentos.");
  b.npc({ id: "petri-1", x: 13, y: 11, sprite: "chico", dir: 0, talk: "El Dr. Solé usa Simbiontes, Gram+ y Esporulados. ¡Un Microo de tipo Antibiótico le vendría fatal a sus lactobacilos!" });
  b.npc({ id: "petri-2", x: 20, y: 12, sprite: "chica", move: "pasear", talk: "Dicen que el Monte Micelio, al norte, está cerrado por un derrumbe de hifas. ¡Qué miedo!" });
  b.warp({ x: 0, y: 13, h: 4, to: "bosque-viral", tx: 28, ty: 14, dir: 2, keep: "y" });
  add(b.done({ music: "ciudad" }));
}
add(incubadora("incubadora-petri", "Ciudad Petri", { to: "ciudad-petri", x: 5, y: 8 }));
add(tienda("tienda-petri", "Ciudad Petri", { to: "ciudad-petri", x: 18, y: 9 }, ["criobola-roja", "criobola-azul", "caldo-nutritivo", "medio-lb", "solucion-salina", "glicerol"]));
add(casa("casa-petri", "Casa de Ciudad Petri", { to: "ciudad-petri", x: 18, y: 16 }, [
  { id: "quesera", x: 5, y: 3, sprite: "madre", dir: 0, talk: ["Mi queso madura gracias a Penicillium roqueforti.", "¡Y el yogur, a Lactobacillus! Sin Microos no habría cocina."] },
]));
{
  const b = new MapBuilder("gimnasio-petri", "Gimnasio de Ciudad Petri", 11, 15, "Y", "gimnasio", false);
  b.fill(0, 0, 11, 1, "w").fill(0, 1, 11, 1, "W");
  b.fill(1, 4, 4, 1, "Q").fill(7, 4, 3, 1, "Q").fill(0, 7, 3, 1, "C").fill(5, 7, 6, 1, "C").fill(1, 10, 4, 1, "K").fill(7, 10, 3, 1, "Q");
  b.set(0, 2, "K").set(10, 2, "K").set(0, 12, "n").set(10, 12, "n");
  b.fill(4, 14, 3, 1, "a");
  b.npc({ id: "lider-sole", x: 5, y: 2, sprite: "sole", dir: 0, script: "liderSole" });
  b.npc({ id: "gym-lucia", x: 4, y: 9, sprite: "chica", dir: 3, trainer: {
    name: "Lucía", clase: "Técnica de Calidad", team: [["casei", 10]], sight: 3, money: 30,
    intro: "¡Alto! ¡Esta muestra no ha pasado el control de calidad!", lose: "Lote rechazado…", after: "El Dr. Solé conoce cada bacteria de la nevera." } });
  b.npc({ id: "gym-joan", x: 7, y: 6, sprite: "estudiante", dir: 2, trainer: {
    name: "Joan", clase: "Maestro Quesero", team: [["sacchari", 9], ["epidermi", 10]], sight: 3, money: 35,
    intro: "¡Huele a queso curado! ¡Y a victoria!", lose: "Se me ha cortado la leche…", after: "Los Esporulados aguantan casi todo. ¡Sus esporas resisten hasta el calor!" } });
  b.npc({ id: "guia-gym", x: 3, y: 12, sprite: "becario", dir: 0, talk: ["¡Hola, aspirante! Te doy un consejo.", "Los tipos Simbionte resisten bien a los Antibióticos… pero sufren contra Gram- y Biofilm.", "Y los Esporulados odian el agua de los Protozoos y a los Fotótrofos."] });
  b.warp({ x: 4, y: 14, w: 3, to: "ciudad-petri", tx: 11, ty: 7, dir: 0 });
  add(b.done({ music: "gimnasio" }));
}

/** Comprueba coherencia de mapas: destinos de warps dentro de los mapas existentes. */
export function checkMaps(): string[] {
  const errs: string[] = [];
  for (const m of Object.values(MAPS)) {
    for (const r of m.grid) if (r.length !== m.w) errs.push(`${m.id}: fila de ancho ${r.length}`);
    for (const w of m.warps) {
      const t = MAPS[w.to];
      if (!t) errs.push(`${m.id}: warp a mapa inexistente ${w.to}`);
      else if (w.tx < 0 || w.ty < 0 || w.tx >= t.w || w.ty >= t.h) errs.push(`${m.id}: warp fuera de ${w.to} (${w.tx},${w.ty})`);
    }
  }
  return errs;
}
