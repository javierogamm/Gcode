/* ============================================================
   LET.JS
   Inserta bloques:

   {{let | reference: personalized.REF_DESTINO | result: FORMULA}}

   - Botón "LET" en la toolbar
   - No hace falta tener texto seleccionado
   - Inserta el LET donde está el cursor
   - Opera sobre tesauros:
       · numero
       · moneda
       · si_no (true / false)
   - Y sobre variables creadas con:
       {{definition | reference: REF | type: numeric | value: 10}}

   - En la fórmula:
       · Tesauros se escriben con ALIAS amigable (no se ve personalized.REF)
       · Variables se escriben como la REFERENCIA (REF)
   - Al generar el código:
       · ALIAS de tesauro → personalized.REF
       · REFERENCIA de variable → variable.REF

   - Si el cursor/selección está dentro de un {{let ...}},
     el botón LET abre el modal en modo EDICIÓN de ese bloque.
============================================================ */

const LetManager = {

    textarea: null,
    btn: null,

    modal: null,
    refSelect: null,
    refInput: null,
    formulaInput: null,
    tesauroList: null,
    defList: null,

    tesauroFields: [],
    definitionVars: [],
    caretPos: null,

    // contexto extra
    currentDestField: null,   // tesauro destino (para saber si es si_no / numero / moneda)
    opBar: null,              // barra de operadores rápidos
    // *** CAMBIO: eliminada gestión de constante numérica (constRow/constInput/constBtn)
    boolBar: null,            // barra de atajos SI/NO

    // alias → { kind: "tesauro" | "variable", ref: "REF" }
    tokenMap: {},

    // rango de LET en modo edición (start, end) o null si es nuevo
    editingLetRange: null,

    /* =======================================
       INIT
    ======================================= */
    init() {
        const ta = document.getElementById("markdownText");
        const toolbar =
            document.getElementById("toolbar") ||
            document.querySelector(".toolbar");

        if (!ta || !toolbar) return;

        this.textarea = ta;

        // --- Botón LET en la toolbar ---
        let btn = document.getElementById("btnLet");
        if (!btn) {
            btn = document.createElement("button");
            btn.id = "btnLet";
            btn.type = "button";
            btn.textContent = "LET";
            btn.style.fontWeight = "600";

            // Intentar ponerlo después del botón Sections
            const secBtn = toolbar.querySelector("#btnSections");
            if (secBtn && secBtn.nextSibling) {
                toolbar.insertBefore(btn, secBtn.nextSibling);
            } else {
                toolbar.appendChild(btn);
            }
        }
        this.btn = btn;

        btn.addEventListener("mousedown", (e) => e.preventDefault());
        btn.addEventListener("click", () => this.openModal());

        this.createModal();
    },

    /* =======================================
       MODAL
    ======================================= */
    createModal() {
        if (this.modal) return;

        const div = document.createElement("div");
        div.id = "letModal";
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
                width:860px;
                max-width:96%;
                font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                font-size:14px;
            ">
                <h2 style="margin:0 0 10px 0; font-size:18px; color:#111827;">
                    Crear LET (cálculo)
                </h2>

                <p style="margin:0 0 12px 0; font-size:12px; color:#6b7280;">
                    Genera una instrucción
                    <code>{{let | reference: personalized.MiCampo | result: ...}}</code>
                    para cálculos con tesauros <strong>número / moneda / sí_no</strong>
                    y variables <code>{{definition}}</code> de tipo <strong>numeric</strong>.
                </p>

                <div style="display:flex; gap:14px; align-items:flex-start;">
                    <!-- Columna izquierda: referencia + fórmula -->
                    <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
                        <div>
                            <span style="display:block; font-size:12px; color:#6b7280; margin-bottom:3px;">
                                Referencia destino (personalized.REF)
                            </span>
                            <div style="display:flex; gap:6px;">
                                <select id="letRefSelect" style="
                                    flex:1;
                                    padding:5px 6px;
                                    border-radius:6px;
                                    border:1px solid #cbd5e1;
                                    font-size:12px;
                                "></select>
                            </div>
                            <input id="letRefInput" type="text" placeholder="MiCampoResultado" style="
                                margin-top:6px;
                                width:100%;
                                padding:5px 7px;
                                border-radius:6px;
                                border:1px solid #cbd5e1;
                                font-size:13px;
                            ">
                            <p style="font-size:11px; color:#9ca3af; margin:4px 0 0 0;">
                                Se insertará como <code>personalized.&lt;referencia&gt;</code>.
                            </p>
                        </div>

                        <div>
                            <span style="display:block; font-size:12px; color:#6b7280; margin-bottom:3px;">
                                Fórmula (result)
                            </span>
                            <textarea id="letFormulaInput" rows="4" style="
                                width:100%;
                                padding:6px 8px;
                                border-radius:6px;
                                border:1px solid #cbd5e1;
                                font-size:13px;
                                font-family:Consolas,monospace;
                                resize:vertical;
                            "></textarea>

                            <!-- Barra de operadores rápidos -->
                            <div id="letOpBar" style="
                                margin-top:6px;
                                display:flex;
                                flex-wrap:wrap;
                                gap:4px;
                                align-items:center;
                                font-size:11px;
                                color:#6b7280;
                            ">
                                <span>Operadores rápidos:</span>
                                <button type="button" data-op="+" style="
                                    padding:2px 6px;
                                    border-radius:999px;
                                    border:1px solid #cbd5e1;
                                    background:#f9fafb;
                                    cursor:pointer;
                                ">+</button>
                                <button type="button" data-op="-" style="
                                    padding:2px 6px;
                                    border-radius:999px;
                                    border:1px solid #cbd5e1;
                                    background:#f9fafb;
                                    cursor:pointer;
                                ">-</button>
                                <button type="button" data-op="*" style="
                                    padding:2px 6px;
                                    border-radius:999px;
                                    border:1px solid #cbd5e1;
                                    background:#f9fafb;
                                    cursor:pointer;
                                ">*</button>
                                <button type="button" data-op="/" style="
                                    padding:2px 6px;
                                    border-radius:999px;
                                    border:1px solid #cbd5e1;
                                    background:#f9fafb;
                                    cursor:pointer;
                                ">/</button>
                                <!-- *** CAMBIO: botón de paréntesis ahora es "()" y se ha eliminado el botón separado de ")" -->
                                <button type="button" data-op="()" style="
                                    padding:2px 6px;
                                    border-radius:999px;
                                    border:1px solid #cbd5e1;
                                    background:#f9fafb;
                                    cursor:pointer;
                                ">()</button>
                            </div>

                            <!-- *** CAMBIO: eliminada la fila de "Constante numérica" -->

                            <!-- Atajos SI / NO -->
                            <div id="letBoolBar" style="
                                margin-top:6px;
                                display:flex;
                                align-items:center;
                                gap:4px;
                                font-size:11px;
                                color:#6b7280;
                            ">
                                <span>Atajos sí/no:</span>
                                <button type="button" data-bool="si" style="
                                    padding:2px 8px;
                                    border-radius:999px;
                                    border:1px solid #cbd5e1;
                                    background:#f9fafb;
                                    cursor:pointer;
                                ">SI</button>
                                <button type="button" data-bool="no" style="
                                    padding:2px 8px;
                                    border-radius:999px;
                                    border:1px solid #cbd5e1;
                                    background:#f9fafb;
                                    cursor:pointer;
                                ">NO</button>
                            </div>

                            <p style="font-size:11px; color:#9ca3af; margin:4px 0 0 0;">
                                Ejemplos:
                                <code>ImporteTotal + 10</code>,
                                <code>Base - Descuento</code>,
                                <code>FlagAutorizacion == true</code>.
                            </p>
                        </div>
                    </div>

                    <!-- Columna derecha: tesauros + variables -->
                    <div style="width:260px; border-left:1px solid #e5e7eb; padding-left:12px;">
                        <h3 style="margin:0 0 6px 0; font-size:13px; color:#111827;">
                            Tesauros para usar en la fórmula
                        </h3>
                        <p style="margin:0 0 6px 0; font-size:11px; color:#6b7280;">
                            Clic para insertar un <strong>alias</strong> en la fórmula
                            (luego se convertirá a <code>personalized.REF</code>).
                        </p>
                        <div id="letTesauroList" style="
                            max-height:160px;
                            overflow:auto;
                            border-radius:6px;
                            border:1px solid #e5e7eb;
                            background:#f9fafb;
                            padding:4px;
                            font-size:12px;
                        "></div>

                        <div style="margin-top:10px; padding-top:8px; border-top:1px dashed #e5e7eb;"></div>

                        <h3 style="margin:8px 0 4px 0; font-size:13px; color:#111827;">
                            Variables (definition, numeric)
                        </h3>
                        <p style="margin:0 0 6px 0; font-size:11px; color:#6b7280;">
                            Clic para insertar la <strong>referencia</strong> de la variable
                            (en el código será <code>variable.REF</code>).
                        </p>
                        <div id="letDefinitionList" style="
                            max-height:120px;
                            overflow:auto;
                            border-radius:6px;
                            border:1px solid #dbeafe;
                            background:#eff6ff;
                            padding:4px;
                            font-size:12px;
                        "></div>
                    </div>
                </div>

                <div style="margin-top:14px; display:flex; justify-content:flex-end; gap:8px;">
                    <button id="letCancelBtn" type="button" style="
                        padding:7px 12px;
                        border-radius:6px;
                        border:1px solid #e5e7eb;
                        background:#f3f4f6;
                        font-size:13px;
                        cursor:pointer;
                    ">Cancelar</button>

                    <button id="letOkBtn" type="button" style="
                        padding:7px 14px;
                        border-radius:6px;
                        border:none;
                        background:#1d4ed8;
                        color:white;
                        font-size:13px;
                        cursor:pointer;
                        font-weight:500;
                    ">Insertar LET</button>
                </div>
            </div>
        `;

        document.body.appendChild(div);

        this.modal        = div;
        this.refSelect    = div.querySelector("#letRefSelect");
        this.refInput     = div.querySelector("#letRefInput");
        this.formulaInput = div.querySelector("#letFormulaInput");
        this.tesauroList  = div.querySelector("#letTesauroList");
        this.defList      = div.querySelector("#letDefinitionList");

        // referencias al builder
        this.opBar      = div.querySelector("#letOpBar");
        this.boolBar    = div.querySelector("#letBoolBar");

        const btnOk     = div.querySelector("#letOkBtn");
        const btnCancel = div.querySelector("#letCancelBtn");

        btnCancel.addEventListener("click", () => this.closeModal());
        btnOk.addEventListener("click", () => this.apply());

        // Cerrar con ESC
        document.addEventListener("keydown", (e) => {
            if (!this.modal || this.modal.style.display !== "flex") return;
            if (e.key === "Escape") this.closeModal();
        });

        // Cambiar referencia al seleccionar tesauro destino
        if (this.refSelect) {
            this.refSelect.addEventListener("change", () => this.onChangeRefSelect());
        }

        // *** CAMBIO: lógica de operadores rápidos, incluyendo "()" que envuelve selección
        if (this.opBar) {
            this.opBar.querySelectorAll("button[data-op]").forEach((btn) => {
                btn.addEventListener("click", () => {
                    const op = btn.getAttribute("data-op") || "";
                    if (!op) return;

                    // Solo si destino numérico
                    if (!this.isNumericDest()) return;

                    const ta = this.formulaInput;
                    if (!ta) return;

                    // Botón de paréntesis "()" → si hay selección, envolverla;
                    // si no hay selección, insertar "()" y colocar el cursor dentro.
                    if (op === "()") {
                        const start = ta.selectionStart || 0;
                        const end   = ta.selectionEnd || start;
                        const value = ta.value || "";

                        if (end > start) {
                            const before   = value.slice(0, start);
                            const selected = value.slice(start, end);
                            const after    = value.slice(end);
                            ta.value = before + "(" + selected + ")" + after;
                            ta.selectionStart = start + 1;
                            ta.selectionEnd   = end + 1;
                        } else {
                            const before = value.slice(0, start);
                            const after  = value.slice(start);
                            ta.value = before + "()" + after;
                            ta.selectionStart = ta.selectionEnd = start + 1;
                        }
                        return;
                    }

                    // Resto de operadores → insertar con espacios
                    this.insertTokenInFormula(" " + op + " ");
                });
            });
        }

        // *** CAMBIO: eliminada la lógica de "Constante numérica"

        // Atajos SI / NO
        if (this.boolBar) {
            this.boolBar.querySelectorAll("button[data-bool]").forEach((btn) => {
                btn.addEventListener("click", () => {
                    const token = btn.getAttribute("data-bool") || "";
                    if (!token || !this.formulaInput) return;

                    if (this.getDestType() === "si_no") {
                        // Para si_no, la fórmula es solo si/no
                        this.formulaInput.value = token;
                    } else {
                        this.insertTokenInFormula(token);
                    }
                });
            });
        }
    },

    /* =======================================
       Utilidades tipo destino
    ======================================= */
    getDestType() {
        const f = this.currentDestField;
        if (!f || !f.tipo) return null;
        return String(f.tipo);
    },

    isNumericDest() {
        const t = this.getDestType();
        return t === "numero" || t === "moneda";
    },

    updateFormulaUIForDestType() {
        const destType = this.getDestType();
        const isBool   = destType === "si_no";
        const isNum    = destType === "numero" || destType === "moneda";

        if (this.formulaInput) {
            this.formulaInput.disabled = isBool;
        }

        const lockNumTools = !isNum;

        if (this.opBar) {
            this.opBar.style.opacity       = lockNumTools ? "0.4" : "1";
            this.opBar.style.pointerEvents = lockNumTools ? "none" : "auto";
        }
        // *** CAMBIO: ya no hay constRow; se mantiene control sobre tesauroList/defList
        if (this.tesauroList) {
            this.tesauroList.style.opacity       = lockNumTools ? "0.4" : "1";
            this.tesauroList.style.pointerEvents = lockNumTools ? "none" : "auto";
        }
        if (this.defList) {
            this.defList.style.opacity       = lockNumTools ? "0.4" : "1";
            this.defList.style.pointerEvents = lockNumTools ? "none" : "auto";
        }

        if (this.boolBar) {
            this.boolBar.style.display = isBool ? "flex" : "none";
        }
    },

    /* =======================================
       Tesauros
    ======================================= */
    buildTesauroFields() {
        this.tesauroFields = [];

        if (!window.DataTesauro || !Array.isArray(DataTesauro.campos)) return;

        const campos = DataTesauro.campos || [];

        const usedTokens = new Set();

        this.tesauroFields = campos
            .filter(function (c) {
                return (
                    c &&
                    (c.tipo === "numero" ||
                     c.tipo === "moneda" ||
                     c.tipo === "si_no")
                );
            })
            .map((c) => {
                let base = c.nombre || c.ref || "Campo";
                base = String(base).trim();
                if (!base) base = c.ref || "Campo";

                let token = base.replace(/\s+/g, "_").replace(/[^\w]/g, "_");
                if (!token) token = c.ref || "Campo";

                let originalToken = token;
                let i = 2;
                while (usedTokens.has(token)) {
                    token = originalToken + "_" + i++;
                }
                usedTokens.add(token);

                const ref = c.ref || "";
                if (ref) {
                    this.tokenMap[token] = { kind: "tesauro", ref: ref };
                }

                return {
                    ...c,
                    token: token
                };
            });
    },

    populateRefSelect() {
        if (!this.refSelect) return;

        this.refSelect.innerHTML = "";

        const optNone = document.createElement("option");
        optNone.value = "";
        optNone.textContent = "— Referencia manual —";
        this.refSelect.appendChild(optNone);

        this.tesauroFields.forEach(function (c, idx) {
            const o = document.createElement("option");
            o.value = String(idx);
            const nombre = c.nombre || c.ref || "(sin nombre)";
            const ref = c.ref || "";
            const tipo = c.tipo || "";
            o.textContent = `${nombre} (${ref}) [${tipo}]`;
            this.refSelect.appendChild(o);
        }, this);
    },

    renderTesauroList() {
        if (!this.tesauroList) return;

        this.tesauroList.innerHTML = "";

        if (!this.tesauroFields.length) {
            const p = document.createElement("div");
            p.style.fontSize = "12px";
            p.style.color = "#6b7280";
            p.style.padding = "4px 6px";
            p.textContent = "No hay tesauros numéricos / moneda / si_no definidos.";
            this.tesauroList.appendChild(p);
            return;
        }

        this.tesauroFields.forEach((field) => {
            const ref    = field.ref || "";
            const nombre = field.nombre || ref || "(sin nombre)";
            const tipo   = field.tipo || "";
            const token  = field.token || ref || "";

            const item = document.createElement("div");
            item.style.padding = "4px 6px";
            item.style.borderRadius = "4px";
            item.style.cursor = "pointer";
            item.style.display = "flex";
            item.style.flexDirection = "column";
            item.style.gap = "2px";
            item.style.marginBottom = "2px";

            item.addEventListener("mouseenter", () => {
                item.style.background = "#e5effe";
            });
            item.addEventListener("mouseleave", () => {
                item.style.background = "transparent";
            });

            // Clic → insertar alias en fórmula (solo destino numérico)
            item.addEventListener("click", () => {
                if (!ref) return;
                if (!this.isNumericDest()) return;
                if (!token) return;
                this.insertTokenInFormula(token);
            });

            const line1 = document.createElement("div");
            line1.textContent = nombre;
            line1.style.fontWeight = "500";
            line1.style.color = "#111827";
            line1.style.fontSize = "12px";

            const line2 = document.createElement("div");
            line2.textContent = `${token}  →  ${ref} [${tipo}]`;
            line2.style.fontSize = "11px";
            line2.style.color = "#6b7280";

            item.appendChild(line1);
            item.appendChild(line2);

            this.tesauroList.appendChild(item);
        });
    },

    /* =======================================
       Variables (definition, numeric)
       extraídas del texto del editor
    ======================================= */
    buildDefinitionVars() {
        this.definitionVars = [];

        const ta = this.textarea;
        if (!ta) return;

        const text = ta.value || "";

        const regex = /\{\{\s*definition\b[^}]*\}\}/gi;
        let m;

        const usedTokens = new Set(Object.keys(this.tokenMap || {}));

        while ((m = regex.exec(text)) !== null) {
            const block = m[0];
            const inner = block.slice(2, -2); // quitar {{ }}

            const refMatch  = inner.match(/reference\s*:\s*([^\|\}]+)/i);
            const typeMatch = inner.match(/type\s*:\s*([^\|\}]+)/i);

            if (!refMatch || !typeMatch) continue;

            let ref  = refMatch[1].trim();
            let type = typeMatch[1].trim().toLowerCase();

            if (type !== "numeric") continue;

            const safeRef = this.sanitizeId(ref, ref || "Variable");

            // alias visible en fórmula = referencia
            let token = safeRef;
            let baseToken = token;
            let i = 2;
            while (usedTokens.has(token)) {
                token = baseToken + "_" + i++;
            }
            usedTokens.add(token);

            this.definitionVars.push({
                ref: safeRef,
                token: token,
                type: "numeric"
            });

            // mapping alias → variable.REF
            this.tokenMap[token] = { kind: "variable", ref: safeRef };
        }
    },

    renderDefinitionList() {
        if (!this.defList) return;

        this.defList.innerHTML = "";

        if (!this.definitionVars.length) {
            const p = document.createElement("div");
            p.style.fontSize = "12px";
            p.style.color = "#6b7280";
            p.style.padding = "4px 6px";
            p.textContent = "No hay variables {{definition}} de tipo numeric.";
            this.defList.appendChild(p);
            return;
        }

        this.definitionVars.forEach((v) => {
            const item = document.createElement("div");
            item.style.padding = "4px 6px";
            item.style.borderRadius = "4px";
            item.style.cursor = "pointer";
            item.style.display = "flex";
            item.style.flexDirection = "column";
            item.style.gap = "2px";
            item.style.marginBottom = "2px";

            item.addEventListener("mouseenter", () => {
                item.style.background = "#dbeafe";
            });
            item.addEventListener("mouseleave", () => {
                item.style.background = "transparent";
            });

            item.addEventListener("click", () => {
                if (!this.isNumericDest()) return;
                if (!v.token) return;
                this.insertTokenInFormula(v.token);
            });

            const line1 = document.createElement("div");
            line1.textContent = v.ref;
            line1.style.fontWeight = "500";
            line1.style.color = "#111827";
            line1.style.fontSize = "12px";

            const line2 = document.createElement("div");
            line2.textContent = `variable.${v.ref} [numeric]`;
            line2.style.fontSize = "11px";
            line2.style.color = "#6b7280";

            item.appendChild(line1);
            item.appendChild(line2);

            this.defList.appendChild(item);
        });
    },

    /* =======================================
       Cambio tesauro destino
    ======================================= */
    onChangeRefSelect() {
        if (!this.refSelect || !this.refInput) return;

        const idxStr = this.refSelect.value;

        this.currentDestField = null;

        if (!idxStr) {
            this.refInput.disabled = false;
            this.updateFormulaUIForDestType();
            return;
        }

        const idx = parseInt(idxStr, 10);
        const field = this.tesauroFields[idx];

        if (!field) {
            this.refInput.disabled = false;
            this.updateFormulaUIForDestType();
            return;
        }

        const ref = field.ref || "";
        this.refInput.value = ref;
        this.refInput.disabled = true;

        this.currentDestField = field;
        this.updateFormulaUIForDestType();
    },

    /* =======================================
       Buscar LET bajo cursor / selección
    ======================================= */
    findLetAtPosition(text, selStart, selEnd) {
        if (selStart == null || selEnd == null) {
            return null;
        }
        const re = /\{\{\s*let\b[^}]*\}\}/gi;
        let m;
        while ((m = re.exec(text)) !== null) {
            const start = m.index;
            const end   = start + m[0].length;

            // ¿intersección con selección/caret?
            const intersects =
                (selStart >= start && selStart <= end) ||
                (selEnd   >= start && selEnd   <= end) ||
                (selStart <= start && selEnd   >= end);

            if (intersects) {
                return {
                    start: start,
                    end: end,
                    text: m[0]
                };
            }
        }
        return null;
    },

    /* =======================================
       Rellenar modal desde un LET existente
    ======================================= */
    prefillFromExistingLet(letMatch) {
        if (!letMatch || !letMatch.text) return;

        const raw = letMatch.text;
        // quitar {{ y }}
        let inner = raw.trim();
        if (inner.startsWith("{{")) inner = inner.slice(2);
        if (inner.endsWith("}}")) inner = inner.slice(0, -2);
        inner = inner.trim();

        // extraer reference: ... | result: ...
        const m = inner.match(/reference\s*:\s*([^\|]+?)\s*\|\s*result\s*:\s*([\s\S]*)$/i);
        if (!m) return;

        let refPart    = (m[1] || "").trim();
        let formulaRaw = (m[2] || "").trim();

        // Reference: puede venir como personalized.REF
        let destRef = refPart;
        if (/^personalized\./i.test(destRef)) {
            destRef = destRef.replace(/^personalized\./i, "").trim();
        }

        // Rellenar referencia destino
        if (this.refInput) {
            this.refInput.value = destRef;
            this.refInput.disabled = false;
        }
        if (this.refSelect) {
            this.refSelect.value = "";
        }
        this.currentDestField = null;

        // Intentar casar con un tesauro destino
        let destFieldIndex = -1;
        for (let i = 0; i < this.tesauroFields.length; i++) {
            if (this.tesauroFields[i].ref === destRef) {
                destFieldIndex = i;
                break;
            }
        }
        if (destFieldIndex >= 0 && this.refSelect) {
            this.refSelect.value = String(destFieldIndex);
            const field = this.tesauroFields[destFieldIndex];
            this.currentDestField = field;
            if (this.refInput) {
                this.refInput.value = field.ref || destRef;
                this.refInput.disabled = true;
            }
        }

        // Reconstruir fórmula amigable:
        // 1) personalized.REF → alias de tesauro (token)
        let formula = formulaRaw;

        this.tesauroFields.forEach((field) => {
            const ref   = field.ref || "";
            const token = field.token || "";
            if (!ref || !token) return;
            const re = new RegExp("\\bpersonalized\\." + this.escapeRegex(ref) + "\\b", "g");
            formula = formula.replace(re, token);
        });

        // 2) variable.REF → REF (referencia de variable)
        formula = formula.replace(/variable\.([A-Za-z0-9_]+)/g, (match, varRef) => {
            return varRef || match;
        });

        if (this.formulaInput) {
            this.formulaInput.value = formula;
        }

        // Ajustar UI (booleana / numérica según destino)
        this.updateFormulaUIForDestType();
    },

    /* =======================================
       Abrir / cerrar modal
    ======================================= */
    openModal() {
        const ta = this.textarea;
        if (!ta || !this.modal) return;

        ta.focus();
        const selStart = ta.selectionStart != null ? ta.selectionStart : 0;
        const selEnd   = ta.selectionEnd   != null ? ta.selectionEnd   : selStart;

        // posición por defecto para insertar si es un LET nuevo
        this.caretPos        = selStart;
        this.editingLetRange = null;
        this.currentDestField = null;
        this.tokenMap = {};
        this.definitionVars = [];

        // Construir tesauros + alias (rellena tokenMap)
        this.buildTesauroFields();
        this.populateRefSelect();

        // Construir variables definition (también añade a tokenMap)
        this.buildDefinitionVars();

        // ¿Hay un LET bajo el cursor/selección?
        const text = ta.value || "";
        const existingLet = this.findLetAtPosition(text, selStart, selEnd);
        const isEditing = !!existingLet;

        if (isEditing) {
            // Sustituiremos este rango al aplicar
            this.editingLetRange = {
                start: existingLet.start,
                end: existingLet.end
            };
        } else {
            this.editingLetRange = null;
        }

        // Render listas (se verán igual en modo nuevo o edición)
        this.renderTesauroList();
        this.renderDefinitionList();

        // Reset inputs base
        if (this.refInput) {
            this.refInput.disabled = false;
            this.refInput.value = "";
        }
        if (this.refSelect) {
            this.refSelect.value = "";
        }
        if (this.formulaInput) {
            this.formulaInput.value = "";
            this.formulaInput.disabled = false;
        }

        // Si estamos editando un LET → precargar datos
        if (isEditing) {
            this.prefillFromExistingLet(existingLet);
        } else {
            // Si no hay LET, reset de UI (sin destino = herramientas numéricas apagadas)
            this.updateFormulaUIForDestType();
        }

        this.modal.style.display = "flex";

        const self = this;
        setTimeout(function () {
            if (self.refInput) {
                self.refInput.focus();
                self.refInput.select();
            }
        }, 0);
    },

    closeModal() {
        if (this.modal) {
            this.modal.style.display = "none";
        }
    },

    /* =======================================
       Insertar token en fórmula
    ======================================= */
    insertTokenInFormula(token) {
        const ta = this.formulaInput;
        if (!ta) return;

        ta.focus();
        const start = ta.selectionStart || 0;
        const end   = ta.selectionEnd || start;

        const before = ta.value.slice(0, start);
        const after  = ta.value.slice(end);

        ta.value = before + token + after;

        const newPos = start + token.length;
        ta.selectionStart = ta.selectionEnd = newPos;
    },

    /* =======================================
       Utilidades varias
    ======================================= */
    sanitizeId(str, fallback) {
        if (!str) return fallback;
        let s = String(str).trim();
        if (!s) return fallback;
        s = s.replace(/\s+/g, "_").replace(/[^\w]/g, "_");
        if (!s) return fallback;
        return s;
    },

    escapeRegex(str) {
        return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    },

    // Sustituir alias por personalized.REF / variable.REF
    replaceTokenAliases(formula) {
        if (!this.tokenMap || !Object.keys(this.tokenMap).length) return formula;

        const tokens = Object.keys(this.tokenMap).sort((a, b) => b.length - a.length);

        tokens.forEach((tok) => {
            const entry = this.tokenMap[tok];
            if (!entry || !entry.ref) return;

            const re = new RegExp("\\b" + this.escapeRegex(tok) + "\\b", "g");
            const prefix = entry.kind === "variable" ? "variable." : "personalized.";

            formula = formula.replace(re, prefix + entry.ref);
        });

        return formula;
    },

    /* =======================================
       Aplicar: generar {{let ...}}
    ======================================= */
    apply() {
        const ta = this.textarea;
        if (!ta || !this.refInput || !this.formulaInput) return;

        let refRaw = this.refInput.value || "";
        refRaw = refRaw.trim();

        if (!refRaw) {
            alert("Debes indicar una referencia destino.");
            return;
        }

        const refSan = this.sanitizeId(refRaw, "MiCampoResultado");
        const fullRef = "personalized." + refSan;

        let formula = this.formulaInput.value || "";
        formula = formula.trim();

        const destField = this.currentDestField || null;
        const destType  = destField && destField.tipo ? String(destField.tipo) : null;

        // si_no → si/sí/no → true/false
        if (destType === "si_no") {
            const fLower = formula.toLowerCase();
            if (fLower === "si" || fLower === "sí" || fLower === "true") {
                formula = "true";
            } else if (fLower === "no" || fLower === "false") {
                formula = "false";
            }
        } else {
            // resto → sustituir alias de tesauros y variables
            formula = this.replaceTokenAliases(formula);
        }

        if (!formula) {
            alert("Debes indicar una fórmula (result).");
            return;
        }

        const letBlock =
            "{{let | reference: " +
            fullRef +
            " | result: " +
            formula +
            "}}";

        // Si estábamos editando un LET existente → reemplazar
        let insertStart, insertEnd;
        if (this.editingLetRange) {
            insertStart = this.editingLetRange.start;
            insertEnd   = this.editingLetRange.end;
        } else {
            insertStart = (this.caretPos != null ? this.caretPos : ta.value.length);
            insertEnd   = insertStart;
        }

        if (window.UndoManager && typeof UndoManager.saveState === "function") {
            UndoManager.saveState();
        }

        ta.setRangeText(letBlock, insertStart, insertEnd, "end");

        if (typeof window.updateHighlight === "function") {
            updateHighlight();
        }

        this.closeModal();
    }
};

/* =======================================
   Bootstrap
======================================= */
(function () {
    function start() { LetManager.init(); }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
window.LetManager = LetManager;
