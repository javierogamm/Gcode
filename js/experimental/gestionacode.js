/* ============================================================
   GESTIONA CODE — Versión blindada para editor sincronizado
   Mantiene el cursor, no se pierde la cajita verde
============================================================ */
console.log("⚙️ GestionaCode (versión blindada — cursor y cajita persistentes)");

const GestionaCode = {
    lastRange: null,
    inserting: false, // 🧩 Flag de protección para evitar reseteos

    init() {
        this.visualEditor = document.getElementById("visualEditor");
        this.markdownText = document.getElementById("markdownText");

        // Crear botón
        const toolbar = document.getElementById("toolbar");
        if (toolbar && !document.getElementById("btnInsertField")) {
            const div = document.createElement("div");
            div.className = "field-inserter";
            div.innerHTML = `<button id="btnInsertField" class="btn-gestionacode">➕ Insertar campo</button>`;
            toolbar.insertAdjacentElement("afterend", div);
        }

        document.getElementById("btnInsertField").addEventListener("click", () => this.insertField());
        this.enableDeletion();
        this.trackCursor();
    },

    /* ============================================================
       Guardar última selección del cursor
    ============================================================= */
    trackCursor() {
        const ed = this.visualEditor;
        ed.addEventListener("mouseup", () => this.saveSelection());
        ed.addEventListener("keyup", () => this.saveSelection());
        ed.addEventListener("input", () => this.saveSelection());
    },

    saveSelection() {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && this.visualEditor.contains(sel.anchorNode)) {
            this.lastRange = sel.getRangeAt(0).cloneRange();
        }
    },

/* ============================================================
   Inserta una cajita verde donde esté el cursor
============================================================ */
insertField() {
    const ref = prompt("Referencia del campo:", "ReferenciaTesauro");
    if (!ref) return;
    const name = prompt("Nombre visible:", "Nombre del campo");
    if (!name) return;

    // Evitar que el listener del editor se dispare
    this.inserting = true;

    // Crear cajita verde
    const span = document.createElement("span");
    span.className = "gc-field";
    span.dataset.reference = ref.trim();
    span.dataset.name = name.trim();
    span.textContent = `[${name.trim()}]`;
    span.contentEditable = "false";

    let range;

    // Si hay rango guardado, úsalo
    if (this.lastRange) {
        range = this.lastRange.cloneRange();
    } else {
        range = document.createRange();
        range.selectNodeContents(this.visualEditor);
        range.collapse(false);
    }

    range.insertNode(span);

    // Recolocar cursor después de la cajita
    range.setStartAfter(span);
    range.setEndAfter(span);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    // Guardar el rango actualizado
    this.lastRange = range.cloneRange();

    console.log("✅ Cajita insertada visualmente en posición correcta");

    // === ACTUALIZAR SOLO EL TEXTO DEL MARKDOWN DERECHO mediante el traductor ===
    const md = GestionaTranslator.serializeVisualToCode(this.visualEditor);
    this.markdownText.value = md;
    console.log("🟩 Markdown actualizado desde visual via Translator");

    // ✅ Evitar que el editor sobrescriba
    setTimeout(() => {
        this.inserting = false;
    }, 100);
},


    /* ============================================================
       Evita que el editor elimine las cajitas al sincronizar
    ============================================================= */
    stopAutoSync() {
        if (this.inserting) return true;
        return false;
    },

    /* ============================================================
       Borrar cajita completa
    ============================================================= */
    enableDeletion() {
        this.visualEditor.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" || e.key === "Delete") {
                const sel = window.getSelection();
                if (!sel || !sel.rangeCount) return;
                const node = sel.anchorNode;
                const field = node && (node.nodeType === 1 ? node : node.parentElement)?.closest?.(".gc-field");
                if (field) {
                    e.preventDefault();
                    field.remove();
                }
            }
        });
    }
};

/* ============================================================
   ESTILOS DE LAS CAJITAS VERDES
============================================================ */
const style = document.createElement("style");
style.textContent = `
.gc-field {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f0fdf4;
  border: 1px dashed #22c55e;
  border-radius: 6px;
  padding: 3px 6px;
  margin: 2px;
  color: #166534;
  font-family: Consolas, monospace;
  user-select: none;
  cursor: default;
}
.gc-field:hover {
  background: #dcfce7;
  border-color: #16a34a;
}
.btn-gestionacode {
  background: #22c55e;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.2s ease;
  font-size: 14px;
}
.btn-gestionacode:hover {
  background: #16a34a;
}
`;
document.head.appendChild(style);

window.addEventListener("DOMContentLoaded", () => GestionaCode.init());
