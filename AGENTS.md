# Instrucciones para agentes

Este repositorio contiene un editor Markdown orientado a la inserción de tesauros y reglas especiales. A continuación se describen sus funcionalidades principales para facilitar futuras contribuciones.

## Estructura y funcionalidades
- **`index.html`** arma la página del editor con un panel lateral de acciones rápidas (nuevo, pegar, copiar, descargar Markdown, exportar/importar proyecto) y un área central con la barra de formato (negrita, cursiva, subrayado, encabezados H1/H2, listas, cita, bloque de código y tabla) más el textarea principal.
- **`js/editormarkdown.js`**
  - Gestiona exportar/importar proyectos combinando el Markdown actual con los tesauros almacenados en `DataTesauro.campos`.
  - Implementa un gestor de deshacer/rehacer que registra cambios por tecleo, acciones de la barra y pegados.
  - Aplica formatos Markdown según el botón de la barra o la selección actual (negrita, cursiva, subrayado con `<u>`, títulos H1/H2, listas ordenadas y sin ordenar, cita, bloque de código y creación de tablas básicas).
  - Controla botones laterales: limpiar el editor, pegar desde el portapapeles, copiar el Markdown y descargarlo como `.md`.
  - Limpia pegados procedentes de Word convirtiéndolos a Markdown (incluidas tablas) tras eliminar estilos y metadatos propios de Word.
  - Convierte tablas en texto plano con espacios múltiples a sintaxis Markdown y sincroniza un overlay de resaltado.
  - Pinta un resaltado visual para bloques `{{#section ...}}`, tesauros `{{personalized ...}}`, fragmentos `{{definition ...}}` y etiquetas LET mostrando errores de anidado/sintaxis y ofrece toggles para activar/desactivar el resaltado de secciones, tesauros, LET y Markdown parcial.
  - Mapea portapapeles y desplazamiento del textarea con la capa de resaltado y soporta atajos de teclado Ctrl+Z/Ctrl+Y.
- **`js/sections.js`**
  - Añade un botón "Sections" que abre un modal para construir bloques `{{#section ...}} ... {{/section}}` con grupos y subcondiciones anidadas usando AND/OR.
  - Permite nombrar la sección, elegir operadores por grupo/subcondición y seleccionar campos de tesauro tipo selector, sí/no, número o moneda con sus comparadores (`==`, `!=`, `>`, `<`, `>=`, `<=`).
  - Inserta o edita el bloque en la posición seleccionada respetando el formato elegido en el modal.
- **`js/let.js`**
  - Crea el botón "LET" que inserta o edita bloques `{{let | reference: personalized.REF | result: FORMULA}}` para cálculos basados en tesauros numéricos/moneda/sí_no y variables definidas.
  - El modal permite escoger el tesauro destino, escribir la fórmula con alias amigables, usar barras de operadores/booleanos y validar las referencias.
  - Gestiona el modo edición cuando el cursor está dentro de un bloque LET y sincroniza los alias con referencias `personalized.` o `variable.`.
- **`js/definition.js`**
  - Añade el botón "Definition" para crear variables independientes mediante bloques `{{definition | reference: REF | type: numeric|boolean | value: ...}}`.
  - Inserta siempre las definiciones al inicio del documento (debajo de las existentes) y ofrece un modal para elegir referencia, tipo y valor (numérico o booleano).
- **`js/tables.js`**
  - Proporciona utilidades avanzadas para tablas Markdown:
    - Botón "Anchos" que abre un editor visual para añadir atributos `@width` por columna en la fila separadora.
    - Botón "Agrupar" para combinar celdas horizontales, verticales o en rectángulo usando marcas `@cols` y `@rows`.
  - Detecta la tabla bajo el cursor, ajusta prefijos/sufijos y actualiza el textarea con la sintaxis extendida.
- **Tesauros (`js/datatesauro_md.js` y `js/tesauromanager_md.js`)**
  - `datatesauro_md.js` crea un botón flotante para abrir un panel lateral donde se listan, agrupan y gestionan campos de tesauro; permite arrastrarlos o insertarlos con un botón (`{{personalized | reference: ...}}`), marcar un tesauro seleccionado como no editable y acceder al gestor completo.
  - `tesauromanager_md.js` implementa el gestor completo en un modal de pantalla completa: tabla editable de tesauros, importación masiva desde texto o Markdown, referencia cruzada, exportación en CSV (incluyendo datos de entidad/actividad) y sincronización con `DataTesauro.campos`.

## Notas
- No hay instrucciones especiales de estilo ni pruebas obligatorias; sigue convenciones existentes al modificar este repositorio.
