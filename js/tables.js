/* ============================================================
   TABLES.JS
   Utilidades de tablas para el Editor Markdown

   - Botón "Anchos": editor visual de @width en la fila separadora
       |---|---|  →  |@width=50; --- | @width=50; --- |

   - Botón "Agrupar": agrupar celdas seleccionadas en tablas:
       · Horizontal:  @cols=N:
       · Vertical:    @rows=N:
       · Rectángulo:  @cols=N:@rows=M:

     Ejemplos:

       |@cols=2: CELDA COMBINADA| 
       | --- | --- |
       | CELDA 2 | CELDA 3 |

       |@rows=2: CELDA COMBINADA| CELDA 2|
       |---|---|
       |CELDA 3| CELDA 4|

       |@cols=2:@rows=2: CELDA|   CELDA 3  |
       |-----|-----|-----|
       |                CELDA 4   |
       | CELDA 5 | CELDA 6 | CELDA 7 |
============================================================ */

/* ============================================================
   GESTOR DE ANCHOS: @width=N; en la fila separadora
============================================================ */

const TableWidthManager = {
    textarea: null,
    modal: null,
    inputsContainer: null,
    inputs: [],
    currentLineStart: null,
    currentLineEnd: null,
    currentColumns: [],
    currentPrefix: "",
    currentSuffix: "",

    /* =======================================
       INIT → botón en la toolbar
    ======================================= */
    init() {
        const ta = document.getElementById("markdownText");
        if (!ta) return;
        this.textarea = ta;

        const toolbar =
            document.getElementById("toolbar") ||
            document.querySelector(".toolbar");
        if (!toolbar) return;

        // Botón sólo una vez
        if (!document.getElementById("btnTableWidths")) {
            const btn = document.createElement("button");
            btn.id = "btnTableWidths";
            btn.type = "button";
            btn.textContent = "Anchos";
            btn.title = "Definir anchos de columnas de la tabla";
            toolbar.appendChild(btn);

            // Evitar perder selección al hacer click
            btn.addEventListener("mousedown", (e) => e.preventDefault());
            btn.addEventListener("click", () => this.openForCurrentLine());
        }
    },

    /* =======================================
       Crear modal (una sola vez)
    ======================================= */
    ensureModal() {
        if (this.modal) return;

        const overlay = document.createElement("div");
        overlay.id = "tableWidthModal";
        overlay.style.position = "fixed";
        overlay.style.inset = "0";
        overlay.style.background = "rgba(0,0,0,0.45)";
        overlay.style.display = "none";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.zIndex = "99999";

        overlay.innerHTML = `
            <div style="
                background:white;
                width:420px;
                max-width:95%;
                padding:16px 18px;
                border-radius:10px;
                box-shadow:0 4px 16px rgba(0,0,0,0.3);
                font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                font-size:13px;
            ">
                <h2 style="margin:0 0 8px 0; font-size:16px; color:#111827;">
                    Anchos de columnas
                </h2>
                <p style="margin:0 0 8px 0; font-size:12px; color:#6b7280;">
                    Ajusta el ancho de cada columna en %. Si dejas un campo vacío,
                    no se añadirá <code>@width</code> en esa columna.
                </p>

                <div id="twColsContainer" style="
                    max-height:220px;
                    overflow:auto;
                    border:1px solid #e5e7eb;
                    border-radius:6px;
                    padding:6px 8px;
                    margin-bottom:10px;
                "></div>

                <div style="display:flex; gap:8px; margin-bottom:8px;">
                    <button id="twEqual" type="button" style="
                        flex:1;
                        padding:6px 8px;
                        border-radius:6px;
                        border:1px solid #3b82f6;
                        background:#dbeafe;
                        cursor:pointer;
                        font-size:12px;
                        font-weight:500;
                    ">
                        Repartir 100% a partes iguales
                    </button>
                </div>

                <div style="display:flex; justify-content:flex-end; gap:8px;">
                    <button id="twCancel" type="button" style="
                        padding:6px 10px;
                        border-radius:6px;
                        border:1px solid #e5e7eb;
                        background:#f3f4f6;
                        cursor:pointer;
                    ">
                        Cancelar
                    </button>
                    <button id="twApply" type="button" style="
                        padding:6px 12px;
                        border-radius:6px;
                        border:none;
                        background:#16a34a;
                        color:white;
                        cursor:pointer;
                        font-weight:500;
                    ">
                        Aplicar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        this.modal = overlay;
        this.inputsContainer = overlay.querySelector("#twColsContainer");

        const btnCancel = overlay.querySelector("#twCancel");
        const btnApply  = overlay.querySelector("#twApply");
        const btnEqual  = overlay.querySelector("#twEqual");

        if (btnCancel) {
            btnCancel.addEventListener("click", () => this.close());
        }
        if (btnApply) {
            btnApply.addEventListener("click", () => this.apply());
        }
        if (btnEqual) {
            btnEqual.addEventListener("click", () => this.distributeEqual());
        }

        // Cerrar al hacer click fuera
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) this.close();
        });
    },

    /* =======================================
       Abrir para la línea actual (|---|---|)
    ======================================= */
    openForCurrentLine() {
        const ta = this.textarea;
        if (!ta) return;

        const value = ta.value || "";
        const pos   = ta.selectionStart != null ? ta.selectionStart : 0;

        // Localizar límites de la línea
        let lineStart = value.lastIndexOf("\n", pos - 1);
        if (lineStart === -1) lineStart = 0;
        else lineStart += 1;

        let lineEnd = value.indexOf("\n", pos);
        if (lineEnd === -1) lineEnd = value.length;

        const lineText = value.slice(lineStart, lineEnd);

        const prefixMatch = lineText.match(/^\s*/);
        const suffixMatch = lineText.match(/\s*$/);
        const prefix = prefixMatch ? prefixMatch[0] : "";
        const suffix = suffixMatch ? suffixMatch[0] : "";
        const trimmed = lineText.trim();

        // Debe ser una fila tipo | ... |
        if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
            alert("Coloca el cursor en la fila separadora de la tabla (---).");
            return;
        }

        // Quitar barras exteriores y trocear por columnas
        const inner = trimmed.slice(1, -1); // sin la primera y última barra
        const rawCells = inner.split("|");

        const columns = [];
        rawCells.forEach((raw) => {
            let cell = raw.trim();
            if (!cell) return;

            let width = null;
            let base  = cell;

            // Detectar @width=N; al principio de la celda
            const m = cell.match(/^@width\s*=\s*([0-9]+)\s*;\s*(.*)$/i);
            if (m) {
                width = parseInt(m[1], 10);
                base = (m[2] || "").trim();
            }

            if (!base) base = "---";

            columns.push({
                base: base,
                width: (width != null && !isNaN(width)) ? width : null
            });
        });

        if (!columns.length) {
            alert("No parece una fila separadora de tabla válida.");
            return;
        }

        this.currentLineStart = lineStart;
        this.currentLineEnd   = lineEnd;
        this.currentColumns   = columns;
        this.currentPrefix    = prefix;
        this.currentSuffix    = suffix;

        this.ensureModal();
        this.populateModal();

        this.modal.style.display = "flex";
    },

    /* =======================================
       Rellenar modal con inputs por columna
    ======================================= */
    populateModal() {
        if (!this.inputsContainer) return;

        this.inputsContainer.innerHTML = "";
        this.inputs = [];

        this.currentColumns.forEach((col, idx) => {
            const row = document.createElement("div");
            row.style.display = "flex";
            row.style.alignItems = "center";
            row.style.gap = "8px";
            row.style.marginBottom = "4px";

            const label = document.createElement("div");
            label.textContent = "Columna " + (idx + 1);
            label.style.flex = "1";
            label.style.fontSize = "12px";
            label.style.color = "#111827";

            const input = document.createElement("input");
            input.type = "number";
            input.min = "0";
            input.step = "1";
            input.placeholder = "%";
            input.style.width = "70px";
            input.style.padding = "3px 5px";
            input.style.borderRadius = "6px";
            input.style.border = "1px solid #cbd5e1";
            input.style.fontSize = "12px";

            if (col.width != null && !isNaN(col.width)) {
                input.value = String(col.width);
            }

            const percent = document.createElement("span");
            percent.textContent = "%";
            percent.style.fontSize = "12px";
            percent.style.color = "#6b7280";

            row.appendChild(label);
            row.appendChild(input);
            row.appendChild(percent);

            this.inputsContainer.appendChild(row);
            this.inputs.push(input);
        });
    },

    /* =======================================
       Repartir 100% a partes iguales
    ======================================= */
    distributeEqual() {
        if (!this.inputs || !this.inputs.length) return;
        const n = this.inputs.length;
        if (!n) return;

        const base = Math.floor(100 / n);
        let rest = 100 - base * n;

        this.inputs.forEach((input, idx) => {
            let val = base;
            if (idx === this.inputs.length - 1) {
                val += rest;
            }
            input.value = String(val);
        });
    },

    /* =======================================
       Aplicar cambios → reescribir línea
    ======================================= */
    apply() {
        const ta = this.textarea;
        if (!ta || this.currentLineStart == null || this.currentLineEnd == null) {
            this.close();
            return;
        }

        const cols = this.currentColumns || [];
        if (!cols.length) {
            this.close();
            return;
        }

        const newCells = cols.map((col, idx) => {
            const base = (col.base && col.base.trim()) ? col.base.trim() : "---";
            let widthStr = "";

            if (this.inputs && this.inputs[idx]) {
                const raw = this.inputs[idx].value != null
                    ? String(this.inputs[idx].value).trim()
                    : "";
                if (raw !== "") {
                    const n = parseInt(raw, 10);
                    if (!isNaN(n) && n > 0) {
                        widthStr = "@width=" + n + "; ";
                    }
                }
            }

            return widthStr + base;
        });

        const newLine =
            this.currentPrefix +
            "|" + " " +
            newCells.join(" | ") +
            " |" +
            this.currentSuffix;

        if (window.UndoManager && typeof UndoManager.saveState === "function") {
            UndoManager.saveState();
        }

        ta.setRangeText(newLine, this.currentLineStart, this.currentLineEnd, "end");

        if (typeof window.updateHighlight === "function") {
            window.updateHighlight();
        }

        const caretPos = this.currentLineStart + newLine.length;
        ta.selectionStart = ta.selectionEnd = caretPos;

        this.close();
    },

    /* =======================================
       Cerrar modal
    ======================================= */
    close() {
        if (this.modal) {
            this.modal.style.display = "none";
        }
    }
};

/* ============================================================
   GESTOR DE AGRUPACIÓN DE CELDAS: @cols / @rows
============================================================ */

const TableMergeManager = {
    textarea: null,

    init() {
        const ta = document.getElementById("markdownText");
        if (!ta) return;
        this.textarea = ta;

        const toolbar =
            document.getElementById("toolbar") ||
            document.querySelector(".toolbar");
        if (!toolbar) return;

        if (!document.getElementById("btnTableMerge")) {
            const btn = document.createElement("button");
            btn.id = "btnTableMerge";
            btn.type = "button";
            btn.textContent = "Agrupar";
            btn.title = "Agrupar celdas de tabla seleccionadas";
            toolbar.appendChild(btn);

            btn.addEventListener("mousedown", (e) => e.preventDefault());
            btn.addEventListener("click", () => this.mergeSelectedCells());
        }
    },

    /* =======================================
       Agrupar celdas seleccionadas
    ======================================= */
    mergeSelectedCells() {
        const ta = this.textarea;
        if (!ta) return;

        const text = ta.value || "";
        let selStart = ta.selectionStart != null ? ta.selectionStart : 0;
        let selEnd   = ta.selectionEnd != null   ? ta.selectionEnd   : selStart;

        if (selEnd < selStart) {
            const tmp = selStart;
            selStart = selEnd;
            selEnd = tmp;
        }

        if (selStart === selEnd) {
            alert("Selecciona al menos dos celdas de una tabla para agrupar.");
            return;
        }

        // -----------------------------------
        // Helper: construir metadatos de líneas
        // -----------------------------------
        function buildLinesMeta(txt) {
            const lines = [];
            let lineStart = 0;
            let idx = 0;
            const len = txt.length;

            while (idx <= len) {
                if (idx === len || txt[idx] === "\n") {
                    const lineEnd = idx;
                    const lineText = txt.slice(lineStart, lineEnd);
                    const lineIndex = lines.length;
                    lines.push({
                        index: lineIndex,
                        start: lineStart,
                        end: lineEnd,
                        text: lineText
                    });
                    lineStart = idx + 1;
                }
                idx++;
            }

            return lines;
        }

        // -----------------------------------
        // Helper: parsear fila de tabla
        // -----------------------------------
        function getRowMeta(lineObj) {
            const lineText = lineObj.text;
            const lineStart = lineObj.start;
            const lineIndex = lineObj.index;

            const firstNonSpace = lineText.search(/\S/);
            if (firstNonSpace === -1) return null;
            if (lineText[firstNonSpace] !== "|") return null;

            const bars = [];
            for (let i = 0; i < lineText.length; i++) {
                if (lineText[i] === "|") {
                    bars.push(i);
                }
            }
            if (bars.length < 2) return null;

            const cells = [];
            for (let k = 0; k < bars.length - 1; k++) {
                const cellStart = bars[k] + 1;
                const cellEnd   = bars[k + 1];
                if (cellEnd < cellStart) continue;

                const raw = lineText.slice(cellStart, cellEnd);
                const content = raw.replace(/\r/g, "").trim();

                const globalStart = lineStart + cellStart;
                const globalEnd   = lineStart + cellEnd;

                cells.push({
                    index: k,
                    raw: raw,
                    content: content,
                    globalStart: globalStart,
                    globalEnd: globalEnd
                });
            }

            if (!cells.length) return null;

            // ¿Es fila separadora (---, :---:, etc.)?
            const isSeparator = cells.every((cell) => {
                const t = cell.content;
                if (!t) return false;
                return /^:?-{3,}:?$/.test(t);
            });

            return {
                lineIndex: lineIndex,
                start: lineStart,
                end: lineStart + lineText.length,
                text: lineText,
                cells: cells,
                isSeparator: isSeparator
            };
        }

        const lines = buildLinesMeta(text);

        // -----------------------------------
        // Recoger celdas seleccionadas en filas de tabla
        // (ignorando las filas separadoras tipo |---|)
        // -----------------------------------
        const tableLines = new Map(); // lineIndex -> rowMeta
        const selectedCells = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Si la selección no pasa por esta línea, saltar rápido
            if (selEnd <= line.start || selStart >= line.end) continue;

            const rowMeta = getRowMeta(line);
            if (!rowMeta) continue;

            tableLines.set(i, rowMeta);

            if (rowMeta.isSeparator) {
                // No queremos seleccionar celdas del separador
                continue;
            }

            rowMeta.cells.forEach((cell) => {
                // ¿Intersección de selección con la celda?
                if (selEnd <= cell.globalStart || selStart >= cell.globalEnd) {
                    return;
                }
                selectedCells.push({
                    lineIndex: i,
                    cellIndex: cell.index
                });
            });
        }

        if (selectedCells.length < 2) {
            alert("Selecciona al menos dos celdas (no sólo la línea separadora) para agrupar.");
            return;
        }

        // -----------------------------------
        // Comprobar que es un bloque rectangular
        // -----------------------------------
        const rowSet = new Set();
        const colSet = new Set();
        const keySet = new Set();

        selectedCells.forEach((c) => {
            rowSet.add(c.lineIndex);
            colSet.add(c.cellIndex);
            keySet.add(c.lineIndex + ":" + c.cellIndex);
        });

        const rows = Array.from(rowSet).sort((a, b) => a - b);
        const cols = Array.from(colSet).sort((a, b) => a - b);

        // Comprobar todas las combinaciones fila/columna
        let rectangular = true;
        for (let r of rows) {
            for (let c of cols) {
                if (!keySet.has(r + ":" + c)) {
                    rectangular = false;
                    break;
                }
            }
            if (!rectangular) break;
        }

        if (!rectangular) {
            alert("La selección de celdas debe formar un bloque rectangular dentro de una misma tabla.");
            return;
        }

        const rowSpan = rows.length;
        const colSpan = cols.length;

        // Fila/celda superior izquierda del bloque
        const topRowIndex = rows[0];
        const leftColIndex = cols[0];

        const topRowMeta = tableLines.get(topRowIndex);
        if (!topRowMeta) {
            alert("No se ha podido localizar la fila principal de la selección.");
            return;
        }

        const mainCell = topRowMeta.cells.find((c) => c.index === leftColIndex);
        if (!mainCell) {
            alert("No se ha podido localizar la celda principal de la selección.");
            return;
        }

        const originalMainContent = mainCell.content || "";

        // Prefijo con @cols / @rows
        let attr = "";
        if (colSpan > 1) {
            attr += "@cols=" + colSpan + ":";
        }
        if (rowSpan > 1) {
            attr += "@rows=" + rowSpan + ":";
        }

        let newMainContent = attr;
        if (originalMainContent) {
            if (attr) {
                newMainContent += " " + originalMainContent.trim();
            } else {
                newMainContent = originalMainContent.trim();
            }
        }

        // -----------------------------------
        // Construir nuevo texto de todas las líneas
        // -----------------------------------
        const newLinesText = lines.map((l) => l.text);

        rows.forEach((rowIndex) => {
            const rowMeta = tableLines.get(rowIndex);
            if (!rowMeta) return;
            if (rowMeta.isSeparator) return; // En teoría no debería estar en `rows`

            const cellContents = rowMeta.cells.map((c) => c.content);

            cols.forEach((colIndex) => {
                if (rowIndex === topRowIndex && colIndex === leftColIndex) {
                    // Celda principal
                    cellContents[colIndex] = newMainContent;
                } else {
                    // Celdas "tapadas" por el span → vacías
                    cellContents[colIndex] = "";
                }
            });

            const rebuiltLine =
                "|" +
                cellContents
                    .map((content) => {
                        const t = (content || "").trim();
                        return " " + t + " ";
                    })
                    .join("|") +
                "|";

            newLinesText[rowIndex] = rebuiltLine;
        });

        const newText = newLinesText.join("\n");

        if (window.UndoManager && typeof UndoManager.saveState === "function") {
            UndoManager.saveState();
        }

        ta.value = newText;

        // Poner el cursor al inicio de la fila superior del bloque
        let caretPos = 0;
        for (let i = 0; i < topRowIndex; i++) {
            caretPos += newLinesText[i].length + 1; // +1 por el \n
        }
        ta.selectionStart = ta.selectionEnd = caretPos;

        if (typeof window.updateHighlight === "function") {
            window.updateHighlight();
        }
    }
};

/* ============================================================
   BOOTSTRAP AUTOMÁTICO
============================================================ */

(function () {
    function startTables() {
        TableWidthManager.init();
        TableMergeManager.init();
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startTables);
    } else {
        startTables();
    }
})();

window.TableWidthManager = TableWidthManager;
window.TableMergeManager = TableMergeManager;
