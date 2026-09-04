/* test_firma.mjs — Suite TDD del motor de firma.
 * Ejecutar: node test_firma.mjs
 * Verifica compatibilidad con Outlook Desktop, Gmail y dark mode. */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const E = require("./signature-engine.js");

let passed = 0;
let failed = 0;
const fails = [];

function ok(cond, name) {
  if (cond) {
    passed++;
  } else {
    failed++;
    fails.push(name);
    console.log("  FAIL: " + name);
  }
}

const sample = {
  name: "Isabel Figueroa V.",
  title: "Analista de Recursos Humanos",
  company: "Hospital Claudio Vicuña",
  area: "Selección de Personal",
  email: "isabel@hcv.cl",
  phone: "+56 9 1234 5678",
  website: "www.hcv.cl",
  linkedin: "linkedin.com/in/isabel",
  address: "San Antonio, Chile",
  photo: "data:image/png;base64,AAAA",
  logo: "data:image/png;base64,BBBB",
};

// ── Grupo 1: contrato del motor ──
function g1() {
  const r = E.buildSignature(sample, { template: "executive", color: "#155e75" });
  ok(typeof r.html === "string" && r.html.length > 0, "g1: html no vacío");
  ok(typeof r.text === "string" && r.text.length > 0, "g1: texto plano no vacío");
  let threw = false;
  try {
    E.buildSignature({ name: "" }, {});
  } catch (e) {
    threw = true;
  }
  ok(threw, "g1: nombre vacío lanza error");
  ok(E.templates.length === 3, "g1: tres plantillas disponibles");
}

// ── Grupo 2: compatibilidad Outlook Desktop ──
function g2() {
  const html = E.buildSignature(sample, { template: "executive" }).html;
  ok(!/display\s*:\s*inline-block/i.test(html), "g2: sin display:inline-block");
  ok(!/display\s*:\s*flex/i.test(html), "g2: sin display:flex");
  ok(!/display\s*:\s*grid/i.test(html), "g2: sin display:grid");
  ok(!/data:image\/svg\+xml/i.test(html), "g2: sin SVG data URI");
  ok(!/<svg[\s>]/i.test(html), "g2: sin SVG embebido");
  ok(/mso-line-height-rule\s*:\s*exactly/i.test(html), "g2: usa mso-line-height-rule");
  ok(/<table/i.test(html), "g2: usa tablas para layout");
  ok(!/<script/i.test(html), "g2: sin JavaScript en la firma");
  ok(!/<form/i.test(html), "g2: sin formularios en la firma");
}

// ── Grupo 3: dark mode (bgcolor + font color) ──
function g3() {
  const html = E.buildSignature(sample, { template: "minimal", color: "#7c2d12" }).html;
  // Toda celda con background-color CSS debe tener atributo bgcolor.
  const tdsWithCssBg = html.match(/<td(?![^>]*bgcolor)[^>]*background-color[^>]*>/gi) || [];
  ok(tdsWithCssBg.length === 0, "g3: toda celda coloreada tiene bgcolor");
  ok(/bgcolor=/i.test(html), "g3: usa atributo bgcolor");
  ok(/<font[^>]+color=/i.test(html), "g3: usa <font color> para texto");
}

