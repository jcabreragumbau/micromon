// Mapas (… → Ruta 4 → Cueva Anaeróbica / Túnel Endospórico → Ciudad Gram): Pueblo Plaqueta → Ruta 1 → Ciudad Viral → Bosque Viral → Ciudad Petri → Ruta 2 → Monte Micelio → Ruta 3 → Ciudad Cultivo.
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
  b.npc({ id: "pc-info", x: 10, y: 3, sprite: "", script: "congelador" });
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
  b.npc({ id: "petri-1", x: 13, y: 11, sprite: "chico", dir: 0, talk: "El Dr. Solé usa Simbiontes, Gram+ y Esporulados. ¡Ojo! Sus lactobacilos aguantan los Antibióticos; mejor algo de tipo Gram- o Biofilm." });
  b.fill(20, 0, 2, 13, "p");
  b.npc({ id: "petri-2", x: 15, y: 10, sprite: "chica", move: "pasear", talk: "Dicen que el Monte Micelio, al norte, está tapado por una maraña de hifas. Solo con Celulasa se puede pasar." });
  b.sign(19, 2, "Ruta 2. Al norte: Monte Micelio.");
  b.warp({ x: 20, y: 0, w: 2, to: "ruta-2", tx: 9, ty: 28, dir: 1, keep: "x" });
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


// ---------------------------------------------------------------- Ruta 2
{
  const b = new MapBuilder("ruta-2", "Ruta 2", 20, 30);
  b.trees(0, 0, 2, 30).trees(18, 0, 2, 30).trees(2, 0, 16, 2).trees(2, 28, 6, 2).trees(12, 28, 6, 2);
  b.fill(8, 28, 1, 2, "k").fill(11, 28, 1, 2, "k");
  b.fill(2, 2, 16, 3, "A").set(13, 4, "O");
  b.fill(9, 20, 2, 10, "p").fill(4, 18, 7, 2, "p").fill(4, 8, 2, 10, "p").fill(4, 8, 10, 2, "p").fill(13, 5, 1, 4, "p");
  b.fill(11, 21, 6, 5, "g").fill(7, 11, 6, 5, "g").fill(14, 10, 4, 7, "g").fill(2, 21, 5, 4, "g");
  b.trees(8, 16, 2, 2).fill(2, 6, 2, 1, "f").fill(15, 6, 2, 1, "f");
  b.sign(11, 27, "Ruta 2. Al norte: Monte Micelio. ¡Cuidado con las hifas!");
  b.item(16, 12, "solucion-salina", "item:r2-salina", 2);
  b.item(3, 22, "criobola-azul", "item:r2-azul");
  b.npc({ id: "hifas-r2", x: 13, y: 5, sprite: "@tile:hifas_bloqueo", script: "cortarHifas", hideIf: "hifas-r2", solid: true });
  b.npc({ id: "r2-micologa", x: 11, y: 19, sprite: "chica", dir: 2, trainer: {
    name: "Elena", clase: "Micóloga", team: [["roqueforti", 11], ["mucorin", 12]], sight: 3, money: 40,
    intro: "¡Los hongos son los reyes del bosque! ¿Quieres comprobarlo?", lose: "Mis esporas no han germinado…", after: "Penicillium roqueforti es el que da el color azul a los quesos. ¡Precioso!" } });
  b.npc({ id: "r2-agronomo", x: 10, y: 7, sprite: "estudiante", dir: 0, trainer: {
    name: "Ramón", clase: "Agrónomo", team: [["rhizobi", 11], ["thuringien", 11], ["serratia", 12]], sight: 2, money: 45,
    intro: "¡Mis Rhizobium fijan nitrógeno en las raíces! ¡Y luchan!", lose: "Se me ha secado la cosecha…", after: "Bacillus thuringiensis es un insecticida natural. ¡Lo usan en agricultura ecológica!" } });
  b.npc({ id: "r2-paseante", x: 15, y: 24, sprite: "chico", move: "pasear", talk: ["Arriba está el Monte Micelio. Una cueva llena de hifas que brillan en la oscuridad.", "Últimamente se ve entrar a gente con portátiles y ojeras… ¿Qué harán ahí dentro?"] });
  b.warp({ x: 9, y: 29, w: 2, to: "ciudad-petri", tx: 20, ty: 1, dir: 0, keep: "x" });
  b.warp({ x: 13, y: 4, to: "monte-micelio", tx: 14, ty: 22, dir: 1 });
  b.encounters([
    { sp: "rhizobi", min: 9, max: 12, w: 22 }, { sp: "serratia", min: 9, max: 12, w: 18 }, { sp: "thuringien", min: 10, max: 12, w: 14 },
    { sp: "bifidum", min: 9, max: 11, w: 14 }, { sp: "euglena", min: 10, max: 12, w: 12 }, { sp: "casei", min: 10, max: 12, w: 12 },
    { sp: "roqueforti", min: 11, max: 12, w: 8 },
  ]);
  add(b.done({ music: "ruta" }));
}

// ---------------------------------------------------------------- Monte Micelio
{
  const b = new MapBuilder("monte-micelio", "Monte Micelio", 30, 24, "X", "cueva", false);
  b.fill(12, 18, 5, 6, "u").fill(3, 18, 9, 3, "u").fill(2, 8, 6, 10, "u").fill(2, 3, 14, 4, "u").fill(16, 3, 4, 12, "u")
    .fill(16, 12, 12, 3, "u").fill(22, 4, 6, 8, "u").fill(24, 0, 2, 4, "u").fill(17, 19, 6, 2, "u").fill(21, 15, 2, 4, "u");
  // hifas luminosas y setas como obstáculos y decoración
  b.fill(12, 18, 1, 2, "h").fill(16, 18, 1, 1, "h").set(2, 8, "h").set(7, 8, "o").set(2, 17, "o").set(7, 16, "h").set(2, 3, "o")
    .fill(6, 3, 1, 1, "h").set(15, 6, "h").set(19, 3, "o").set(16, 9, "h").set(19, 10, "h").set(27, 14, "o").set(22, 4, "h")
    .set(27, 4, "o").set(22, 11, "h").set(17, 20, "o").set(22, 20, "h").set(12, 23, "h").set(16, 23, "o");
  b.fill(9, 5, 2, 2, "h").fill(17, 6, 2, 2, "o");
  b.item(3, 15, "medio-lb", "item:mm-lb", 2);
  b.item(26, 10, "criobola-azul", "item:mm-azul", 2);
  b.item(14, 4, "glicerol", "item:mm-glicerol");
  const recluta = (id: string, x: number, y: number, dir: number, sprite: string, name: string, team: [string, number][], intro: string, lose: string, after: string) =>
    b.npc({ id, x, y, sprite, dir, trainer: { name, clase: "Recluta de la Unidad", team, sight: 4, money: 60, intro, lose, after } });
  recluta("mm-recluta-1", 5, 12, 0, "recluta", "Becario", [["phage-x174", 13], ["mycoplas", 13]],
    "¡Eh! Este becario está picando datos de 16S y no se puede distraer. ¡Fuera de aquí!",
    "¡Mi portátil se ha reiniciado!", "Llevo tres meses sin ver una placa de Petri… solo terminales negras.");
  recluta("mm-recluta-2", 11, 4, 2, "recluta-b", "Doctoranda", [["serratia", 13], ["bacteroid", 14]],
    "¿Microbióloga? ¡Ja! Los Microos son solo excusas con ADN para publicar en Nature.",
    "No puede ser… ¡mi pipeline no tenía control de errores!", "Mi contrato acabó hace dos años. Sigo aquí por el paper.");
  recluta("mm-recluta-3", 19, 13, 2, "recluta", "Becario", [["mucorin", 13], ["roqueforti", 14], ["phage-x174", 14]],
    "¡El Dr. Salazar ha dicho que nadie pase! Bueno, ha dicho que le da igual, pero yo me lo tomo en serio.",
    "Vale, vale, pasa… total, nadie me paga.", "El Dr. Salazar está al fondo, sentado. No se levanta ni para comer.");
  b.npc({ id: "mm-becario-1", x: 3, y: 9, sprite: "becario", dir: 0, hideIf: "salazar1",
    talk: ["¡Ayuda! Nos obligan a analizar metabarcoding de 16S y 18S sin supervisión.", "Yo vine a hacer prácticas de cultivo… ¡y llevo semanas sin tocar una pipeta!"] });
  b.npc({ id: "mm-becario-2", x: 15, y: 3, sprite: "estudiante", dir: 0, hideIf: "salazar1",
    talk: "Dicen que buscan cepas ancestrales liofilizadas para llevarlas al Instituto Carlos III. ¿Para qué las querrán?" });
  b.npc({ id: "salazar", x: 24, y: 4, sprite: "salazar", dir: 0, script: "salazar", hideIf: "salazar1", solid: true });
  b.npc({ id: "disco-duro", x: 25, y: 4, sprite: "@tile:disco_duro", script: "discoDuro", hideIf: "disco", solid: true });
  b.warp({ x: 14, y: 23, w: 1, to: "ruta-2", tx: 13, ty: 5, dir: 0 });
  b.warp({ x: 24, y: 0, w: 2, to: "ruta-3", tx: 9, ty: 23, dir: 0 });
  b.encounters([
    { sp: "roqueforti", min: 12, max: 15, w: 20 }, { sp: "niger", min: 13, max: 15, w: 16 }, { sp: "mucorin", min: 12, max: 14, w: 14 },
    { sp: "rhizopupa", min: 13, max: 15, w: 12 }, { sp: "bacteroid", min: 12, max: 14, w: 12 }, { sp: "thermus", min: 13, max: 15, w: 10 },
    { sp: "phage-x174", min: 12, max: 14, w: 10 }, { sp: "mycoplas", min: 12, max: 14, w: 6 },
  ]);
  add(b.done({ music: "cueva" }));
}

// ---------------------------------------------------------------- Ruta 3
{
  const b = new MapBuilder("ruta-3", "Ruta 3", 20, 30);
  b.trees(0, 0, 2, 30).trees(18, 0, 2, 30).trees(2, 0, 6, 2).trees(10, 0, 8, 2).trees(2, 26, 16, 4);
  b.fill(4, 20, 12, 3, "A").set(9, 22, "O");
  b.fill(11, 3, 6, 5, "~");
  b.fill(9, 23, 9, 1, "p").fill(16, 10, 2, 14, "p").fill(8, 10, 10, 2, "p").fill(8, 0, 2, 12, "p");
  b.fill(3, 7, 5, 9, "g").fill(10, 13, 5, 5, "g").fill(2, 23, 6, 3, "g");
  b.fill(12, 8, 4, 1, "f").set(3, 17, "f").set(4, 17, "f");
  b.sign(10, 24, "Ruta 3. Al norte: Ciudad Cultivo, la ciudad de los fotobiorreactores.");
  b.item(16, 4, "caldo-nutritivo", "item:r3-caldo", 2);
  b.item(3, 15, "medio-lb", "item:r3-lb");
  b.npc({ id: "r3-limnologa", x: 13, y: 9, sprite: "chica", dir: 0, trainer: {
    name: "Marta", clase: "Limnóloga", team: [["euglena", 15], ["navicula", 15], ["noctiluca", 16]], sight: 1, money: 60,
    intro: "¡Este lago tiene más diatomeas que gotas de agua!", lose: "Se me ha volcado el muestreador…", after: "La Dra. Gajú estudia los tapetes microbianos del Delta del Ebro. ¡Sus Microos aman la luz!" } });
  b.npc({ id: "r3-cervecero", x: 7, y: 16, sprite: "estudiante", dir: 3, trainer: {
    name: "Iker", clase: "Cervecero", team: [["sacchari", 15], ["zymomonas", 16]], sight: 3, money: 55,
    intro: "¡Fermentación alcohólica en marcha! ¿Un combate mientras sube la espuma?", lose: "Se me ha cortado la fermentación…", after: "Zymomonas fermenta el agave del pulque. ¡Y es una bacteria, no una levadura!" } });
  b.npc({ id: "r3-rival", x: 9, y: 5, sprite: "rival", dir: 0, hideIf: "rival3" });
  b.trigger({ x: 8, y: 7, w: 2, script: "rivalRuta3", once: "rival3" });
  b.warp({ x: 9, y: 22, to: "monte-micelio", tx: 24, ty: 1, dir: 0 });
  b.warp({ x: 8, y: 0, w: 2, to: "ciudad-cultivo", tx: 8, ty: 18, dir: 1, keep: "x" });
  b.encounters([
    { sp: "euglena", min: 14, max: 17, w: 20 }, { sp: "noctiluca", min: 14, max: 16, w: 15 }, { sp: "ceratium", min: 14, max: 16, w: 15 },
    { sp: "zymomonas", min: 14, max: 16, w: 14 }, { sp: "rhizobi", min: 14, max: 16, w: 12 }, { sp: "albicans", min: 15, max: 17, w: 12 },
    { sp: "desulfovib", min: 15, max: 17, w: 6 }, { sp: "navicula", min: 14, max: 16, w: 6 },
  ]);
  add(b.done({ music: "ruta" }));
}

