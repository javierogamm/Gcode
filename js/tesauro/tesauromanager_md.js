/* ============================================================
   TESAURO MANAGER — Popup completo de gestión avanzada
   ------------------------------------------------------------
   - Pantalla completa tipo modal
   - Muestra TODOS los tesauros en una tabla
   - Selector → gestiona sus valores con inputs controlados
   - Popup adicional para "Referenciar Tesauros" masivo
   - Sincroniza siempre con DataTesauro.campos
   (adaptado para Editor Markdown: sin Engine, sin DataTesauro.sync)
   - *** NUEVO ***: Exportador Tesauro (3 CSV) con modal Entidad/Actividad
   - *** NUEVO ***: Importar tesauros desde Markdown
============================================================ */

const TesauroManager = {

    modal: null,
    table: null,
    btnClose: null,
    btnSave: null,
    btnOpenRefPopup: null,
    btnOpenPlainImport: null,   // botón importar texto
    btnOpenMdImport: null,      // *** NUEVO: botón importar desde markdown
    refModal: null,

    importModal: null,          // popup importar texto
    markdownImportModal: null,  // *** NUEVO: popup importar markdown

    // modal exportar Tesauro (3 CSV)
    exportModal: null,
    exportEntidad: "",
    exportActividad: "",

    // Import / export
    pasteArea: null,

    // 🔹 Selección múltiple de filas
    selectedRows: new Set(),
    lastSelectedRow: null,

    /* ---------------------------------------------
       Inicializar (solo una vez)
    --------------------------------------------- */
    init() {
        if (this.modal) return; // ya existe

        // === Crear el modal principal ===
        const div = document.createElement("div");
        div.id = "tesauroManagerModal";
        div.style.position = "fixed";
        div.style.inset = "0";
        div.style.background = "rgba(0,0,0,0.55)";
        div.style.display = "none";
        div.style.zIndex = "99999";
        div.style.justifyContent = "center";
        div.style.alignItems = "center";
        div.style.backdropFilter = "blur(2px)";

        // === Caja interna ===
        div.innerHTML = `
    <div id="tmBox" style="

    
        background:white;
        width:90%;
        height:85%;
        border-radius:12px;
        padding:20px;
        display:flex;
        flex-direction:column;
        box-shadow:0 6px 20px rgba(0,0,0,0.35);
        overflow:hidden;
    ">
    <button id="tmCloseX" style=" 
    position:absolute;
    top:50px;
    right:64px;
    background:#fee2e2;
    border:1px solid #f41313ff;
    color:#991b1b;
    width:32px;
    height:32px;
    border-radius:999px;
    cursor:pointer;
    font-size:16px;
    font-weight:bold;
    box-shadow:0 2px 6px rgba(0,0,0,0.25);
">✖</button>
        <h2 style="
            margin:0 0 15px 0;
            text-align:center;
            font-size:22px;
            color:#0f172a;
        ">
            🧩 Gestor Completo de Tesauros
        </h2>

        <div style="flex:1; overflow:auto;">
            <table id="tmTable" style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#e2e8f0;">
                        <th style="padding:8px; border:1px solid #cbd5e1;">Referencia</th>
                        <th style="padding:8px; border:1px solid #cbd5e1;">Nombre</th>
                        <th style="padding:8px; border:1px solid #cbd5e1;">Tipo</th>
                        <th style="padding:8px; border:1px solid #cbd5e1;">Valores (selector)</th>
                        <th style="padding:8px; border:1px solid #cbd5e1;">Momento captura</th>
                        <th style="padding:8px; border:1px solid #cbd5e1;">Agrupación</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>

        <!-- *** NUEVO: zona de acciones de import/export (4 botones en una línea) -->
        <div style="
            margin-top:8px;
            display:flex;
            gap:8px;
            flex-wrap:wrap;
        ">
            <button id="tmExportTesauroAll" style="
                flex:1;
                border:none;
                border-radius:6px;
                padding:8px 12px;
                background:#0f766e;
                color:#ecfdf5;
                cursor:pointer;
                font-size:12px;
                font-weight:bold;
            ">
                📦 Exportar Tesauro (3 CSV oficiales)
            </button>

            <button id="tmOpenPlainImport" style="
                flex:1;
                background:#dbeafe;
                border:1px solid #3b82f6;
                border-radius:6px;
                padding:10px;
                cursor:pointer;
                font-weight:bold;
            ">
                📥 Importar tesauros (texto)
            </button>

            <!-- *** NUEVO: Importar tesauros desde Markdown -->
            <button id="tmOpenMdImport" style="
                flex:1;
                background:#ecfdf5;
                border:1px solid #22c55e;
                border-radius:6px;
                padding:10px;
                cursor:pointer;
                font-weight:bold;
            ">
                📝 Importar desde Markdown
            </button>

            <button id="tmOpenRefPopup" style="
                flex:1;
                background:#fef3c7;
                border:1px solid #f59e0b;
                border-radius:6px;
                padding:10px;
                cursor:pointer;
                font-weight:bold;
            ">
                🧪 Referenciar Tesauros
            </button>
        </div>

        <div style="display:flex; gap:10px; margin-top:12px;">
            <button id="tmClose" style="
                flex:1;
                background:#f1f5f9;
                border:1px solid #cbd5e1;
                padding:10px;
                border-radius:6px;
                cursor:pointer;
                font-weight:bold;
            ">Cerrar</button>

            <button id="tmNewTesauro" style="
                flex:1;
                background:#e0f2fe;
                border:1px solid #3b82f6;
                color:#1e3a8a;
                padding:10px;
                border-radius:6px;
                cursor:pointer;
                font-weight:bold;
            ">➕ Crear tesauro</button>

            <button id="tmSave" style="
                flex:1;
                background:#10b981;
                color:white;
                border:none;
                padding:10px;
                border-radius:6px;
                cursor:pointer;
                font-weight:bold;
            ">💾 Guardar cambios</button>
        </div>
    </div>
`;

        // ⭐ PANEL DESLIZANTE PARA CAMBIO MASIVO DE TIPOS/MOMENTO/AGRUPACIÓN
        div.innerHTML += `
        <div id="tmMassPanel" style="
            position:absolute;
            top:-220px;
            left:0;
            width:100%;
            background:white;
            padding:15px;
            display:flex;
            gap:10px;
            justify-content:center;
            box-shadow:0 4px 10px rgba(0,0,0,0.25);
            transition:top 0.25s ease;
            z-index:100000;
        ">

            <!-- Tipo -->
            <select id="tmMassTipo" style="padding:8px; border:1px solid #cbd5e1; border-radius:6px; width:180px;">
                <option value="">Tipo…</option>
                <option value="selector">Selector</option>
                <option value="si_no">Sí/No</option>
                <option value="texto">Texto</option>
                <option value="numero">Numérico</option>
                <option value="moneda">Moneda</option>
                <option value="fecha">Fecha</option>
            </select>

            <!-- Momento -->
            <select id="tmMassMomento" style="padding:8px; border:1px solid #cbd5e1; border-radius:6px; width:180px;">
                <option value="">Momento…</option>
                <option value="Solicitud">Solicitud</option>
                <option value="Tramitación">Tramitación</option>
                <option value="Ejecución">Ejecución</option>
                <option value="Archivo">Archivo</option>
            </select>

            <!-- Agrupación -->
            <input id="tmMassAgr"
                placeholder="Agrupación…"
                style="padding:8px; border:1px solid #cbd5e1; border-radius:6px; width:180px;">

            <button id="tmMassApply" style="
                background:#10b981; color:white;
                border:none; border-radius:6px;
                padding:8px 16px; font-weight:bold; cursor:pointer;
            ">Aplicar</button>
        </div>
`;

        // MODAL EXPORTAR TESAURO (3 CSV) — pide Entidad y Actividad
        div.innerHTML += `
        <div id="tmExportModal" style="
            position:fixed;
            inset:0;
            background:rgba(15,23,42,0.45);
            display:none;
            align-items:center;
            justify-content:center;
            z-index:100001;
        ">
            <div style="
                background:white;
                width:420px;
                max-width:95%;
                padding:20px;
                border-radius:12px;
                box-shadow:0 4px 20px rgba(0,0,0,0.35);
                display:flex;
                flex-direction:column;
                gap:10px;
            ">
                <h2 style="margin:0; text-align:center; font-size:18px;">📦 Exportar Tesauro (3 CSV)</h2>
                <p style="margin:0; font-size:13px; color:#4b5563;">
                    Se generarán <strong>Tesauro.csv</strong>, <strong>Tesauro_Valores.csv</strong> y
                    <strong>Vinculacion_Tesauros.csv</strong> con el mismo formato que el exportador oficial.
                </p>

                <label style="font-size:13px; color:#111827; margin-top:6px;">Nombre Entidad</label>
                <input id="tmExpEntidad" type="text" style="
                    width:100%; padding:6px; border-radius:6px; border:1px solid #cbd5e1;
                    font-size:13px;
                " placeholder="Ej: Ayuntamiento de XXX">

                <label style="font-size:13px; color:#111827; margin-top:4px;">Actividad</label>
                <input id="tmExpActividad" type="text" style="
                    width:100%; padding:6px; border-radius:6px; border:1px solid #cbd5e1;
                    font-size:13px;
                " placeholder="Ej: Licencia de obras menores">

                <p style="margin:4px 0 0 0; font-size:12px; color:#6b7280;">
                    El <strong>Momento de captura</strong> y la <strong>Agrupación</strong> se toman
                    de cada tesauro (columnas de la tabla).
                </p>

                <div style="display:flex; gap:10px; margin-top:10px;">
                    <button id="tmExpCancel" style="
                        flex:1; background:#f1f5f9; border:1px solid #cbd5e1;
                        padding:8px; border-radius:6px; cursor:pointer; font-weight:bold;
                    ">Cancelar</button>

                    <button id="tmExpDo" style="
                        flex:1; background:#0f766e; color:white;
                        border:none; padding:8px; border-radius:6px;
                        cursor:pointer; font-weight:bold;
                    ">Exportar 3 CSV</button>
                </div>
            </div>
        </div>
`;

        document.body.appendChild(div);

        this.modal = div;
        this.table = div.querySelector("#tmTable tbody");
        this.btnClose = div.querySelector("#tmClose");
        this.btnSave = div.querySelector("#tmSave");
        this.btnOpenRefPopup = div.querySelector("#tmOpenRefPopup");
        this.btnOpenPlainImport = div.querySelector("#tmOpenPlainImport");
        this.btnOpenMdImport = div.querySelector("#tmOpenMdImport");  // *** NUEVO
        this.exportModal = div.querySelector("#tmExportModal");

        // Eventos básicos
        this.btnClose.addEventListener("click", () => this.close());
        const btnCloseX = div.querySelector("#tmCloseX");
        if (btnCloseX) {
            btnCloseX.addEventListener("click", () => this.close());
            }
        this.btnSave.addEventListener("click", () => this.save());
        this.btnOpenRefPopup.addEventListener("click", () => this.openRefPopup());

        const btnNewTesauro = div.querySelector("#tmNewTesauro");
        if (btnNewTesauro) {
            btnNewTesauro.addEventListener("click", () => this.createTesauroFromManager());
        }

        // Abrir popup de importación desde texto
        if (this.btnOpenPlainImport) {
            this.btnOpenPlainImport.addEventListener("click", () => this.openPlainImportPopup());
        }

        // *** NUEVO: abrir popup de importación desde Markdown
        if (this.btnOpenMdImport) {
            this.btnOpenMdImport.addEventListener("click", () => this.openMarkdownImportPopup());
        }

        // Abrir modal export Tesauro 3 CSV
        const btnExportTesauroAll = div.querySelector("#tmExportTesauroAll");
        if (btnExportTesauroAll) {
            btnExportTesauroAll.addEventListener("click", () => this.openExportTesauroModal());
        }

        // wiring botones del modal de exportación
        if (this.exportModal) {
            const btnExpCancel = this.exportModal.querySelector("#tmExpCancel");
            const btnExpDo = this.exportModal.querySelector("#tmExpDo");

            if (btnExpCancel) {
                btnExpCancel.addEventListener("click", () => this.closeExportTesauroModal());
            }

            if (btnExpDo) {
                btnExpDo.addEventListener("click", () => {
                    const inEnt = this.exportModal.querySelector("#tmExpEntidad");
                    const inAct = this.exportModal.querySelector("#tmExpActividad");
                    const entidad = (inEnt?.value || "").trim();
                    const actividad = (inAct?.value || "").trim();

                    if (!entidad) {
                        alert("Indica un nombre de entidad para el exportador.");
                        return;
                    }

                    this.exportEntidad = entidad;
                    this.exportActividad = actividad;

                    this.doExportTesauro(entidad, actividad);
                    this.closeExportTesauroModal();
                });
            }
        }
    },

    /* ---------------------------------------------
       Abrir popup principal
    --------------------------------------------- */
    open() {
        this.init();
        this.render();
        this.modal.style.display = "flex";
    },

    /* ---------------------------------------------
       Cerrar popup principal
    --------------------------------------------- */
    close() {
        if (this.modal) this.modal.style.display = "none";
    },

    /* ============================================================
       POPUP IMPORTAR TESAUROS DESDE TEXTO PLANO
       (ya existente)
    ============================================================ */
    openPlainImportPopup() {
        // si ya existe, solo mostrar
        if (this.importModal) {
            this.importModal.style.display = "flex";
            return;
        }

        const div = document.createElement("div");
        div.style.position = "fixed";
        div.style.inset = "0";
        div.style.background = "rgba(0,0,0,0.45)";
        div.style.zIndex = "999999";
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.justifyContent = "center";

        div.innerHTML = `
            <div style="
                background:white;
                width:700px;
                max-width:95%;
                padding:20px;
                border-radius:12px;
                box-shadow:0 4px 20px rgba(0,0,0,0.35);
                display:flex;
                flex-direction:column;
                max-height:80vh;
            ">
                <h2 style="margin:0 0 10px 0; text-align:center;">📥 Importar tesauros desde texto</h2>
                <p style="margin:0 0 8px 0; font-size:13px; color:#4b5563;">
                    Formato por línea (pegado desde Excel, columnas separadas por TAB):
                    <br>
                    <code>Momento captura   Agrupación   Referencia   Nombre tesauro   Tipo   Clasificación   Borrar</code>
                    <br>
                    Las columnas de <em>Clasificación</em> y <em>Borrar</em> se ignoran.
                    Si el tipo no se reconoce, se usará <strong>Texto</strong>.
                </p>
                <textarea id="tmPlainInput" style="
                    width:100%;
                    flex:1;
                    min-height:140px;
                    resize:vertical;
                    padding:8px;
                    margin:8px 0 12px 0;
                    border:1px solid #cbd5e1;
                    border-radius:6px;
                    font-family:Consolas,monospace;
                    font-size:12px;
                " placeholder="Ejemplo:
Solicitud\t00\tNuevoCampo98\tCampo para borrar DESDE ACTIVIDAD\tTexto\tSIN CLASIFICACIÓN\tBorrar"></textarea>

                <div style="display:flex; gap:10px; margin-top:8px;">
                    <button id="tmPlainCancel" style="
                        flex:1; background:#f1f5f9; border:1px solid #cbd5e1;
                        padding:8px; border-radius:6px; cursor:pointer;
                    ">Cancelar</button>

                    <button id="tmPlainImport" style="
                        flex:1; background:#10b981; color:white;
                        border:none; padding:8px;
                        border-radius:6px; cursor:pointer; font-weight:bold;
                    ">Importar tesauros</button>
                </div>
            </div>
        `;

        document.body.appendChild(div);
        this.importModal = div;

        const btnCancel = div.querySelector("#tmPlainCancel");
        const btnImport = div.querySelector("#tmPlainImport");

        if (btnCancel) {
            btnCancel.addEventListener("click", () => {
                this.importModal.style.display = "none";
            });
        }

        if (btnImport) {
            btnImport.addEventListener("click", () => {
                const txt = (div.querySelector("#tmPlainInput").value || "").trim();
                if (!txt) {
                    alert("Pega algún texto con tesauros.");
                    return;
                }
                const nuevos = this.normalizeFromPlainLines(txt);
                if (!nuevos.length) {
                    alert("No se ha podido leer ningún tesauro. Revisa el formato (tabulado).");
                    return;
                }

                this.mergeImportedCampos(nuevos);
                this.render();

                alert("✔ Importados " + nuevos.length + " tesauros desde texto.");
                this.importModal.style.display = "none";
            });
        }
    },

    /* ============================================================
       *** NUEVO ***
       POPUP IMPORTAR TESAUROS DESDE MARKDOWN
       - Detecta {{personalized | reference: RefTesauro}}
       - Muestra lista editable antes de guardar
    ============================================================ */
    openMarkdownImportPopup() {
        // si ya existe, solo mostrar
        if (this.markdownImportModal) {
            this.markdownImportModal.style.display = "flex";
            return;
        }

        const div = document.createElement("div");
        div.style.position = "fixed";
        div.style.inset = "0";
        div.style.background = "rgba(0,0,0,0.45)";
        div.style.zIndex = "999999";
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.justifyContent = "center";

        div.innerHTML = `
            <div style="
                background:white;
                width:760px;
                max-width:95%;
                padding:20px;
                border-radius:12px;
                box-shadow:0 4px 20px rgba(0,0,0,0.35);
                display:flex;
                flex-direction:column;
                max-height:80vh;
            ">
                <h2 style="margin:0 0 10px 0; text-align:center;">📝 Importar tesauros desde Markdown</h2>
                <p style="margin:0 0 8px 0; font-size:13px; color:#4b5563;">
                    Se detectarán referencias con la forma
                    <code>{{personalized | reference: MiReferencia}}</code>
                    en el Markdown pegado abajo. Cada referencia generará (o actualizará)
                    un tesauro con esa referencia.
                </p>

                <textarea id="tmMdInput" style="
                    width:100%;
                    min-height:120px;
                    resize:vertical;
                    padding:8px;
                    margin:8px 0 10px 0;
                    border:1px solid #cbd5e1;
                    border-radius:6px;
                    font-family:Consolas,monospace;
                    font-size:12px;
                " placeholder="Pega aquí el Markdown que contiene tesauros..."></textarea>

                <!-- Contenedor con scroll para la lista editable -->
                <div style="
                    flex:1;
                    min-height:120px;
                    max-height:40vh;
                    overflow:auto;
                    border:1px solid #e5e7eb;
                    border-radius:6px;
                    padding:4px;
                    margin-bottom:10px;
                ">
                    <table style="width:100%; border-collapse:collapse; font-size:12px;">
                        <thead>
                            <tr style="background:#e5e7eb;">
                                <th style="padding:4px; border:1px solid #d1d5db;">Referencia</th>
                                <th style="padding:4px; border:1px solid #d1d5db;">Nombre</th>
                                <th style="padding:4px; border:1px solid #d1d5db;">Tipo</th>
                                <th style="padding:4px; border:1px solid #d1d5db;">Momento</th>
                                <th style="padding:4px; border:1px solid #d1d5db;">Agrupación</th>
                            </tr>
                        </thead>
                        <tbody id="tmMdTable"></tbody>
                    </table>
                </div>

                <div style="display:flex; gap:10px; margin-top:4px;">
                    <button id="tmMdCancel" style="
                        flex:1; background:#f1f5f9; border:1px solid #cbd5e1;
                        padding:8px; border-radius:6px; cursor:pointer;
                    ">Cancelar</button>

                    <button id="tmMdDetect" style="
                        flex:1; background:#fef3c7; border:1px solid #f59e0b;
                        padding:8px; border-radius:6px; cursor:pointer; font-weight:bold;
                    ">🔍 Detectar tesauros</button>

                    <button id="tmMdImport" style="
                        flex:1; background:#10b981; color:white;
                        border:none; padding:8px; border-radius:6px;
                        cursor:pointer; font-weight:bold;
                    ">💾 Importar y guardar</button>
                </div>
            </div>
        `;

        document.body.appendChild(div);
        this.markdownImportModal = div;

        const txtArea = div.querySelector("#tmMdInput");
        const tbody = div.querySelector("#tmMdTable");
        const btnCancel = div.querySelector("#tmMdCancel");
        const btnDetect = div.querySelector("#tmMdDetect");
        const btnImport = div.querySelector("#tmMdImport");

        if (btnCancel) {
            btnCancel.addEventListener("click", () => {
                this.markdownImportModal.style.display = "none";
            });
        }

        if (btnDetect) {
            btnDetect.addEventListener("click", () => {
                const raw = (txtArea.value || "");
                const refsSet = new Set();

                // Buscar {{personalized | reference: RefTesauro}}
                const regex = /\{\{\s*personalized\s*\|\s*reference\s*:\s*([A-Za-z0-9_]+)\s*\}\}/gi;
                let m;
                while ((m = regex.exec(raw)) !== null) {
                    const ref = (m[1] || "").trim();
                    if (ref) refsSet.add(ref);
                }

                tbody.innerHTML = "";

                const refs = Array.from(refsSet);
                if (!refs.length) {
                    alert("No se han encontrado tesauros en el Markdown.");
                    return;
                }

                const existentes = (window.DataTesauro && Array.isArray(DataTesauro.campos))
                    ? DataTesauro.campos
                    : [];

                refs.forEach(ref => {
                    const existing = existentes.find(c =>
                        (c.ref || "").toLowerCase() === ref.toLowerCase()
                    ) || {};

                    const tr = document.createElement("tr");
                    tr.style.borderBottom = "1px solid #e5e7eb";

                    // Referencia
                    const tdRef = document.createElement("td");
                    tdRef.style.padding = "4px";
                    tdRef.style.border = "1px solid #d1d5db";
                    const inpRef = document.createElement("input");
                    inpRef.type = "text";
                    inpRef.className = "tmMd-ref";
                    inpRef.value = ref;
                    inpRef.style.width = "100%";
                    inpRef.style.padding = "3px";
                    inpRef.style.border = "1px solid #cbd5e1";
                    inpRef.style.borderRadius = "4px";
                    tdRef.appendChild(inpRef);

                    // Nombre
                    const tdNombre = document.createElement("td");
                    tdNombre.style.padding = "4px";
                    tdNombre.style.border = "1px solid #d1d5db";
                    const inpNombre = document.createElement("input");
                    inpNombre.type = "text";
                    inpNombre.className = "tmMd-nombre";
                    inpNombre.value = existing.nombre || ref;
                    inpNombre.style.width = "100%";
                    inpNombre.style.padding = "3px";
                    inpNombre.style.border = "1px solid #cbd5e1";
                    inpNombre.style.borderRadius = "4px";
                    tdNombre.appendChild(inpNombre);

                    // Tipo
                    const tdTipo = document.createElement("td");
                    tdTipo.style.padding = "4px";
                    tdTipo.style.border = "1px solid #d1d5db";
                    const selTipo = document.createElement("select");
                    selTipo.className = "tmMd-tipo";
                    selTipo.style.width = "100%";
                    selTipo.style.padding = "3px";
                    selTipo.style.borderRadius = "4px";
                    selTipo.style.border = "1px solid #cbd5e1";

                    const tipos = [
                        ["selector", "Selector"],
                        ["si_no", "Sí/No"],
                        ["texto", "Texto"],
                        ["numero", "Numérico"],
                        ["moneda", "Moneda"],
                        ["fecha", "Fecha"]
                    ];
                    const tipoActual = existing.tipo || "texto";
                    tipos.forEach(([val, label]) => {
                        const opt = document.createElement("option");
                        opt.value = val;
                        opt.textContent = label;
                        if (val === tipoActual) opt.selected = true;
                        selTipo.appendChild(opt);
                    });
                    tdTipo.appendChild(selTipo);

                    // Momento
                    const tdMomento = document.createElement("td");
                    tdMomento.style.padding = "4px";
                    tdMomento.style.border = "1px solid #d1d5db";
                    const selMom = document.createElement("select");
                    selMom.className = "tmMd-momento";
                    selMom.style.width = "100%";
                    selMom.style.padding = "3px";
                    selMom.style.borderRadius = "4px";
                    selMom.style.border = "1px solid #cbd5e1";

                    const momentos = ["Solicitud", "Tramitación", "Ejecución", "Archivo"];
                    const momentoActual = existing.momento || "Solicitud";
                    momentos.forEach(mom => {
                        const opt = document.createElement("option");
                        opt.value = mom;
                        opt.textContent = mom;
                        if (mom === momentoActual) opt.selected = true;
                        selMom.appendChild(opt);
                    });
                    tdMomento.appendChild(selMom);

                    // Agrupación
                    const tdAgr = document.createElement("td");
                    tdAgr.style.padding = "4px";
                    tdAgr.style.border = "1px solid #d1d5db";
                    const inpAgr = document.createElement("input");
                    inpAgr.type = "text";
                    inpAgr.className = "tmMd-agr";
                    inpAgr.value = existing.agrupacion || "Agrupación";
                    inpAgr.style.width = "100%";
                    inpAgr.style.padding = "3px";
                    inpAgr.style.border = "1px solid #cbd5e1";
                    inpAgr.style.borderRadius = "4px";
                    tdAgr.appendChild(inpAgr);

                    tr.appendChild(tdRef);
                    tr.appendChild(tdNombre);
                    tr.appendChild(tdTipo);
                    tr.appendChild(tdMomento);
                    tr.appendChild(tdAgr);

                    tbody.appendChild(tr);
                });
            });
        }

        if (btnImport) {
            btnImport.addEventListener("click", () => {
                const rows = Array.from(tbody.querySelectorAll("tr"));
                if (!rows.length) {
                    alert("No hay nada que importar. Primero detecta los tesauros.");
                    return;
                }

                const actuales = (window.DataTesauro && Array.isArray(DataTesauro.campos))
                    ? DataTesauro.campos
                    : [];
                const nuevos = [];

                rows.forEach(row => {
                    const ref = (row.querySelector(".tmMd-ref")?.value || "").trim();
                    const nombre = (row.querySelector(".tmMd-nombre")?.value || "").trim() || ref;
                    const tipo = (row.querySelector(".tmMd-tipo")?.value || "texto");
                    const momento = (row.querySelector(".tmMd-momento")?.value || "Solicitud");
                    const agrupacion = (row.querySelector(".tmMd-agr")?.value || "Agrupación");

                    if (!ref || !nombre) return;

                    const existing = actuales.find(c =>
                        (c.ref || "").toLowerCase() === ref.toLowerCase()
                    );

                    const nuevo = {
                        ref,
                        nombre,
                        tipo,
                        momento,
                        agrupacion
                    };

                    // Si ya existía y era selector, intenta preservar sus opciones
                    if (existing && Array.isArray(existing.opciones)) {
                        nuevo.opciones = existing.opciones.slice();
                    } else if (tipo === "selector") {
                        nuevo.opciones = [];
                    }

                    nuevos.push(nuevo);
                });

                if (!nuevos.length) {
                    alert("No se ha generado ningún tesauro a partir de la tabla.");
                    return;
                }

                this.mergeImportedCampos(nuevos);
                this.render();

                alert("✔ Importados/actualizados " + nuevos.length + " tesauros desde Markdown.");
                this.markdownImportModal.style.display = "none";
            });
        }
    },

    /* ============================================================
       POPUP REFERENCIAR TESAUROS
    ============================================================ */
    openRefPopup() {
        if (this.refModal) {
            this.refModal.style.display = "flex";
            return;
        }

        const div = document.createElement("div");
        div.style.position = "fixed";
        div.style.inset = "0";
        div.style.background = "rgba(0,0,0,0.45)";
        div.style.zIndex = "999999";
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.justifyContent = "center";

        div.innerHTML = `
            <div style="
                background:white;
                width:500px;
                max-width:95%;
                max-height:80vh;
                padding:20px;
                border-radius:12px;
                box-shadow:0 4px 20px rgba(0,0,0,0.35);
                display:flex;
                flex-direction:column;
                overflow:auto;
            ">
                <h2 style="margin:0 0 10px 0; text-align:center;">🧪 Referenciar Tesauros</h2>

                <label><strong>Pega nombres (uno por línea):</strong></label>
                <textarea id="refInput" style="
                    width:100%;
                    height:120px;
                    resize:vertical;
                    padding:8px;
                    margin:8px 0 12px 0;
                    border:1px solid #cbd5e1;
                    border-radius:6px;
                "></textarea>

                <button id="refPreview" style="
                    background:#fef3c7; border:1px solid #f59e0b;
                    padding:8px; border-radius:6px; margin-bottom:10px;
                    font-weight:bold; cursor:pointer;
                ">🔍 Generar referencias</button>

                <!-- CONTENEDOR SCROLLEABLE PARA LA TABLA -->
                <div style="
                    flex:1;
                    min-height:80px;
                    max-height:40vh;
                    overflow:auto;
                    margin-bottom:10px;
                ">
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="background:#e2e8f0;">
                                <th style="padding:6px; border:1px solid #cbd5e1;">Nombre</th>
                                <th style="padding:6px; border:1px solid #cbd5e1;">Referencia</th>
                            </tr>
                        </thead>
                        <tbody id="refTable"></tbody>
                    </table>
                </div>

                <div style="display:flex; gap:10px; margin-top:4px;">
                    <button id="refCancel" style="
                        flex:1; background:#f1f5f9; border:1px solid #cbd5e1;
                        padding:8px; border-radius:6px; cursor:pointer;
                    ">Cancelar</button>

                    <button id="refCreate" style="
                        flex:1; background:#10b981; color:white;
                        border:none; padding:8px; border-radius:6px;
                        cursor:pointer; font-weight:bold;
                    ">💾 Crear Tesauros</button>
                </div>
            </div>
        `;

        document.body.appendChild(div);
        this.refModal = div;

        div.querySelector("#refCancel").addEventListener("click", () => {
            this.refModal.style.display = "none";
        });

        div.querySelector("#refPreview").addEventListener("click", () => this.refPreviewFn());
        div.querySelector("#refCreate").addEventListener("click", () => this.refCreateFn());
    },

    /* ---------------------------------------------
       Generar tabla de previsualización de referencias
    --------------------------------------------- */
    refPreviewFn() {
        if (!this.refModal) return;

        const textarea = this.refModal.querySelector("#refInput");
        const tbody = this.refModal.querySelector("#refTable");
        if (!textarea || !tbody) return;

        const raw = textarea.value || "";
        const lines = raw
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(l => l.length > 0);

        tbody.innerHTML = "";

        if (!lines.length) return;

        const existentes = new Set(
            (DataTesauro.campos || []).map(c => (c.ref || "").toLowerCase())
        );

        lines.forEach(nombre => {
            const tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid #e2e8f0";

            const tdNombre = document.createElement("td");
            tdNombre.style.padding = "6px";
            tdNombre.style.border = "1px solid #cbd5e1";
            tdNombre.textContent = nombre;
            tdNombre.dataset.nombre = nombre;

            const tdRef = document.createElement("td");
            tdRef.style.padding = "6px";
            tdRef.style.border = "1px solid #cbd5e1";

            const input = document.createElement("input");
            input.type = "text";
            input.className = "ref-ref-input";
            input.style.width = "100%";
            input.style.padding = "4px";
            input.style.border = "1px solid #cbd5e1";
            input.style.borderRadius = "4px";

            const refSugerida = (DataTesauro && typeof DataTesauro.generarReferenciaDesdeNombre === "function")
                ? DataTesauro.generarReferenciaDesdeNombre(nombre)
                : nombre.replace(/\s+/g, "_");

            input.value = refSugerida;

            // si ya existe esa referencia → marcar en rojo
            if (existentes.has(refSugerida.toLowerCase())) {
                input.style.background = "#fee2e2";
            }

            tdRef.appendChild(input);

            tr.appendChild(tdNombre);
            tr.appendChild(tdRef);
            tbody.appendChild(tr);
        });
    },

    /* ---------------------------------------------
       Crear tesauros desde la tabla de referencias
    --------------------------------------------- */
    refCreateFn() {
        if (!this.refModal) return;

        const tbody = this.refModal.querySelector("#refTable");
        if (!tbody) return;

        const rows = Array.from(tbody.querySelectorAll("tr"));
        if (!rows.length) {
            alert("No hay nada que crear. Primero genera las referencias.");
            return;
        }

        const lista = DataTesauro.campos || [];
        const existentes = new Set(lista.map(c => (c.ref || "").toLowerCase()));

        let creados = 0;

        rows.forEach(row => {
            const tdNombre = row.querySelector("td[data-nombre]") || row.cells[0];
            const nombre = (tdNombre.dataset.nombre || tdNombre.textContent || "").trim();
            const inputRef = row.querySelector(".ref-ref-input");
            const ref = (inputRef?.value || "").trim();

            if (!nombre || !ref) return;

            const refLower = ref.toLowerCase();
            if (existentes.has(refLower)) {
                // ya existe esa referencia → saltar
                return;
            }

            existentes.add(refLower);

            const nuevo = {
                id: TesauroManager.generateId(),
                ref,
                nombre,
                tipo: "texto",
                opciones: [],
                momento: "Solicitud",
                agrupacion: "Agrupación"
            };

            lista.push(nuevo);
            creados++;
        });

        if (creados > 0) {
            DataTesauro.campos = lista;

            // refrescar panel lateral
            if (typeof DataTesauro.renderList === "function") {
                DataTesauro.renderList();
            } else if (typeof DataTesauro.render === "function") {
                DataTesauro.render();
            }

            // refrescar tabla del gestor
            this.render();
        }

        alert(`✅ Creados ${creados} tesauros nuevos.`);
        this.refModal.style.display = "none";
    },

    /* ---------------------------------------------
       Render tabla completa del gestor
    --------------------------------------------- */
    render() {
        if (!this.table) return;

        this.table.innerHTML = "";

        const lista = DataTesauro.campos || [];
   // *** NUEVO: asegurar que TODOS los campos tengan id (para selección y cambios masivos)
    lista.forEach(c => {
        if (!c.id) {
            c.id = (typeof DataTesauro.generateId === "function")
                ? DataTesauro.generateId()
                : TesauroManager.generateId();
        }
    });
        // Asegurar valores por defecto
        lista.forEach(c => {
            if (!c.momento) c.momento = "Solicitud";
            if (!c.agrupacion) c.agrupacion = "Agrupación";

            // normalizar tipo numérico
            if (c.tipo === "numerico") c.tipo = "numero";

            if (c.tipo === "selector" && !Array.isArray(c.opciones)) {
                c.opciones = [];
            }
        });

        // asegurar IDs únicos para opciones de selectors
        lista.forEach(c => {
            if (c.tipo === "selector" && Array.isArray(c.opciones)) {
                c.opciones.forEach(o => {
                    if (!o.id) {
                        o.id = TesauroManager.generateId();
                    }
                });
            }
        });

        lista.forEach(c => {
            const row = document.createElement("tr");
            row.style.borderBottom = "1px solid #e2e8f0";
            row.style.cursor = "pointer";
            row.classList.add("tm-row");
            row.dataset.id = c.id;

            // restaurar selección si ya estaba
            if (TesauroManager.selectedRows.has(c.id)) {
                row.classList.add("tm-row-selected");
            }

            // === COLUMNA: Referencia ===
            const tdRef = document.createElement("td");
            tdRef.style.padding = "6px";
            tdRef.style.border = "1px solid #cbd5e1";
            tdRef.contentEditable = true;
            tdRef.dataset.field = "ref";
            tdRef.dataset.id = c.id;
            tdRef.innerText = c.ref || "";

            // === COLUMNA: Nombre ===
            const tdNombre = document.createElement("td");
            tdNombre.style.padding = "6px";
            tdNombre.style.border = "1px solid #cbd5e1";
            tdNombre.contentEditable = true;
            tdNombre.dataset.field = "nombre";
            tdNombre.dataset.id = c.id;
            tdNombre.innerText = c.nombre || "";

            // === COLUMNA: Tipo ===
            const tdTipo = document.createElement("td");
            tdTipo.style.padding = "6px";
            tdTipo.style.border = "1px solid #cbd5e1";
            tdTipo.dataset.id = c.id;

            tdTipo.innerHTML = `
            <select data-field="tipo" data-id="${c.id}" class="tmTipoSelect" style="width:100%; padding:4px;">
                <option value="selector"  ${c.tipo === "selector" ? "selected" : ""}>Selector</option>
                <option value="si_no"     ${c.tipo === "si_no" ? "selected" : ""}>Sí/No</option>
                <option value="texto"     ${c.tipo === "texto" ? "selected" : ""}>Texto</option>
                <option value="numero"    ${c.tipo === "numero" ? "selected" : ""}>Numérico</option>
                <option value="moneda"    ${c.tipo === "moneda" ? "selected" : ""}>Moneda</option>
                <option value="fecha"     ${c.tipo === "fecha" ? "selected" : ""}>Fecha</option>
            </select>
        `;

            // === COLUMNA: Valores (selector) ===
            const tdValores = document.createElement("td");
            tdValores.style.padding = "6px";
            tdValores.style.border = "1px solid #cbd5e1";

            if (c.tipo === "selector") {
                const opts = Array.isArray(c.opciones) ? c.opciones : [];

                const htmlOpts = opts.map(o => {
                    const safeRef = (window.DataTesauro && typeof DataTesauro.escapeAttr === "function")
                        ? DataTesauro.escapeAttr(o.ref)
                        : (o.ref || "").replace(/"/g, "&quot;");
                    const safeVal = (window.DataTesauro && typeof DataTesauro.escapeAttr === "function")
                        ? DataTesauro.escapeAttr(o.valor)
                        : (o.valor || "").replace(/"/g, "&quot;");

                    return `
                    <div class="tm-opt-row" data-oid="${o.id}"
                        style="display:flex; gap:6px; align-items:center; margin-bottom:4px;">

                        <input class="tm-opt-ref" type="text" value="${safeRef}"
                            placeholder="Ref"
                            style="flex:0.6; padding:4px; border:1px solid #cbd5e1; border-radius:4px;">

                        <input class="tm-opt-valor" type="text" value="${safeVal}"
                            placeholder="Valor"
                            style="flex:1; padding:4px; border:1px solid #cbd5e1; border-radius:4px;">

                        <button class="tm-opt-del"
                            style="background:#fee2e2; border:1px solid #fca5a5;
                                border-radius:4px; padding:4px 6px; cursor:pointer;">
                            🗑️
                        </button>
                    </div>
                `;
                }).join("");

                tdValores.innerHTML = `
                <div class="tm-opt-box" data-id="${c.id}" style="display:flex; flex-direction:column; gap:6px;">

                    <div class="tm-opt-list">
                        ${htmlOpts}
                    </div>

                    <div style="display:flex; gap:6px; margin-top:4px;">
                        <input class="tm-new-opt-ref" type="text"
                            placeholder="Ref"
                            style="flex:0.6; padding:4px; border:1px solid #cbd5e1; border-radius:4px;">

                        <input class="tm-new-opt-valor" type="text"
                            placeholder="Valor"
                            style="flex:1; padding:4px; border:1px solid #cbd5e1; border-radius:4px;">

                        <button class="tm-opt-add"
                            style="background:#d1fae5; border:1px solid #10b981;
                                border-radius:4px; padding:4px 6px; cursor:pointer;">
                            ➕
                        </button>
                    </div>

                </div>
            `;
            } else {
                tdValores.innerHTML = `<i style="color:#94a3b8;">(no aplica)</i>`;
            }

            // === COLUMNA: Momento de captura ===
            const tdMomento = document.createElement("td");
            tdMomento.style.padding = "6px";
            tdMomento.style.border = "1px solid #cbd5e1";

            tdMomento.innerHTML = `
            <select data-field="momento" data-id="${c.id}" class="tmMomentoSelect"
                style="width:100%; padding:4px;">
                <option value="Solicitud"    ${c.momento === "Solicitud" ? "selected" : ""}>Solicitud</option>
                <option value="Tramitación"  ${c.momento === "Tramitación" ? "selected" : ""}>Tramitación</option>
                <option value="Ejecución"    ${c.momento === "Ejecución" ? "selected" : ""}>Ejecución</option>
                <option value="Archivo"      ${c.momento === "Archivo" ? "selected" : ""}>Archivo</option>
            </select>
        `;

            // === COLUMNA: Agrupación ===
            const tdAgr = document.createElement("td");
            tdAgr.style.padding = "6px";
            tdAgr.style.border = "1px solid #cbd5e1";

            tdAgr.innerHTML = `
            <input type="text" data-field="agrupacion" data-id="${c.id}"
                value="${c.agrupacion || "Agrupación"}"
                class="tmAgrInput"
                style="width:100%; padding:4px; border:1px solid #cbd5e1; border-radius:4px;">
        `;

            // Añadir columnas al row
            row.appendChild(tdRef);
            row.appendChild(tdNombre);
            row.appendChild(tdTipo);
            row.appendChild(tdValores);
            row.appendChild(tdMomento);
            row.appendChild(tdAgr);
            // === COLUMNA: Borrar tesauro ===
            const tdDel = document.createElement("td");
            tdDel.style.padding = "6px";
            tdDel.style.border = "1px solid #cbd5e1";
            tdDel.style.textAlign = "center";

            tdDel.innerHTML = `
                <button class="tmDelTesauro" data-id="${c.id}" 
                    style="
                        background:#fee2e2;
                        border:1px solid #fca5a5;
                        color:#991b1b;
                        padding:4px 8px;
                        border-radius:4px;
                        cursor:pointer;
                        font-weight:bold;
                    ">
                    ❌
                </button>
            `;

row.appendChild(tdDel);

            this.table.appendChild(row);
        });

        // CAMBIO INDIVIDUAL DE TIPO (con soporte masivo)
        this.modal.querySelectorAll(".tmTipoSelect").forEach(sel => {
            sel.addEventListener("change", (e) => {
                const nuevoTipo = e.target.value;

                const applyTipo = (item) => {
                    item.tipo = nuevoTipo;
                    if (nuevoTipo === "selector") {
                        if (!Array.isArray(item.opciones)) item.opciones = [];
                    } else {
                        item.opciones = [];
                    }
                };

                if (TesauroManager.selectedRows.size > 1) {
                    TesauroManager.selectedRows.forEach(id => {
                        const item = DataTesauro.campos.find(x => x.id === id);
                        if (item) applyTipo(item);
                    });

                    this.render();

                    TesauroManager.selectedRows.forEach(id => {
                        const row = TesauroManager.modal.querySelector(`tr[data-id='${id}']`);
                        if (row) row.classList.add("tm-row-selected");
                    });

                    return;
                }

                const id = e.target.dataset.id;
                const item = DataTesauro.campos.find(x => x.id === id);
                if (!item) return;

                applyTipo(item);

                this.render();
            });
        });

        // CAMBIOS INDIVIDUALES EN MOMENTO
        this.modal.querySelectorAll(".tmMomentoSelect").forEach(sel => {
            sel.addEventListener("change", () => {
                const id = sel.dataset.id;
                const item = DataTesauro.campos.find(x => x.id === id);
                if (item) item.momento = sel.value;
            });
        });

        // CAMBIOS INDIVIDUALES EN AGRUPACIÓN
        this.modal.querySelectorAll(".tmAgrInput").forEach(inp => {
            inp.addEventListener("input", () => {
                const id = inp.dataset.id;
                const item = DataTesauro.campos.find(x => x.id === id);
                if (item) item.agrupacion = inp.value.trim();
            });
        });

        // 🎯 Selección múltiple (con panel deslizante)
        const rowsEls = Array.from(this.modal.querySelectorAll(".tm-row"));

        rowsEls.forEach(row => {
            row.addEventListener("click", e => {
                const id = row.dataset.id;
                if (!id) return;

                if (e.ctrlKey || e.metaKey) {
                    if (TesauroManager.selectedRows.has(id)) {
                        TesauroManager.selectedRows.delete(id);
                        row.classList.remove("tm-row-selected");
                    } else {
                        TesauroManager.selectedRows.add(id);
                        row.classList.add("tm-row-selected");
                    }
                    TesauroManager.lastSelectedRow = row;
                }

                else if (e.shiftKey && TesauroManager.lastSelectedRow) {
                    const allRows = Array.from(TesauroManager.modal.querySelectorAll(".tm-row"));
                    const start = allRows.indexOf(TesauroManager.lastSelectedRow);
                    const end = allRows.indexOf(row);

                    if (start !== -1 && end !== -1) {
                        const [min, max] = [Math.min(start, end), Math.max(start, end)];
                        TesauroManager.selectedRows.clear();
                        allRows.forEach((r, i) => {
                            r.classList.remove("tm-row-selected");
                            if (i >= min && i <= max) {
                                TesauroManager.selectedRows.add(r.dataset.id);
                                r.classList.add("tm-row-selected");
                            }
                        });
                    }
                }

                else {
                    TesauroManager.selectedRows.clear();
                    rowsEls.forEach(r => r.classList.remove("tm-row-selected"));

                    TesauroManager.selectedRows.add(id);
                    row.classList.add("tm-row-selected");
                    TesauroManager.lastSelectedRow = row;
                }

                // Mostrar / ocultar panel
                const massPanel = TesauroManager.modal.querySelector("#tmMassPanel");
                if (massPanel) {
                    if (TesauroManager.selectedRows.size > 1) {
                        massPanel.style.top = "0px";
                    } else {
                        massPanel.style.top = "-200px";
                    }
                }
            });
        });

        // ACCIONES MASIVAS (Tipo, Momento, Agrupación)
        const massApply = this.modal.querySelector("#tmMassApply");
        const massSelect = this.modal.querySelector("#tmMassTipo");
        const massMomento = this.modal.querySelector("#tmMassMomento");
        const massAgr = this.modal.querySelector("#tmMassAgr");

        if (massApply) {
            massApply.onclick = () => {

                const tipo = massSelect ? massSelect.value : "";
                const momento = massMomento ? massMomento.value : "";
                const agrupacion = massAgr ? massAgr.value.trim() : "";

                if (!tipo && !momento && !agrupacion) {
                    alert("Selecciona al menos un valor para aplicar.");
                    return;
                }

                TesauroManager.selectedRows.forEach(id => {
                    const item = DataTesauro.campos.find(x => x.id === id);
                    if (!item) return;

                    // CAMBIAR TIPO
                    if (tipo) {
                        item.tipo = tipo;
                        if (tipo === "selector") {
                            if (!Array.isArray(item.opciones)) item.opciones = [];
                        } else {
                            item.opciones = [];
                        }
                    }

                    // CAMBIAR MOMENTO
                    if (momento) {
                        item.momento = momento;
                    }

                    // CAMBIAR AGRUPACIÓN
                    if (agrupacion) {
                        item.agrupacion = agrupacion;
                    }
                });

                // Refrescar tabla
                this.render();

                // Restaurar selección
                TesauroManager.selectedRows.forEach(id => {
                    const row = TesauroManager.modal.querySelector(`tr[data-id='${id}']`);
                    if (row) row.classList.add("tm-row-selected");
                });

                // Ocultar panel
                const massPanel2 = this.modal.querySelector("#tmMassPanel");
                if (massPanel2) massPanel2.style.top = "-200px";

                alert("✔ Cambios masivos aplicados correctamente.");
            };
        }

        // gestión de opciones de campos tipo "selector"

        // Añadir opción al selector
        this.modal.querySelectorAll(".tm-opt-add").forEach(btn => {
            btn.addEventListener("click", () => {
                const box = btn.closest(".tm-opt-box");
                if (!box) return;

                const idCampo = box.dataset.id;
                const item = (DataTesauro.campos || []).find(x => x.id === idCampo);
                if (!item) return;

                const refInput = box.querySelector(".tm-new-opt-ref");
                const valInput = box.querySelector(".tm-new-opt-valor");
                const ref = (refInput?.value || "").trim();
                const valor = (valInput?.value || "").trim();

                // Si no hay nada, no hacemos nada
                if (!ref && !valor) return;

                if (!Array.isArray(item.opciones)) item.opciones = [];

                const nuevaOpcion = {
                    id: TesauroManager.generateId(),
                    ref,
                    valor
                };

                item.opciones.push(nuevaOpcion);

                // Limpiar inputs
                if (refInput) refInput.value = "";
                if (valInput) valInput.value = "";

                // Re-dibujar tabla para que aparezca la nueva fila
                TesauroManager.render();
            });
        });

        // Eliminar opción
        this.modal.querySelectorAll(".tm-opt-del").forEach(btn => {
            btn.addEventListener("click", () => {
                const optRow = btn.closest(".tm-opt-row");
                const box = btn.closest(".tm-opt-box");
                if (!optRow || !box) return;

                const idCampo = box.dataset.id;
                const idOpcion = optRow.dataset.oid;

                const item = (DataTesauro.campos || []).find(x => x.id === idCampo);
                if (!item || !Array.isArray(item.opciones)) return;

                item.opciones = item.opciones.filter(o => o.id !== idOpcion);

                TesauroManager.render();
            });
        });

        // Editar referencia de opción
        this.modal.querySelectorAll(".tm-opt-ref").forEach(inp => {
            inp.addEventListener("input", () => {
                const optRow = inp.closest(".tm-opt-row");
                const box = inp.closest(".tm-opt-box");
                if (!optRow || !box) return;

                const idCampo = box.dataset.id;
                const idOpcion = optRow.dataset.oid;

                const item = (DataTesauro.campos || []).find(x => x.id === idCampo);
                if (!item || !Array.isArray(item.opciones)) return;

                const opt = item.opciones.find(o => o.id === idOpcion);
                if (!opt) return;

                opt.ref = inp.value.trim();
            });
        });

        // Editar valor visual de opción
        this.modal.querySelectorAll(".tm-opt-valor").forEach(inp => {
            inp.addEventListener("input", () => {
                const optRow = inp.closest(".tm-opt-row");
                const box = inp.closest(".tm-opt-box");
                if (!optRow || !box) return;

                const idCampo = box.dataset.id;
                const idOpcion = optRow.dataset.oid;

                const item = (DataTesauro.campos || []).find(x => x.id === idCampo);
                if (!item || !Array.isArray(item.opciones)) return;

                const opt = item.opciones.find(o => o.id === idOpcion);
                if (!opt) return;

                opt.valor = inp.value;
            });
        });
        // BORRAR TESAURO COMPLETO
            this.modal.querySelectorAll(".tmDelTesauro").forEach(btn => {
                btn.addEventListener("click", e => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    if (!id) return;

                    const ok = confirm("¿Seguro que quieres borrar este tesauro?");
                    if (!ok) return;

                    DataTesauro.campos = DataTesauro.campos.filter(c => c.id !== id);

                    // refrescar
                    this.render();
                    if (typeof DataTesauro.renderList === "function") DataTesauro.renderList();
                });
            });


    }, // fin render

    /* ---------------------------------------------
       Convertir opciones -> texto editable (no usado)
    --------------------------------------------- */
    serializeOptions(opts) {
        if (!Array.isArray(opts)) return "";
        return opts.map(o => `${o.ref} = ${o.valor}`).join("\n");
    },

    /* ---------------------------------------------
       Guardar cambios al DataTesauro
    --------------------------------------------- */
    save() {
        const lista = DataTesauro.campos;

        // 1) Guardar referencias y nombres (celdas contentEditable)
        this.modal.querySelectorAll("[contenteditable]").forEach(el => {
            const field = el.dataset.field;
            const id = el.dataset.id;
            const item = lista.find(x => x.id === id);
            if (item && (field === "ref" || field === "nombre")) {
                item[field] = el.innerText.trim();
            }
        });

        // 2) Guardar tipos
        this.modal.querySelectorAll("select[data-field='tipo']").forEach(sel => {
            const id = sel.dataset.id;
            const item = lista.find(x => x.id === id);
            if (item) {
                item.tipo = sel.value;
                if (item.tipo === "selector" && !Array.isArray(item.opciones)) {
                    item.opciones = [];
                }
                if (item.tipo !== "selector") {
                    item.opciones = [];
                }
            }
        });

        // Momento y agrupación ya se actualizan con los listeners

        // 4) Refrescar panel lateral del tesauro en el editor Markdown
        if (typeof DataTesauro.renderList === "function") {
            DataTesauro.renderList();
        } else if (typeof DataTesauro.render === "function") {
            DataTesauro.render();
        }

        alert("✔ Tesauros actualizados correctamente.");
        this.close();
    },

    /* ---------------------------------------------
       Import helpers
    --------------------------------------------- */
    normalizeFromJson(json) {
        const arr = Array.isArray(json) ? json : [json];
        return arr.map(o => {
            return {
                id: (window.DataTesauro && typeof DataTesauro.generateId === "function")
                    ? DataTesauro.generateId()
                    : TesauroManager.generateId(),
                ref: o.ref || o.referencia || o.referenciaTesauro || "",
                nombre: o.nombre || o.label || "",
                tipo: o.tipo || "texto",
                momento: o.momento || o.momentoCaptura || "",
                agrupacion: o.agrupacion || o.grupo || ""
            };
        }).filter(c => c.ref && c.nombre);
    },

    normalizeFromCsv(txt) {
        if (!txt) return [];
        const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (!lines.length) return [];

        const sep = lines[0].includes(";") ? ";" : ",";

        const headerParts = lines[0].split(sep).map(p => p.trim().toLowerCase());
        const hasHeader = headerParts.some(h =>
            h.includes("ref") || h.includes("nombre") || h.includes("tipo")
        );

        let startIdx = 0;
        let mapIndices = null;

        if (hasHeader) {
            mapIndices = {
                ref: headerParts.findIndex(h => h.includes("ref")),
                nombre: headerParts.findIndex(h => h.includes("nom")),
                tipo: headerParts.findIndex(h => h.includes("tipo")),
                momento: headerParts.findIndex(h => h.includes("momento")),
                agrupacion: headerParts.findIndex(h => h.includes("agrup"))
            };
            startIdx = 1;
        }

        const campos = [];

        for (let i = startIdx; i < lines.length; i++) {
            const parts = lines[i].split(sep).map(p => p.trim());
            let ref = "", nombre = "", tipo = "texto", momento = "", agrupacion = "";

            if (mapIndices) {
                ref = mapIndices.ref >= 0 ? (parts[mapIndices.ref] || "") : "";
                nombre = mapIndices.nombre >= 0 ? (parts[mapIndices.nombre] || "") : "";
                tipo = mapIndices.tipo >= 0 ? (parts[mapIndices.tipo] || "texto") : "texto";
                momento = mapIndices.momento >= 0 ? (parts[mapIndices.momento] || "") : "";
                agrupacion = mapIndices.agrupacion >= 0 ? (parts[mapIndices.agrupacion] || "") : "";
            } else {
                // Sin cabecera: columnas fijas: ref;nombre;tipo;momento;agrupacion
                ref = parts[0] || "";
                nombre = parts[1] || "";
                tipo = parts[2] || "texto";
                momento = parts[3] || "";
                agrupacion = parts[4] || "";
            }

            if (!ref || !nombre) continue;

            campos.push({
                id: (window.DataTesauro && typeof DataTesauro.generateId === "function")
                    ? DataTesauro.generateId()
                    : TesauroManager.generateId(),
                ref,
                nombre,
                tipo,
                momento,
                agrupacion
            });
        }

        return campos;
    },

    /* ---------------------------------------------
       Normalizar desde texto plano manager
    --------------------------------------------- */
    normalizeFromPlainLines(txt) {
        if (!txt) return [];
        const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const campos = [];

        lines.forEach(line => {
            if (!line) return;

            // Preferimos TAB (texto desde Excel). Si no, intentamos 2+ espacios.
            let parts = line.split("\t");
            if (parts.length < 5) {
                parts = line.split(/\s{2,}/);
            }

            if (parts.length < 4) return;

            const momento    = (parts[0] || "").trim();
            const agrupacion = (parts[1] || "").trim();
            const ref        = (parts[2] || "").trim();
            const nombre     = (parts[3] || "").trim();
            const tipoTexto  = (parts[4] || "").trim(); // clasif y borrar se ignoran

            if (!ref || !nombre) return;

            const tipo = TesauroManager.mapTipoFromTexto(tipoTexto);

            campos.push({
                id: (window.DataTesauro && typeof DataTesauro.generateId === "function")
                    ? DataTesauro.generateId()
                    : TesauroManager.generateId(),
                ref,
                nombre,
                tipo,
                momento,
                agrupacion
            });
        });

        return campos;
    },

    // mapear tipo desde texto
    mapTipoFromTexto(txt) {
        if (!txt) return "texto";
        let t = String(txt).trim().toLowerCase();

        // Quitar acentos
        if (t.normalize) {
            t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }

        if (t.includes("selector")) return "selector";
        if (t.includes("si/no") || (t.includes("si") && t.includes("no"))) return "si_no";
        if (t.startsWith("num") || t.includes("numero")) return "numero";
        if (t.includes("moneda") || t.includes("euro")) return "moneda";
        if (t.includes("fecha")) return "fecha";
        if (t.includes("texto") || t.includes("string")) return "texto";

        return "texto";
    },

    mergeImportedCampos(nuevos) {
        if (!window.DataTesauro) return;
        const actuales = DataTesauro.campos || [];
        const mapa = new Map();

        actuales.forEach(c => {
            if (!c.ref) return;
            mapa.set(c.ref.toLowerCase(), { ...c });
        });

        nuevos.forEach(c => {
            if (!c.ref) return;
            const key = c.ref.toLowerCase();
            const prev = mapa.get(key) || {};
            mapa.set(key, { ...prev, ...c });
        });

        DataTesauro.campos = Array.from(mapa.values());

        if (typeof DataTesauro.renderList === "function") {
            DataTesauro.renderList();
        } else if (typeof DataTesauro.render === "function") {
            DataTesauro.render();
        }
    },

    buildCsv(campos) {
        const header = "ref;nombre;tipo;momento;agrupacion";
        const lines = campos.map(c =>
            [
                c.ref || "",
                c.nombre || "",
                c.tipo || "",
                c.momento || "",
                c.agrupacion || ""
            ].map(v => (v || "").replace(/;/g, ",")).join(";")
        );
        return [header, ...lines].join("\r\n");
    },

    downloadText(nombre, contenido, mime) {
        const blob = new Blob([contenido], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nombre;
        a.click();
        URL.revokeObjectURL(url);
    },

    /* ---------------------------------------------
       EXPORTADOR OFICIAL TESAURO (3 CSV)
    --------------------------------------------- */
    openExportTesauroModal() {
        if (!this.exportModal) return;
        const inEnt = this.exportModal.querySelector("#tmExpEntidad");
        const inAct = this.exportModal.querySelector("#tmExpActividad");
        if (inEnt) inEnt.value = this.exportEntidad || "";
        if (inAct) inAct.value = this.exportActividad || "";
        this.exportModal.style.display = "flex";
    },

    closeExportTesauroModal() {
        if (this.exportModal) this.exportModal.style.display = "none";
    },

    doExportTesauro(entidad, actividad) {
        if (!window.DataTesauro || !Array.isArray(DataTesauro.campos) || !DataTesauro.campos.length) {
            alert("No hay campos de tesauro definidos para exportar.");
            return;
        }

        const lista = DataTesauro.campos || [];

        // 1️⃣ Tesauro.csv
        const header1 = [
            "Nombre Entidad","Sobrescribir","Eliminar","Clasificación","Referencia",
            "Nombre Castellano","Nombre Catalán","Nombre Valenciano","Nombre Gallego","Nombre Euskera","Nombre Balear",
            "Nombre Inglés","Nombre Francés","Nombre Alemán","Nombre Italiano",
            "Ayuda Castellano","Ayuda Catalán","Ayuda Valenciano","Ayuda Gallego","Ayuda Euskera","Ayuda Balear",
            "Ayuda Inglés","Ayuda Francés","Ayuda Alemán","Ayuda Italiano",
            "Tipo de campo","Propiedad del tipo de campo 1","Propiedad del tipo de campo 2","Propiedad del tipo de campo 3","Propiedad del tipo de campo 4",
            "Momento de captura","Agrupación","Obligatorio","Campo asunto"
        ];

        const traducirTipo = (t) => {
            switch (t) {
                case "selector": return "Selector I18N";
                case "texto": return "Texto";
                case "numero": return "Numérico";
                case "numerico": return "Numérico";
                case "si_no": return "Sí/No";
                case "fecha": return "Fecha";
                case "moneda": return "Moneda";
                default: return t || "";
            }
        };

        const rows1 = lista.map(c => {
            const tipoVisible = traducirTipo(c.tipo);

            let propiedad1 = "";
            if (c.tipo === "selector") propiedad1 = "Desplegable";
            if (c.tipo === "si_no") propiedad1 = "Botones";
            if (c.tipo === "fecha") propiedad1 = "Sin hora";

            return [
                entidad || "",                        // Nombre Entidad
                "No",                                 // Sobrescribir
                "No",                                 // Eliminar
                "5.00.00. SIN CLASIFICACIÓN",         // Clasificación
                c.ref || "",                          // Referencia
                c.nombre || "",                       // Nombre Castellano
                "", "", "", "", "",                   // Otros idiomas
                "", "", "", "",                       // Idiomas extra
                "", "", "", "", "", "", "", "", "", "", // Ayudas
                tipoVisible,                           // Tipo de campo
                propiedad1,                            // Propiedad 1
                "", "", "",                            // Propiedades 2-4
                c.momento || "Solicitud",              // Momento de captura
                c.agrupacion || "Agrupación",          // Agrupación
                "",                                    // Obligatorio
                ""                                     // Campo asunto
            ];
        });

        const csv1 = [header1.join(";"), ...rows1.map(r => r.map(v => this.cleanCsvValue(v)).join(";"))].join("\n");
        this.downloadCsvWithBom("Tesauro.csv", csv1);

        // 2️⃣ Tesauro_Valores.csv
        const selectores = lista.filter(c => c.tipo === "selector" && Array.isArray(c.opciones) && c.opciones.length);
        if (selectores.length) {
            const header2 = ["Referencia Tesauro", "Referencia I18N", "Idioma", "Valor"];
            const rows2 = [];

            selectores.forEach(sel => {
                sel.opciones.forEach(opt => {
                    rows2.push([
                        sel.ref || "",
                        opt.ref || "",
                        "Castellano",
                        opt.valor || ""
                    ]);
                });
            });

            const csv2 = [header2.join(";"), ...rows2.map(r => r.map(v => this.cleanCsvValue(v)).join(";"))].join("\n");
            this.downloadCsvWithBom("Tesauro_Valores.csv", csv2);
        }

        // 3️⃣ Vinculacion_Tesauros.csv
        const headerV = [
            "Nombre Entidad",
            "Sobrescribir",
            "Eliminar",
            "Referencia",
            "Actividad",
            "Momento de captura",
            "Agrupación",
            "Obligatorio",
            "Campo asunto"
        ];

        const rowsV = lista.map(c => {
            return [
                entidad || "",
                "No",
                "No",
                c.ref || "",
                actividad || "",
                c.momento || "Solicitud",
                c.agrupacion || "Agrupación",
                "",
                ""
            ];
        });

        const csvV = [headerV.join(";"), ...rowsV.map(r => r.map(v => this.cleanCsvValue(v)).join(";"))].join("\n");
        this.downloadCsvWithBom("Vinculacion_Tesauros.csv", csvV);

        console.log("📚 Exportación completada: Tesauro.csv + Tesauro_Valores.csv + Vinculacion_Tesauros.csv");
    },

    downloadCsvWithBom(nombre, contenido) {
        const bom = "\uFEFF";
        const blob = new Blob([bom + contenido], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nombre;
        a.click();
        URL.revokeObjectURL(url);
    },

    cleanCsvValue(t) {
        return (t || "").toString().replace(/\n/g, " ").replace(/;/g, ",").trim();
    },

    /* ---------------------------------------------
       ID helper
    --------------------------------------------- */
    generateId() {
        return Math.random().toString(36).substring(2, 9);
    },

    /* ---------------------------------------------
       Crear un tesauro nuevo desde el manager
    --------------------------------------------- */
    createTesauroFromManager() {
        if (!window.DataTesauro) {
            alert("DataTesauro no está disponible.");
            return;
        }

        const lista = DataTesauro.campos || [];
        const nombre = prompt("Nombre del tesauro:");
        if (!nombre || !nombre.trim()) return;

        let ref = "";
        if (typeof DataTesauro.generarReferenciaDesdeNombre === "function") {
            ref = DataTesauro.generarReferenciaDesdeNombre(nombre.trim());
        } else {
            ref = nombre.trim().replace(/\s+/g, "");
        }

        // Evitar refs duplicadas
        const existentes = new Set(
            lista.map(c => (c.ref || "").toLowerCase())
        );
        let refBase = ref || "nuevoCampo";
        let refFinal = refBase;
        let idx = 1;
        while (existentes.has(refFinal.toLowerCase())) {
            refFinal = refBase + idx++;
        }

        const nuevo = {
            id: (typeof DataTesauro.generateId === "function")
                ? DataTesauro.generateId()
                : TesauroManager.generateId(),
            ref: refFinal,
            nombre: nombre.trim(),
            tipo: "texto",
            opciones: [],
            momento: "Solicitud",
            agrupacion: "Agrupación"
        };

        lista.push(nuevo);
        DataTesauro.campos = lista;

        // Refrescar panel lateral y tabla del manager
        if (typeof DataTesauro.renderList === "function") {
            DataTesauro.renderList();
        } else if (typeof DataTesauro.render === "function") {
            DataTesauro.render();
        }

        this.render();
    }
};

window.TesauroManager = TesauroManager;
