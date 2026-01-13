# Log de cambios

## v1.3.16 - 2026-01-15
- El modal de doble columna ahora detecta el bloque completo cuando el cursor o la selección están dentro, cargando cada columna en su campo correspondiente.

## v1.3.15 - 2026-01-15
- Se añadió un botón para intercambiar el contenido de las columnas en el modal de doble columna.

## v1.3.14 - 2026-01-08
- Se calcularon los números de línea en base a las líneas visuales para mantenerlos visibles cuando hay saltos automáticos por ajuste de texto.

## v1.3.13 - 2025-03-05
- Se corrigió el scroll de los números de línea para que no se recorten en la parte inferior.

## v1.3.12 - 2025-03-05
- Se sincronizó el desplazamiento de los números de línea con el overlay del editor.

## v1.3.11 - 2025-03-05
- Se ajustó el ancho del gutter para alinear los overlays de resaltado con el texto del editor.

## v1.3.10 - 2025-03-05
- Se añadieron números de línea como overlay sin modificar el layout del editor.
- Se mantuvo el textarea original, ajustando únicamente el padding interno para respetar el gutter.

## v1.3.9 - 2025-03-05
- Se añadió un panel de números de línea sincronizado con el editor Markdown.
- El área de edición ahora integra un contenedor con gutter para mantener alineado el contenido y el resaltado.

## v1.3.8 - 2025-12-29
- El modal de doble columna mantiene el texto seleccionado sin recortes al abrirse desde el botón.
- Se evitó cerrar el modal de doble columna al hacer click fuera de él.

## v1.3.7 - 2025-12-22
- Se añadió un menú contextual al hacer click derecho sobre texto seleccionado para convertirlo en bloque de doble columna.
- El modal de doble columna ahora se abre desde el menú contextual precargando la selección en la columna izquierda.

## v1.3.6 - 2025-12-10
- Se añadió el botón de doble columna con modal amplio para componer columnas izquierda y derecha en sintaxis Gestiona Code.
- Se incorporó el resaltado de columnas con colores propios y un toggle dedicado para mostrar/ocultar el bloque.
- Se mostró la versión de la app en la interfaz principal.

## v1.3.5 - 2025-12-02
- Se revierte el recorrido de inserción de tesauros y el botón secundario asociado en el modal de inicio, dejando el tutorial únicamente con el flujo principal previo.

## v1.2.2 - 2024-06-16
- Se ampliaron los modales de LET y Sections para ofrecer más espacio de trabajo y se ajustaron sus controles para ocupar el ancho disponible.

## v1.2.1 - 2024-06-15
- El selector de referencia del modal LET muestra las variables creadas al elegir "Variable" como destino y permite reutilizarlas directamente.

## v1.2.0 - 2024-06-14
- El generador LET permite elegir si la referencia destino es un tesauro (`personalized.*`) o una variable (`variable.*`), conservando los atajos numéricos para variables definidas.
- En la creación de secciones, el comparador por defecto en los desplegables de condición pasa a ser "==" (igual a).

## v1.1.0 - 2024-06-13
- Se limita la generación automática de referencias de tesauros a un máximo de 40 caracteres en todas las rutas de creación y sugerencias.
- Se añade al Gestor de Tesauros la importación desde archivos CSV exportados (Tesauro.csv obligatorio, Tesauro_Valores.csv y Vinculacion_Tesauros.csv opcionales).