// ---------------------------------------------------------------- Ciudad Cultivo
{
  const b = new MapBuilder("ciudad-cultivo", "Ciudad Cultivo", 26, 20);
  b.trees(0, 0, 26, 2).trees(0, 0, 2, 20).trees(24, 0, 2, 20).trees(0, 18, 8, 2).trees(10, 18, 14, 2);
  b.fill(8, 12, 2, 8, "p").fill(2, 12, 20, 2, "p").fill(15, 8, 1, 4, "p").fill(5, 7, 1, 5, "p").fill(21, 11, 1, 1, "p");
  b.building(12, 4, { kind: "gimnasio", w: 7, door: 3, to: "gimnasio-cultivo", tx: 6, ty: 15 });
  b.building(3, 4, { kind: "incubadora", w: 5, door: 2, to: "incubadora-cultivo", tx: 5, ty: 6 });
  b.building(19, 8, { kind: "tienda", w: 4, door: 2, to: "tienda-cultivo", tx: 4, ty: 6 });
  b.building(14, 14, { kind: "casa", w: 5, color: "azul", door: 2, to: "casa-cultivo", tx: 3, ty: 5 });
  b.fill(2, 15, 4, 3, "~").fill(10, 15, 3, 2, "f").fill(20, 3, 3, 2, "f");
  b.sign(10, 14, "Ciudad Cultivo. «Donde la luz se convierte en biomasa».");
  b.sign(11, 8, "Gimnasio de Ciudad Cultivo. Líder: Dra. Núria Gajú, Microbiología Ambiental.");
  b.fill(22, 12, 4, 2, "p");
  b.sign(22, 11, "Ruta 4. Al este: Túnel Endospórico y Ciudad Gram.");
  b.warp({ x: 25, y: 12, h: 2, to: "ruta-4", tx: 1, ty: 8, dir: 3, keep: "y" });
  b.npc({ id: "cultivo-1", x: 13, y: 10, sprite: "chico", dir: 0, talk: ["El gimnasio es un invernadero lleno de columnas de Winogradsky.", "Arriba crecen las algas y abajo, sin oxígeno, las bacterias del azufre. ¡Cada capa es un mundo!"] });
  b.npc({ id: "cultivo-2", x: 19, y: 13, sprite: "chica", move: "pasear", talk: "La Dra. Gajú usa Fotótrofos, Algas y Anaerobios. Un buen Microo de tipo Hongo o Gram- le dará guerra." });
  b.npc({ id: "cultivo-becario", x: 6, y: 13, sprite: "becario", dir: 0, showIf: "salazar1",
    talk: ["¡Eres quien nos sacó del Monte Micelio! Gracias.", "Por fin he vuelto a sembrar una placa. ¡Qué bien huele el agar!"] });
  b.warp({ x: 8, y: 19, w: 2, to: "ruta-3", tx: 8, ty: 1, dir: 0, keep: "x" });
  add(b.done({ music: "ciudad" }));
}
add(incubadora("incubadora-cultivo", "Ciudad Cultivo", { to: "ciudad-cultivo", x: 5, y: 6 }));
add(tienda("tienda-cultivo", "Ciudad Cultivo", { to: "ciudad-cultivo", x: 21, y: 10 }, ["criobola-roja", "criobola-azul", "caldo-nutritivo", "medio-lb", "solucion-salina", "glicerol"]));
add(casa("casa-cultivo", "Casa de Ciudad Cultivo", { to: "ciudad-cultivo", x: 16, y: 16 }, [
  { id: "cultivo-casa", x: 5, y: 3, sprite: "estudiante", dir: 0, talk: ["Mi abuelo cultivaba Spirulina en la terraza.", "Decía que una cianobacteria hace más fotosíntesis que todos los árboles de la ciudad juntos."] },
]));
{
  const b = new MapBuilder("gimnasio-cultivo", "Gimnasio de Ciudad Cultivo", 13, 17, "j", "invernadero", false);
  b.fill(0, 0, 13, 1, "w").fill(0, 1, 13, 1, "W");
  b.fill(0, 5, 5, 1, "q").fill(7, 5, 6, 1, "q").fill(0, 9, 8, 1, "q").fill(10, 9, 3, 1, "q");
  b.set(1, 2, "Z").set(3, 2, "Z").set(9, 2, "Z").set(11, 2, "Z").set(0, 7, "Z").set(12, 7, "Z").set(0, 11, "Z").set(12, 11, "Z")
    .set(1, 13, "Z").set(11, 13, "Z").set(0, 15, "n").set(12, 15, "n");
  b.fill(5, 16, 3, 1, "a");
  b.npc({ id: "lider-gaju", x: 6, y: 2, sprite: "gaju", dir: 0, script: "liderGaju" });
  b.npc({ id: "gym2-ana", x: 9, y: 7, sprite: "chica", dir: 2, trainer: {
    name: "Sara", clase: "Ecóloga", team: [["euglena", 17], ["navicula", 17]], sight: 3, money: 70,
    intro: "¡Bienvenid{o} al invernadero! ¿Sabes qué capa de la columna prefieres?", lose: "Me has dejado sin oxígeno…", after: "Arriba, Fotótrofos. Abajo, Anaerobios. ¡Todo es cuestión de gradientes!" } });
  b.npc({ id: "gym2-pau", x: 4, y: 11, sprite: "estudiante", dir: 3, trainer: {
    name: "Pau", clase: "Técnico de Fotobiorreactor", team: [["synechoc", 16], ["desulfovib", 17]], sight: 3, money: 70,
    intro: "¡Mi fotobiorreactor produce biomasa sin parar! ¡Y Microos!", lose: "Se me ha apagado la lámpara…", after: "Desulfovibrio respira sulfato y suelta H₂S. ¡Por eso huele a huevo podrido!" } });
  b.npc({ id: "guia-gym2", x: 4, y: 14, sprite: "becario", dir: 0, talk: ["¡Hola, aspirante! Te doy un consejo.", "La Dra. Gajú combina Algas, Anaerobios y Fotótrofos.", "Un tipo Hongo pega fuerte a los Fotótrofos… ¡pero cuidado con los Anaerobios!"] });
  b.warp({ x: 5, y: 16, w: 3, to: "ciudad-cultivo", tx: 15, ty: 8, dir: 0 });
  add(b.done({ music: "gimnasio" }));
}

// ---------------------------------------------------------------- Ruta 4
{
  const b = new MapBuilder("ruta-4", "Ruta 4", 40, 18);
  b.trees(0, 0, 40, 2).trees(0, 16, 40, 2).trees(38, 8, 2, 8).trees(0, 2, 2, 6).trees(0, 10, 2, 6);
  b.fill(32, 2, 8, 6, "A").set(35, 7, "O");
  b.fill(8, 11, 6, 3, "A").set(10, 13, "O");
  b.fill(0, 8, 37, 2, "p").fill(14, 10, 1, 5, "p").fill(10, 14, 5, 1, "p");
  b.fill(2, 3, 8, 4, "g").fill(16, 3, 10, 4, "g").fill(18, 11, 10, 4, "g").fill(2, 11, 5, 4, "g");
  b.fill(28, 12, 6, 3, "~").fill(26, 3, 2, 2, "f").fill(30, 10, 2, 1, "f");
  b.fill(16, 10, 4, 1, "v");
  b.sign(3, 7, "Ruta 4. Al este: Túnel Endospórico. Al sur: Cueva Anaeróbica (aire irrespirable).");
  b.item(24, 4, "medio-tsb", "item:r4-tsb");
  b.item(3, 13, "criobola-azul", "item:r4-azul", 3);
  b.item(33, 13, "atp-concentrado", "item:r4-atp", 1, true);
  b.npc({ id: "r4-guarda", x: 10, y: 14, sprite: "dependiente", dir: 0, script: "guardaCueva", hideIf: "mascara-ok" });
  b.npc({ id: "r4-guarda-2", x: 11, y: 14, sprite: "dependiente", dir: 2, showIf: "mascara-ok", talk: "Dentro hay metano y sulfuro. ¡No te quites la máscara!" });
  b.npc({ id: "r4-ciclista", x: 12, y: 8, sprite: "chico", dir: 3, trainer: {
    name: "Nil", clase: "Técnico de Depuradora", team: [["putida", 19], ["klebsi", 20]], sight: 4, money: 80,
    intro: "¡Las Pseudomonas se comen el petróleo! ¿Te apuntas a un combate?", lose: "Me has dejado el agua más limpia que nunca…", after: "En la depuradora, las bacterias hacen todo el trabajo sucio. Literalmente." } });
  b.npc({ id: "r4-parasit", x: 22, y: 10, sprite: "chica", dir: 1, trainer: {
    name: "Inés", clase: "Parasitóloga", team: [["giardia", 20], ["proteus-am", 19], ["entamoeba", 21]], sight: 3, money: 85,
    intro: "¡No bebas del estanque! Bueno, primero luchemos.", lose: "Tendré que hervir el agua…", after: "Giardia tiene dos núcleos y parece que te mira. ¡Dan escalofríos!" } });
  b.npc({ id: "r4-micro", x: 30, y: 9, sprite: "estudiante", dir: 2, trainer: {
    name: "Óscar", clase: "Estudiante de Máster", team: [["neisseria", 20], ["caulobac", 20], ["spirogyra", 21]], sight: 4, money: 90,
    intro: "¡Mi TFM va de Caulobacter! ¿Sabías que se divide en dos células distintas?", lose: "Tendré que repetir el experimento…", after: "El Túnel Endospórico es oscuro como la boca de un lobo. Con la Medalla Tapete podrás iluminarlo." } });
  b.warp({ x: 0, y: 8, h: 2, to: "ciudad-cultivo", tx: 24, ty: 12, dir: 2, keep: "y" });
  b.warp({ x: 35, y: 7, to: "tunel-endosporico", tx: 2, ty: 12, dir: 1 });
  b.warp({ x: 10, y: 13, to: "cueva-anaerobica", tx: 11, ty: 16, dir: 1 });
  b.encounters([
    { sp: "perfringens", min: 19, max: 22, w: 16 }, { sp: "klebsi", min: 19, max: 21, w: 16 }, { sp: "putida", min: 19, max: 21, w: 14 },
    { sp: "giardia", min: 19, max: 21, w: 14 }, { sp: "neisseria", min: 19, max: 21, w: 12 }, { sp: "spirogyra", min: 20, max: 22, w: 12 },
    { sp: "caulobac", min: 19, max: 21, w: 10 }, { sp: "kefirgran", min: 20, max: 22, w: 6 },
  ]);
  add(b.done({ music: "ruta" }));
}

// ---------------------------------------------------------------- Cueva Anaeróbica (lateral, con máscara)
{
  const b = new MapBuilder("cueva-anaerobica", "Cueva Anaeróbica", 24, 18, "X", "cueva", false);
  b.fill(9, 12, 5, 6, "u").fill(3, 12, 6, 3, "u").fill(3, 3, 4, 9, "u").fill(3, 3, 17, 3, "u").fill(16, 6, 4, 9, "u").fill(13, 12, 7, 3, "u");
  b.fill(9, 7, 4, 3, "u").fill(10, 5, 1, 2, "u");
  b.set(3, 3, "o").set(19, 3, "o").set(3, 14, "h").set(19, 14, "o").set(12, 12, "h").set(16, 9, "h").set(6, 7, "h").set(9, 9, "o");
  b.item(10, 8, "plasmido-col", "item:ca-col");
  b.item(19, 5, "glicerol", "item:ca-glicerol", 2);
  b.item(4, 11, "medio-tsb", "item:ca-tsb");
  b.npc({ id: "ca-espeleo", x: 12, y: 4, sprite: "chica", dir: 0, trainer: {
    name: "Carla", clase: "Espeleóloga", team: [["methanococ", 22], ["perfringens", 22], ["desulfovib", 23]], sight: 3, money: 110,
    intro: "¡Aquí abajo no hay ni una molécula de oxígeno! Perfecto para mis Microos.", lose: "Me he quedado sin aire… y sin Microos.", after: "Methanococcus produce metano. ¡Es una arquea, ni bacteria ni eucariota!" } });
  b.npc({ id: "ca-cientifico", x: 17, y: 13, sprite: "becario", dir: 2, talk: ["Estudio los metanógenos de esta cueva. Las arqueas son un dominio de la vida aparte.", "¿Sabías que la mitad del metano del planeta lo producen Microos como estos?"] });
  b.warp({ x: 11, y: 17, to: "ruta-4", tx: 10, ty: 14, dir: 0 });
  b.encounters([
    { sp: "methanococ", min: 20, max: 23, w: 26 }, { sp: "perfringens", min: 20, max: 23, w: 22 }, { sp: "bacteroid", min: 20, max: 22, w: 16 },
    { sp: "desulfovib", min: 21, max: 23, w: 16 }, { sp: "zymomonas", min: 20, max: 22, w: 12 }, { sp: "thiomargar", min: 22, max: 24, w: 8 },
  ]);
  add(b.done({ music: "cueva", onEnter: "entrarCuevaAnaerobica" }));
}

// ---------------------------------------------------------------- Túnel Endospórico (oscuro)
{
  const b = new MapBuilder("tunel-endosporico", "Túnel Endospórico", 36, 14, "X", "cueva", false);
  b.fill(1, 10, 6, 4, "u").fill(5, 8, 2, 3, "u").fill(5, 7, 10, 2, "u").fill(13, 2, 2, 6, "u").fill(13, 2, 10, 2, "u")
    .fill(21, 2, 2, 9, "u").fill(21, 9, 8, 2, "u").fill(27, 3, 2, 7, "u").fill(27, 3, 9, 2, "u").fill(8, 9, 4, 4, "u").fill(16, 6, 3, 5, "u").fill(15, 6, 1, 1, "u");
  b.set(1, 10, "o").set(9, 12, "h").set(14, 7, "o").set(18, 10, "h").set(22, 2, "o").set(28, 9, "h").set(33, 4, "o");
  b.item(10, 11, "criobola-amarilla", "item:te-amarilla");
  b.item(17, 9, "atp-concentrado", "item:te-atp");
  b.item(28, 5, "glicerol", "item:te-glicerol", 1, true);
  b.npc({ id: "te-esporas-1", x: 13, y: 5, sprite: "estudiante", dir: 0, trainer: {
    name: "Bruno", clase: "Coleccionista de Esporas", team: [["subtilis", 21], ["cereus", 22], ["mycoides", 22]], sight: 3, money: 95,
    intro: "¡Shhh! Las endosporas duermen. Pero yo no.", lose: "Mis esporas han germinado… hacia la derrota.", after: "Una endospora puede aguantar siglos esperando. ¡Hasta millones de años en ámbar!" } });
  b.npc({ id: "te-esporas-2", x: 24, y: 9, sprite: "chica", dir: 2, trainer: {
    name: "Alba", clase: "Esterilizadora", team: [["lichenifor", 23], ["perfringens", 22]], sight: 3, money: 100,
    intro: "¡Ni el autoclave a 121 °C me detiene! Bueno, a mis esporas sí, a veces.", lose: "Ciclo de esterilización fallido…", after: "Para matar endosporas hace falta autoclave: vapor a presión, 121 °C, 15 minutos." } });
  b.warp({ x: 2, y: 13, w: 2, to: "ruta-4", tx: 35, ty: 8, dir: 0 });
  b.warp({ x: 35, y: 3, h: 2, to: "ciudad-gram", tx: 1, ty: 9, dir: 3, keep: "y" });
  b.encounters([
    { sp: "subtilis", min: 21, max: 24, w: 20 }, { sp: "lichenifor", min: 22, max: 24, w: 14 }, { sp: "cereus", min: 21, max: 23, w: 16 },
    { sp: "mycoides", min: 21, max: 24, w: 14 }, { sp: "thuringien", min: 21, max: 23, w: 14 }, { sp: "perfringens", min: 21, max: 23, w: 14 },
    { sp: "amberspor", min: 23, max: 24, w: 4 }, { sp: "anthracis", min: 24, max: 24, w: 4 },
  ]);
  add(b.done({ music: "cueva", dark: true, onEnter: "entrarTunel" }));
}

