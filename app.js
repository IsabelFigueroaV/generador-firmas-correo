/* app.js — Glue de interfaz. Usa SignatureEngine (lógica pura).
 * Sin dependencias externas. Persistencia en localStorage. */
(function () {
  "use strict";
  var E = window.SignatureEngine;
  var $ = function (id) { return document.getElementById(id); };

  var state = {
    template: "executive",
    color: "#155e75",
    short: false,
    dark: false,
    photo: "",
    logo: "",
  };

  var PROFILE_KEY = "firma_profiles";
  var MAX_SRC_BYTES = 12 * 1024 * 1024; // guarda: no leer originales enormes (12 MB)
  var MAX_DIM = { photo: 320, logo: 480 }; // lado máximo tras optimizar (px)

  // ── Lectura/escritura del formulario ──
  var FIELDS = ["name", "title", "company", "area", "email", "phone", "website", "linkedin", "address"];

  function getData() {
    var d = {};
    FIELDS.forEach(function (f) { d[f] = $(f).value.trim(); });
    d.photo = state.photo;
    d.logo = state.logo;
    return d;
  }

  function setData(d) {
    d = d || {};
    FIELDS.forEach(function (f) { $(f).value = d[f] || ""; });
    state.photo = d.photo || "";
    state.logo = d.logo || "";
    refreshThumb("photo", state.photo);
    refreshThumb("logo", state.logo);
  }

  // ── Validación de campos ──
  function validate(d) {
    var errs = {};
    if (!d.name) errs.name = "El nombre es obligatorio.";
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))
      errs.email = "Correo no válido.";
    return errs;
  }

  function applyValidation(errs) {
    ["name", "email"].forEach(function (f) {
      var wrap = $(f).closest(".field");
      if (errs[f]) {
        wrap.classList.add("invalid");
        $(f + "-err").textContent = errs[f];
      } else {
        wrap.classList.remove("invalid");
      }
    });
  }

  // ── Render de vista previa ──
  function render() {
    var d = getData();
    var errs = validate(d);
    applyValidation(errs);
    var preview = $("preview");
    if (errs.name) {
      preview.innerHTML =
        '<p style="color:#9a2b2b;font-size:13px;margin:0;">Ingrese al menos el nombre para ver la firma.</p>';
      $("htmlCode").value = "";
      $("textCode").value = "";
      return;
    }
    var result;
    try {
      result = E.buildSignature(d, {
        template: state.template,
        color: state.color,
        short: state.short,
      });
    } catch (e) {
      preview.innerHTML = '<p style="color:#9a2b2b;">' + e.message + "</p>";
      return;
    }
    preview.innerHTML = result.html;
    $("htmlCode").value = result.html;
    $("textCode").value = result.text;
  }

  // ── Imágenes (foto/logo) → base64 local ──
  function handleImage(inputId, slot) {
    var input = $(inputId);
    var file = input.files && input.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setStatus("El archivo no es una imagen.", "err");
      input.value = "";
      return;
    }
    if (file.size > MAX_SRC_BYTES) {
      setStatus("La imagen supera 12 MB. Use una más liviana.", "err");
      input.value = "";
      return;
    }
    var reader = new FileReader();
    reader.onload = function (ev) {
      var square = slot === "photo"; // la foto se recorta a cuadrado
      optimizeImage(ev.target.result, MAX_DIM[slot] || 360, square, function (optimized, info) {
        state[slot] = optimized;
        refreshThumb(slot, state[slot]);
        render();
        setStatus(
          (slot === "photo" ? "Foto" : "Logo") + " cargada y optimizada (" + info + ").",
          "ok"
        );
      });
    };
    reader.onerror = function () { setStatus("No se pudo leer la imagen.", "err"); };
    reader.readAsDataURL(file);
  }

  /* optimizeImage — redimensiona en canvas y comprime, manteniendo la firma
   * liviana sin importar el tamaño original.
   * square=true: recorta a cuadrado (centrado) para fotos de avatar, evitando
   * distorsión en clientes sin object-fit (Outlook).
   * PNG con transparencia se conserva como PNG; el resto pasa a JPEG. */
  function optimizeImage(dataUrl, maxDim, square, cb) {
    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth || img.width;
      var h = img.naturalHeight || img.height;
      if (!w || !h) { cb(dataUrl, "sin cambios"); return; }
      var canvas = document.createElement("canvas");
      var ctx, out, nw, nh;
      if (square) {
        var side = Math.min(w, h);
        var sx = Math.round((w - side) / 2);
        var sy = Math.round((h - side) / 2);
        var outSide = Math.min(maxDim, side);
        canvas.width = outSide; canvas.height = outSide;
        ctx = canvas.getContext("2d");
        ctx.drawImage(img, sx, sy, side, side, 0, 0, outSide, outSide);
        nw = outSide; nh = outSide;
      } else {
        var scale = Math.min(1, maxDim / Math.max(w, h));
        nw = Math.max(1, Math.round(w * scale));
        nh = Math.max(1, Math.round(h * scale));
        canvas.width = nw; canvas.height = nh;
        ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, nw, nh);
      }
      var isPng = /^data:image\/png/i.test(dataUrl);
      try {
        out = isPng
          ? canvas.toDataURL("image/png")
          : canvas.toDataURL("image/jpeg", 0.82);
      } catch (e) {
        cb(dataUrl, "sin cambios");
        return;
      }
      // El recorte cuadrado siempre se conserva (corrige proporción).
      // En el resto, si el original era más liviano, se conserva.
      if (!square && out.length >= dataUrl.length) out = dataUrl;
      var kb = Math.round((out.length * 3) / 4 / 1024);
      cb(out, nw + "×" + nh + " px, ~" + kb + " KB");
    };
    img.onerror = function () { cb(dataUrl, "sin cambios"); };
    img.src = dataUrl;
  }

  function refreshThumb(slot, src) {
    var t = $(slot + "Thumb");
    if (src) { t.src = src; t.style.display = "block"; }
    else { t.removeAttribute("src"); t.style.display = "none"; }
  }

  function clearImage(slot) {
    state[slot] = "";
    $(slot).value = "";
    refreshThumb(slot, "");
    render();
  }

  // ── Estado / mensajes ──
  var statusTimer = null;
  function setStatus(msg, kind) {
    var el = $("status");
    el.textContent = msg;
    el.className = "status " + (kind || "");
    if (statusTimer) clearTimeout(statusTimer);
    if (msg) statusTimer = setTimeout(function () { el.textContent = ""; el.className = "status"; }, 4000);
  }

  // ── Copiar firma (HTML enriquecido + texto plano) ──
  function copySignature() {
    var d = getData();
    if (validate(d).name) { setStatus("Complete el nombre antes de copiar.", "err"); return; }
    var html = $("htmlCode").value;
    var text = $("textCode").value;
    if (navigator.clipboard && window.ClipboardItem) {
      var item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      });
      navigator.clipboard.write([item]).then(
        function () { setStatus("Firma copiada (HTML enriquecido). Péguela en su cliente de correo.", "ok"); },
        function () { copyFallback(); }
      );
    } else {
      copyFallback();
    }
  }

  // Alternativa cuando ClipboardItem no está disponible (ej. file://).
  function copyFallback() {
    var sel = window.getSelection();
    var range = document.createRange();
    range.selectNodeContents($("preview"));
    sel.removeAllRanges();
    sel.addRange(range);
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    sel.removeAllRanges();
    if (ok) setStatus("Firma copiada desde la vista previa.", "ok");
    else setStatus("No se pudo copiar automáticamente. Use 'Descargar HTML' o copie el código manualmente.", "err");
  }

  // ── Descargar HTML de la firma ──
  function downloadHtml() {
    var d = getData();
    if (validate(d).name) { setStatus("Complete el nombre antes de descargar.", "err"); return; }
    var doc =
      "<!DOCTYPE html>\n<html lang=\"es\"><head><meta charset=\"utf-8\"></head><body>\n" +
      $("htmlCode").value +
      "\n</body></html>\n";
    var blob = new Blob([doc], { type: "text/html;charset=utf-8" });
    var safe = (d.name || "firma").replace(/[^\w\-]+/g, "_");
    triggerDownload(blob, "firma_" + safe + ".html");
    setStatus("Archivo de firma descargado.", "ok");
  }

  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ── Perfiles (localStorage) ──
  function loadProfiles() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}"); }
    catch (e) { return {}; }
  }
  function saveProfiles(p) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); return true; }
    catch (e) { return false; }
  }

  function currentProfileData() {
    var d = getData();
    d.template = state.template;
    d.color = state.color;
    d.short = state.short;
    return d;
  }

  function saveProfile() {
    var d = getData();
    if (validate(d).name) { setStatus("Complete el nombre antes de guardar el perfil.", "err"); return; }
    var name = prompt("Nombre del perfil:", d.name);
    if (!name) return;
    var p = loadProfiles();
    if (p[name] && !confirm("Ya existe un perfil '" + name + "'. ¿Reemplazar?")) return;
    p[name] = currentProfileData();
    if (saveProfiles(p)) { renderProfiles(); setStatus("Perfil '" + name + "' guardado.", "ok"); }
    else setStatus("No se pudo guardar (almacenamiento no disponible).", "err");
  }

  function applyProfile(name) {
    var p = loadProfiles();
    var d = p[name];
    if (!d) return;
    setData(d);
    state.template = d.template || "executive";
    state.color = d.color || "#155e75";
    state.short = !!d.short;
    syncControls();
    render();
    setStatus("Perfil '" + name + "' cargado.", "ok");
  }

  function deleteProfile(name) {
    if (!confirm("¿Eliminar el perfil '" + name + "'? Esta acción no se puede deshacer.")) return;
    var p = loadProfiles();
    delete p[name];
    saveProfiles(p);
    renderProfiles();
    setStatus("Perfil '" + name + "' eliminado.", "ok");
  }

  function renderProfiles() {
    var box = $("profiles");
    var p = loadProfiles();
    var names = Object.keys(p);
    if (!names.length) {
      box.innerHTML = '<span style="font-size:13px;color:#5b6573;">Sin perfiles guardados.</span>';
      return;
    }
    box.innerHTML = "";
    names.forEach(function (name) {
      var pill = document.createElement("span");
      pill.className = "profile-pill";
      var label = document.createElement("span");
      label.textContent = name;
      var use = document.createElement("button");
      use.type = "button"; use.textContent = "Usar";
      use.addEventListener("click", function () { applyProfile(name); });
      var del = document.createElement("button");
      del.type = "button"; del.className = "del"; del.textContent = "✕";
      del.setAttribute("aria-label", "Eliminar perfil " + name);
      del.addEventListener("click", function () { deleteProfile(name); });
      pill.appendChild(label); pill.appendChild(use); pill.appendChild(del);
      box.appendChild(pill);
    });
  }

  // ── Sincroniza controles visuales con el estado ──
  function syncControls() {
    document.querySelectorAll("[data-template]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-template") === state.template ? "true" : "false");
    });
    $("shortToggle").setAttribute("aria-pressed", state.short ? "true" : "false");
    $("colorPicker").value = state.color;
    $("colorHex").value = state.color;
  }

  // ── Inicialización ──
  function init() {
    // Eventos de campos
    FIELDS.forEach(function (f) { $(f).addEventListener("input", render); });

    // Plantillas
    document.querySelectorAll("[data-template]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.template = b.getAttribute("data-template");
        syncControls(); render();
      });
    });

    // Firma breve
    $("shortToggle").addEventListener("click", function () {
      state.short = !state.short; syncControls(); render();
    });

    // Color
    $("colorPicker").addEventListener("input", function () {
      state.color = $("colorPicker").value; $("colorHex").value = state.color; render();
    });
    $("colorHex").addEventListener("input", function () {
      var v = $("colorHex").value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) { state.color = v; $("colorPicker").value = v; render(); }
    });

    // Imágenes
    $("photo").addEventListener("change", function () { handleImage("photo", "photo"); });
    $("logo").addEventListener("change", function () { handleImage("logo", "logo"); });
    $("photoClear").addEventListener("click", function () { clearImage("photo"); });
    $("logoClear").addEventListener("click", function () { clearImage("logo"); });

    // Acciones
    $("copyBtn").addEventListener("click", copySignature);
    $("downloadBtn").addEventListener("click", downloadHtml);
    $("saveProfileBtn").addEventListener("click", saveProfile);
    $("darkToggle").addEventListener("click", function () {
      state.dark = !state.dark;
      $("previewFrame").classList.toggle("dark", state.dark);
      $("darkToggle").setAttribute("aria-pressed", state.dark ? "true" : "false");
    });

    // Campos vacíos al iniciar; las indicaciones van como placeholder en el HTML.
    syncControls();
    renderProfiles();
    render();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
