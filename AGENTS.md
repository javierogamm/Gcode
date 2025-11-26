# Instrucciones para agentes

Este repositorio contiene un editor Markdown orientado a la inserción de tesauros y reglas especiales. A continuación se describe la estructura actual para facilitar futuras contribuciones.

## Estructura y funcionalidades
- **`index.html`** arma la página del editor con un panel lateral de acciones rápidas (nuevo, pegar, copiar, descargar Markdown, exportar/importar proyecto) y un área central con la barra de formato (negrita, cursiva, subrayado, encabezados H1/H2, listas, cita, bloque de código y tabla) más el textarea principal.
- **CSS (`css/main.css`)** centraliza los estilos del editor, incluyendo botones, paneles, modales, resaltados y utilidades visuales.
- **Carpetas JavaScript**
  - `js/core`: `editormarkdown.js` gestiona exportar/importar proyectos combinando el Markdown actual con `DataTesauro.campos`, controla el historial deshacer/rehacer, aplica formatos básicos, conecta los botones laterales, limpia pegados de Word, convierte tablas a Markdown y mantiene el overlay de resaltado/atajos.
  - `js/features`: `sections.js`, `let.js`, `definition.js` y `tables.js` añaden modales y botones para secciones, bloques LET, definiciones y utilidades avanzadas de tablas (anchos y agrupaciones) respetando la selección del usuario.
  - `js/tesauro`: `datatesauro_md.js` crea el panel lateral de tesauros con inserción y `tesauromanager_md.js` implementa el gestor completo (importación masiva, exportación CSV, edición y sincronización con `DataTesauro.campos`).
  - `js/experimental`: `GestionaTranslator.js` y `gestionacode.js` albergan pruebas de editor visual no cargadas por defecto.

## Notas
- No hay instrucciones especiales de estilo ni pruebas obligatorias; sigue convenciones existentes al modificar este repositorio.