// ---------------------------------------------------------------- Ciudad Gram
{
  const b = new MapBuilder("ciudad-gram", "Ciudad Gram", 26, 20);
  b.trees(0, 0, 26, 2).trees(0, 0, 2, 8).trees(0, 12, 2, 8).trees(24, 0, 2, 20).trees(0, 18, 26, 2);
  b.fill(0, 9, 22, 2, "p").fill(15, 7, 1, 2, "p").fill(5, 7, 1, 2, "p").fill(18, 11, 1, 3, "p").fill(10, 11, 1, 6, "p").fill(7, 16, 4, 1, "p");
  b.building(12, 2, { kind: "gimnasio", w: 7, color: "morado", door: 3, to: "gimnasio-gram", tx: 6, ty: 15 });
  b.building(3, 4, { kind: "incubadora", w: 5, door: 2, to: "incubadora-gram", tx: 5, ty: 6 });
  b.building(16, 14, { kind: "tienda", w: 4, door: 2, to: "tienda-gram", tx: 4, ty: 6 });
  b.building(5, 13, { kind: "casa", w: 5, color: "morado", door: 2, to: "casa-gram", tx: 3, ty: 5 });
  b.fill(20, 4, 3, 2, "f").fill(2, 13, 2, 4, "f").fill(12, 13, 3, 3, "~");
  b.sign(10, 8, "Ciudad Gram. «Violeta o rosa: todo depende del alcohol-acetona».");
  b.sign(11, 6, "Gimnasio de Ciudad Gram. Líder: Dra. Laia Guàrdia, Micología.");
  b.fill(22, 9, 4, 2, "p");
  b.sign(22, 11, "Ruta 5. Al este: Pueblo Levadura y la Torre Prión.");
  b.warp({ x: 25, y: 9, h: 2, to: "ruta-5", tx: 1, ty: 7, dir: 3, keep: "y" });
  b.npc({ id: "gram-1", x: 9, y: 11, sprite: "chico", move: "pasear", talk: ["La tinción de Gram tiñe de violeta las bacterias de pared gruesa y de rosa las de pared fina.", "¡Por eso hay Microos Gram+ y Gram-!"] });
  b.npc({ id: "gram-2", x: 20, y: 8, sprite: "chica", dir: 0, talk: "La Dra. Guàrdia es micóloga. Sus mohos odian los Antibióticos… ¡Uy, no, al revés! Mejor pregunta en el gimnasio." });
  b.npc({ id: "gram-3", x: 14, y: 12, sprite: "estudiante", dir: 2, talk: ["Aspergillus flavus produce aflatoxinas en los cacahuetes mal guardados.", "¡Y Penicillium chrysogenum nos dio la penicilina! Los hongos son buenos y malos a la vez."] });
  b.warp({ x: 0, y: 9, h: 2, to: "tunel-endosporico", tx: 34, ty: 3, dir: 2, keep: "y" });
  add(b.done({ music: "ciudad" }));
}
add(incubadora("incubadora-gram", "Ciudad Gram", { to: "ciudad-gram", x: 5, y: 6 }));
add(tienda("tienda-gram", "Ciudad Gram", { to: "ciudad-gram", x: 18, y: 16 }, ["criobola-roja", "criobola-azul", "criobola-amarilla", "medio-lb", "medio-tsb", "solucion-salina", "glicerol", "atp-concentrado"]));
add(casa("casa-gram", "Casa de Ciudad Gram", { to: "ciudad-gram", x: 7, y: 15 }, [
  { id: "gram-casa", x: 5, y: 3, sprite: "madre", dir: 0, talk: ["Mi hijo trabaja en el Instituto de Biotecnología, más allá de Ciudad Aerobia.", "Dice que últimamente hay gente rara con portátiles por los pasillos…"] },
]));
{
  const b = new MapBuilder("gimnasio-gram", "Gimnasio de Ciudad Gram", 13, 17, "u", "cueva", false);
  b.fill(0, 0, 13, 1, "w").fill(0, 1, 13, 1, "W");
  // laberinto de hifas fluorescentes
  b.fill(0, 4, 9, 1, "h").fill(11, 4, 2, 1, "h").fill(4, 8, 9, 1, "h").fill(0, 8, 2, 1, "h").fill(0, 12, 7, 1, "h").fill(9, 12, 4, 1, "h");
  b.set(0, 2, "o").set(12, 2, "o").set(0, 6, "o").set(12, 10, "o").set(0, 15, "n").set(12, 15, "n");
  b.fill(5, 16, 3, 1, "a");
  b.npc({ id: "lider-guardia", x: 6, y: 2, sprite: "guardia", dir: 0, script: "liderGuardia" });
  b.npc({ id: "gym3-a", x: 10, y: 6, sprite: "estudiante", dir: 2, trainer: {
    name: "Jordi", clase: "Micólogo", team: [["roqueforti", 23], ["niger", 24]], sight: 4, money: 110,
    intro: "¡Bienvenid{o} a la placa de Sabouraud más grande del mundo!", lose: "Me has dejado sin conidios…", after: "A los hongos les hacen daño los Anaerobios, los Gram+ y las Algas. ¡Pero aguantan bien a los Fotótrofos!" } });
  b.npc({ id: "gym3-b", x: 3, y: 10, sprite: "chica", dir: 3, trainer: {
    name: "Mireia", clase: "Micóloga", team: [["albicans", 23], ["rhizopupa", 23], ["mucorin", 24]], sight: 4, money: 110,
    intro: "¡Las hifas lo cubren todo! ¿Te atreves a atravesarlas?", lose: "Mi micelio se ha secado…", after: "La Dra. Guàrdia tiene un Aspergillus que suelta aflatoxinas. ¡Lleva Solución Salina!" } });
  b.npc({ id: "guia-gym3", x: 4, y: 14, sprite: "becario", dir: 0, talk: ["¡Hola, aspirante! Te doy un consejo.", "La Dra. Guàrdia usa Hongos: sufren contra Anaerobios, Gram+ y Algas, y resisten Fotótrofos, Antibióticos y Esporulados.", "¡Y cuidado con su Chrysogenum: produce penicilina!"] });
  b.warp({ x: 5, y: 16, w: 3, to: "ciudad-gram", tx: 15, ty: 6, dir: 0 });
  add(b.done({ music: "gimnasio" }));
}

// ---------------------------------------------------------------- Ruta 5
{
  const b = new MapBuilder("ruta-5", "Ruta 5", 36, 16);
  b.trees(0, 0, 36, 2).trees(0, 14, 36, 2).trees(0, 2, 2, 4).trees(0, 10, 2, 4).trees(34, 2, 2, 4).trees(34, 10, 2, 4);
  b.fill(0, 7, 36, 2, "p");
  b.fill(4, 2, 7, 4, "g").fill(14, 10, 9, 4, "g").fill(25, 2, 7, 4, "g").fill(2, 10, 5, 4, "g");
  b.fill(12, 3, 1, 4, "l").fill(24, 9, 1, 4, "l").fill(28, 10, 4, 3, "~").fill(15, 4, 3, 2, "f");
  b.fill(4, 6, 7, 1, "v");
  b.sign(3, 9, "Ruta 5. Al este: Pueblo Levadura.");
  b.item(30, 3, "medio-tsb", "item:r5-tsb");
  b.item(3, 12, "plasmido-r", "item:r5-plasmido-r");
  b.npc({ id: "r5-a", x: 9, y: 9, sprite: "chico", dir: 1, trainer: {
    name: "Aleix", clase: "Epidemiólogo", team: [["rickettsia", 25], ["borrelia", 26]], sight: 3, money: 100,
    intro: "¡Las garrapatas transmiten de todo! ¿Te enseño mis Microos?", lose: "Brote controlado…", after: "Borrelia viaja en garrapatas y Rickettsia en piojos. ¡Siempre van de paquete!" } });
  b.npc({ id: "r5-b", x: 19, y: 6, sprite: "chica", dir: 0, trainer: {
    name: "Nora", clase: "Dentista", team: [["mutans", 26], ["actinomyces", 26]], sight: 1, money: 110,
    intro: "¡Abre la boca! Ah, no, que eres rival. ¡Combate!", lose: "Me has dejado sin placa dental…", after: "Streptococcus mutans fabrica la placa que te da caries. ¡Cepíllate!" } });
  b.npc({ id: "r5-c", x: 27, y: 8, sprite: "estudiante", dir: 2, trainer: {
    name: "Pol", clase: "Microbiólogo de Suelos", team: [["bdellovib", 26], ["smegmatis", 26], ["caulobac", 27]], sight: 4, money: 110,
    intro: "¡Bdellovibrio se come a otras bacterias desde dentro! ¿Quieres verlo?", lose: "Me han depredado…", after: "En Pueblo Levadura hay una torre llena de placas contaminadas. Nadie sube por la niebla." } });
  b.warp({ x: 0, y: 7, h: 2, to: "ciudad-gram", tx: 24, ty: 9, dir: 2, keep: "y" });
  b.warp({ x: 35, y: 7, h: 2, to: "pueblo-levadura", tx: 1, ty: 10, dir: 3, keep: "y" });
  b.encounters([
    { sp: "rickettsia", min: 25, max: 27, w: 14 }, { sp: "neisseria", min: 25, max: 27, w: 12 }, { sp: "cryptococ", min: 25, max: 28, w: 14 },
    { sp: "smegmatis", min: 25, max: 27, w: 12 }, { sp: "borrelia", min: 25, max: 27, w: 12 }, { sp: "bdellovib", min: 25, max: 27, w: 12 },
    { sp: "mutans", min: 25, max: 27, w: 12 }, { sp: "actinomyces", min: 26, max: 28, w: 12 },
  ]);
  add(b.done({ music: "ruta" }));
}

// ---------------------------------------------------------------- Pueblo Levadura
{
  const b = new MapBuilder("pueblo-levadura", "Pueblo Levadura", 24, 20);
  b.trees(0, 0, 24, 2).trees(0, 0, 2, 10).trees(0, 12, 2, 8).trees(22, 0, 2, 8).trees(22, 12, 2, 8).trees(0, 18, 24, 2);
  b.fill(0, 10, 24, 2, "p").fill(15, 6, 1, 4, "p").fill(5, 7, 1, 3, "p").fill(19, 12, 1, 4, "p");
  b.building(12, 2, { kind: "lab", w: 7, color: "morado", door: 3, to: "torre-prion-1", tx: 5, ty: 12 });
  b.building(3, 4, { kind: "incubadora", w: 5, door: 2, to: "incubadora-levadura", tx: 5, ty: 6 });
  b.building(17, 13, { kind: "casa", w: 5, color: "gris", door: 2, to: "casa-levadura", tx: 3, ty: 5 });
  b.fill(2, 13, 6, 4, "f").fill(9, 14, 4, 3, "f");
  b.sign(9, 9, "Pueblo Levadura. «Aquí descansan las cepas que se contaminaron».");
  b.sign(17, 8, "Torre Prión. Cementerio de cultivos contaminados. Prohibido abrir las placas.");
  b.npc({ id: "lev-1", x: 8, y: 12, sprite: "madre", dir: 0, talk: ["Dicen que en la torre hay proteínas que se pliegan mal y contagian su forma a las sanas.", "Sin un Western Blot no hay forma de saber qué son. ¡Dan escalofríos!"] });
  b.npc({ id: "lev-2", x: 19, y: 11, sprite: "chico", move: "pasear", talk: "Los del Casino de Ciudad Aerobia, al este, tienen máquinas de todo tipo. Hasta un Western Blot, dicen." });
  b.warp({ x: 0, y: 10, h: 2, to: "ruta-5", tx: 34, ty: 7, dir: 2, keep: "y" });
  b.warp({ x: 23, y: 10, h: 2, to: "ruta-6", tx: 1, ty: 7, dir: 3, keep: "y" });
  add(b.done({ music: "pueblo" }));
}
add(incubadora("incubadora-levadura", "Pueblo Levadura", { to: "pueblo-levadura", x: 5, y: 6 }));
add(casa("casa-levadura", "Casa de Pueblo Levadura", { to: "pueblo-levadura", x: 19, y: 15 }, [
  { id: "lev-casa", x: 5, y: 3, sprite: "profesora", dir: 0, talk: ["Fui técnica de laboratorio cuarenta años. En esa torre guardábamos las placas que se estropeaban.", "Ahora la niebla no deja subir a nadie… Dicen que hay alguien arriba desde hace días."] },
]));

// ---------------------------------------------------------------- Torre Prión
function torre(n: number) {
  const b = new MapBuilder(`torre-prion-${n}`, `Torre Prión ${n}P`, 11, 14, "F", "torre", false);
  b.fill(0, 0, 11, 1, "w").fill(0, 1, 11, 1, "W");
  return b;
}
{
  const b = torre(1);
  b.set(1, 3, "I").set(3, 3, "I").set(7, 3, "I").set(9, 3, "I").set(1, 6, "I").set(3, 6, "I").set(7, 6, "I").set(9, 6, "I").set(1, 9, "I").set(9, 9, "I");
  b.set(10, 2, "E").fill(4, 13, 3, 1, "a");
  b.npc({ id: "torre-dolida", x: 4, y: 8, sprite: "chica", dir: 0, talk: ["Aquí está la placa de mi primer cultivo. Se contaminó con un hongo…", "Lo cuidé durante meses. Vengo a verlo cada semana."] });
  const niebla = "Una niebla densa de proteínas mal plegadas tapa las escaleras. Sin un Western Blot no sabes qué son… y no te atreves a pasar.";
  b.npc({ id: "niebla-1", x: 9, y: 2, sprite: "", hideIf: "blot", solid: true, talk: niebla });
  b.npc({ id: "niebla-2", x: 10, y: 3, sprite: "", hideIf: "blot", solid: true, talk: niebla });
  b.warp({ x: 4, y: 13, w: 3, to: "pueblo-levadura", tx: 15, ty: 6, dir: 0 });
  b.warp({ x: 10, y: 2, to: "torre-prion-2", tx: 9, ty: 2, dir: 2 });
  b.encounters([{ sp: "genitalium", min: 29, max: 31, w: 1 }]);
  add(b.done({ music: "torre", fog: true }));
}
{
  const b = torre(2);
  b.fill(2, 4, 7, 1, "I").fill(0, 8, 4, 1, "I").fill(6, 8, 5, 1, "I").set(1, 11, "I").set(9, 11, "I");
  b.set(10, 2, "E").set(0, 12, "E");
  b.npc({ id: "tp2-a", x: 5, y: 6, sprite: "estudiante", dir: 2, trainer: {
    name: "Gerard", clase: "Bioquímico", team: [["pneumoniae", 30], ["genitalium", 30]], sight: 4, money: 120,
    intro: "¡He visto una proteína doblarse sola! ¡Lucha conmigo antes de que me doble yo!", lose: "Me he desnaturalizado…", after: "Los priones no tienen ADN. Solo una forma equivocada… que contagian." } });
  b.npc({ id: "tp2-b", x: 8, y: 10, sprite: "chica", dir: 2, trainer: {
    name: "Mar", clase: "Neuróloga", team: [["bovis", 31], ["cryptococ", 30], ["rickettsia", 31]], sight: 4, money: 120,
    intro: "La encefalopatía espongiforme empieza así: una proteína mal plegada…", lose: "Necesito un café.", after: "Arriba hay alguien gritando sobre «perspectiva global». ¡Da miedo!" } });
  b.item(1, 10, "atp-concentrado", "item:tp2-atp");
  b.warp({ x: 10, y: 2, to: "torre-prion-1", tx: 9, ty: 2, dir: 2 });
  b.warp({ x: 0, y: 12, to: "torre-prion-3", tx: 1, ty: 12, dir: 3 });
  b.encounters([
    { sp: "rickettsia", min: 29, max: 31, w: 22 }, { sp: "genitalium", min: 29, max: 31, w: 18 }, { sp: "pneumoniae", min: 30, max: 32, w: 18 },
    { sp: "cryptococ", min: 29, max: 31, w: 16 }, { sp: "bovis", min: 30, max: 32, w: 16 },
  ]);
  add(b.done({ music: "torre", fog: true }));
}
{
  const b = torre(3);
  b.set(0, 12, "E").fill(3, 6, 5, 1, "I").set(2, 3, "I").set(8, 3, "I");
  b.npc({ id: "hernandez", x: 5, y: 8, sprite: "hernandez", dir: 0, hideIf: "hernandez1" });
  b.npc({ id: "torre-jubilado", x: 5, y: 3, sprite: "becario", dir: 0, script: "jubiladoTorre" });
  b.trigger({ x: 1, y: 9, w: 9, h: 2, script: "albaHernandez", once: "hernandez1" });
  b.warp({ x: 0, y: 12, to: "torre-prion-2", tx: 1, ty: 12, dir: 3 });
  b.encounters([{ sp: "genitalium", min: 31, max: 33, w: 30 }, { sp: "pneumoniae", min: 31, max: 33, w: 35 }, { sp: "bovis", min: 31, max: 33, w: 35 }]);
  b.npc({ id: "prion-legendario", x: 9, y: 4, sprite: "@microo:prion-sc", script: "estatico:prion-sc|45|prion", hideIf: "prion", solid: true });
  add(b.done({ music: "torre", fog: true }));
}

// ---------------------------------------------------------------- Ruta 6
{
  const b = new MapBuilder("ruta-6", "Ruta 6", 36, 16);
  b.trees(0, 0, 36, 2).trees(0, 14, 36, 2).trees(0, 2, 2, 4).trees(0, 10, 2, 4).trees(34, 2, 2, 4).trees(34, 10, 2, 4);
  b.fill(0, 7, 36, 2, "p");
  b.fill(3, 2, 8, 4, "g").fill(20, 2, 10, 4, "g").fill(8, 10, 12, 4, "g");
  b.fill(13, 2, 5, 4, "~").fill(24, 10, 6, 3, "s").fill(30, 11, 3, 2, "f");
  b.sign(3, 9, "Ruta 6. Al este: Ciudad Aerobia, la metrópolis del oxígeno.");
  b.item(25, 11, "criobola-amarilla", "item:r6-amarilla", 2);
  b.item(16, 6, "glicerol", "item:r6-glicerol", 1, true);
  b.npc({ id: "r6-a", x: 8, y: 6, sprite: "chica", dir: 0, trainer: {
    name: "Lía", clase: "Geomicrobióloga", team: [["magnetospir", 27], ["geobacter", 28]], sight: 1, money: 120,
    intro: "¡Mi Magnetospirillum siempre sabe dónde está el norte!", lose: "He perdido el norte…", after: "Geobacter produce electricidad. ¡Hay pilas de combustible microbianas!" } });
  b.npc({ id: "r6-b", x: 21, y: 9, sprite: "chico", dir: 1, trainer: {
    name: "Biel", clase: "Salinero", team: [["halobacter", 28], ["psychrobac", 27], ["baylyi", 28]], sight: 2, money: 120,
    intro: "¡Mis arqueas viven en salmueras rosas! ¿Y las tuyas?", lose: "Me he quedado sin sal…", after: "Las salinas se vuelven rosas por Halobacterium. ¡Es su pigmento, la bacteriorrodopsina!" } });
  b.npc({ id: "r6-c", x: 30, y: 8, sprite: "estudiante", dir: 2, trainer: {
    name: "Rita", clase: "Médica Tropical", team: [["leishmania", 28], ["giardia", 28], ["rickettsia", 29]], sight: 3, money: 130,
    intro: "¡Acabo de volver de una misión! Tengo Microos exóticos.", lose: "Necesito vacaciones de verdad.", after: "En Ciudad Aerobia hay un casino. Dicen que debajo hay servidores que no paran de zumbar." } });
  b.warp({ x: 0, y: 7, h: 2, to: "pueblo-levadura", tx: 22, ty: 10, dir: 2, keep: "y" });
  b.warp({ x: 35, y: 7, h: 2, to: "ciudad-aerobia", tx: 1, ty: 11, dir: 3, keep: "y" });
  b.encounters([
    { sp: "magnetospir", min: 27, max: 29, w: 14 }, { sp: "halobacter", min: 27, max: 29, w: 14 }, { sp: "psychrobac", min: 27, max: 29, w: 12 },
    { sp: "actinomyces", min: 27, max: 29, w: 12 }, { sp: "baylyi", min: 27, max: 29, w: 12 }, { sp: "geobacter", min: 27, max: 29, w: 12 },
    { sp: "leishmania", min: 27, max: 30, w: 12 }, { sp: "cryptococ", min: 27, max: 29, w: 12 },
  ]);
  add(b.done({ music: "ruta" }));
}

