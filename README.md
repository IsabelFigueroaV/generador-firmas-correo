# Generador de Firmas de Correo

Aplicacion web local para crear firmas de correo en HTML y prepararlas para usar en Gmail en computador, Outlook u otros servicios de correo.

La herramienta permite completar datos de contacto, elegir una plantilla, definir un color de marca, incluir fotografia y logotipo, y copiar o descargar la firma generada.

## Caracteristicas

- Tres plantillas: Ejecutiva, Minimal y Tarjeta.
- Firma breve para omitir informacion secundaria.
- Personalizacion del color de marca.
- Fotografia circular y logotipo corporativo.
- Optimizacion local de imagenes para mantener firmas livianas.
- Enlaces clicleables a correo, telefono, sitio web y LinkedIn.
- Vista previa en modo claro u oscuro, elegida por la persona usuaria.
- Copia de la firma como HTML enriquecido.
- Descarga de la firma en formato HTML.
- Version de texto plano disponible.
- Perfiles guardados localmente en el navegador.
- Sin dependencias externas ni envio de datos a servidores.

## Tecnologias

- HTML
- CSS
- JavaScript

## Uso

1. Descarga o clona el repositorio.
2. Abre `generador-firmas.html` con doble clic en tu navegador.
3. Completa los campos de contacto.
4. Carga una fotografia o logotipo si lo necesitas.
5. Selecciona una plantilla y color de marca.
6. Presiona `Copiar firma` para pegarla en Gmail, Outlook u otro cliente de correo, o `Descargar HTML` para guardarla.

## Privacidad

La aplicacion funciona localmente en el navegador. Los datos e imagenes no se envian a ningun servidor. Los perfiles se guardan solo en el navegador y equipo donde se crean.

## Estructura

```text
generador-firmas/
|-- generador-firmas.html
|-- LEEME.txt
`-- codigo-fuente/
    |-- signature-engine.js
    |-- app.js
    |-- styles.css
    |-- test_firma.mjs
    `-- test_ui.mjs
```

## Pruebas

Si tienes Node.js instalado, desde la carpeta `codigo-fuente` puedes ejecutar:

```bash
node test_firma.mjs
node test_ui.mjs
```

## Autora

Isabel Figueroa
