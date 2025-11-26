/* ============================================================
   DEFINITION.JS
   Crea variables independientes:

   {{definition | reference: REF | type: numeric | value: 10}}
   {{definition | reference: FLAG | type: boolean | value: true}}

   - Botón "Definition" en la toolbar
   - Modal separado del LET
   - Tipos permitidos: numeric / boolean
   - SIEMPRE inserta la definición en la parte superior del editor,
     justo debajo de la última {{definition ...}} existente
============================================================ */

const DefinitionManager = {

    textarea: null,
    btn: null,

    modal: null,
    refInput: null,
    typeSelect: null,
    valueInput: null,
    valueSelectBool: null,
    caretPos: null,

    init() {
        const ta = document.getElementById("markdownText");
        const toolbar =
            document.getElementById("toolbar") ||
            document.querySelector(".toolbar");
        const floatingRow = (window.ensureFloatingActionRow && ensureFloatingActionRow()) || null;

        if (!ta || !toolbar) return;

        this.textarea = ta;

        // === BOTÓN "DEFINITION" ===
        let btn = document.getElementById("btnDefinition");
        if (!btn) {
            btn = document.createElement("button");
            btn.id = "btnDefinition";
            btn.type = "button";
            btn.textContent = "Definition";
            btn.className = "floating-action-btn";

            if (floatingRow) {
                floatingRow.appendChild(btn);
            } else {
                toolbar.appendChild(btn);
            }
        }
        this.btn = btn;

        btn.addEventListener("mousedown", e => e.preventDefault());
        btn.addEventListener("click", () => this.openModal());

        this.createModal();
    },

    /* ============================================================
       MODAL
    ============================================================ */
    createModal() {
        if (this.modal) return;

        const div = document.createElement("div");
        div.id = "definitionModal";
        div.style.position = "fixed";
        div.style.inset = "0";
        div.style.background = "rgba(0,0,0,0.45)";
        div.style.display = "none";
        div.style.alignItems = "center";
        div.style.justifyContent = "center";
        div.style.zIndex = "99999";

        div.innerHTML = `
            <div style="
                background:white;
                padding:18px 20px;
                border-radius:10px;
                box-shadow:0 4px 16px rgba(0,0,0,0.3);
                width:520px;
                max-width:90%;
                font-family:system-ui;
                font-size:14px;
            ">
                <h2 style="margin:0 0 10px 0; font-size:18px; color:#111827;">
                    Definir variable (definition)
                </h2>

                <p style="margin:0 0 12px 0; font-size:12px; color:#6b7280;">
                    Crea una instrucción:
                    <br>
                    <code>{{definition | reference: REF | type: numeric | value: 10}}</code>
                </p>

                <div style="display:flex; flex-direction:column; gap:10px;">
                    <div>
                        <span style="font-size:12px; color:#6b7280;">Referencia</span>
                        <input id="defRefInput" type="text" placeholder="MiVariable" style="
                            width:100%;
                            padding:6px;
                            border-radius:6px;
                            border:1px solid #cbd5e1;
                            font-size:13px;
                        ">
                    </div>

                    <div>
                        <span style="font-size:12px; color:#6b7280;">Tipo</span>
                        <select id="defTypeSelect" style="
                            width:100%;
                            padding:6px;
                            border-radius:6px;
                            border:1px solid #cbd5e1;
                            font-size:13px;
                        ">
                            <option value="numeric">numeric</option>
                            <option value="boolean">boolean</option>
                        </select>
                    </div>

                    <div>
                        <span style="font-size:12px; color:#6b7280;">Valor</span>
                        <input id="defValueInput" type="text" placeholder="Ej: 10 o true" style="
                            width:100%;
                            padding:6px;
                            border-radius:6px;
                            border:1px solid #cbd5e1;
                            font-size:13px;
                        ">
                    </div>
                </div>

                <div style="margin-top:16px; display:flex; justify-content:flex-end; gap:8px;">
                    <button id="defCancelBtn" type="button" style="
                        padding:7px 12px;
                        border-radius:6px;
                        border:1px solid #e5e7eb;
                        background:#f3f4f6;
                        cursor:pointer;
                    ">Cancelar</button>

                    <button id="defOkBtn" type="button" style="
                        padding:7px 14px;
                        border-radius:6px;
                        border:none;
                        background:#059669;
                        color:white;
                        cursor:pointer;
                        font-weight:500;
                    ">Insertar definición</button>
                </div>
            </div>
        `;

        document.body.appendChild(div);

        this.modal        = div;
        this.refInput     = div.querySelector("#defRefInput");
        this.typeSelect   = div.querySelector("#defTypeSelect");
        this.valueInput   = div.querySelector("#defValueInput");

        const btnOk       = div.querySelector("#defOkBtn");
        const btnCancel   = div.querySelector("#defCancelBtn");

        btnCancel.addEventListener("click", () => this.closeModal());
        btnOk.addEventListener("click", () => this.applyDefinition());

        // Cerrar con ESC
        document.addEventListener("keydown", (e) => {
            if (this.modal.style.display !== "flex") return;
            if (e.key === "Escape") this.closeModal();
        });

        /* ============================================================
           AJUSTE UI SEGÚN TIPO (numeric / boolean)
        ============================================================ */

        // Selector SI/NO justo después del input de valor
        const valueSelectBool = document.createElement("select");
        valueSelectBool.id = "defValueSelectBool";
        valueSelectBool.style.width = "100%";
        valueSelectBool.style.padding = "6px";
        valueSelectBool.style.border = "1px solid #cbd5e1";
        valueSelectBool.style.borderRadius = "6px";
        valueSelectBool.style.fontSize = "13px";
        valueSelectBool.style.display = "none"; // oculto por defecto

        const optSi = document.createElement("option");
        optSi.value = "true";
        optSi.textContent = "Sí";

        const optNo = document.createElement("option");
        optNo.value = "false";
        optNo.textContent = "No";

        valueSelectBool.appendChild(optSi);
        valueSelectBool.appendChild(optNo);

        // Insertar debajo del input de valor
        this.valueInput.insertAdjacentElement("afterend", valueSelectBool);
        this.valueSelectBool = valueSelectBool;

        // Listener de cambio de tipo
        this.typeSelect.addEventListener("change", () => {
            const t = this.typeSelect.value;

            if (t === "boolean") {
                // BOOLEAN → ocultar input, mostrar selector SI/NO
                this.valueInput.style.display = "none";
                valueSelectBool.style.display = "block";
                this.valueInput.value = "";
            } else {
                // NUMERIC → input numérico visible, selector oculto
                this.valueInput.style.display = "block";
                valueSelectBool.style.display = "none";
                this.valueInput.type = "number";
                this.valueInput.value = "";
            }
        });

        // Validación numérica estricta en tiempo real
        this.valueInput.addEventListener("input", () => {
            if (this.typeSelect.value === "numeric") {
                if (this.valueInput.value === "") return;
                if (isNaN(Number(this.valueInput.value))) {
                    this.valueInput.value = "";
                }
            }
        });
    },

    /* ============================================================
       ABRIR / CERRAR
    ============================================================ */
    openModal() {
        const ta = this.textarea;
        if (!ta || !this.modal) return;

        ta.focus();
        this.caretPos = ta.selectionStart || 0;

        this.refInput.value = "";
        this.valueInput.value = "";
        this.typeSelect.value = "numeric";

        // Estado inicial: numeric
        this.valueInput.style.display = "block";
        this.valueInput.type = "number";
        if (this.valueSelectBool) {
            this.valueSelectBool.style.display = "none";
            this.valueSelectBool.value = "true";
        }

        this.modal.style.display = "flex";

        setTimeout(() => {
            this.refInput.focus();
            this.refInput.select();
        }, 20);
    },

    closeModal() {
        if (this.modal) this.modal.style.display = "none";
    },

    /* ============================================================
       UTILIDAD: calcular posición donde insertar definition
       - Siempre arriba del todo, debajo de la última {{definition ...}}
    ============================================================ */
    findDefinitionInsertPos(text) {
        if (!text) return 0;

        const regex = /\{\{definition\b[^}]*\}\}[ \t]*\r?\n?/g;
        let lastIndex = 0;
        let found = false;
        let m;

        while ((m = regex.exec(text)) !== null) {
            found = true;
            lastIndex = regex.lastIndex;
        }

        // Si no hay ninguna definition → posición 0 (principio del documento)
        if (!found) return 0;

        return lastIndex;
    },

    /* ============================================================
       GENERAR DEFINICIÓN
    ============================================================ */
    sanitizeId(str, fallback) {
        if (!str) return fallback;
        let s = String(str).trim();
        if (!s) return fallback;
        s = s.replace(/\s+/g, "_").replace(/[^\w]/g, "_");
        if (!s) return fallback;
        return s;
    },

    applyDefinition() {
        const ta = this.textarea;
        if (!ta) return;

        let ref   = (this.refInput.value || "").trim();
        let type  = (this.typeSelect.value || "").trim();
        let value = "";

        if (!ref) {
            alert("Debes indicar una referencia.");
            return;
        }

        ref = this.sanitizeId(ref, "Variable");

        if (type === "boolean") {
            // Valor obligado desde el selector SI/NO
            if (this.valueSelectBool) {
                value = this.valueSelectBool.value; // "true" o "false"
            } else {
                value = "false";
            }
        } else if (type === "numeric") {
            value = (this.valueInput.value || "").trim();
            if (value === "" || isNaN(Number(value))) {
                alert("Valor numérico inválido.");
                return;
            }
        } else {
            value = (this.valueInput.value || "").trim();
            if (!value) {
                alert("Debes indicar un valor.");
                return;
            }
        }

        const block =
            "{{definition | reference: " +
            ref +
            " | type: " + type +
            " | value: " + value +
            "}}";

        // 🔹 NUEVO: siempre insertamos en la parte superior,
        // justo debajo de la última definition
        const fullText   = ta.value;
        const insertPos  = this.findDefinitionInsertPos(fullText);

        const before     = fullText.slice(0, insertPos);
        const after      = fullText.slice(insertPos);

        const needsLeadingNewline =
            insertPos > 0 && !before.endsWith("\n");

        const textToInsert =
            (insertPos === 0
                ? block + "\n\n"
                : (needsLeadingNewline ? "\n" : "") + block + "\n");

        // Sustituimos el texto completo con la nueva definition en su zona
        ta.value = before + textToInsert + after;

        if (typeof window.recordUndoAfterChange === "function") {
            recordUndoAfterChange(ta);
        }

        if (typeof window.updateHighlight === "function") {
            updateHighlight();
        }

        this.closeModal();
    }
};

/* ============================================================
   Bootstrap
============================================================ */
(function () {
    function start() { DefinitionManager.init(); }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
window.DefinitionManager = DefinitionManager;