// ---------------------------------------------------------------- Ciudad Aerobia
{
  const b = new MapBuilder("ciudad-aerobia", "Ciudad Aerobia", 30, 24);
  b.trees(0, 0, 30, 2).trees(0, 0, 2, 10).trees(0, 14, 2, 10).trees(28, 0, 2, 24).trees(0, 22, 30, 2);
  b.fill(0, 11, 28, 2, "p").fill(14, 2, 2, 9, "p").fill(14, 13, 2, 9, "p");
  b.building(3, 3, { kind: "gimnasio", w: 7, color: "naranja", door: 3, to: "gimnasio-aerobia", tx: 6, ty: 15 });
  b.building(18, 3, { kind: "casa", w: 8, color: "rojo", door: 4, to: "casino", tx: 6, ty: 10 });
  b.building(3, 15, { kind: "incubadora", w: 5, door: 2, to: "incubadora-aerobia", tx: 5, ty: 6 });
  b.building(18, 15, { kind: "tienda", w: 6, door: 3, to: "tienda-aerobia", tx: 4, ty: 6 });
  b.building(9, 16, { kind: "casa", w: 4, color: "azul", door: 1, to: "casa-aerobia", tx: 3, ty: 5 });
  b.fill(6, 7, 1, 4, "p").fill(22, 7, 1, 4, "p").fill(5, 13, 1, 4, "p").fill(21, 13, 1, 5, "p").fill(10, 13, 1, 5, "p");
  b.fill(17, 13, 2, 2, "f").fill(11, 3, 2, 3, "f");
  b.sign(13, 10, "Ciudad Aerobia. «Donde todo respira oxígeno… y catalasa».");
  b.sign(17, 8, "CASINO MUTAGÉNESIS. ¡Fichas, premios y mutaciones al azar!");
  b.sign(7, 10, "Gimnasio de Ciudad Aerobia. Líder: Dr. Daniel Yero, Levaduras y Eucariotas.");
  b.fill(26, 11, 4, 2, "p");
  b.sign(26, 10, "Ruta 7. Al este: Ciudad Agar y la Reserva Microbiana.");
  b.warp({ x: 29, y: 11, h: 2, to: "ruta-7", tx: 1, ty: 8, dir: 3, keep: "y" });
  b.npc({ id: "aer-1", x: 12, y: 13, sprite: "chico", move: "pasear", talk: "El Dr. Yero es amigo del Dr. Conchillo, del Instituto de Biotecnología. ¡Dicen que hablan de bioinformática hasta en las comidas!" });
  b.npc({ id: "aer-2", x: 24, y: 9, sprite: "recluta", dir: 0, hideIf: "urtaza1", talk: "…¿Qué miras? Solo estoy… vigilando el casino. Por nada en especial." });
  b.npc({ id: "aer-3", x: 8, y: 13, sprite: "estudiante", dir: 1, talk: ["La catalasa rompe el agua oxigenada en agua y oxígeno. ¡Por eso burbujea en una herida!", "Los Microos aerobios la usan para no oxidarse con su propia respiración."] });
  b.warp({ x: 0, y: 11, h: 2, to: "ruta-6", tx: 34, ty: 7, dir: 2, keep: "y" });
  add(b.done({ music: "ciudad" }));
}
add(incubadora("incubadora-aerobia", "Ciudad Aerobia", { to: "ciudad-aerobia", x: 5, y: 17 }));
add(tienda("tienda-aerobia", "Ciudad Aerobia", { to: "ciudad-aerobia", x: 21, y: 17 }, ["criobola-roja", "criobola-azul", "criobola-amarilla", "medio-lb", "medio-tsb", "medio-enriquecido", "solucion-salina", "glicerol", "atp-concentrado"]));
add(casa("casa-aerobia", "Casa de Ciudad Aerobia", { to: "ciudad-aerobia", x: 10, y: 18 }, [
  { id: "aer-casa", x: 5, y: 3, sprite: "estudiante", dir: 0, script: "regaloPleomorph" },
]));

// ---------------------------------------------------------------- Casino Mutagénesis
{
  const b = new MapBuilder("casino", "Casino Mutagénesis", 14, 12, "x", "casino", false);
  b.fill(0, 0, 14, 1, "w").fill(0, 1, 14, 1, "W").set(10, 1, "J");
  b.fill(2, 4, 1, 4, "z").fill(5, 4, 1, 4, "z").fill(8, 4, 1, 4, "z").fill(1, 2, 3, 1, "c").fill(9, 9, 4, 1, "c");
  b.set(12, 2, "E");
  b.fill(5, 11, 3, 1, "a");
  b.npc({ id: "casino-fichas", x: 2, y: 1, sprite: "dependiente", dir: 0, script: "venderFichas" });
  b.npc({ id: "casino-premios", x: 11, y: 10, sprite: "chica", dir: 1, script: "premiosCasino" });
  b.npc({ id: "casino-jugador", x: 4, y: 6, sprite: "chico", dir: 2, talk: "Llevo seis horas aquí. Ya casi saco tres LUCA seguidos. ¡Casi!" });
  b.npc({ id: "casino-recluta", x: 9, y: 2, sprite: "recluta", dir: 3, trainer: {
    name: "Becario", clase: "Recluta de la Unidad", team: [["serratia", 28], ["klebsi", 28]], sight: 2, money: 120,
    intro: "¡Eh! ¡No mires ese póster! …Digo, ¡lucha conmigo!", lose: "Bueno, total, el póster es solo un póster… o no.", after: "Yo no he dicho nada de ningún interruptor." } });
  b.npc({ id: "casino-poster", x: 10, y: 1, sprite: "@tile:poster", script: "posterCasino", solid: true });
  b.npc({ id: "casino-bloqueo", x: 12, y: 2, sprite: "@tile:tragaperras0", hideIf: "guarida", solid: true, talk: "Una máquina tragaperras… está desenchufada y suena hueca por detrás." });
  b.warp({ x: 5, y: 11, w: 3, to: "ciudad-aerobia", tx: 22, ty: 6, dir: 0 });
  b.warp({ x: 12, y: 2, to: "guarida-1", tx: 1, ty: 2, dir: 0 });
  add(b.done({ music: "casino" }));
}

// ---------------------------------------------------------------- Guarida de la Unidad de Genética
{
  const b = new MapBuilder("guarida-1", "Guarida de la Unidad · Sótano 1", 20, 14, "N", "casino", false);
  b.fill(0, 0, 20, 1, "w").fill(0, 1, 20, 1, "W");
  b.set(1, 1, "E").set(18, 12, "E");
  b.fill(4, 3, 1, 7, "D").fill(9, 5, 1, 9, "D").fill(14, 2, 1, 8, "D").fill(15, 11, 3, 1, "D").set(19, 11, "D").fill(1, 11, 3, 1, "t");
  b.item(2, 12, "medio-enriquecido", "item:g1-enriquecido");
  b.item(16, 3, "criobola-amarilla", "item:g1-amarilla", 2);
  const rec = (id: string, x: number, y: number, dir: number, sp: string, name: string, team: [string, number][], intro: string, after: string) =>
    b.npc({ id, x, y, sprite: sp, dir, trainer: { name, clase: "Recluta de la Unidad", team, sight: 4, money: 130, intro, lose: "¡Mi script ha petado!", after } });
  rec("g1-a", 3, 6, 3, "recluta", "Doctorando", [["lambda-v", 29], ["marcescens", 29]], "¡Estos servidores llevan cinco días al 90%! ¡No toques nada!", "El Dr. Barbadilla se mira en las cabinas de flujo. ¡Dice que es para controlar la esterilidad!");
  rec("g1-b", 11, 3, 0, "recluta-b", "Becaria", [["klebsi", 29], ["mycoplas", 29], ["serratia", 29]], "¿Sabes cuántos genomas he ensamblado esta semana? ¡Ni yo!", "Llevo tres años sin vacaciones. Pero salgo en los agradecimientos.");
  rec("g1-c", 12, 10, 2, "recluta", "Doctorando", [["phage-x174", 29], ["lambda-v", 30]], "¡Alto! ¡Este pasillo es solo para gente con cuenta en el clúster!", "Abajo está el despacho del jefe. No grites, que está de mal humor.");
  b.npc({ id: "barbadilla", x: 18, y: 11, sprite: "barbadilla", dir: 1, script: "barbadilla", hideIf: "barbadilla1", solid: true });
  b.warp({ x: 1, y: 1, to: "casino", tx: 12, ty: 3, dir: 0 });
  b.warp({ x: 18, y: 12, to: "guarida-2", tx: 1, ty: 2, dir: 0 });
  add(b.done({ music: "guarida" }));
}
{
  const b = new MapBuilder("guarida-2", "Guarida de la Unidad · Sótano 2", 16, 12, "N", "casino", false);
  b.fill(0, 0, 16, 1, "w").fill(0, 1, 16, 1, "W");
  b.set(1, 1, "E");
  b.fill(6, 2, 1, 6, "D").fill(0, 8, 5, 1, "D").fill(8, 7, 8, 1, "D").fill(11, 2, 1, 3, "D");
  b.fill(14, 3, 2, 1, "t").set(14, 2, "P").set(15, 2, "D");
  b.npc({ id: "casillas", x: 5, y: 9, sprite: "casillas", dir: 1, script: "casillas", hideIf: "casillas1", solid: true });
  b.npc({ id: "g2-becario", x: 4, y: 9, sprite: "becario", dir: 1, hideIf: "casillas1", talk: "La Dra. Casillas nos trae táperes y nos pregunta si hemos comido. ¡Es la única que nos cuida!" });
  b.npc({ id: "urtaza", x: 13, y: 3, sprite: "urtaza", dir: 0, script: "urtaza", hideIf: "urtaza1", solid: true });
  b.warp({ x: 1, y: 1, to: "guarida-1", tx: 18, ty: 11, dir: 0 });
  add(b.done({ music: "guarida" }));
}

// ---------------------------------------------------------------- Gimnasio de Ciudad Aerobia
{
  const b = new MapBuilder("gimnasio-aerobia", "Gimnasio de Ciudad Aerobia", 13, 17, "Y", "gimnasio", false);
  b.fill(0, 0, 13, 1, "w").fill(0, 1, 13, 1, "W");
  b.fill(0, 5, 4, 1, "K").fill(6, 5, 7, 1, "K").fill(0, 9, 8, 1, "K").fill(10, 9, 3, 1, "K").fill(3, 12, 7, 1, "B");
  b.set(0, 2, "i").set(12, 2, "i").set(0, 15, "n").set(12, 15, "n");
  b.fill(5, 16, 3, 1, "a");
  b.npc({ id: "lider-yero", x: 6, y: 2, sprite: "yero", dir: 0, script: "liderYero" });
  b.npc({ id: "gym4-a", x: 8, y: 7, sprite: "chica", dir: 2, trainer: {
    name: "Clara", clase: "Panadera", team: [["sacchari", 28], ["kefirgran", 29]], sight: 4, money: 130,
    intro: "¡La masa madre está lista! ¿Y tú?", lose: "Se me ha bajado la masa…", after: "Saccharomyces hace subir el pan con el CO₂ de su fermentación." } });
  b.npc({ id: "gym4-b", x: 2, y: 11, sprite: "estudiante", dir: 3, trainer: {
    name: "Hugo", clase: "Micólogo Clínico", team: [["albicans", 29], ["cryptococ", 29], ["bifidum", 29]], sight: 4, money: 130,
    intro: "Las levaduras también pueden ser patógenas. ¡Te lo demuestro!", lose: "Necesito un antifúngico.", after: "Candida auris es resistente a casi todo. ¡El Dr. Yero tiene una!" } });
  b.npc({ id: "guia-gym4", x: 4, y: 14, sprite: "becario", dir: 0, talk: ["¡Hola, aspirante! Te doy un consejo.", "El Dr. Yero usa Levaduras y Eucariotas: Pastorian, Neoformans y Auris.", "¡Auris es Levadura y Biofilm, y no hay quien la elimine!"] });
  b.warp({ x: 5, y: 16, w: 3, to: "ciudad-aerobia", tx: 6, ty: 7, dir: 0 });
  add(b.done({ music: "gimnasio" }));
}

// ---------------------------------------------------------------- Ruta 7
{
  const b = new MapBuilder("ruta-7", "Ruta 7", 40, 18);
  b.trees(0, 0, 40, 2).trees(0, 16, 40, 2).trees(0, 2, 2, 6).trees(0, 10, 2, 6).trees(38, 2, 2, 6).trees(38, 12, 2, 4);
  b.fill(0, 8, 40, 2, "p").fill(20, 10, 2, 6, "p");
  b.fill(3, 2, 9, 5, "g").fill(24, 2, 12, 5, "g").fill(4, 11, 12, 4, "g").fill(26, 11, 9, 4, "G");
  b.fill(14, 3, 6, 4, "~").fill(22, 12, 3, 3, "f").fill(14, 10, 4, 1, "v");
  b.sign(3, 10, "Ruta 7. Al este: Ciudad Agar.");
  b.item(34, 3, "medio-enriquecido", "item:r7-enriquecido");
  b.item(5, 13, "plasmido-col", "item:r7-col", 1, true);
  b.item(33, 14, "criobola-amarilla", "item:r7-amarilla", 2);
  b.npc({ id: "r7-a", x: 10, y: 7, sprite: "chico", dir: 0, trainer: {
    name: "Arnau", clase: "Técnico de Biogás", team: [["methanosar", 31], ["sulfurreduc", 31]], sight: 1, money: 140,
    intro: "¡Mis arqueas convierten la basura en metano! ¿Combatimos?", lose: "Se me ha apagado el digestor…", after: "El biogás es casi todo metano. ¡Lo hacen las arqueas metanógenas!" } });
  b.npc({ id: "r7-b", x: 24, y: 10, sprite: "chica", dir: 1, trainer: {
    name: "Paula", clase: "Médica de Urgencias", team: [["tetani", 32], ["meningitid", 32]], sight: 2, money: 140,
    intro: "¡Esta herida tiene pinta de tétanos! Bueno, luego te vacuno. ¡Primero luchamos!", lose: "Me han dado el alta…", after: "Clostridium tetani parece una raqueta de tambor al microscopio. ¡Es la espora en un extremo!" } });
  b.npc({ id: "r7-c", x: 33, y: 9, sprite: "estudiante", dir: 2, trainer: {
    name: "Jan", clase: "Parasitólogo", team: [["cryptospor", 32], ["prowazekii", 32], ["pneumonia-k", 33]], sight: 3, money: 150,
    intro: "¡Cryptosporidium resiste al cloro de las piscinas! ¿Y tú?", lose: "Me rindo… como un quiste roto.", after: "En Ciudad Agar está la Reserva Microbiana. ¡Allí hay Microos que no viven en ningún otro sitio!" } });
  b.warp({ x: 0, y: 8, h: 2, to: "ciudad-aerobia", tx: 28, ty: 11, dir: 2, keep: "y" });
  b.warp({ x: 39, y: 8, h: 2, to: "ciudad-agar", tx: 1, ty: 10, dir: 3, keep: "y" });
  b.encounters([
    { sp: "tetani", min: 31, max: 33, w: 12 }, { sp: "cryptospor", min: 31, max: 33, w: 12 }, { sp: "methanosar", min: 31, max: 33, w: 12 },
    { sp: "sulfurreduc", min: 31, max: 33, w: 12 }, { sp: "colwellia", min: 31, max: 33, w: 10 }, { sp: "meningitid", min: 31, max: 33, w: 12 },
    { sp: "pneumonia-k", min: 31, max: 34, w: 12 }, { sp: "prowazekii", min: 31, max: 33, w: 12 }, { sp: "perfringens", min: 30, max: 32, w: 6 },
  ]);
  add(b.done({ music: "ruta" }));
}