// ── Grupo 4: iconos Unicode seguros ──
function g4() {
  const icon = E.makeIcon("email", "#155e75");
  ok(/&#9993;/.test(icon), "g4: email usa entidad Unicode ✉");
  ok(/bgcolor=/i.test(icon), "g4: icono tiene bgcolor");
  ok(/<font color="#ffffff"/.test(icon), "g4: icono con font color blanco");
  ok(E.makeIcon("phone", "#000").includes("&#9742;"), "g4: phone ☎");
  ok(E.makeIcon("web", "#000").includes("&#8853;"), "g4: web ⊕");
  ok(E.makeIcon("location", "#000").includes("&#9678;"), "g4: location ◎");
  ok(E.makeIcon("inexistente", "#000") === "", "g4: tipo inválido devuelve vacío");
}

// ── Grupo 5: enlaces y normalización ──
function g5() {
  const html = E.buildSignature(sample, {}).html;
  ok(/href="mailto:isabel@hcv\.cl"/.test(html), "g5: mailto correcto");
  ok(/href="tel:\+56912345678"/.test(html), "g5: tel sin espacios");
  ok(/href="https:\/\/www\.hcv\.cl"/.test(html), "g5: web con https");
  ok(E.normalizeUrl("hcv.cl") === "https://hcv.cl", "g5: normalizeUrl agrega https");
  ok(E.displayUrl("https://www.hcv.cl/") === "www.hcv.cl", "g5: displayUrl limpia esquema y barra");
}

// ── Grupo 6: variantes (breve, sin foto, sin logo) ──
function g6() {
  const full = E.buildSignature(sample, { short: false }).html;
  ok(/San Antonio, Chile/.test(full), "g6: firma completa incluye dirección");
  const short = E.buildSignature(sample, { short: true }).html;
  ok(!/San Antonio, Chile/.test(short), "g6: firma breve omite dirección");
  const noPhoto = E.buildSignature({ ...sample, photo: "" }, {}).html;
  ok(!/<img[^>]+border-radius:50%/.test(noPhoto), "g6: sin foto no renderiza img circular");
  const noLogo = E.buildSignature({ ...sample, logo: "" }, {}).html;
  ok(!/logo"/.test(noLogo), "g6: sin logo no renderiza logo");
}

// ── Grupo 7: las tres plantillas generan HTML válido ──
function g7() {
  for (const t of E.templates) {
    const html = E.buildSignature(sample, { template: t }).html;
    ok(html.includes("Isabel Figueroa"), "g7: " + t + " incluye nombre");
    ok((html.match(/<table/gi) || []).length >= 1, "g7: " + t + " usa tabla");
  }
}

// ── Grupo 8: escape de seguridad ──
function g8() {
  const evil = E.buildSignature(
    { name: '<script>x</script>', title: 'a"b', email: "x@y.z" },
    {}
  ).html;
  ok(!/<script>x<\/script>/.test(evil), "g8: nombre con script es escapado");
  ok(/&lt;script&gt;/.test(evil), "g8: caracteres < > escapados");
}

// ── Grupo 9: una sola línea en correo/teléfono/web/LinkedIn ──
function g9() {
  const html = E.buildSignature(sample, { template: "executive" }).html;
  const nowrapCells = html.match(/nowrap="nowrap"/gi) || [];
  ok(nowrapCells.length === 4, "g9: 4 celdas nowrap (email, tel, web, linkedin)");
  ok(/white-space:nowrap/i.test(html), "g9: usa white-space:nowrap");
  // Dirección: debe permitir quiebre (sin nowrap).
  const addrOnly = E.buildSignature({ name: "X", address: "Calle larga 123, San Antonio" }, {}).html;
  ok(!/nowrap="nowrap"/i.test(addrOnly), "g9: dirección no fuerza nowrap");
}

// ── Grupo 10: comillas que rompen atributos (raíz del quiebre real) ──
function g10() {
  ok(E.FONT_STACK.indexOf('"') === -1, "g10: FONT_STACK sin comillas dobles");
  const html = E.buildSignature(sample, { template: "executive" }).html;
  ok(!/font-family:"/.test(html), "g10: ningún font-family abre comilla doble en atributo");
  // Ningún atributo style debe contener comillas dobles internas.
  const styles = html.match(/style="[^"]*"/g) || [];
  const totalStyleAttrs = (html.match(/style=/g) || []).length;
  ok(styles.length === totalStyleAttrs, "g10: todos los style cierran sin comillas internas");
}

const groups = [g1, g2, g3, g4, g5, g6, g7, g8, g9, g10];
console.log("Ejecutando suite TDD del motor de firma...\n");
for (const g of groups) g();

console.log("\n" + "=".repeat(50));
console.log("Resultado: " + passed + " pasaron, " + failed + " fallaron");
console.log("=".repeat(50));
if (failed > 0) {
  console.log("Tests fallidos: " + fails.join(", "));
  process.exit(1);
}
process.exit(0);
