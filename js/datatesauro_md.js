/* ============================================================
   DATATESAURO_MD.JS
   Panel flotante de creación y gestión básica de campos "tesauro"
   para el Editor Markdown.

   - Botón flotante 📚 (abre/cierra panel)
   - Panel lateral derecho con:
       · Alta / edición rápida de campos
       · Listado agrupado por tipo
       · Arrastrar campos al textarea
       · Botón ➕ para insertar en el cursor
       · Botón para abrir TesauroManager (gestor completo)
   - Inserta SIEMPRE: {{personalized | reference: ReferenciaDelTesauro}}
============================================================ */

const DataTesauro = {
    btn: null,
    panel: null,
    listDiv: null,

    // Campos en memoria
    campos: [],

    // Referencia al textarea Markdown
    targetTextarea: null,

    // Estado de colapsado por tipo
    collapsed: {},

    /* =======================================
       INICIALIZAR PARA ESTE EDITOR
       ======================================= */
    initForMarkdown(textarea) {
        if (!textarea) return;

        this.targetTextarea = textarea;

        // Crear botón flotante si no existe
        if (!document.getElementById("btnTesauro")) {
            this.btn = document.createElement("button");
            this.btn.id = "btnTesauro";
            this.btn.className = "floating-tesauro-btn";
            this.btn.textContent = "📚 Tesauro";
            // === TESAURO: botón flotante ===
            document.body.appendChild(this.btn);

            this.btn.addEventListener("click", () => {
                this.togglePanel();
            });
        }
            // === NUEVO BOTÓN VERDE → abre TesauroManager ===
            if (!document.getElementById("btnTesauroManagerFloat")) {
                const btn2 = document.createElement("button");
                btn2.id = "btnTesauroManagerFloat";
                btn2.className = "floating-tesauro-btn-green";
                btn2.textContent = "🧩 Manager";
                document.body.appendChild(btn2);

                btn2.addEventListener("click", () => {
                    if (window.TesauroManager && typeof TesauroManager.open === "function") {
                        TesauroManager.open();
                    } else {
                        alert("TesauroManager no está disponible.");
                    }
                });
            }
        // Crear panel lateral si no existe
        if (!document.getElementById("tesauroPanel")) {
            this.panel = document.createElement("div");
            this.panel.id = "tesauroPanel";
            this.panel.className = "tesauro-panel";
            this.panel.innerHTML = `
                <h3>📚 Campos del Tesauro</h3>
                <div class="tesauro-panel-inner">
                    <div class="tesauro-panel-section" id="tesauroFormSection"></div>
                    <div class="tesauro-panel-section">
                        <h4>📋 Campos definidos</h4>
                        <div id="tesauroList"></div>
                    </div>
                </div>
                <div class="tesauro-panel-footer">
                    Arrastra un campo al editor o pulsa ➕ para insertarlo en el Markdown.
                </div>
            `;
            // === TESAURO: panel lateral ===
            document.body.appendChild(this.panel);

            this.listDiv = this.panel.querySelector("#tesauroList");
            this.renderForm();
            this.renderList();
        } else {
            this.panel = document.getElementById("tesauroPanel");
            this.listDiv = this.panel.querySelector("#tesauroList");
        }

        // Configurar drag & drop sobre el textarea
        this.setupMarkdownDrop(textarea);
    },

    /* =======================================
       MOSTRAR / OCULTAR PANEL
       ======================================= */
    togglePanel() {
        if (!this.panel) return;
        const visible = this.panel.classList.contains("visible");
        if (visible) {
            this.panel.classList.remove("visible");
        } else {
            this.panel.classList.add("visible");
        }
    },

    /* =======================================
       FORMULARIO RÁPIDO (ALTA / EDICIÓN)
       ======================================= */
    renderForm() {
        const formSection = this.panel.querySelector("#tesauroFormSection");
        if (!formSection) return;

        formSection.innerHTML = `
            <h4>➕ Crear / editar campo</h4>

            <div class="tesauro-form-row">
                <label for="tNombre">Nombre del campo</label>
                <input id="tNombre" type="text" placeholder="Ej: Referencia Catastral" />
            </div>

            <div class="tesauro-form-row">
                <label for="tRef">Referencia (se autogenera)</label>
                <input id="tRef" type="text" placeholder="referenciaCatastral" />
            </div>

            <div class="tesauro-form-row">
                <label for="tTipo">Tipo</label>
                <select id="tTipo">
                    <option value="texto">Texto</option>
                    <option value="selector">Selector</option>
                    <option value="si_no">Sí / No</option>
                    <option value="numero">Número</option>
                    <option value="fecha">Fecha</option>
                    <option value="moneda">Moneda</option>
                </select>
            </div>

            <div class="tesauro-form-actions">
                <button id="btnTesauroGuardar" class="tesauro-btn tesauro-btn-primary">💾 Guardar</button>
                <button id="btnTesauroLimpiar" class="tesauro-btn tesauro-btn-secondary">🧹 Limpiar</button>
            </div>

            <div style="margin-top:8px; display:flex; gap:6px;">
                <button id="btnTesauroManager" class="tesauro-btn tesauro-btn-secondary" style="flex:1;">
                    🧩 Gestor completo
                </button>
            </div>
        `;

        const inputNombre = formSection.querySelector("#tNombre");
        const inputRef = formSection.querySelector("#tRef");
        const selectTipo = formSection.querySelector("#tTipo");
        const btnGuardar = formSection.querySelector("#btnTesauroGuardar");
        const btnLimpiar = formSection.querySelector("#btnTesauroLimpiar");
        const btnManager = formSection.querySelector("#btnTesauroManager");

        // Autogenerar referencia al escribir nombre
        inputNombre.addEventListener("input", () => {
            if (!inputNombre.value.trim()) return;
            inputRef.value = this.generarReferenciaDesdeNombre(inputNombre.value);
        });

        // Guardar campo (nuevo o edición)
        btnGuardar.addEventListener("click", () => {
            const nombre = inputNombre.value.trim();
            const ref = inputRef.value.trim();
            const tipo = selectTipo.value;

            if (!nombre || !ref) {
                alert("Nombre y referencia son obligatorios.");
                return;
            }

            const editingId = formSection.dataset.editingId || null;

            if (editingId) {
                // Editar
                const idx = this.campos.findIndex(c => c.id === editingId);
                if (idx !== -1) {
                    this.campos[idx].nombre = nombre;
                    this.campos[idx].ref = ref;
                    this.campos[idx].tipo = tipo;
                }
            } else {
                // Alta nueva
                this.campos.push({
                    id: this.generateId(),
                    nombre,
                    ref,
                    tipo,
                    momento: "",
                    agrupacion: ""
                });
            }

            this.renderList();
            this.clearForm();
        });

        // Limpiar formulario
        btnLimpiar.addEventListener("click", () => {
            this.clearForm();
        });

        // Abrir gestor completo
        btnManager.addEventListener("click", () => {
            if (window.TesauroManager && typeof TesauroManager.open === "function") {
                TesauroManager.open();
            } else {
                alert("TesauroManager no está disponible (js/tesauromanager_md.js).");
            }
        });
    },

    clearForm() {
        const formSection = this.panel.querySelector("#tesauroFormSection");
        if (!formSection) return;
        formSection.dataset.editingId = "";
        formSection.querySelector("#tNombre").value = "";
        formSection.querySelector("#tRef").value = "";
        formSection.querySelector("#tTipo").value = "texto";
    },

    /* =======================================
       LISTADO AGRUPADO POR TIPO
       ======================================= */
    renderList() {
        if (!this.listDiv) return;

        const grupos = {};
        this.campos.forEach(c => {
            const t = c.tipo || "texto";
            if (!grupos[t]) grupos[t] = [];
            grupos[t].push(c);
        });

        const tiposOrden = ["texto", "selector", "si_no", "numero", "fecha", "moneda"];

        let html = "";

        tiposOrden.forEach(tipo => {
            const lista = grupos[tipo] || [];
            if (!lista.length) return;

            const colapsado = !!this.collapsed[tipo];

            html += `
                <div class="tesauro-group" data-tipo="${tipo}">
                    <div class="tesauro-group-header" data-tipo="${tipo}">
                        <span>${this.prettyTipo(tipo)} (${lista.length})</span>
                        <span>${colapsado ? "➕" : "➖"}</span>
                    </div>
            `;

            if (!colapsado) {
                html += `<div class="tesauro-group-body">`;
                lista.forEach(campo => {
                    html += `
                        <div class="tesauro-item" data-id="${campo.id}">
                            <div class="tesauro-item-main">
                                <span class="drag-pill"
                                      draggable="true"
                                      data-dnd="tesauro-campo"
                                      data-campo-ref="${this.escapeAttr(campo.ref)}"
                                      data-campo-nombre="${this.escapeAttr(campo.nombre)}">
                                    ⧉ ${campo.ref}
                                </span>
                                <span class="tesauro-item-name" title="${this.escapeAttr(campo.nombre)}">
                                    ${campo.nombre}
                                </span>
                                <button class="tesauro-mini-btn tesauro-insert" data-ref="${this.escapeAttr(campo.ref)}">➕</button>
                                <button class="tesauro-mini-btn tesauro-edit" data-id="${campo.id}">✏</button>
                                <button class="tesauro-mini-btn tesauro-del" data-id="${campo.id}">🗑</button>
                            </div>
                        </div>
                    `;
                });
                html += `</div>`;
            }

            html += `</div>`;
        });

        this.listDiv.innerHTML = html || "<p style='font-size:12px;color:#9ca3af;'>Aún no hay campos de tesauro.</p>";

        // Eventos de grupo (colapsar)
        this.listDiv.querySelectorAll(".tesauro-group-header").forEach(h => {
            h.addEventListener("click", () => {
                const tipo = h.dataset.tipo;
                this.collapsed[tipo] = !this.collapsed[tipo];
                this.renderList();
            });
        });

        // Eventos de edición y borrado
        this.listDiv.querySelectorAll(".tesauro-edit").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.id;
                const campo = this.campos.find(c => c.id === id);
                if (!campo) return;

                const formSection = this.panel.querySelector("#tesauroFormSection");
                if (!formSection) return;

                formSection.dataset.editingId = campo.id;
                formSection.querySelector("#tNombre").value = campo.nombre;
                formSection.querySelector("#tRef").value = campo.ref;
                formSection.querySelector("#tTipo").value = campo.tipo || "texto";
                this.panel.classList.add("visible");
            });
        });

        this.listDiv.querySelectorAll(".tesauro-del").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.id;
                this.campos = this.campos.filter(c => c.id !== id);
                this.renderList();
            });
        });

        // Insertar con botón ➕
        this.listDiv.querySelectorAll(".tesauro-insert").forEach(btn => {
            btn.addEventListener("click", () => {
                const ref = btn.dataset.ref;
                this.insertReferenceIntoMarkdown(ref);
            });
        });

        // Drag & drop
        this.listDiv.querySelectorAll(".drag-pill").forEach(pill => {
            pill.addEventListener("dragstart", (e) => this.handleDragStart(e, pill));
        });
    },

    /* =======================================
       DRAG & DROP HACIA EL TEXTAREA
       ======================================= */
    setupMarkdownDrop(textarea) {
        // Dragover: permitir soltar si viene un tesauro
        textarea.addEventListener("dragover", (e) => {
            const types = Array.from(e.dataTransfer.types || []);
            if (types.includes("application/x-tesauro")) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
            }
        });

        textarea.addEventListener("drop", (e) => {
            const types = Array.from(e.dataTransfer.types || []);
            if (!types.includes("application/x-tesauro")) return;

            e.preventDefault();
            const raw = e.dataTransfer.getData("application/x-tesauro");
            if (!raw) return;

            let payload = null;
            try {
                payload = JSON.parse(raw);
            } catch {
                return;
            }

            const ref = payload.refCampo || payload.ref || payload.refTesauro;
            if (!ref) return;

            this.insertReferenceIntoMarkdown(ref);
        });
    },

    handleDragStart(e, pill) {
        const payload = {
            tipo: "campo",
            refCampo: pill.dataset.campoRef,
            nombre: pill.dataset.campoNombre
        };

        e.dataTransfer.setData("application/x-tesauro", JSON.stringify(payload));
        e.dataTransfer.effectAllowed = "copy";
    },

    /* =======================================
       INSERCIÓN EN MARKDOWN
       ======================================= */
    insertReferenceIntoMarkdown(refTesauro) {
        if (!this.targetTextarea) return;

        const ta = this.targetTextarea;
        ta.focus();

        const start = ta.selectionStart;
        const end = ta.selectionEnd;

        const marker = ` {{personalized | reference: ${refTesauro}}} `;

        ta.setRangeText(marker, start, end, "end");
           // update highlight (ya se dispara por input, pero por si acaso)
    if (window.updateHighlight) updateHighlight();
    },

    /* =======================================
       UTILIDADES
       ======================================= */
    generateId() {
        return Math.random().toString(36).substring(2, 9);
    },

    prettyTipo(tipo) {
        switch (tipo) {
            case "texto": return "Texto";
            case "selector": return "Selector";
            case "si_no": return "Sí / No";
            case "numero": return "Número";
            case "fecha": return "Fecha";
            case "moneda": return "Moneda";
            default: return tipo;
        }
    },

    escapeAttr(str) {
        if (!str) return "";
        return String(str).replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },
// ⭐ NUEVO: generador de referencias con inversión + SiNo siempre al final
generarReferenciaDesdeNombre(nombre) {
    if (!nombre) return "";

    const raw = String(nombre).trim();
    if (!raw) return "";

    // Normalizar: minúsculas + quitar acentos
    let norm = raw.toLowerCase();
    if (norm.normalize) {
        norm = norm.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    // ⭐ Excepciones que NO se invierten y tienen forma fija
    const exceptions = {
        "nif": "NIF",
        "cif": "CIF",
        "dni": "DNI",
        "nie": "NIE",

        // ⛔ NO invertir estos nombres
        "referencia catastral": "ReferenciaCatastral",
        "proyecto tecnico": "ProyectoTecnico",
        "direccion postal": "DireccionPostal",
        "comunidad autonoma": "ComunidadAutonoma",
        "codigo postal": "CodigoPostal"
    };

    if (Object.prototype.hasOwnProperty.call(exceptions, norm)) {
        return exceptions[norm];
    }

    // Quitar signos raros (/, :, -, etc.) → los convertimos en espacio
    norm = norm.replace(/[^\p{L}\p{N}\s]+/gu, " ");

    // ⭐ AJUSTE Si/No:
    // Cualquier "si no" (antes venía de "si/no", "sí/no", etc.) se colapsa a un token
    norm = norm.replace(/\bsi\s+no\b/g, "sinotoken");

    const stopWords = [
        "de", "del", "la", "el", "los", "las",
        "y", "o", "u", "en", "para", "por", "con",
        "un", "una", "unos", "unas",
        "al", "como"
    ];

    // Partir en palabras, limpiar stopwords
    let words = norm
        .split(/\s+/)
        .filter(w => w && !stopWords.includes(w));

    if (!words.length) return "";

    // Invertir el orden (Tipo de Licencia de Obras → Obras Licencia Tipo)
    if (words.length > 1) {
        words.reverse();
    }

    // ⭐ AJUSTE: SiNo SIEMPRE al final
    const hasSiNo = words.includes("sinotoken");
    if (hasSiNo) {
        words = words.filter(w => w !== "sinotoken");
        words.push("sinotoken");
    }

    // PascalCase, mapeando el token especial a "SiNo"
    const camel = words
        .map(w => {
            if (w === "sinotoken") return "SiNo";
            return w.charAt(0).toUpperCase() + w.slice(1);
        })
        .join("");

    return camel;
}


};

// === TESAURO: bootstrap automático para este editor ===
(function bootstrapTesauro() {
    function start() {
        const ta = document.getElementById("markdownText");
        if (ta) {
            DataTesauro.initForMarkdown(ta);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();

// Exponer por si quieres acceder desde consola
window.DataTesauro = DataTesauro;