// ---------------------------------------------------------------- Ciudad Agar
{
  const b = new MapBuilder("ciudad-agar", "Ciudad Agar", 30, 22);
  b.trees(0, 0, 30, 2).trees(0, 0, 2, 10).trees(0, 12, 2, 10).trees(28, 0, 2, 10).trees(28, 12, 2, 10).trees(0, 20, 30, 2);
  b.fill(0, 10, 30, 2, "p").fill(14, 3, 2, 7, "p").fill(5, 12, 1, 4, "p").fill(22, 12, 1, 4, "p").fill(9, 7, 1, 3, "p");
  b.building(11, 0, { kind: "lab", w: 8, color: "verde", door: 3, to: "reserva-entrada", tx: 5, ty: 8 });
  b.building(17, 4, { kind: "gimnasio", w: 7, color: "gris", door: 3, to: "gimnasio-agar", tx: 6, ty: 15 });
  b.building(3, 4, { kind: "incubadora", w: 5, door: 2, to: "incubadora-agar", tx: 5, ty: 6 });
  b.building(3, 14, { kind: "tienda", w: 5, door: 2, to: "tienda-agar", tx: 4, ty: 6 });
  b.building(20, 14, { kind: "casa", w: 5, color: "verde", door: 2, to: "casa-agar", tx: 3, ty: 5 });
  b.fill(10, 14, 6, 4, "~").fill(17, 13, 2, 3, "f").fill(25, 3, 2, 3, "f");
  b.sign(13, 9, "Ciudad Agar. «Sólida por fuera, nutritiva por dentro».");
  b.sign(16, 7, "Reserva Microbiana: extremófilos y protozoos únicos. ¡Pase y vea!");
  b.sign(19, 9, "Gimnasio de Ciudad Agar. Líder: Dr. Jordi Mas, Microbiología Industrial.");
  b.npc({ id: "agar-1", x: 8, y: 12, sprite: "chica", move: "pasear", talk: "En la Reserva no se lucha: les ofreces Medios de Enriquecimiento para que se calmen, y luego… ¡Criobola Verde!" });
  b.fill(28, 10, 2, 2, "p");
  const corte = "Guarda: El camino al Instituto de Biotecnología está cortado. Solo dejamos pasar a quien tenga la Medalla Quimiostato.";
  b.npc({ id: "agar-guarda-1", x: 27, y: 10, sprite: "dependiente", dir: 2, hideIf: "medalla5", talk: corte });
  b.npc({ id: "agar-guarda-2", x: 27, y: 11, sprite: "dependiente", dir: 2, hideIf: "medalla5", talk: corte });
  b.warp({ x: 29, y: 10, h: 2, to: "ruta-8", tx: 1, ty: 7, dir: 3, keep: "y" });
  b.npc({ id: "agar-3", x: 26, y: 9, sprite: "estudiante", dir: 0, talk: "El agar sale de las algas rojas. Lo trajeron a los laboratorios por consejo de la mujer de un ayudante de Koch. ¡Sin ella no habría placas!" });
  b.warp({ x: 0, y: 10, h: 2, to: "ruta-7", tx: 38, ty: 8, dir: 2, keep: "y" });
  add(b.done({ music: "ciudad" }));
}
add(incubadora("incubadora-agar", "Ciudad Agar", { to: "ciudad-agar", x: 5, y: 6 }));
add(tienda("tienda-agar", "Ciudad Agar", { to: "ciudad-agar", x: 5, y: 16 }, ["criobola-azul", "criobola-amarilla", "medio-tsb", "medio-enriquecido", "solucion-salina", "glicerol", "atp-concentrado"]));
add(casa("casa-agar", "Casa de Ciudad Agar", { to: "ciudad-agar", x: 22, y: 16 }, [
  { id: "agar-casa", x: 5, y: 3, sprite: "madre", dir: 0, talk: ["Fanny Hesse sugirió usar agar en vez de gelatina, porque no se derrite a 37 °C.", "¡Por eso la Profesora de tu pueblo se llama así! Es un homenaje."] },
]));
{
  const b = new MapBuilder("reserva-entrada", "Entrada de la Reserva Microbiana", 11, 10, "L", "interior", false);
  b.fill(0, 0, 11, 1, "w").fill(0, 1, 11, 1, "W").fill(2, 3, 3, 1, "c").set(0, 8, "n").set(10, 8, "n");
  b.fill(4, 9, 3, 1, "a").fill(4, 1, 3, 1, "a");
  b.npc({ id: "reserva-recepcion", x: 3, y: 2, sprite: "enfermera", dir: 0, script: "entrarReserva" });
  b.npc({ id: "reserva-info", x: 8, y: 5, sprite: "becario", dir: 2, talk: ["En la Reserva hay Kefirgran, Spirogyra, Mixotricha… ¡y dicen que un Tardigrad!", "Si le das un Medio de Enriquecimiento, se queda más tiempo. Si le pones un antibiótico, es más fácil de aislar… pero puede huir."] });
  b.warp({ x: 4, y: 9, w: 3, to: "ciudad-agar", tx: 14, ty: 4, dir: 0 });
  add(b.done({ onEnter: "salirReserva" }));
}
{
  const b = new MapBuilder("reserva-microbiana", "Reserva Microbiana", 30, 28, "G", "bosque");
  b.trees(0, 0, 30, 2).trees(0, 0, 2, 28).trees(28, 0, 2, 28).trees(0, 26, 12, 2).trees(16, 26, 14, 2);
  b.fill(12, 22, 4, 6, "p").fill(13, 4, 2, 18, "p").fill(4, 12, 22, 2, "p").fill(4, 4, 2, 8, "p").fill(24, 4, 2, 8, "p").fill(6, 4, 18, 2, "p");
  b.fill(7, 15, 5, 5, "~").fill(17, 15, 6, 4, "s").fill(18, 7, 5, 4, "~");
  b.trees(8, 7, 4, 4).trees(2, 18, 4, 4).trees(24, 20, 4, 4);
  b.fill(3, 2, 3, 2, "f").fill(26, 14, 2, 3, "f");
  b.set(5, 3, "m").npc({ id: "reserva-guarda", x: 4, y: 2, sprite: "dependiente", dir: 0, script: "guardaReserva" });
  b.item(26, 6, "criobola-amarilla", "item:rm-amarilla", 2);
  b.item(9, 22, "medio-enriquecido", "item:rm-enriquecido", 1, true);
  b.sign(15, 22, "Reserva Microbiana. Prohibido lanzar antibióticos fuertes.");
  b.warp({ x: 12, y: 27, w: 4, to: "reserva-entrada", tx: 5, ty: 2, dir: 0 });
  b.encounters([
    { sp: "kefirgran", min: 30, max: 33, w: 14 }, { sp: "spirogyra", min: 30, max: 33, w: 14 }, { sp: "mixotricha", min: 31, max: 34, w: 10 },
    { sp: "aquaticus", min: 32, max: 34, w: 10 }, { sp: "radiodurans", min: 32, max: 34, w: 8 }, { sp: "colwellia", min: 32, max: 34, w: 10 },
    { sp: "thermus", min: 30, max: 32, w: 12 }, { sp: "halobacter", min: 30, max: 32, w: 10 }, { sp: "tardigrad", min: 33, max: 35, w: 3 },
    { sp: "pyrolobus", min: 34, max: 35, w: 2 }, { sp: "psychrobac", min: 30, max: 32, w: 7 },
  ]);
  add(b.done({ music: "reserva", safari: true }));
}
{
  const b = new MapBuilder("gimnasio-agar", "Gimnasio de Ciudad Agar", 13, 17, "Y", "gimnasio", false);
  b.fill(0, 0, 13, 1, "w").fill(0, 1, 13, 1, "W");
  b.fill(2, 4, 9, 1, "K").fill(0, 8, 5, 1, "K").fill(7, 8, 6, 1, "K").fill(2, 12, 4, 1, "K").fill(8, 12, 5, 1, "K");
  b.set(0, 2, "P").set(12, 2, "P").set(0, 15, "n").set(12, 15, "n");
  b.fill(5, 16, 3, 1, "a");
  b.npc({ id: "lider-mas", x: 6, y: 2, sprite: "mas", dir: 0, script: "liderMas" });
  b.npc({ id: "gym5-a", x: 11, y: 6, sprite: "estudiante", dir: 2, trainer: {
    name: "Marc", clase: "Ingeniero de Bioprocesos", team: [["mobilis", 33], ["marcescens", 33]], sight: 5, money: 150,
    intro: "¡Mi biorreactor trabaja a pleno rendimiento! ¡Igual que yo!", lose: "Se me ha disparado el pH…", after: "En un biorreactor hay que controlar el oxígeno disuelto. ¡Si no, los aerobios se ahogan!" } });
  b.npc({ id: "gym5-b", x: 1, y: 10, sprite: "chica", dir: 3, trainer: {
    name: "Laura", clase: "Técnica de Fermentación", team: [["perfringens", 33], ["thermus", 33], ["acetobuty", 34]], sight: 5, money: 150,
    intro: "¡Fermentación ABE: acetona, butanol y etanol! ¿Sabes quién la inventó?", lose: "Chaim Weizmann estaría decepcionado…", after: "La fermentación ABE se usó en la Primera Guerra Mundial para fabricar acetona." } });
  b.npc({ id: "guia-gym5", x: 4, y: 14, sprite: "becario", dir: 0, talk: ["¡Hola, aspirante! Te doy un consejo.", "El Dr. Mas usa Anaerobios, Antibióticos y Extremófilos de escala industrial.", "¡Su Coli-BL21 es una superfactoría: aguanta mucho!"] });
  b.warp({ x: 5, y: 16, w: 3, to: "ciudad-agar", tx: 20, ty: 8, dir: 0 });
  add(b.done({ music: "gimnasio" }));
}

// ---------------------------------------------------------------- Ruta 8
{
  const b = new MapBuilder("ruta-8", "Ruta 8", 36, 16);
  b.trees(0, 0, 36, 2).trees(0, 14, 36, 2).trees(0, 2, 2, 4).trees(0, 10, 2, 4).trees(34, 2, 2, 4).trees(34, 10, 2, 4);
  b.fill(0, 7, 36, 2, "p");
  b.fill(3, 2, 10, 4, "g").fill(16, 10, 10, 4, "g").fill(22, 2, 10, 4, "G").fill(3, 10, 8, 4, "g");
  b.fill(14, 2, 6, 3, "~").fill(28, 10, 4, 3, "f");
  b.sign(3, 9, "Ruta 8. Al este: Parque Biotecnológico.");
  b.item(30, 3, "medio-enriquecido", "item:r8-enriquecido", 2);
  b.item(17, 12, "atp-concentrado", "item:r8-atp", 1, true);
  b.npc({ id: "r8-a", x: 9, y: 6, sprite: "chica", dir: 0, trainer: {
    name: "Ona", clase: "Viróloga", team: [["rous-v", 35], ["poxvir", 35]], sight: 1, money: 160,
    intro: "¡Los virus no están vivos! …¿O sí? ¡Luchemos y lo discutimos!", lose: "Me has dejado sin cápside…", after: "El virus del sarcoma de Rous fue el primer virus que se vio que causaba cáncer." } });
  b.npc({ id: "r8-b", x: 20, y: 9, sprite: "estudiante", dir: 1, trainer: {
    name: "Iván", clase: "Doctorando Rebelde", team: [["chlamydia", 36], ["nocardia", 36]], sight: 2, money: 160,
    intro: "¡Me he escapado del Instituto! ¿Eres de la Unidad? ¡Demuéstralo!", lose: "Vale, vale, no eres de la Unidad. ¡Ayúdanos!", after: "La Unidad ha tomado el Instituto. Tienen al Dr. Conchillo atado a una terminal…" } });
  b.npc({ id: "r8-c", x: 29, y: 8, sprite: "chico", dir: 2, trainer: {
    name: "Teo", clase: "Oceanógrafo", team: [["shewanella", 36], ["lyssavir", 36], ["lentivir", 37]], sight: 3, money: 170,
    intro: "¡Shewanella respira metales pesados! ¿Y tú qué respiras?", lose: "Me he quedado sin electrones…", after: "Shewanella puede respirar hierro y manganeso. ¡Limpia aguas contaminadas!" } });
  b.warp({ x: 0, y: 7, h: 2, to: "ciudad-agar", tx: 28, ty: 10, dir: 2, keep: "y" });
  b.warp({ x: 35, y: 7, h: 2, to: "parque-biotec", tx: 1, ty: 11, dir: 3, keep: "y" });
  b.encounters([
    { sp: "rous-v", min: 34, max: 36, w: 12 }, { sp: "lentivir", min: 35, max: 37, w: 10 }, { sp: "poxvir", min: 34, max: 36, w: 12 },
    { sp: "lyssavir", min: 34, max: 36, w: 12 }, { sp: "nocardia", min: 35, max: 37, w: 12 }, { sp: "shewanella", min: 35, max: 37, w: 12 },
    { sp: "chlamydia", min: 35, max: 37, w: 12 }, { sp: "acantharia", min: 34, max: 36, w: 12 }, { sp: "bdellovib", min: 34, max: 36, w: 6 },
  ]);
  add(b.done({ music: "ruta" }));
}

