/* ============================================================
   SECTIONS.JS
   Inserta bloques de sección en el editor Markdown.

   - Botón "Sections" en la toolbar
   - Grupos de condiciones (CONDICIÓN 1, 2, ...) con AND / OR
   - Cada grupo tiene subcondiciones (1.1, 1.2, ...) con AND / OR
   - Comparador por defecto para texto/selector/si_no: DISTINTO A → "!=",
     pero ahora puede elegirse "==" en un desplegable.
   - Tesauros numéricos o moneda:
       · valor numérico
       · operadores: >, <, >=, <=
   - Sintaxis generada:

     {{#section_NOMBRE | condition:(((personalized.REF1 != "VAL1") AND (personalized.REF2 != "VAL2")) OR (personalized.REF3 > 10))}}
     ...selección...
     {{/section_NOMBRE}}

   - Usa tesauros tipo selector / si_no / numero / moneda.
============================================================ */

const Sections = {
    textarea: null,
    btn: null,

    modal: null,
    nameInput: null,
    condList: null,
    addGroupBtn: null,

    tesauroFields: [],
    selStart: null,
    selEnd: null,

    /* =======================================
       INIT
    ======================================= */
    init() {
        const ta = document.getElementById("markdownText");
        const toolbar = document.getElementById("toolbar");
        const floatingRow = (window.ensureFloatingActionRow && ensureFloatingActionRow()) || null;
        if (!ta || !toolbar) return;

        this.textarea = ta;

        // === Botón Sections ===
        let btn = document.getElementById("btnSections");
        if (!btn) {
            btn = document.createElement("button");
            btn.id = "btnSections";
            btn.type = "button";
            btn.textContent = "Sections";
            btn.className = "floating-action-btn";

            if (floatingRow) {
                floatingRow.appendChild(btn);
            } else {
                toolbar.appendChild(btn);
            }
        }
        this.btn = btn;

        btn.addEventListener("mousedown", function (e) { e.preventDefault(); });
        btn.addEventListener("click", () => this.openModal());

        this.createModal();
    },

    /* =======================================
       Crear popupF!=
    ======================================= */
    createModal() {
        if (this.modal) return;

        const div = document.createElement("div");
        div.id = "sectionsModal";
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
                width:820px;
                max-width:95%;
                font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                font-size:14px;
            ">
                <h2 style="margin:0 0 12px 0; font-size:18px; color:#111827;">
                    Crear sección con grupos de condiciones
                </h2>

                <div style="display:flex; flex-direction:column; gap:10px;">
                    <label>
                        <span style="display:block; font-size:12px; color:#6b7280; margin-bottom:2px;">
                            Nombre de la sección (identificador)
                        </span>
                        <input id="secNameInput" type="text" placeholder="MiSeccion" style="
                            width:100%;
                            padding:6px 8px;
                            border-radius:6px;
                            border:1px solid #cbd5e1;
                            font-size:13px;
                        ">
                    </label>

                    <div>
                        <span style="display:block; font-size:12px; color:#6b7280; margin-bottom:4px;">
                            Grupos de condiciones (CONDICIÓN 1, SUBCONDICIÓN 1.1, 1.2...).
                        </span>

                        <div id="secCondList" style="
                            display:flex;
                            flex-direction:column;
                            gap:8px;
                            margin-bottom:6px;
                            max-height:300px;
                            overflow:auto;
                            padding-right:4px;
                        "></div>

                        <button id="secAddGroupBtn" type="button" style="
                            border:none;
                            border-radius:6px;
                            padding:7px 12px;
                            font-size:12px;
                            background:#e0f2fe;
                            color:#0369a1;
                            cursor:pointer;
                        ">
                            ➕ Añadir grupo de condiciones
                        </button>

                        <p style="font-size:11px; color:#9ca3af; margin-top:6px;">
                            Dentro de cada grupo se pueden añadir subcondiciones (1.1, 1.2...)
                            con el botón ➕.
                        </p>
                    </div>
                </div>

                <div style="margin-top:14px; display:flex; justify-content:flex-end; gap:8px;">
                    <button id="secCancelBtn" type="button" style="
                        padding:7px 12px;
                        border-radius:6px;
                        border:1px solid #e5e7eb;
                        background:#f3f4f6;
                        font-size:13px;
                        cursor:pointer;
                    ">Cancelar</button>

                    <button id="secOkBtn" type="button" style="
                        padding:7px 14px;
                        border-radius:6px;
                        border:none;
                        background:#2563eb;
                        color:white;
                        font-size:13px;
                        cursor:pointer;
                        font-weight:500;
                    ">Insertar sección</button>
                </div>
            </div>
        `;

        document.body.appendChild(div);

        this.modal       = div;
        this.nameInput   = div.querySelector("#secNameInput");
        this.condList    = div.querySelector("#secCondList");
        this.addGroupBtn = div.querySelector("#secAddGroupBtn");

        const btnOk     = div.querySelector("#secOkBtn");
        const btnCancel = div.querySelector("#secCancelBtn");

        btnCancel.addEventListener("click", () => this.closeModal());
        btnOk.addEventListener("click", () => this.applyFromModal());
        this.addGroupBtn.addEventListener("click", () => this.addGroup());

        document.addEventListener("keydown", (e) => {
            if (!this.modal || this.modal.style.display !== "flex") return;
            if (e.key === "Escape") this.closeModal();
        });
    },

    /* =======================================
       Tesauros
    ======================================= */
    buildTesauroFields() {
        this.tesauroFields = [];

        if (!window.DataTesauro || !Array.isArray(DataTesauro.campos)) return;

        const campos = DataTesauro.campos || [];

        this.tesauroFields = campos.filter(function (c) {
            return (
                c &&
                (c.tipo === "selector" ||
                 c.tipo === "si_no"   ||
                 c.tipo === "numero"  ||
                 c.tipo === "moneda")
            );
        });
    },

    populateRefSelect(selectEl) {
        selectEl.innerHTML = "";

        const optNone = document.createElement("option");
        optNone.value = "";
        optNone.textContent = "— Tesauro (manual) —";
        selectEl.appendChild(optNone);

        this.tesauroFields.forEach(function (c, idx) {
            const o = document.createElement("option");
            o.value = String(idx);
            const nombre = c.nombre || c.ref || "(sin nombre)";
            const ref = c.ref || "";
            o.textContent = nombre + " (" + ref + ") [" + c.tipo + "]";
            selectEl.appendChild(o);
        });
    },

    /* =======================================
       Popup
    ======================================= */
    openModal() {
        const ta = this.textarea;
        if (!ta) return;

        ta.focus();

        const start = ta.selectionStart;
        const end   = ta.selectionEnd;

        if (start === end) {
            alert("Selecciona texto para envolver en una sección.");
            return;
        }

        this.selStart = start;
        this.selEnd   = end;

// ⭐ NO SUGERIMOS NADA → obligamos a escribirlo
if (this.nameInput) {
    this.nameInput.value = "";
}
        this.buildTesauroFields();
        if (this.condList) {
            this.condList.innerHTML = "";
        }
        this.addGroup();

        if (this.modal) {
            this.modal.style.display = "flex";
        }

        const self = this;
        setTimeout(function () {
            if (!self.nameInput) return;
            self.nameInput.focus();
            self.nameInput.select();
        }, 0);
    },

    closeModal() {
        if (this.modal) {
            this.modal.style.display = "none";
        }
    },

    /* =======================================
       GRUPOS
    ======================================= */
    addGroup(afterGroup = null) {
        if (!this.condList) return;

        const isFirstGroup = this.condList.children.length === 0;

        const group = document.createElement("div");
        group.className = "sec-group";
        group.style.border = "1px solid #e5e7eb";
        group.style.borderRadius = "8px";
        group.style.padding = "8px 10px";
        group.style.background = "#f9fafb";

        const header = document.createElement("div");
        header.className = "sec-group-header";
        header.style.display = "flex";
        header.style.alignItems = "center";
        header.style.gap = "8px";
        header.style.marginBottom = "4px";

        const logicDiv = document.createElement("div");
        logicDiv.className = "sec-group-logic";
        logicDiv.style.width = "80px";

        if (isFirstGroup) {
            const lab = document.createElement("span");
            lab.className = "secGroupLogicLabel";
            lab.textContent = "Si";
            lab.style.fontSize = "13px";
            lab.style.color = "#6b7280";
            lab.style.fontWeight = "500";
            logicDiv.appendChild(lab);
        } else {
            const sel = document.createElement("select");
            sel.className = "secGroupLogicSelect";
            sel.style.width = "100%";
            sel.style.padding = "5px 6px";
            sel.style.borderRadius = "6px";
            sel.style.border = "1px solid #cbd5e1";
            sel.style.fontSize = "13px";

            const optAnd = document.createElement("option");
            optAnd.value = "AND";
            optAnd.textContent = "AND";
            sel.appendChild(optAnd);

            const optOr = document.createElement("option");
            optOr.value = "OR";
            optOr.textContent = "OR";
            sel.appendChild(optOr);

            logicDiv.appendChild(sel);
        }

        const titleSpan = document.createElement("span");
        titleSpan.textContent = "Condición";
        titleSpan.style.fontSize = "13px";
        titleSpan.style.color = "#374151";
        titleSpan.style.fontWeight = "500";

        const spacer = document.createElement("div");
        spacer.style.flex = "1";

        const delBtn = document.createElement("button");
        delBtn.className = "sec-group-del";
        delBtn.textContent = "🗑";
        delBtn.style.border = "none";
        delBtn.style.background = "transparent";
        delBtn.style.cursor = "pointer";

        if (isFirstGroup) delBtn.style.visibility = "hidden";

        delBtn.addEventListener("click", () => {
            if (this.condList && this.condList.contains(group)) {
                this.condList.removeChild(group);
                this.normalizeGroups();
            }
        });

        header.appendChild(logicDiv);
        header.appendChild(titleSpan);
        header.appendChild(spacer);
        header.appendChild(delBtn);

        const body = document.createElement("div");
        body.style.marginTop = "4px";
        body.style.paddingLeft = "12px";
        body.style.borderLeft = "2px solid #e5e7eb";
        body.style.display = "flex";
        body.style.flexDirection = "column";
        body.style.gap = "4px";

        const subList = document.createElement("div");
        subList.className = "sec-sub-list";
        subList.style.display = "flex";
        subList.style.flexDirection = "column";
        subList.style.gap = "4px";

        const subAddWrap = document.createElement("div");
        subAddWrap.style.marginTop = "4px";

        const subAddBtn = document.createElement("button");
        subAddBtn.textContent = "➕ Subcondición";
        subAddBtn.style.border = "none";
        subAddBtn.style.borderRadius = "6px";
        subAddBtn.style.padding = "5px 8px";
        subAddBtn.style.fontSize = "11px";
        subAddBtn.style.background = "#fefce8";
        subAddBtn.style.color = "#92400e";
        subAddBtn.style.cursor = "pointer";

        subAddBtn.addEventListener("click", () => this.addSubConditionRow(group));

        subAddWrap.appendChild(subAddBtn);
        body.appendChild(subList);
        body.appendChild(subAddWrap);

        group.appendChild(header);
        group.appendChild(body);

        if (afterGroup && this.condList.contains(afterGroup)) {
            this.condList.insertBefore(group, afterGroup.nextSibling);
        } else {
            this.condList.appendChild(group);
        }

        this.addSubConditionRow(group);
        this.normalizeGroups();
    },

    /* =======================================
       SUBCONDICIONES
    ======================================= */
    addSubConditionRow(group, afterSub = null) {
        const subList = group.querySelector(".sec-sub-list");
        if (!subList) return;

        const isFirstSub = subList.children.length === 0;

        const row = document.createElement("div");
        row.className = "sec-sub-row";
        row.style.display = "flex";
        row.style.alignItems = "flex-start";
        row.style.gap = "8px";

        const logicDiv = document.createElement("div");
        logicDiv.className = "sec-sub-logic";
        logicDiv.style.width = "60px";
        logicDiv.style.paddingTop = "4px";

        if (isFirstSub) {
            const lab = document.createElement("span");
            lab.className = "secSubLogicLabel";
            lab.textContent = "Si";
            lab.style.fontSize = "12px";
            lab.style.color = "#6b7280";
            lab.style.fontWeight = "500";
            logicDiv.appendChild(lab);
        } else {
            const sel = document.createElement("select");
            sel.className = "secSubLogicSelect";
            sel.style.width = "100%";
            sel.style.padding = "4px 6px";
            sel.style.borderRadius = "6px";
            sel.style.border = "1px solid #cbd5e1";
            sel.style.fontSize = "12px";

            const optAnd = document.createElement("option");
            optAnd.value = "AND";
            optAnd.textContent = "AND";
            sel.appendChild(optAnd);

            const optOr = document.createElement("option");
            optOr.value = "OR";
            optOr.textContent = "OR";
            sel.appendChild(optOr);

            logicDiv.appendChild(sel);
        }

        const bodyDiv = document.createElement("div");
        bodyDiv.style.flex = "1";
        bodyDiv.style.display = "flex";
        bodyDiv.style.flexDirection = "column";
        bodyDiv.style.gap = "4px";

        const refRow = document.createElement("div");
        refRow.style.display = "flex";
        refRow.style.gap = "4px";

        const refSelect = document.createElement("select");
        refSelect.className = "secRefSelect";
        refSelect.style.flex = "1.1";
        refSelect.style.padding = "4px 6px";
        refSelect.style.borderRadius = "6px";
        refSelect.style.border = "1px solid #cbd5e1";
        refSelect.style.fontSize = "12px";
        this.populateRefSelect(refSelect);

        const refInput = document.createElement("input");
        refInput.type = "text";
        refInput.className = "secRefInput";
        refInput.placeholder = "Referencia";
        refInput.style.flex = "0.9";
        refInput.style.padding = "4px 6px";
        refInput.style.borderRadius = "6px";
        refInput.style.border = "1px solid #cbd5e1";
        refInput.style.fontSize = "12px";

        refRow.appendChild(refSelect);
        refRow.appendChild(refInput);

        const valRow = document.createElement("div");
        valRow.style.display = "flex";
        valRow.style.gap = "4px";

        const opSelect = document.createElement("select");
        opSelect.className = "secOpSelect";
        opSelect.style.flex = "0 0 70px";
        opSelect.style.padding = "4px 6px";
        opSelect.style.borderRadius = "6px";
        opSelect.style.border = "1px solid #cbd5e1";
        opSelect.style.fontSize = "12px";
        opSelect.style.display = "none"; // se rellena en updateRowValueSelect

        const valSelect = document.createElement("select");
        valSelect.className = "secValSelect";
        valSelect.style.flex = "1";
        valSelect.style.padding = "4px 6px";
        valSelect.style.borderRadius = "6px";
        valSelect.style.border = "1px solid #cbd5e1";
        valSelect.style.fontSize = "12px";
        valSelect.style.display = "none";

        const valInput = document.createElement("input");
        valInput.type = "text";
        valInput.className = "secValInput";
        valInput.placeholder = "VALOR";
        valInput.value = "VALOR";
        valInput.style.flex = "1";
        valInput.style.padding = "4px 6px";
        valInput.style.borderRadius = "6px";
        valInput.style.border = "1px solid #cbd5e1";
        valInput.style.fontSize = "12px";

        valRow.appendChild(opSelect);
        valRow.appendChild(valSelect);
        valRow.appendChild(valInput);

        bodyDiv.appendChild(refRow);
        bodyDiv.appendChild(valRow);

        const btnsCol = document.createElement("div");
        btnsCol.style.display = "flex";
        btnsCol.style.flexDirection = "column";
        btnsCol.style.alignItems = "center";
        btnsCol.style.gap = "2px";
        btnsCol.style.marginTop = "2px";

        const addBtn = document.createElement("button");
        addBtn.textContent = "+";
        addBtn.style.border = "none";
        addBtn.style.background = "transparent";
        addBtn.style.cursor = "pointer";
        addBtn.style.padding = "2px";
        addBtn.style.fontSize = "16px";

        addBtn.addEventListener("click", () => {
            this.addSubConditionRow(group, row);
        });

        const delBtn = document.createElement("button");
        delBtn.className = "sec-sub-del";
        delBtn.textContent = "🗑";
        delBtn.style.border = "none";
        delBtn.style.background = "transparent";
        delBtn.style.cursor = "pointer";
        delBtn.style.padding = "2px";
        delBtn.style.fontSize = "14px";

        delBtn.addEventListener("click", () => {
            if (subList.contains(row)) {
                subList.removeChild(row);
                this.normalizeSubRows(group);
            }
        });

        btnsCol.appendChild(addBtn);
        btnsCol.appendChild(delBtn);

        row.appendChild(logicDiv);
        row.appendChild(bodyDiv);
        row.appendChild(btnsCol);

        if (afterSub && subList.contains(afterSub)) {
            subList.insertBefore(row, afterSub.nextSibling);
        } else {
            subList.appendChild(row);
        }

        refSelect.addEventListener("change", () => this.updateRowValueSelect(row));

        this.updateRowValueSelect(row);
        this.normalizeSubRows(group);
    },

    /* =======================================
       Normalizaciones
    ======================================= */
    normalizeGroups() {
        if (!this.condList) return;

        const groups = Array.from(this.condList.querySelectorAll(".sec-group"));
        const totalGroups = groups.length;

        groups.forEach(function (group, index) {
            const logicDiv = group.querySelector(".sec-group-logic");
            const delBtn = group.querySelector(".sec-group-del");
            if (!logicDiv) return;

            const label = logicDiv.querySelector(".secGroupLogicLabel");
            const select = logicDiv.querySelector(".secGroupLogicSelect");

            if (index === 0) {
                // Primer grupo: sólo etiqueta "Si"
                if (select) {
                    logicDiv.removeChild(select);
                }
                if (!label) {
                    const lab = document.createElement("span");
                    lab.className = "secGroupLogicLabel";
                    lab.textContent = "Si";
                    lab.style.fontSize = "13px";
                    lab.style.color = "#6b7280";
                    lab.style.fontWeight = "500";
                    logicDiv.appendChild(lab);
                }
                if (delBtn) {
                    delBtn.style.visibility = totalGroups > 1 ? "visible" : "hidden";
                }
            } else {
                // Resto: sólo select AND/OR
                if (label) {
                    logicDiv.removeChild(label);
                }
                if (!select) {
                    const sel = document.createElement("select");
                    sel.className = "secGroupLogicSelect";
                    sel.style.width = "100%";
                    sel.style.padding = "5px 6px";
                    sel.style.borderRadius = "6px";
                    sel.style.border = "1px solid #cbd5e1";
                    sel.style.fontSize = "13px";

                    ["AND", "OR"].forEach(function (v) {
                        const opt = document.createElement("option");
                        opt.value = v;
                        opt.textContent = v;
                        sel.appendChild(opt);
                    });

                    logicDiv.appendChild(sel);
                }
                if (delBtn) {
                    delBtn.style.visibility = "visible";
                }
            }
        });
    },

    normalizeSubRows(group) {
        const subList = group.querySelector(".sec-sub-list");
        if (!subList) return;

        const rows = Array.from(subList.querySelectorAll(".sec-sub-row"));
        const total = rows.length;

        rows.forEach(function (row, index) {
            const logicDiv = row.querySelector(".sec-sub-logic");
            const delBtn = row.querySelector(".sec-sub-del");
            if (!logicDiv) return;

            const label = logicDiv.querySelector(".secSubLogicLabel");
            const select = logicDiv.querySelector(".secSubLogicSelect");

            if (index === 0) {
                // Primera subcondición: sólo "Si"
                if (select) {
                    logicDiv.removeChild(select);
                }
                if (!label) {
                    const lab = document.createElement("span");
                    lab.className = "secSubLogicLabel";
                    lab.textContent = "Si";
                    lab.style.fontSize = "12px";
                    lab.style.color = "#6b7280";
                    lab.style.fontWeight = "500";
                    logicDiv.appendChild(lab);
                }
            } else {
                // Resto: sólo select AND/OR
                if (label) {
                    logicDiv.removeChild(label);
                }
                if (!select) {
                    const sel = document.createElement("select");
                    sel.className = "secSubLogicSelect";
                    sel.style.width = "100%";
                    sel.style.padding = "4px 6px";
                    sel.style.borderRadius = "6px";
                    sel.style.border = "1px solid #cbd5e1";
                    sel.style.fontSize = "12px";

                    ["AND", "OR"].forEach(function (v) {
                        const opt = document.createElement("option");
                        opt.value = v;
                        opt.textContent = v;
                        sel.appendChild(opt);
                    });

                    logicDiv.appendChild(sel);
                }
            }

            if (delBtn) {
                delBtn.style.visibility = total === 1 ? "hidden" : "visible";
            }
        });
    },

    /* =======================================
       Actualizar valor según tipo
    ======================================= */
    updateRowValueSelect(row) {
        const refSelect = row.querySelector(".secRefSelect");
        const refInput  = row.querySelector(".secRefInput");
        const valSelect = row.querySelector(".secValSelect");
        const valInput  = row.querySelector(".secValInput");
        const opSelect  = row.querySelector(".secOpSelect");

        if (!refSelect || !refInput || !valSelect || !valInput || !opSelect) return;

        const idxStr = refSelect.value;

        // Reset básico
        opSelect.innerHTML = "";
        opSelect.style.display = "none";

        if (!idxStr) {
            // === MODO MANUAL (sin tesauro) → texto libre + operador == / !=
            refInput.disabled = false;

            valSelect.style.display = "none";
            valSelect.innerHTML = "";

            valInput.style.display = "block";

            ["!=", "=="].forEach(function (op) {
                const o = document.createElement("option");
                o.value = op;
                o.textContent = op;
                opSelect.appendChild(o);
            });
            opSelect.style.display = "block";
            opSelect.value = "=="; // por defecto DISTINTO

            return;
        }

        const idx = parseInt(idxStr, 10);
        const field = this.tesauroFields[idx];
        if (!field) return;

        const tipo = field.tipo;

        refInput.value = field.ref || "";
        refInput.disabled = true;

        valSelect.innerHTML = "";

        if (tipo === "selector") {
            // SELECTOR → desplegable de valores + operador == / !=
            valSelect.style.display = "block";
            valInput.style.display = "none";

            const opts = Array.isArray(field.opciones) ? field.opciones : [];

            if (!opts.length) {
                const o = document.createElement("option");
                o.value = "";
                o.textContent = "— Sin opciones definidas —";
                valSelect.appendChild(o);
            } else {
                opts.forEach(function (oData) {
                    const opt = document.createElement("option");
                    opt.value = oData.ref || oData.valor || "";
                    opt.textContent = oData.valor || oData.ref || "";
                    valSelect.appendChild(opt);
                });
            }

            ["!=", "=="].forEach(function (op) {
                const o = document.createElement("option");
                o.value = op;
                o.textContent = op;
                opSelect.appendChild(o);
            });
            opSelect.style.display = "block";
            opSelect.value = "=="; // por defecto DISTINTO

        } else if (tipo === "si_no") {
            // SI/NO → select true/false + operador == / !=
            valSelect.style.display = "block";
            valInput.style.display = "none";

            const optSi = document.createElement("option");
            optSi.value = "true";
            optSi.textContent = "Sí";
            valSelect.appendChild(optSi);

            const optNo = document.createElement("option");
            optNo.value = "false";
            optNo.textContent = "No";
            valSelect.appendChild(optNo);

            ["!=", "=="].forEach(function (op) {
                const o = document.createElement("option");
                o.value = op;
                o.textContent = op;
                opSelect.appendChild(o);
            });
            opSelect.style.display = "block";
            opSelect.value = "!=";

        } else if (tipo === "numero" || tipo === "moneda") {
            // NUMERO / MONEDA → valor numérico + > < >= <=
            valSelect.style.display = "none";
            valInput.style.display = "block";
            valInput.value = "0";

            [">", "<", ">=", "<="].forEach(function (op) {
                const o = document.createElement("option");
                o.value = op;
                o.textContent = op;
                opSelect.appendChild(o);
            });
            opSelect.style.display = "block";
            opSelect.value = ">"; // por defecto

        } else {
            // Otros tipos → texto + operador == / !=
            valSelect.style.display = "none";
            valInput.style.display = "block";

            ["!=", "=="].forEach(function (op) {
                const o = document.createElement("option");
                o.value = op;
                o.textContent = op;
                opSelect.appendChild(o);
            });
            opSelect.style.display = "block";
            opSelect.value = "!=";
        }
    },

    /* =======================================
       Recoger datos y generar block
    ======================================= */
    applyFromModal() {
        if (!this.nameInput || !this.condList) return;

        const nombreRaw = this.nameInput.value || "";
        const groupEls = Array.from(this.condList.querySelectorAll(".sec-group"));

        const groupsData = [];
        const self = this;

        groupEls.forEach(function (group) {
            const groupLogicSel = group.querySelector(".secGroupLogicSelect");
            const groupLogic = groupLogicSel ? groupLogicSel.value : null;

            const subRows = Array.from(group.querySelectorAll(".sec-sub-row"));
            const subConds = [];

            subRows.forEach(function (row) {
                const subLogicSel = row.querySelector(".secSubLogicSelect");
                const subLogic = subLogicSel ? subLogicSel.value : null;

                const refSelect = row.querySelector(".secRefSelect");
                const refInput  = row.querySelector(".secRefInput");
                const valSelect = row.querySelector(".secValSelect");
                const valInput  = row.querySelector(".secValInput");
                const opSelect  = row.querySelector(".secOpSelect");

                if (!refSelect || !refInput || !valSelect || !valInput || !opSelect) return;

                let refRaw = "";
                let valorRaw = "";
                let tipoCampo = "";
                let isNumeric = false;
                let op = null;

                const idxStr = refSelect.value;

                if (idxStr) {
                    const idx = parseInt(idxStr, 10);
                    const field = self.tesauroFields[idx];

                    if (field) {
                        refRaw = field.ref || "";
                        tipoCampo = field.tipo || "";

                        if (tipoCampo === "numero" || tipoCampo === "moneda") {
                            isNumeric = true;
                            valorRaw = valInput.value || "";
                            op = (opSelect.value || ">").trim();
                        } else if (tipoCampo === "selector" || tipoCampo === "si_no") {
                            valorRaw = valSelect.value || "";
                            op = (opSelect.value || "!=").trim();
                        } else {
                            valorRaw = valInput.value || "";
                            op = (opSelect.value || "!=").trim();
                        }
                    }
                } else {
                    // Manual
                    refRaw = refInput.value || "";
                    valorRaw = valInput.value || "";
                    op = (opSelect.value || "!=").trim();
                }

                if (!refRaw || !valorRaw) return;
                if (!op) op = "!=";

                subConds.push({
                    logic: subLogic,
                    ref: refRaw,
                    value: valorRaw,
                    isNumeric: isNumeric,
                    op: op
                });
            });

            if (subConds.length) {
                groupsData.push({
                    logic: groupLogic,
                    subConds: subConds
                });
            }
        });

        if (!groupsData.length) {
            alert("Debes definir al menos una condición.");
            return;
        }

        this.wrapSelection(nombreRaw, groupsData);
        this.closeModal();
    },

    /* =======================================
       Generar sección en el markdown
    ======================================= */
    sanitizeId(str, fallback) {
        if (!str) return fallback;
        let s = String(str).trim();
        if (!s) return fallback;
        s = s.replace(/\s+/g, "_").replace(/[^\w]/g, "_");
        if (!s) return fallback;
        return s;
    },

    /* 🔁 AJUSTE PARÉNTESIS:
       - 1 sola condición en total → (condición)
       - Varias condiciones 1 grupo → ((cond1) AND (cond2))
       - Varios grupos → ((...grupo1...) OR (...grupo2...))
    */
    wrapSelection(nombreRaw, groupsData) {
        const ta = this.textarea;
        if (!ta) return;

        let start = this.selStart;
        let end = this.selEnd;

        if (start == null || end == null) {
            start = ta.selectionStart;
            end = ta.selectionEnd;
        }

        if (start === end) {
            alert("No hay texto seleccionado.");
            return;
        }

        const selected = ta.value.slice(start, end);
        const nombre = this.sanitizeId(nombreRaw, "MiSeccion");

        const totalGroups = groupsData.length;
        const groupExprs = [];

        groupsData.forEach(function (g, gIndex) {
            const condParts = [];

            g.subConds.forEach(function (c, index) {
                const safeRef = Sections.sanitizeId(c.ref, "Referencia");
                let cond = "";

                if (c.isNumeric) {
                    const rawVal = (c.value == null ? "" : String(c.value));
                    const numVal = rawVal.trim() || "0";
                    cond = "(personalized." + safeRef + " " + c.op + " " + numVal + ")";
                } else {
                    const rawVal = (c.value == null ? "VALOR" : String(c.value));
                    const safeVal = rawVal.replace(/"/g, '\\"');
                    cond = '(personalized.' + safeRef + ' ' + c.op + ' "' + safeVal + '")';
                }

                if (index === 0) {
                    condParts.push(cond);
                } else {
                    const opInner = c.logic === "OR" ? "OR" : "AND";
                    condParts.push(" " + opInner + " " + cond);
                }
            });

            if (!condParts.length) return;

            const innerExpr = condParts.join("");

            let groupExpr;
            if (totalGroups === 1 && g.subConds.length === 1) {
                // Solo una condición en todo el bloque → no añadimos () extra
                groupExpr = innerExpr; // (personalized.ref == "VALOR")
            } else {
                // Grupo con varias condiciones O hay más grupos → lo envolvemos
                groupExpr = "(" + innerExpr + ")";
            }

            if (gIndex === 0) {
                groupExprs.push(groupExpr);
            } else {
                const opOuter = g.logic === "OR" ? "OR" : "AND";
                groupExprs.push(" " + opOuter + " " + groupExpr);
            }
        });

        if (!groupExprs.length) {
            alert("Debes definir al menos una condición.");
            return;
        }

        let fullCond;
        if (totalGroups === 1) {
            // Una sola burbuja de condiciones → ya tiene la forma correcta
            fullCond = groupExprs.join("");
        } else {
            // Varias burbujas AND/OR → las agrupamos en un único par de paréntesis
            fullCond = "(" + groupExprs.join("") + ")";
        }

        const openTag = "{{#section_" + nombre + " | condition:" + fullCond + "}}";
        const closeTag = "{{/section_" + nombre + "}}";

        const wrapped = openTag + "\n" + selected + "\n" + closeTag;

        ta.setRangeText(wrapped, start, end, "end");

        if (typeof window.recordUndoAfterChange === "function") {
            recordUndoAfterChange(ta);
        }

        if (typeof window.updateHighlight === "function") {
            updateHighlight();
        }
    }
};

// Bootstrap
(function () {
    function start() { Sections.init(); }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();

window.Sections = Sections;
