/* test_ui.mjs — Verifica comportamiento de los campos del formulario.
 * Reglas: al cargar, ningún campo debe tener texto precargado (value),
 * y cada campo debe tener un placeholder como indicación. */
import { JSDOM } from "jsdom";
import fs from "fs";

const html = fs.readFileSync("/mnt/user-data/outputs/generador-firmas.html", "utf8");
const FIELDS = ["name","title","company","area","email","phone","website","linkedin","address"];

let passed = 0, failed = 0; const fails = [];
function ok(c, n){ if(c){passed++;} else {failed++; fails.push(n); console.log("  FAIL: "+n);} }

const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true,
  beforeParse(w){ w.FileReader = class { readAsDataURL(){} }; } });

setTimeout(() => {
  const doc = dom.window.document;
  FIELDS.forEach(f => {
    const el = doc.getElementById(f);
    ok(el, "existe campo " + f);
    if (el) {
      ok(el.value === "", "campo " + f + " inicia vacío (sin value precargado)");
      ok((el.getAttribute("placeholder") || "").trim().length > 0, "campo " + f + " tiene placeholder");
    }
  });
  console.log("\nResultado UI: " + passed + " pasaron, " + failed + " fallaron");
  if (failed) { console.log("Fallidos: " + fails.join(", ")); process.exit(1); }
  process.exit(0);
}, 300);