// ---------------------------------------------------------------- Parque Biotecnológico
{
  const b = new MapBuilder("parque-biotec", "Parque Biotecnológico", 30, 24);
  b.trees(0, 0, 30, 2).trees(0, 0, 2, 10).trees(0, 14, 2, 10).trees(28, 0, 2, 24).trees(0, 22, 30, 2);
  b.fill(0, 11, 28, 2, "p").fill(14, 7, 2, 4, "p").fill(5, 13, 1, 3, "p").fill(22, 13, 1, 4, "p").fill(23, 8, 1, 3, "p");
  b.building(9, 2, { kind: "lab", w: 12, color: "gris", door: 5, to: "instituto-1", tx: 6, ty: 12 });
  b.building(3, 15, { kind: "incubadora", w: 5, door: 2, to: "incubadora-biotec", tx: 5, ty: 6 });
  b.building(21, 4, { kind: "gimnasio", w: 6, color: "azul", door: 2, to: "gimnasio-biotec", tx: 6, ty: 15 });
  b.building(19, 16, { kind: "tienda", w: 5, door: 3, to: "tienda-biotec", tx: 4, ty: 6 });
  b.fill(10, 15, 6, 4, "f").fill(3, 3, 4, 4, "~");
  b.sign(13, 10, "Parque Biotecnológico. Instituto de Biotecnología. «Del gen al biorreactor».");
  b.sign(24, 9, "Gimnasio Bioinfo. Líder: Dr. Òscar Conchillo. (Cerrado: el líder no está).");
  b.npc({ id: "biotec-yero", x: 16, y: 8, sprite: "yero", dir: 0, hideIf: "instituto-libre", script: "yeroInstituto" });
  b.npc({ id: "biotec-recluta-1", x: 14, y: 7, sprite: "recluta", dir: 0, hideIf: "yero-equipo", talk: "Recluta: Prohibido el paso. Órdenes del Dr. Martínez-Urtaza." });
  b.npc({ id: "biotec-recluta-2", x: 15, y: 7, sprite: "recluta-b", dir: 0, hideIf: "yero-equipo", talk: "Recluta: ¡Aquí no entra nadie sin cuenta en el clúster!" });
  b.npc({ id: "biotec-gym-cerrado", x: 23, y: 7, sprite: "becario", dir: 0, hideIf: "instituto-libre", talk: "El Dr. Conchillo no ha vuelto del Instituto. Sin él, el gimnasio está cerrado." });
  b.npc({ id: "biotec-1", x: 8, y: 13, sprite: "chica", move: "pasear", talk: "El Instituto tiene once plantas de laboratorios. ¡Y la Unidad de Genética las ha tomado todas!" });
  b.warp({ x: 0, y: 11, h: 2, to: "ruta-8", tx: 34, ty: 7, dir: 2, keep: "y" });
  b.fill(28, 11, 2, 2, "p");
  b.warp({ x: 29, y: 11, h: 2, to: "ruta-9", tx: 1, ty: 8, dir: 3, keep: "y" });
  add(b.done({ music: "ciudad" }));
}
add(incubadora("incubadora-biotec", "Parque Biotecnológico", { to: "parque-biotec", x: 5, y: 17 }));
add(tienda("tienda-biotec", "Parque Biotecnológico", { to: "parque-biotec", x: 22, y: 18 }, ["criobola-azul", "criobola-amarilla", "medio-tsb", "medio-enriquecido", "solucion-salina", "glicerol", "atp-concentrado"]));

// ---------------------------------------------------------------- Instituto de Biotecnología (asedio)
function planta(id: string, name: string) {
  const b = new MapBuilder(id, `Instituto · ${name}`, 14, 14, "L", "laboratorio", false);
  b.fill(0, 0, 14, 1, "w").fill(0, 1, 14, 1, "W");
  return b;
}
{
  const b = planta("instituto-1", "Planta 1");
  b.fill(1, 3, 4, 1, "c").set(12, 2, "E").fill(5, 13, 3, 1, "a").set(0, 12, "n").set(13, 12, "n");
  b.fill(8, 5, 1, 4, "B").fill(3, 8, 1, 4, "B");
  b.npc({ id: "i1-recepcion", x: 2, y: 2, sprite: "enfermera", dir: 0, talk: "Recepcionista: ¡Ayuda! Han tomado el edificio. El Dr. Conchillo está en la sala de servidores de la planta 5…" });
  b.npc({ id: "i1-rebelde", x: 10, y: 10, sprite: "estudiante", dir: 2, talk: ["Doctorando rebelde: ¡Estamos hartos! Tres años sin contrato y ni siquiera salimos en la guía docente.", "Las escaleras del fondo llevan arriba. Os cubrimos."] });
  b.npc({ id: "i1-r1", x: 6, y: 6, sprite: "recluta", dir: 3, trainer: {
    name: "Becario", clase: "Recluta de la Unidad", team: [["lentivir", 38], ["marcescens", 38]], sight: 3, money: 180,
    intro: "¡El Instituto es nuestro! ¡Bueno, del Dr. Martínez-Urtaza!", lose: "Me han quitado el acceso al VPN…", after: "Yo solo quería publicar en Nature…" } });
  b.npc({ id: "i1-r2", x: 10, y: 4, sprite: "recluta-b", dir: 0, trainer: {
    name: "Doctoranda", clase: "Recluta de la Unidad", team: [["pneumonia-k", 38], ["meningitid", 38]], sight: 3, money: 180,
    intro: "¿Visitas? ¡Las visitas se anuncian por correo con tres semanas de antelación!", lose: "Tendré que reprogramar el seminario…", after: "Arriba tienen al Dr. Conchillo arreglando scripts que no ha escrito." } });
  b.warp({ x: 5, y: 13, w: 3, to: "parque-biotec", tx: 14, ty: 6, dir: 0 });
  b.warp({ x: 12, y: 2, to: "instituto-5", tx: 12, ty: 3, dir: 0 });
  add(b.done({ music: "guarida" }));
}
{
  const b = planta("instituto-5", "Planta 5 · Servidores");
  b.set(12, 2, "E").set(1, 12, "E");
  b.fill(3, 4, 8, 1, "D").fill(3, 8, 1, 4, "D").fill(10, 8, 1, 4, "D").fill(5, 11, 4, 1, "D");
  b.npc({ id: "i5-conchillo", x: 6, y: 9, sprite: "conchillo", dir: 0, hideIf: "conchillo-libre", talk: ["Dr. Òscar Conchillo: …10.000 réplicas de bootstrap… cinco días… al 90% de CPU…", "¿Daniel? ¿Eres tú? ¡Sácame de aquí, por favor!"] });
  b.npc({ id: "i5-barbadilla", x: 6, y: 6, sprite: "barbadilla", dir: 1, script: "asedioEjecutivos", hideIf: "conchillo-libre", solid: true });
  b.npc({ id: "i5-casillas", x: 7, y: 6, sprite: "casillas", dir: 1, script: "asedioEjecutivos", hideIf: "conchillo-libre", solid: true });
  b.npc({ id: "i5-r1", x: 11, y: 6, sprite: "recluta", dir: 2, trainer: {
    name: "Doctorando", clase: "Recluta de la Unidad", team: [["methanosar", 39], ["prowazekii", 39], ["lentivir", 39]], sight: 3, money: 190,
    intro: "¡No toques los servidores! ¡Llevan cinco días calculando!", lose: "Se ha reiniciado el clúster… ¡Cinco días perdidos!", after: "El jefe está arriba, en la planta 11. Busca algo morado." } });
  b.item(12, 12, "criobola-amarilla", "item:i5-amarilla", 3);
  b.warp({ x: 12, y: 2, to: "instituto-1", tx: 12, ty: 3, dir: 0 });
  b.warp({ x: 1, y: 12, to: "instituto-11", tx: 2, ty: 12, dir: 3 });
  add(b.done({ music: "guarida" }));
}
{
  const b = planta("instituto-11", "Planta 11 · Dirección");
  b.set(1, 12, "E").fill(4, 3, 6, 1, "c").set(4, 2, "P").set(9, 2, "e").set(10, 2, "e").set(0, 2, "n").set(13, 2, "n");
  b.fill(3, 7, 1, 5, "B").fill(10, 7, 1, 5, "B");
  b.npc({ id: "i11-urtaza", x: 7, y: 5, sprite: "urtaza", dir: 0, script: "urtazaInstituto", hideIf: "urtaza2", solid: true });
  b.npc({ id: "i11-director", x: 6, y: 2, sprite: "profesora", dir: 0, script: "directorInstituto" });
  b.npc({ id: "i11-r1", x: 6, y: 9, sprite: "recluta-b", dir: 2, hideIf: "urtaza2", trainer: {
    name: "Postdoc", clase: "Recluta de la Unidad", team: [["bacteriovor", 40], ["pneumonia-k", 40]], sight: 3, money: 200,
    intro: "¡El Dr. Martínez-Urtaza está ocupado! ¡Reunión importante con… con la Criobola!", lose: "Bueno… pide cita.", after: "Yo lo dejo. Me voy a hacer un máster en algo con contrato." } });
  b.warp({ x: 1, y: 12, to: "instituto-5", tx: 2, ty: 12, dir: 3 });
  add(b.done({ music: "guarida" }));
}
{
  const b = new MapBuilder("gimnasio-biotec", "Gimnasio Bioinfo", 13, 17, "L", "laboratorio", false);
  b.fill(0, 0, 13, 1, "w").fill(0, 1, 13, 1, "W");
  b.fill(0, 5, 5, 1, "D").fill(7, 5, 6, 1, "D").fill(2, 9, 9, 1, "P").fill(0, 13, 4, 1, "D").fill(9, 13, 4, 1, "D");
  b.set(0, 2, "D").set(12, 2, "D").set(0, 15, "n").set(12, 15, "n");
  b.fill(5, 16, 3, 1, "a");
  b.npc({ id: "lider-conchillo", x: 6, y: 2, sprite: "conchillo", dir: 0, script: "liderConchillo" });
  b.npc({ id: "gym6-a", x: 11, y: 7, sprite: "estudiante", dir: 2, trainer: {
    name: "Pere", clase: "Bioinformático", team: [["rickettsia", 39], ["chlamydia", 40]], sight: 4, money: 190,
    intro: "¡Tengo un script que predice tus movimientos! …Tiene algún bug.", lose: "Segmentation fault (core dumped).", after: "Un genoma mínimo tiene unos 470 genes. ¡Mycoplasma genitalium casi no tiene más!" } });
  b.npc({ id: "gym6-b", x: 1, y: 11, sprite: "chica", dir: 3, trainer: {
    name: "Júlia", clase: "Biología Estructural", team: [["acantharia", 39], ["methanosar", 40], ["thermus", 40]], sight: 4, money: 190,
    intro: "¡Mis proteínas se pliegan perfectamente! ¿Y las tuyas?", lose: "Se me ha desnaturalizado el modelo…", after: "El Dr. Conchillo predice la estructura de las proteínas a partir de su secuencia." } });
  b.npc({ id: "guia-gym6", x: 4, y: 14, sprite: "becario", dir: 0, talk: ["¡Hola, aspirante! Te doy un consejo.", "El Dr. Conchillo usa Intracelulares, Archaea y Extremófilos de genoma mínimo.", "¡Su Pyrolobus aguanta 113 °C! Busca bien sus debilidades."] });
  b.warp({ x: 5, y: 16, w: 3, to: "parque-biotec", tx: 23, ty: 8, dir: 0 });
  add(b.done({ music: "gimnasio" }));
}

// ---------------------------------------------------------------- Ruta 9 (costa)
{
  const b = new MapBuilder("ruta-9", "Ruta 9", 44, 18);
  b.trees(0, 0, 44, 2).trees(0, 2, 2, 6).trees(42, 2, 2, 6).trees(32, 2, 2, 6);
  b.fill(0, 10, 44, 3, "s").fill(0, 13, 44, 5, "~").fill(0, 8, 44, 2, "p");
  b.fill(32, 9, 1, 4, "r");
  b.building(6, 3, { kind: "lab", w: 7, color: "gris", door: 3, to: "central-1", tx: 6, ty: 12 });
  b.fill(9, 7, 1, 1, "p");
  b.fill(16, 3, 10, 4, "g").fill(35, 3, 6, 4, "g").fill(2, 3, 3, 4, "f");
  b.sign(4, 7, "Central Metabólica. Reactor de biogás y pilas de combustible microbianas. Peligro: alto voltaje.");
  b.sign(28, 7, "Ruta 9. Al este: Ciudad Pili.");
  b.item(40, 11, "medio-enriquecido", "item:r9-enriquecido", 2);
  b.item(20, 11, "criobola-amarilla", "item:r9-amarilla", 3, true);
  b.npc({ id: "r9-tardigrado", x: 32, y: 8, sprite: "@microo:tardigrad", script: "tardigrado", hideIf: "tardigrado", solid: true });
  b.npc({ id: "r9-a", x: 14, y: 11, sprite: "chica", dir: 1, trainer: {
    name: "Nerea", clase: "Bióloga Marina", team: [["cholerae", 40], ["diatomax", 41]], sight: 3, money: 190,
    intro: "¡El mar está lleno de Vibrios! ¿Te enseño los míos?", lose: "Me ha arrastrado la corriente…", after: "Los Vibrios se pegan al plancton. ¡Viajan en copépodos!" } });
  b.npc({ id: "r9-b", x: 24, y: 9, sprite: "chico", dir: 2, trainer: {
    name: "Unai", clase: "Enfermero de UCI", team: [["baumannii", 41], ["aeruginosa", 41]], sight: 4, money: 200,
    intro: "¡En la UCI vemos Microos que resisten a todo! ¿Y los tuyos?", lose: "Me toca guardia doble…", after: "Acinetobacter baumannii sobrevive semanas en las superficies secas del hospital." } });
  b.npc({ id: "r9-c", x: 38, y: 11, sprite: "estudiante", dir: 2, trainer: {
    name: "Gael", clase: "Surfista Científico", team: [["vulnificus", 42], ["salinarum", 41], ["shewanella", 41]], sight: 3, money: 200,
    intro: "¡Ola perfecta y combate perfecto!", lose: "Me he comido la ola…", after: "Vibrio vulnificus vive en aguas cálidas. ¡Cuidado con las heridas abiertas en el mar!" } });
  b.warp({ x: 0, y: 8, h: 2, to: "parque-biotec", tx: 28, ty: 11, dir: 2, keep: "y" });
  b.warp({ x: 43, y: 8, h: 2, to: "ciudad-pili", tx: 1, ty: 9, dir: 3, keep: "y" });
  b.encounters([
    { sp: "cholerae", min: 40, max: 42, w: 16 }, { sp: "aeruginosa", min: 41, max: 43, w: 14 }, { sp: "baumannii", min: 41, max: 43, w: 12 },
    { sp: "diatomax", min: 40, max: 42, w: 14 }, { sp: "shewanella", min: 40, max: 42, w: 14 }, { sp: "salinarum", min: 40, max: 42, w: 12 },
    { sp: "vulnificus", min: 42, max: 43, w: 6 }, { sp: "pneumonia-k", min: 40, max: 42, w: 12 },
  ]);
  add(b.done({ music: "ruta" }));
}

// ---------------------------------------------------------------- Central Metabólica (opcional)
{
  const b = new MapBuilder("central-1", "Central Metabólica · Reactor", 16, 14, "N", "casino", false);
  b.fill(0, 0, 16, 1, "w").fill(0, 1, 16, 1, "W");
  b.fill(2, 4, 2, 2, "K").fill(6, 4, 2, 2, "K").fill(10, 4, 2, 2, "K").fill(2, 8, 5, 1, "D").fill(9, 8, 5, 1, "D").fill(13, 3, 1, 4, "D");
  b.set(14, 2, "E").fill(5, 13, 3, 1, "a");
  b.item(1, 11, "atp-concentrado", "item:cm-atp", 2);
  b.npc({ id: "cm-a", x: 8, y: 6, sprite: "chica", dir: 0, trainer: {
    name: "Èlia", clase: "Ingeniera Eléctrica", team: [["geobacter", 41], ["sulfurreduc", 42]], sight: 4, money: 200,
    intro: "¡Estas pilas funcionan con bacterias! ¡Y mis Microos dan calambre!", lose: "Cortocircuito…", after: "Geobacter transfiere electrones a un electrodo. ¡Eso es una pila de combustible microbiana!" } });
  b.npc({ id: "cm-tecnico", x: 12, y: 11, sprite: "becario", dir: 2, talk: ["Hace semanas que algo raro vive en la sala de control de arriba. No es una bacteria… ni un virus…", "Es solo una molécula de ARN circular. ¡Y se mueve!"] });
  b.warp({ x: 5, y: 13, w: 3, to: "ruta-9", tx: 9, ty: 7, dir: 0 });
  b.warp({ x: 14, y: 2, to: "central-2", tx: 13, ty: 3, dir: 0 });
  b.encounters([
    { sp: "geobacter", min: 40, max: 42, w: 20 }, { sp: "sulfurreduc", min: 41, max: 43, w: 18 }, { sp: "magnetospir", min: 40, max: 42, w: 18 },
    { sp: "shewanella", min: 40, max: 42, w: 16 }, { sp: "methanosar", min: 41, max: 43, w: 18 }, { sp: "deinococ", min: 43, max: 43, w: 4 },
  ]);
  add(b.done({ music: "guarida", floorEncounters: "suelo_tecnico" }));
}
{
  const b = new MapBuilder("central-2", "Central Metabólica · Sala de control", 16, 14, "N", "casino", false);
  b.fill(0, 0, 16, 1, "w").fill(0, 1, 16, 1, "W");
  b.set(13, 2, "E").fill(1, 2, 4, 1, "P").fill(3, 6, 10, 1, "D").fill(3, 7, 1, 4, "D").fill(12, 7, 1, 4, "D");
  b.item(14, 12, "plasmido-r", "item:cm-plasmido-r");
  b.npc({ id: "viroide-legendario", x: 7, y: 9, sprite: "@microo:viroid-cad", script: "estatico:viroid-cad|50|viroide", hideIf: "viroide", solid: true });
  b.warp({ x: 13, y: 2, to: "central-1", tx: 14, ty: 3, dir: 0 });
  b.encounters([{ sp: "sulfurreduc", min: 42, max: 44, w: 50 }, { sp: "deinococ", min: 43, max: 44, w: 10 }, { sp: "geobacter", min: 41, max: 43, w: 40 }]);
  add(b.done({ music: "guarida", floorEncounters: "suelo_tecnico" }));
}

