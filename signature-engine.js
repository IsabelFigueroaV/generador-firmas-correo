/* signature-engine.js
 * Motor de generación de firmas de correo. Lógica pura, sin DOM.
 * Salida conservadora: tablas, estilos inline, bgcolor + <font color>,
 * iconos Unicode seguros, mso-line-height-rule. Compatible con
 * Outlook Desktop (motor Word), Outlook Web, Gmail, dark mode y móvil.
 * Funciona en Node (module.exports) y navegador (window.SignatureEngine).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SignatureEngine = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Cadena de respaldo amplia para clientes de correo.
  const FONT_STACK = "'Aptos','Segoe UI',Arial,Helvetica,sans-serif";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  // Normaliza un teléfono a formato tel: (solo dígitos y +).
  function telHref(phone) {
    const cleaned = String(phone || "").replace(/[^\d+]/g, "");
    return cleaned;
  }

  // Normaliza una URL para href (agrega https:// si falta esquema).
  function normalizeUrl(url) {
    const v = String(url || "").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v)) return v;
    return "https://" + v;
  }

  // Texto visible de una URL (sin esquema ni barra final).
  function displayUrl(url) {
    return String(url || "")
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/$/, "");
  }

  /* makeIcon — celda de icono compatible con Outlook Desktop y dark mode.
   * Usa <table><td bgcolor> + <font color> + carácter Unicode seguro. */
  function makeIcon(type, color) {
    const c = escapeAttr(color || "#155e75");
    const map = {
      email: { sym: "&#9993;", fs: "11", fw: "normal" }, // ✉
      phone: { sym: "&#9742;", fs: "11", fw: "normal" }, // ☎
      web: { sym: "&#8853;", fs: "12", fw: "bold" }, // ⊕
      linkedin: { sym: "in", fs: "9", fw: "bold" },
      location: { sym: "&#9678;", fs: "11", fw: "normal" }, // ◎
    };
    const cfg = map[type];
    if (!cfg) return "";
    return (
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" ' +
      'style="border-collapse:collapse;">' +
      "<tr>" +
      '<td bgcolor="' +
      c +
      '" width="18" height="18" align="center" valign="middle" ' +
      'style="width:18px;height:18px;background-color:' +
      c +
      ";border-radius:3px;text-align:center;vertical-align:middle;" +
      "line-height:18px;mso-line-height-rule:exactly;font-size:" +
      cfg.fs +
      "px;font-weight:" +
      cfg.fw +
      ";font-family:Arial,Helvetica,sans-serif;color:#ffffff;\">" +
      '<font color="#ffffff" face="Arial,Helvetica,sans-serif" size="1">' +
      cfg.sym +
      "</font>" +
      "</td>" +
      "</tr>" +
      "</table>"
    );
  }

  // Fila de contacto: icono + enlace/texto. nowrap evita quiebre en celular.
  function contactRow(iconType, color, innerHtml, nowrap) {
    const nw = nowrap
      ? ' nowrap="nowrap"'
      : "";
    const wsStyle = nowrap ? "white-space:nowrap;" : "";
    return (
      "<tr>" +
      '<td valign="middle" style="padding:2px 8px 2px 0;vertical-align:middle;">' +
      makeIcon(iconType, color) +
      "</td>" +
      '<td' + nw + ' valign="middle" style="padding:2px 0;vertical-align:middle;' +
      wsStyle +
      "font-family:" +
      FONT_STACK +
      ";font-size:12px;line-height:18px;color:#333333;\">" +
      innerHtml +
      "</td>" +
      "</tr>"
    );
  }

  function link(href, text, color) {
    return (
      '<a href="' +
      escapeAttr(href) +
      '" style="color:' +
      escapeAttr(color) +
      ';text-decoration:none;white-space:nowrap;font-family:' +
      FONT_STACK +
      ';font-size:12px;">' +
      '<font color="' +
      escapeAttr(color) +
      '">' +
      escapeHtml(text) +
      "</font></a>"
    );
  }

  // Construye las filas de contacto según los datos presentes.
  function buildContactRows(d, color, opts) {
    const rows = [];
    const textColor = "#333333";
    if (d.email) {
      rows.push(
        contactRow(
          "email",
          color,
          link("mailto:" + d.email, d.email, textColor),
          true
        )
      );
    }
    if (d.phone) {
      rows.push(
        contactRow(
          "phone",
          color,
          link("tel:" + telHref(d.phone), d.phone, textColor),
          true
        )
      );
    }
    if (d.website) {
      rows.push(
        contactRow(
          "web",
          color,
          link(normalizeUrl(d.website), displayUrl(d.website), color),
          true
        )
      );
    }
    if (d.linkedin) {
      rows.push(
        contactRow(
          "linkedin",
          color,
          link(normalizeUrl(d.linkedin), displayUrl(d.linkedin), color),
          true
        )
      );
    }
    if (d.address && !opts.short) {
      rows.push(
        contactRow(
          "location",
          color,
          '<font color="' + textColor + '">' + escapeHtml(d.address) + "</font>",
          false
        )
      );
    }
    return rows.join("");
  }

  // Bloque de identidad (nombre, cargo, empresa, área).
  function identityBlock(d, color) {
    let html =
      '<div style="font-family:' +
      FONT_STACK +
      ';font-size:16px;line-height:20px;font-weight:bold;color:#1a1a1a;">' +
      '<font color="#1a1a1a">' +
      escapeHtml(d.name) +
      "</font></div>";
    if (d.title) {
      html +=
        '<div style="font-family:' +
        FONT_STACK +
        ';font-size:13px;line-height:18px;color:' +
        escapeAttr(color) +
        ';">' +
        '<font color="' +
        escapeAttr(color) +
        '">' +
        escapeHtml(d.title) +
        "</font></div>";
    }
    const org = [d.company, d.area].filter(Boolean).map(escapeHtml).join(" — ");
    if (org) {
      html +=
        '<div style="font-family:' +
        FONT_STACK +
        ';font-size:12px;line-height:18px;color:#555555;">' +
        '<font color="#555555">' +
        org +
        "</font></div>";
    }
    return html;
  }

  function photoCell(d) {
    if (!d.photo) return "";
    const size = 88;
    return (
      '<td style="padding-right:14px;vertical-align:middle;" valign="middle">' +
      '<img src="' +
      escapeAttr(d.photo) +
      '" width="' +
      size +
      '" height="' +
      size +
      '" alt="' +
      escapeAttr(d.name || "Foto") +
      '" style="display:block;border:0;width:' +
      size +
      "px;height:" +
      size +
      'px;border-radius:50%;object-fit:cover;">' +
      "</td>"
    );
  }

  function logoBlock(d) {
    if (!d.logo) return "";
    return (
      '<div style="margin-top:8px;">' +
      '<img src="' +
      escapeAttr(d.logo) +
      '" alt="' +
      escapeAttr((d.company || "Logo") + " logo") +
      '" height="34" style="display:block;border:0;height:34px;max-width:200px;">' +
      "</div>"
    );
  }

  // ── Plantilla executive: foto circular + borde izquierdo de color ──
  function templateExecutive(d, color, opts) {
    const photo = photoCell(d);
    const dividerStyle = photo
      ? "border-left:2px solid " + color + ";padding-left:14px;"
      : "";
    return (
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" ' +
      'style="border-collapse:collapse;font-family:' +
      FONT_STACK +
      ';">' +
      "<tr>" +
      photo +
      '<td style="' +
      dividerStyle +
      'vertical-align:middle;" valign="middle">' +
      identityBlock(d, color) +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" ' +
      'style="border-collapse:collapse;margin-top:6px;">' +
      buildContactRows(d, color, opts) +
      "</table>" +
      logoBlock(d) +
      "</td>" +
      "</tr>" +
      "</table>"
    );
  }

  // ── Plantilla minimal: solo borde izquierdo, sin foto ──
  function templateMinimal(d, color, opts) {
    return (
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" ' +
      'style="border-collapse:collapse;font-family:' +
      FONT_STACK +
      ';">' +
      "<tr>" +
      '<td bgcolor="' +
      escapeAttr(color) +
      '" width="3" style="width:3px;background-color:' +
      escapeAttr(color) +
      ';font-size:0;line-height:0;">&nbsp;</td>' +
      '<td style="padding-left:12px;vertical-align:middle;" valign="middle">' +
      identityBlock(d, color) +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" ' +
      'style="border-collapse:collapse;margin-top:6px;">' +
      buildContactRows(d, color, opts) +
      "</table>" +
      logoBlock(d) +
      "</td>" +
      "</tr>" +
      "</table>"
    );
  }

  // ── Plantilla card: marco con borde superior de color ──
  function templateCard(d, color, opts) {
    return (
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" ' +
      'style="border-collapse:collapse;font-family:' +
      FONT_STACK +
      ";border:1px solid #e2e2e2;\">" +
      "<tr>" +
      '<td bgcolor="' +
      escapeAttr(color) +
      '" height="4" style="height:4px;background-color:' +
      escapeAttr(color) +
      ';font-size:0;line-height:0;">&nbsp;</td>' +
      "</tr>" +
      "<tr>" +
      '<td style="padding:14px 16px;vertical-align:top;">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">' +
      "<tr>" +
      photoCell(d) +
      '<td valign="middle" style="vertical-align:middle;">' +
      identityBlock(d, color) +
      "</td>" +
      "</tr>" +
      "</table>" +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" ' +
      'style="border-collapse:collapse;margin-top:8px;">' +
      buildContactRows(d, color, opts) +
      "</table>" +
      logoBlock(d) +
      "</td>" +
      "</tr>" +
      "</table>"
    );
  }

  const TEMPLATES = {
    executive: templateExecutive,
    minimal: templateMinimal,
    card: templateCard,
  };

  // Versión de texto plano de la firma.
  function buildPlainText(d, opts) {
    const lines = [];
    if (d.name) lines.push(d.name);
    if (d.title) lines.push(d.title);
    const org = [d.company, d.area].filter(Boolean).join(" — ");
    if (org) lines.push(org);
    if (d.email) lines.push("Email: " + d.email);
    if (d.phone) lines.push("Tel: " + d.phone);
    if (d.website) lines.push("Web: " + displayUrl(d.website));
    if (d.linkedin) lines.push("LinkedIn: " + displayUrl(d.linkedin));
    if (d.address && !opts.short) lines.push(d.address);
    return lines.join("\n");
  }

  /* buildSignature(data, options)
   * options.template: "executive" | "minimal" | "card"
   * options.color: color de marca (hex)
   * options.short: firma breve (omite dirección)
   * Devuelve { html, text }. */
  function buildSignature(data, options) {
    const d = data || {};
    const opts = options || {};
    if (!d.name || !String(d.name).trim()) {
      throw new Error("El nombre es obligatorio.");
    }
    const color = opts.color || "#155e75";
    const tpl = TEMPLATES[opts.template] || TEMPLATES.executive;
    return {
      html: tpl(d, color, opts),
      text: buildPlainText(d, opts),
    };
  }

  return {
    FONT_STACK,
    escapeHtml,
    makeIcon,
    normalizeUrl,
    displayUrl,
    telHref,
    buildSignature,
    buildPlainText,
    templates: Object.keys(TEMPLATES),
  };
});