// ---------------------------------------------------------------- Ciudad Pili
{
  const b = new MapBuilder("ciudad-pili", "Ciudad Pili", 28, 22);
  b.trees(0, 0, 28, 2).trees(0, 0, 2, 8).trees(0, 12, 2, 6).trees(26, 0, 2, 16);
  b.fill(0, 16, 28, 2, "s").fill(0, 18, 28, 4, "~").fill(12, 16, 4, 4, "s");
  b.fill(0, 9, 26, 2, "p").fill(13, 11, 2, 5, "p").fill(20, 6, 1, 3, "p").fill(6, 6, 1, 3, "p");
  b.building(16, 2, { kind: "gimnasio", w: 8, color: "rojo", door: 4, to: "gimnasio-pili", tx: 6, ty: 15 });
  b.building(3, 3, { kind: "incubadora", w: 5, door: 2, to: "incubadora-pili", tx: 5, ty: 6 });
  b.building(3, 12, { kind: "tienda", w: 5, door: 2, to: "tienda-pili", tx: 4, ty: 6 });
  b.building(19, 12, { kind: "casa", w: 5, color: "azul", door: 2, to: "casa-pili", tx: 3, ty: 5 });
  b.fill(9, 3, 4, 3, "f");
  b.sign(11, 8, "Ciudad Pili. «Aquí todo se pega: hasta la gente».");
  b.sign(15, 8, "Gimnasio Clínico. Líder: Dra. Marina Luquin. Laboratorio de Bioseguridad Nivel 3.");
  b.sign(11, 16, "Puerto de Ciudad Pili. Ferri a las Islas Esporuladas y la Isla Conjugada.");
  b.npc({ id: "pili-marinero", x: 13, y: 19, sprite: "dependiente", dir: 1, script: "ferri" });
  b.npc({ id: "pili-1", x: 9, y: 11, sprite: "chico", move: "pasear", talk: "La Dra. Luquin trabaja con micobacterias. ¡Hasta la tinción usa fucsina caliente!" });
  b.npc({ id: "pili-2", x: 22, y: 10, sprite: "chica", dir: 2, talk: ["Los pili son como pelitos que usan las bacterias para pegarse a todo.", "¡Y algunos sirven para arrastrarse por las superficies, como un garfio!"] });
  b.warp({ x: 0, y: 9, h: 2, to: "ruta-9", tx: 42, ty: 8, dir: 2, keep: "y" });
  add(b.done({ music: "ciudad" }));
}
add(incubadora("incubadora-pili", "Ciudad Pili", { to: "ciudad-pili", x: 5, y: 5 }));
add(tienda("tienda-pili", "Ciudad Pili", { to: "ciudad-pili", x: 5, y: 14 }, ["criobola-azul", "criobola-amarilla", "medio-tsb", "medio-enriquecido", "solucion-salina", "glicerol", "atp-concentrado"]));
add(casa("casa-pili", "Casa de Ciudad Pili", { to: "ciudad-pili", x: 21, y: 14 }, [
  { id: "pili-casa", x: 5, y: 3, sprite: "madre", dir: 0, talk: ["Mi marido trabaja en el Instituto Carlos III, en la Isla Conjugada. Reviven cepas congeladas del permafrost.", "¡Dice que algunas tienen miles de años!"] },
]));
{
  const b = new MapBuilder("gimnasio-pili", "Gimnasio Clínico", 13, 17, "L", "laboratorio", false);
  b.fill(0, 0, 13, 1, "w").fill(0, 1, 13, 1, "W");
  b.fill(0, 5, 5, 1, "B").fill(7, 5, 6, 1, "B").fill(2, 9, 9, 1, "M").fill(0, 13, 4, 1, "i").fill(9, 13, 4, 1, "i");
  b.set(0, 2, "K").set(12, 2, "K").set(0, 15, "n").set(12, 15, "n");
  b.fill(5, 16, 3, 1, "a");
  b.npc({ id: "lider-luquin", x: 6, y: 2, sprite: "luquin", dir: 0, script: "liderLuquin" });
  b.npc({ id: "gym7-a", x: 11, y: 7, sprite: "chica", dir: 2, trainer: {
    name: "Sílvia", clase: "Técnica de BSL-3", team: [["nocardia", 43], ["bovis", 43]], sight: 4, money: 210,
    intro: "¡Presión negativa activada! Aquí no sale ni un aerosol… salvo mis ataques.", lose: "Me he quedado sin EPI…", after: "En un BSL-3 el aire siempre entra, nunca sale. ¡Así no escapan los patógenos!" } });
  b.npc({ id: "gym7-b", x: 1, y: 11, sprite: "estudiante", dir: 3, trainer: {
    name: "Àlex", clase: "Microbiólogo Clínico", team: [["pneumonia-k", 43], ["baumannii", 44], ["smegmatis", 43]], sight: 4, money: 210,
    intro: "¡Antibiograma listo! Veamos a qué resiste tu equipo.", lose: "Halo de inhibición enorme… el mío.", after: "La tinción de Ziehl-Neelsen tiñe de rojo a las micobacterias. ¡Resisten al alcohol-ácido!" } });
  b.npc({ id: "guia-gym7", x: 4, y: 14, sprite: "becario", dir: 0, talk: ["¡Hola, aspirante! Te doy un consejo.", "La Dra. Luquin usa Ácido-Alcohol resistentes, Gram- y Biofilms de hospital.", "¡Su Tuberculos es durísimo! Prepárate bien."] });
  b.warp({ x: 5, y: 16, w: 3, to: "ciudad-pili", tx: 20, ty: 6, dir: 0 });
  add(b.done({ music: "gimnasio" }));
}

// ---------------------------------------------------------------- Islas Esporuladas (laberinto de hielo a -80 °C)
{
  const b = new MapBuilder("islas-esporuladas", "Islas Esporuladas", 24, 24, "R", "hielo", false);
  b.rows(0, 0, [
    "RRRRRRRRRRRRRRRRRRRRRRRR",
    "RyyyyyyyyyyyyyyyyyyyyyyR",
    "RyyyyyyyyyyyyyyyyyyyyyyR",
    "RyyyyyyyyyyyyyyyyyyyyyyR",
    "RRRRRRRRRRRyyRRRRRRRRRRR",
    "RHHHHHHUHHHHHHHHHHHHHHHR",
    "RHHHHHHHHHHHHHHHUHHUHHHR",
    "RUHHHHHHHHHHHHHHHHHUHHUR",
    "RHHUHHHHHHHHHHHHHHHUHHHR",
    "RHHHHHHHHHHUHHHHHHHHHHHR",
    "RHHHHHHHHHHUHHHUHUHHHHHR",
    "RHHHHHHHHHHHHHHHHHHHHHHR",
    "RHHHHHUHHHHHHHHHHHHHHHHR",
    "RHHHHHHHHHHHHUHHHHHHHHHR",
    "RHHHHHHHHHUHUHHHHHHHHHHR",
    "RHHHHHHHHHHHHHHHHHHHHHHR",
    "RHHHHHHHHHHHHHHHHHHHHHHR",
    "RRRRRRRRRRyyyRRRRRRRRRRR",
    "RyyyyyyyyyyyyyyyyyyyyyyR",
    "RyyyyyyyyyyyyyyyyyyyyyyR",
    "RyyyyyyyyyyyyyyyyyyyyyyR",
    "RyyyyyyyyyyyyyyyyyyyyyyR",
    "RyyyyyyyyyyyyyyyyyyyyyyR",
    "RRRRRRRRRRRRRRRRRRRRRRRR"
  ]);
  b.npc({ id: "ie-marinero", x: 9, y: 22, sprite: "dependiente", dir: 3, script: "ferri" });
  b.npc({ id: "ie-crio", x: 16, y: 20, sprite: "becario", dir: 2, talk: ["Esto es nitrógeno líquido evaporándose… estamos a -80 °C. ¡Abrígate!", "El hielo resbala muchísimo: una vez empiezas a deslizarte no paras hasta chocar con algo."] });
  b.npc({ id: "ie-a", x: 4, y: 19, sprite: "chica", dir: 3, trainer: {
    name: "Greta", clase: "Crióloga", team: [["colwellia", 46], ["psychrobac", 46], ["radiodurans", 47]], sight: 4, money: 220,
    intro: "¡A -80 °C solo sobreviven los mejores! ¿Lo son los tuyos?", lose: "Me he quedado congelada…", after: "Las bacterias psicrófilas tienen enzimas que funcionan con frío extremo. ¡Se usan en detergentes!" } });
  b.npc({ id: "ie-fosil-1", x: 6, y: 2, sprite: "@tile:roca_hielo", script: "fosil:fosil-estromatolito", hideIf: "fosil", solid: true });
  b.npc({ id: "ie-fosil-2", x: 9, y: 2, sprite: "@tile:roca_hielo", script: "fosil:ambar-mioceno", hideIf: "fosil", solid: true });
  b.npc({ id: "ie-paleo", x: 7, y: 1, sprite: "estudiante", dir: 0, talk: "Paleomicrobiólogo: ¡Dos fósiles! Un estromatolito y un ámbar con una espora dentro. Solo puedes llevarte uno… ¡Elige bien!" });
  b.npc({ id: "sputnik-legendario", x: 18, y: 2, sprite: "@microo:sputnik-v", script: "estatico:sputnik-v|55|sputnik", hideIf: "sputnik", solid: true });
  b.item(21, 3, "glicerol", "item:ie-glicerol", 2);
  b.item(1, 18, "atp-concentrado", "item:ie-atp", 1, true);
  b.encounters([
    { sp: "colwellia", min: 46, max: 48, w: 24 }, { sp: "psychrobac", min: 45, max: 47, w: 22 }, { sp: "deinococ", min: 46, max: 48, w: 16 },
    { sp: "radiodurans", min: 46, max: 48, w: 18 }, { sp: "tardigrad", min: 47, max: 48, w: 6 }, { sp: "thiomargar", min: 46, max: 48, w: 14 },
  ]);
  add(b.done({ music: "cueva", floorEncounters: "nieve" }));
}

// ---------------------------------------------------------------- Isla Conjugada
{
  const b = new MapBuilder("isla-conjugada", "Isla Conjugada", 30, 26);
  b.trees(0, 0, 30, 2).trees(0, 0, 2, 20).trees(28, 0, 2, 20);
  b.fill(0, 20, 30, 2, "s").fill(0, 22, 30, 4, "~").fill(12, 20, 4, 3, "s");
  b.fill(14, 7, 2, 13, "p").fill(3, 12, 24, 2, "p").fill(6, 8, 1, 4, "p").fill(23, 8, 1, 4, "p").fill(9, 14, 1, 3, "p").fill(20, 14, 1, 3, "p");
  b.building(11, 2, { kind: "gimnasio", w: 8, color: "morado", door: 4, to: "gimnasio-conjugada", tx: 6, ty: 15 });
  b.building(3, 5, { kind: "lab", w: 6, color: "azul", door: 3, to: "carlos-iii", tx: 5, ty: 8 });
  b.building(20, 5, { kind: "casa", w: 7, color: "gris", door: 3, to: "mansion-1", tx: 7, ty: 12 });
  b.building(7, 15, { kind: "incubadora", w: 5, door: 2, to: "incubadora-conjugada", tx: 5, ty: 6 });
  b.building(18, 15, { kind: "tienda", w: 5, door: 2, to: "tienda-conjugada", tx: 4, ty: 6 });
  b.fill(24, 15, 3, 3, "f").fill(2, 15, 3, 3, "f");
  b.sign(13, 19, "Isla Conjugada. «Aquí los genes cambian de dueño».");
  b.sign(5, 10, "Instituto Carlos III. Revivimos cepas del permafrost y fósiles microbianos.");
  b.sign(22, 10, "Mansión de las Cepas. Propiedad privada. (La puerta está forzada…)");
  b.sign(16, 6, "Gimnasio Fago. Líder: Dra. Susana Campoy.");
  b.npc({ id: "conj-marinero", x: 12, y: 22, sprite: "dependiente", dir: 3, script: "ferri" });
  b.npc({ id: "conj-gym-cerrado", x: 15, y: 5, sprite: "becario", dir: 0, hideIf: "urtaza3", talk: "La Dra. Campoy ha cerrado el gimnasio. Ha ido a la Mansión de las Cepas: dice que ahí dentro está pasando algo terrible." });
  b.npc({ id: "conj-1", x: 9, y: 11, sprite: "chica", move: "pasear", talk: "La conjugación bacteriana es como un intercambio de genes con un puente de pilus. ¡Por eso la isla se llama así!" });
  b.encounters([
    { sp: "marburg-v", min: 47, max: 49, w: 16 }, { sp: "mimivir", min: 47, max: 49, w: 16 }, { sp: "lambda-v", min: 46, max: 48, w: 16 },
    { sp: "bacteriovor", min: 46, max: 48, w: 16 }, { sp: "retrovir-x", min: 50, max: 50, w: 4 }, { sp: "lentivir", min: 46, max: 48, w: 16 },
    { sp: "pleomorph", min: 45, max: 46, w: 6 }, { sp: "coli-bl21", min: 46, max: 48, w: 10 },
  ]);
  b.fill(2, 2, 8, 3, "g").fill(22, 2, 5, 3, "g").fill(24, 18, 4, 2, "g").fill(2, 18, 4, 2, "g");
  add(b.done({ music: "ciudad" }));
}
add(incubadora("incubadora-conjugada", "Isla Conjugada", { to: "isla-conjugada", x: 9, y: 17 }));
add(tienda("tienda-conjugada", "Isla Conjugada", { to: "isla-conjugada", x: 20, y: 17 }, ["criobola-amarilla", "medio-tsb", "medio-enriquecido", "solucion-salina", "glicerol", "atp-concentrado"]));
{
  const b = new MapBuilder("carlos-iii", "Instituto Carlos III", 11, 10, "L", "laboratorio", false);
  b.fill(0, 0, 11, 1, "w").fill(0, 1, 11, 1, "W").fill(0, 1, 3, 1, "i").fill(8, 1, 3, 1, "i").set(0, 5, "M").set(10, 5, "B").set(0, 8, "n").set(10, 8, "n");
  b.fill(3, 3, 5, 1, "c").fill(4, 9, 3, 1, "a");
  b.npc({ id: "c3-cientifica", x: 5, y: 2, sprite: "profesora", dir: 0, script: "carlosIII" });
  b.npc({ id: "c3-becario", x: 8, y: 6, sprite: "becario", dir: 2, talk: ["Aquí revivimos microorganismos congelados en el permafrost. ¡Algunos llevan miles de años dormidos!", "El Dr. Martínez-Urtaza vino hace poco a robar muestras liofilizadas… para la Mansión."] });
  b.warp({ x: 4, y: 9, w: 3, to: "isla-conjugada", tx: 6, ty: 9, dir: 0 });
  add(b.done());
}

// ---------------------------------------------------------------- Mansión de las Cepas
{
  const b = new MapBuilder("mansion-1", "Mansión de las Cepas", 16, 14, "m", "interior", false);
  b.fill(0, 0, 16, 1, "w").fill(0, 1, 16, 1, "W").fill(1, 1, 3, 1, "e").fill(12, 1, 3, 1, "e");
  b.fill(4, 4, 1, 5, "e").fill(11, 4, 1, 5, "e").fill(6, 9, 4, 1, "t").set(15, 2, "E").fill(6, 13, 3, 1, "a");
  b.sign(5, 4, "Diario, 5 de julio: Nuestra cepa K-12 crece de maravilla. Docilísima. Perfecta para el laboratorio.");
  b.sign(10, 4, "Diario, 12 de agosto: Un fago portador de la toxina Shiga se ha colado en un cultivo. La cepa ha cambiado…");
  b.sign(8, 9, "Diario, 3 de septiembre: La nueva cepa produce toxina. La llamamos O157:H7. Ya no podemos controlarla.");
  b.npc({ id: "m1-r1", x: 2, y: 6, sprite: "recluta", dir: 3, trainer: {
    name: "Doctorando", clase: "Recluta de la Unidad", team: [["marburg-v", 48], ["retrovir-x", 50]], sight: 4, money: 230,
    intro: "¡El jefe está a punto de despertar al Microo definitivo! ¡No pasarás!", lose: "Bueno… yo solo hacía los gráficos.", after: "El jefe dice que con Machine Learning controlará la selección poblacional. Yo ya no sé qué pensar." } });
  b.npc({ id: "m1-r2", x: 13, y: 10, sprite: "recluta-b", dir: 2, trainer: {
    name: "Postdoc", clase: "Recluta de la Unidad", team: [["mimivir", 49], ["pneumonia-k", 49], ["bacteriovor", 49]], sight: 4, money: 230,
    intro: "¡Tres años de postdoc para esto! ¡Al menos déjame ganar un combate!", lose: "Ni eso…", after: "Arriba está el laboratorio profundo. Y el jefe. Y… eso." } });
  b.warp({ x: 6, y: 13, w: 3, to: "isla-conjugada", tx: 23, ty: 8, dir: 0 });
  b.warp({ x: 15, y: 2, to: "mansion-2", tx: 14, ty: 3, dir: 0 });
  b.encounters([{ sp: "coli-k12", min: 45, max: 47, w: 30 }, { sp: "coli-bl21", min: 46, max: 48, w: 30 }, { sp: "lambda-v", min: 46, max: 48, w: 25 }, { sp: "marburg-v", min: 47, max: 49, w: 15 }]);
  add(b.done({ music: "guarida", floorEncounters: "suelo_madera" }));
}
{
  const b = new MapBuilder("mansion-2", "Mansión de las Cepas · Laboratorio profundo", 16, 14, "L", "laboratorio", false);
  b.fill(0, 0, 16, 1, "w").fill(0, 1, 16, 1, "W");
  b.set(15, 2, "E").fill(2, 2, 3, 1, "K").fill(11, 2, 3, 1, "D").fill(3, 7, 1, 5, "B").fill(12, 7, 1, 5, "B").set(1, 12, "i").set(14, 12, "i");
  b.npc({ id: "m2-campoy", x: 10, y: 9, sprite: "campoy", dir: 2, hideIf: "urtaza3", talk: "Dra. Susana Campoy: ¡Ha usado un fago con la toxina Shiga para crear una cepa nueva! Yo no puedo detenerle sola… ¡Ayúdame!" });
  b.npc({ id: "m2-urtaza", x: 7, y: 5, sprite: "urtaza", dir: 0, script: "urtazaFinal", hideIf: "urtaza3", solid: true });
  b.npc({ id: "o157-legendario", x: 7, y: 3, sprite: "@microo:ecoli-o157", script: "estatico:ecoli-o157|60|o157", showIf: "urtaza3", hideIf: "o157", solid: true });
  b.sign(5, 3, "Diario del Dr. Martínez-Urtaza: «La biología es solo un problema de datos. Con suficientes muestras de Cádiz, la controlaré».");
  b.warp({ x: 15, y: 2, to: "mansion-1", tx: 14, ty: 2, dir: 2 });
  add(b.done({ music: "guarida" }));
}
{
  const b = new MapBuilder("gimnasio-conjugada", "Gimnasio Fago", 13, 17, "Y", "gimnasio", false);
  b.fill(0, 0, 13, 1, "w").fill(0, 1, 13, 1, "W");
  b.fill(0, 5, 4, 1, "1").fill(6, 5, 7, 1, "1").fill(0, 9, 8, 1, "1").fill(10, 9, 3, 1, "1").fill(3, 13, 7, 1, "1");
  b.set(0, 2, "1").set(12, 2, "1").set(0, 15, "n").set(12, 15, "n");
  b.fill(5, 16, 3, 1, "a");
  b.npc({ id: "lider-campoy", x: 6, y: 2, sprite: "campoy", dir: 0, script: "liderCampoy" });
  b.npc({ id: "gym8-a", x: 9, y: 7, sprite: "chica", dir: 2, trainer: {
    name: "Mireia", clase: "Fagóloga", team: [["lambda-v", 49], ["phage-x174", 49], ["marburg-v", 50]], sight: 4, money: 240,
    intro: "¡Ciclo lítico o lisogénico! ¿Cuál prefieres sufrir?", lose: "Me has dejado en latencia…", after: "La terapia fágica usa virus para matar bacterias resistentes. ¡Es el futuro!" } });
  b.npc({ id: "gym8-b", x: 2, y: 11, sprite: "estudiante", dir: 3, trainer: {
    name: "Nil", clase: "Ingeniero Genético", team: [["mimivir", 50], ["retrovir-x", 50], ["bacteriovor", 50]], sight: 4, money: 240,
    intro: "¡Transducción generalizada! ¡Te inyecto mis genes!", lose: "Error de empaquetado…", after: "La Dra. Campoy estudia cómo los fagos mueven genes entre bacterias. ¡Hasta genes de resistencia!" } });
  b.npc({ id: "guia-gym8", x: 4, y: 14, sprite: "becario", dir: 0, talk: ["¡Hola, aspirante! El último consejo.", "La Dra. Campoy usa Virus: Lambda-V, Bacteriovor, Marburg-V y su gran T4-Titan.", "¡T4-Titan es Virus y Biofilm, y golpea como un ariete!"] });
  b.warp({ x: 5, y: 16, w: 3, to: "isla-conjugada", tx: 15, ty: 6, dir: 0 });
  add(b.done({ music: "gimnasio" }));
}

// ---------------------------------------------------------------- Calle Selección Natural
{
  const b = new MapBuilder("calle-seleccion", "Calle Selección Natural", 24, 30, "A");
  b.fill(1, 22, 22, 6, "s").fill(0, 26, 24, 4, "~").fill(2, 21, 3, 2, "s");
  b.fill(3, 2, 3, 20, "p").fill(3, 15, 16, 2, "p").fill(17, 6, 3, 10, "p").fill(8, 6, 10, 2, "p").fill(8, 2, 3, 5, "p").fill(10, 0, 4, 3, "p");
  b.fill(6, 9, 10, 5, "g").fill(13, 18, 8, 3, "g").fill(20, 2, 3, 4, "g");
  b.set(5, 12, "r").set(18, 10, "r").set(9, 4, "r");
  b.set(20, 6, "p").set(14, 17, "p");
  b.sign(5, 21, "Calle Selección Natural. Solo los Microos más adaptados llegan a La UAB.");
  b.item(21, 3, "medio-enriquecido", "item:csn-enriquecido", 3);
  b.item(15, 20, "atp-concentrado", "item:csn-atp", 2);
  b.item(7, 13, "glicerol", "item:csn-glicerol", 3, true);
  b.npc({ id: "csn-marinero", x: 2, y: 24, sprite: "dependiente", dir: 3, script: "ferri" });
  b.npc({ id: "csn-rival", x: 4, y: 18, sprite: "rival", dir: 0, hideIf: "rival4" });
  b.trigger({ x: 3, y: 19, w: 3, script: "rivalFinal", once: "rival4" });
  b.npc({ id: "csn-a", x: 10, y: 15, sprite: "estudiante", dir: 3, trainer: {
    name: "Ferran", clase: "Catedrático Emérito", team: [["pyogenes", 54], ["agalactiae", 54], ["mutans", 53]], sight: 4, money: 260,
    intro: "¡Llevo cuarenta años dando Microbiología! Veamos si has aprendido algo.", lose: "Aprobado. Con nota.", after: "La selección natural no tiene objetivo: solo sobreviven los que mejor se adaptan." } });
  b.npc({ id: "csn-b", x: 18, y: 12, sprite: "chica", dir: 2, trainer: {
    name: "Berta", clase: "Investigadora Ramón y Cajal", team: [["plasmodium", 54], ["toxoplasma", 54], ["naegleria", 55]], sight: 3, money: 260,
    intro: "¡Cinco años de contrato y ni una plaza fija! ¡Descargo mi frustración contigo!", lose: "Al menos me queda la Ramón y Cajal…", after: "La UAB está al norte. El Alto Mando son catedráticos de verdad: no te confíes." } });
  b.npc({ id: "csn-c", x: 12, y: 6, sprite: "chico", dir: 2, trainer: {
    name: "Martí", clase: "Evolucionista", team: [["luca", 50], ["lokiarca", 54], ["cyanofossil", 55]], sight: 4, money: 260,
    intro: "¡Desde LUCA hasta nosotros! ¡Cuatro mil millones de años de evolución!", lose: "La extinción es parte del proceso…", after: "LUCA vivió hace unos 4.000 millones de años. ¡Todos venimos de él!" } });
  b.npc({ id: "csn-hernandez", x: 11, y: 2, sprite: "hernandez", dir: 0, script: "hernandezFinal", hideIf: "hernandez2", solid: true });
  b.warp({ x: 10, y: 0, w: 4, to: "uab", tx: 9, ty: 14, dir: 1, keep: "x" });
  b.encounters([
    { sp: "pyogenes", min: 52, max: 55, w: 12 }, { sp: "agalactiae", min: 53, max: 55, w: 10 }, { sp: "treponema", min: 52, max: 55, w: 12 },
    { sp: "trypanosom", min: 52, max: 55, w: 12 }, { sp: "yersinia", min: 53, max: 55, w: 8 }, { sp: "sulfolobus", min: 52, max: 55, w: 12 },
    { sp: "alexandrium", min: 52, max: 54, w: 12 }, { sp: "agrobacter", min: 52, max: 54, w: 12 }, { sp: "filovir-z", min: 55, max: 55, w: 4 },
    { sp: "pichiamax", min: 54, max: 55, w: 6 },
  ]);
  add(b.done({ music: "ruta" }));
}

// ---------------------------------------------------------------- La UAB
{
  const b = new MapBuilder("uab", "La UAB", 22, 16);
  b.trees(0, 0, 22, 2).trees(0, 0, 2, 16).trees(20, 0, 2, 16);
  b.fill(8, 9, 6, 7, "p").fill(2, 12, 18, 2, "p");
  b.building(5, 2, { kind: "lab", w: 12, color: "rojo", door: 5, to: "uab-vestibulo", tx: 5, ty: 8 });
  b.fill(2, 10, 4, 2, "f").fill(16, 10, 4, 2, "f").fill(3, 14, 4, 2, "~");
  b.sign(14, 8, "Facultad de Biociencias de La UAB. Liga Micromón. Solo con las 8 medallas.");
  b.npc({ id: "uab-estudiante", x: 15, y: 12, sprite: "estudiante", move: "pasear", talk: "Dicen que el Campeón es el mismísimo Louis Pasteur. ¡Con sus matraces de cuello de cisne!" });
  b.warp({ x: 8, y: 15, w: 6, to: "calle-seleccion", tx: 10, ty: 1, dir: 0, keep: "x" });
  add(b.done({ music: "ciudad" }));
}
{
  const b = new MapBuilder("uab-vestibulo", "La UAB · Vestíbulo de la Liga", 11, 10, "L", "laboratorio", false);
  b.fill(0, 0, 11, 1, "w").fill(0, 1, 11, 1, "W").set(1, 1, "i").set(2, 1, "i").set(8, 1, "e").set(9, 1, "e");
  b.fill(0, 3, 4, 1, "c").fill(7, 3, 4, 1, "c").set(0, 8, "n").set(10, 8, "n").fill(4, 9, 3, 1, "a").set(5, 1, "E");
  b.npc({ id: "uab-enfermera", x: 2, y: 2, sprite: "enfermera", dir: 0, script: "incubadora" });
  b.npc({ id: "uab-tienda", x: 8, y: 2, sprite: "dependiente", dir: 0, script: "tienda:criobola-amarilla,medio-tsb,medio-enriquecido,solucion-salina,glicerol,atp-concentrado" });
  b.npc({ id: "uab-guarda", x: 5, y: 2, sprite: "profesora", dir: 0, script: "guardaLiga", hideIf: "liga-abierta" });
  b.npc({ id: "uab-guarda-2", x: 6, y: 2, sprite: "profesora", dir: 2, showIf: "liga-abierta", talk: "¡Mucha suerte! Recuerda: si pierdes contra cualquiera de ellos, tendrás que empezar de nuevo." });
  b.warp({ x: 4, y: 9, w: 3, to: "uab", tx: 10, ty: 8, dir: 0 });
  b.warp({ x: 5, y: 1, to: "liga-1", tx: 5, ty: 9, dir: 1 });
  add(b.done({ music: "pueblo", onEnter: "registrarIncubadora" }));
}
const SALAS: [string, string, string][] = [
  ["liga-1", "Laboratorio de la Dra. Tusell", "tusell"], ["liga-2", "Laboratorio del Dr. Martí", "marti"],
  ["liga-3", "Laboratorio del Dr. Barbé", "barbe"], ["liga-4", "Laboratorio de la Dra. Llagostera", "llagostera"],
  ["liga-5", "Rectorado de La UAB", "pasteur"],
];
SALAS.forEach(([id, name, who], k) => {
  const b = new MapBuilder(id, `Liga Micromón · ${name}`, 11, 11, k === 4 ? "L" : "Y", "gimnasio", false);
  if (k === 4) b.fill(4, 2, 3, 9, "a");
  b.fill(0, 0, 11, 1, "w").fill(0, 1, 11, 1, "W").set(0, 2, "n").set(10, 2, "n");
  if (k === 4) b.fill(0, 4, 3, 1, "K").fill(8, 4, 3, 1, "K");
  else b.fill(0, 5, 3, 1, ["M", "B", "D", "1"][k]).fill(8, 5, 3, 1, ["M", "B", "D", "1"][k]);
  b.set(5, 1, "E");
  b.npc({ id: `liga-jefe-${k + 1}`, x: 4, y: 2, sprite: who, dir: 0, script: `liga:${k + 1}` });
  b.trigger({ x: 0, y: 6, w: 11, script: `liga:${k + 1}`, once: `liga${k + 1}` });
  b.npc({ id: `liga-puerta-${k + 1}`, x: 5, y: 2, sprite: "", hideIf: `liga${k + 1}`, solid: true, talk: "La puerta está cerrada. Primero tienes que vencer en este laboratorio." });
  b.warp({ x: 5, y: 1, to: k < 4 ? `liga-${k + 2}` : "fosa-abisal", tx: 5, ty: 9, dir: 1 });
  add(b.done({ music: k === 4 ? "campeon" : "gimnasio" }));
});

// ---------------------------------------------------------------- Fosa abisal (LUCA)
{
  const b = new MapBuilder("fosa-abisal", "Fosa Abisal", 11, 11, "X", "cueva", false);
  b.fill(2, 2, 7, 9, "u").set(2, 2, "h").set(8, 2, "h").set(2, 9, "o").set(8, 9, "o");
  b.npc({ id: "luca-legendario", x: 5, y: 3, sprite: "@microo:luca", script: "estatico:luca|70|luca", hideIf: "luca", solid: true });
  b.npc({ id: "fosa-salida", x: 5, y: 10, sprite: "", talk: "Un ascensor de vuelta a La UAB.", script: "salirFosa" });
  add(b.done({ music: "cueva" }));
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
