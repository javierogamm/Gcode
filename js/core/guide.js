(function () {
    const messages = {
        toolbar: {
            title: "Zona de estilos",
            description: "Aquí encuentras formatos rápidos (negrita, encabezados, listas, tablas) que se aplican sobre el texto seleccionado."
        },
        editor: {
            title: "Zona de edición",
            description: "Escribe y pega tu Markdown. Todo lo que insertes desde los botones flotantes aparece en este espacio."
        },
        floatingButtons: {
            btnSections: "Abre el asistente de Sections para crear bloques condicionales con tesauros.",
            btnLet: "Define bloques LET y variables reutilizables dentro del documento.",
            btnDefinition: "Inserta definiciones rápidas con título y contenido estructurado.",
            btnTesauroCrear: "Crea un tesauro al vuelo e insértalo sin salir del editor.",
            btnTesauro: "Abre el panel lateral para buscar y arrastrar tesauros al texto."
        },
        tesauroManager: {
            title: "Gestor de tesauros",
            description: "Acceso directo al gestor completo para importar, editar o exportar todos los tesauros del proyecto."
        },
        tutorial: {
            introTitle: "Tesauros: elige tu ruta",
            introDesc: "¿Tienes tesauros configurados en Gestiona? Elige cómo quieres continuar para configurarlos en Gcode.",
            createTitle: "Crea tesauros desde cero",
            createDesc: "Puedes crear y configurar todos los tesauros que necesites directamente en la plantilla.",
            managerEntry: "El gestor de tesauros te permite crear y administrar todos los campos de la plantilla.",
            managerNew: "Añade tesauros individualmente con el botón de creación dentro del gestor.",
            managerBatch: "Carga varios tesauros a la vez desde el botón \"Referenciar Tesauros\" pegando sus nombres (uno por línea).",
            importIntro: "Tienes varias formas de importar tesauros existentes antes de trabajar el Markdown.",
            importText: "Copia y pega los tesauros como texto plano tal cual salen de la actividad en Gestiona.",
            importCsv: "Importa los CSV usados por las RPA en Gestiona. Si tienes Tesauro.csv y Tesauro_Valores.csv, añade ambos.",
            importMd: "Si ya tienes un Markdown con tesauros, pégalo y Gcode detectará automáticamente las referencias."
        }
    };

    const state = {
        steps: [],
        current: 0,
        active: false,
        cleanup: null,
        elements: {
            layer: null,
            dim: null,
            highlight: null,
            tooltip: null,
            title: null,
            text: null,
            prevBtn: null,
            nextBtn: null,
            exitBtn: null,
            actions: null
        },
        dragDemo: null
    };

    const tutorialModal = {
        overlay: null,
        confirmBtn: null,
        insertBtn: null,
        cancelBtn: null
    };

    document.addEventListener("DOMContentLoaded", () => {
        ensureTrigger();
        ensureTutorialTrigger();
        createLayer();
        attachEvents();
    });

    function ensureTrigger() {
        let trigger = document.getElementById("guideTrigger");
        if (!trigger) {
            trigger = document.createElement("button");
            trigger.id = "guideTrigger";
            trigger.className = "guide-trigger";
            trigger.type = "button";
            trigger.textContent = "GUÍA";
            document.body.appendChild(trigger);
        }
        trigger.addEventListener("click", startGuide);
        return trigger;
    }

    function ensureTutorialTrigger() {
        let trigger = document.getElementById("tutorialTrigger");
        if (!trigger) {
            trigger = document.createElement("button");
            trigger.id = "tutorialTrigger";
            trigger.className = "tutorial-trigger";
            trigger.type = "button";
            trigger.textContent = "TUTORIAL";
            document.body.appendChild(trigger);
        }
        trigger.addEventListener("click", startTesauroTutorial);
        return trigger;
    }

    function ensureTutorialModal() {
        if (tutorialModal.overlay) return tutorialModal;

        const overlay = document.createElement("div");
        overlay.className = "modal-overlay tutorial-start-overlay";

        const card = document.createElement("div");
        card.className = "modal-card tutorial-start-card";

        const header = document.createElement("div");
        header.className = "modal-header";
        const title = document.createElement("h3");
        title.textContent = "¿Qué quieres hacer?";
        const close = document.createElement("button");
        close.type = "button";
        close.className = "modal-close";
        close.innerHTML = "&times;";
        header.appendChild(title);
        header.appendChild(close);

        const body = document.createElement("div");
        body.className = "tutorial-start-body";
        const message = document.createElement("p");
        message.textContent = "Elige cómo quieres continuar con las opciones guiadas del tutorial.";
        body.appendChild(message);

        const list = document.createElement("div");
        list.className = "tutorial-start-list";

        const confirm = document.createElement("button");
        confirm.type = "button";
        confirm.className = "tutorial-start-btn";
        confirm.textContent = "Configurar tesauros";

        const insert = document.createElement("button");
        insert.type = "button";
        insert.className = "tutorial-start-btn tutorial-start-secondary";
        insert.textContent = "Insertar tesauro en el Markdown";

        list.appendChild(confirm);
        list.appendChild(insert);

        const actions = document.createElement("div");
        actions.className = "tutorial-start-actions";

        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "tutorial-start-btn tutorial-start-cancel";
        cancel.textContent = "Cerrar";

        actions.appendChild(cancel);
        body.appendChild(list);
        body.appendChild(actions);

        card.appendChild(header);
        card.appendChild(body);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        overlay.addEventListener("click", (ev) => {
            if (ev.target === overlay) {
                closeTutorialModal();
            }
        });
        close.addEventListener("click", closeTutorialModal);
        cancel.addEventListener("click", closeTutorialModal);

        tutorialModal.overlay = overlay;
        tutorialModal.confirmBtn = confirm;
        tutorialModal.insertBtn = insert;
        tutorialModal.cancelBtn = cancel;
        return tutorialModal;
    }

    function createLayer() {
        if (state.elements.layer) return state.elements.layer;

        const layer = document.createElement("div");
        layer.className = "guide-layer";

        const dim = document.createElement("div");
        dim.className = "guide-dim";

        const highlight = document.createElement("div");
        highlight.className = "guide-highlight";

        const tooltip = document.createElement("div");
        tooltip.className = "guide-tooltip";
        tooltip.innerHTML = `
            <h4 id="guideTitle"></h4>
            <p id="guideText"></p>
            <div class="guide-actions">
                <button type="button" class="guide-prev">Anterior</button>
                <button type="button" class="guide-next">Siguiente</button>
                <button type="button" class="guide-exit">Salir</button>
            </div>
        `;

        layer.appendChild(dim);
        layer.appendChild(highlight);
        layer.appendChild(tooltip);
        document.body.appendChild(layer);

        state.elements = {
            layer,
            dim,
            highlight,
            tooltip,
            title: tooltip.querySelector("#guideTitle"),
            text: tooltip.querySelector("#guideText"),
            prevBtn: tooltip.querySelector(".guide-prev"),
            nextBtn: tooltip.querySelector(".guide-next"),
            exitBtn: tooltip.querySelector(".guide-exit"),
            actions: tooltip.querySelector(".guide-actions")
        };

        return layer;
    }

    function attachEvents() {
        const { prevBtn, nextBtn, exitBtn } = state.elements;
        if (!prevBtn || !nextBtn || !exitBtn) return;

        prevBtn.addEventListener("click", () => goToStep(state.current - 1));
        nextBtn.addEventListener("click", () => goToStep(state.current + 1));
        exitBtn.addEventListener("click", endGuide);
        window.addEventListener("resize", () => {
            if (state.active) renderStep(state.current);
        });
        window.addEventListener("scroll", () => {
            if (state.active) renderStep(state.current);
        }, { passive: true });
    }

    function startGuide() {
        startFlow(buildSteps);
    }

    function startTesauroTutorial() {
        openTutorialModal({
            onConfigure: () => startFlow(buildTesauroTutorialSteps),
            onInsert: () => startFlow(buildInsertTesauroFlow)
        });
    }

    function openTutorialModal(options = {}) {
        const modal = ensureTutorialModal();
        if (!modal.overlay || !modal.confirmBtn) return;

        modal.overlay.style.display = "flex";

        const handleConfirm = () => {
            closeTutorialModal();
            if (typeof options.onConfigure === "function") options.onConfigure();
        };

        const handleInsert = () => {
            closeTutorialModal();
            if (typeof options.onInsert === "function") options.onInsert();
        };

        modal.confirmBtn.onclick = handleConfirm;
        if (modal.insertBtn) {
            modal.insertBtn.onclick = handleInsert;
        }
    }

    function closeTutorialModal() {
        if (tutorialModal.overlay) {
            tutorialModal.overlay.style.display = "none";
        }
        if (tutorialModal.confirmBtn) {
            tutorialModal.confirmBtn.onclick = null;
        }
        if (tutorialModal.insertBtn) {
            tutorialModal.insertBtn.onclick = null;
        }
    }

    function startFlow(builder) {
        const steps = typeof builder === "function" ? builder() : builder;
        if (!steps || !steps.length) return;

        runCleanup();
        state.steps = steps;
        state.current = 0;
        state.active = true;
        state.cleanup = null;

        state.elements.layer.classList.add("active");
        renderStep(0);
    }

    function endGuide() {
        runCleanup();
        state.active = false;
        state.elements.layer.classList.remove("active");
        resetOverlay();
    }

    function buildSteps() {
        const steps = [];
        const editor = document.getElementById("workContainer") || document.getElementById("markdownText");
        const toolbar = document.getElementById("toolbar");
        const floatingRow = (window.ensureFloatingActionRow && ensureFloatingActionRow()) || document.getElementById("floatingActionRow");
        const floatingBtns = floatingRow ? Array.from(floatingRow.querySelectorAll("button")) : [];
        const managerBtn = document.getElementById("btnTesauroManagerFloating");

        if (editor) {
            steps.push({
                title: messages.editor.title,
                description: messages.editor.description,
                element: () => editor
            });
        }

        if (toolbar) {
            steps.push({
                title: messages.toolbar.title,
                description: messages.toolbar.description,
                element: () => toolbar
            });
        }

        floatingBtns.forEach((btn) => {
            const id = btn.id || "";
            const text = btn.textContent.trim() || "Botón flotante";
            const custom = messages.floatingButtons[id];
            const description = custom || `Acción rápida: ${text}. Inserta contenido directamente en el editor.`;

            if (id === "btnTesauro") {
                steps.push({
                    title: text || "Insertar Tesauro",
                    description: "Abre el panel lateral y arrastra tesauros al texto o insértalos con un clic.",
                    element: () => ensureTesauroPanelOpen() || btn,
                    onEnter: () => {
                        const panel = document.getElementById("tesauroPanel");
                        showDragDemo(panel);
                    }
                });
                return;
            }

            steps.push({
                title: text,
                description,
                element: () => btn
            });
        });

        if (managerBtn) {
            steps.push(...buildTesauroManagerSteps(managerBtn));
        }

        return steps;
    }

    function goToStep(index) {
        if (index !== state.current) {
            runCleanup();
        }
        if (index < 0) {
            return;
        }
        if (index >= state.steps.length) {
            endGuide();
            return;
        }
        state.current = index;
        renderStep(index);
    }

    function renderStep(index) {
        const step = state.steps[index];
        if (!step) return;

        const target = typeof step.element === "function" ? step.element() : null;
        if (!target) {
            goToStep(index + 1);
            return;
        }

        target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        positionHighlight(target);

        state.elements.title.textContent = step.title;
        state.elements.text.textContent = step.description;

        const isLast = index === state.steps.length - 1;
        state.elements.nextBtn.textContent = isLast ? "Finalizar" : "Siguiente";

        placeTooltipNear(target);

        if (typeof step.onEnter === "function") {
            const result = step.onEnter(target);
            if (typeof result === "function") {
                state.cleanup = result;
            }
        }
    }

    function positionHighlight(target) {
        const rect = target.getBoundingClientRect();
        const padding = 10;
        const { highlight } = state.elements;

        highlight.style.left = `${rect.left - padding}px`;
        highlight.style.top = `${rect.top - padding}px`;
        highlight.style.width = `${rect.width + padding * 2}px`;
        highlight.style.height = `${rect.height + padding * 2}px`;
    }

    function placeTooltipNear(target) {
        const rect = target.getBoundingClientRect();
        const tooltip = state.elements.tooltip;
        if (!tooltip) return;

        // Inicialmente mostrar para calcular dimensiones
        tooltip.style.left = "0px";
        tooltip.style.top = "0px";

        const margin = 12;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const tooltipRect = tooltip.getBoundingClientRect();

        let left = rect.left;
        if (left + tooltipRect.width > viewportWidth - margin) {
            left = viewportWidth - tooltipRect.width - margin;
        }
        if (left < margin) {
            left = margin;
        }

        let top = rect.bottom + margin;
        if (top + tooltipRect.height > viewportHeight - margin) {
            top = rect.top - tooltipRect.height - margin;
        }
        if (top < margin) {
            top = margin;
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }

    function runCleanup() {
        if (typeof state.cleanup === "function") {
            try { state.cleanup(); } catch (err) { console.error(err); }
        }
        state.cleanup = null;
        removeDragDemo();
    }

    function switchSteps(newSteps) {
        if (!Array.isArray(newSteps) || !newSteps.length) return;
        runCleanup();
        state.steps = newSteps;
        state.current = 0;
        renderStep(0);
    }

    function useBranchActions(options) {
        const { actions, prevBtn, nextBtn, layer } = state.elements;
        if (!actions || !layer) return () => {};

        const originalPrevDisplay = prevBtn?.style.display || "";
        const originalNextDisplay = nextBtn?.style.display || "";

        if (prevBtn) prevBtn.style.display = "none";
        if (nextBtn) nextBtn.style.display = "none";

        const existingOverlay = layer.querySelector(".guide-branch-overlay");
        if (existingOverlay) existingOverlay.remove();

        const overlay = document.createElement("div");
        overlay.className = "guide-branch-overlay";

        const card = document.createElement("div");
        card.className = "guide-branch-card";

        const title = document.createElement("h4");
        title.textContent = options.title || state.elements.title?.textContent || "Elige una ruta";
        const desc = document.createElement("p");
        desc.textContent = options.description || state.elements.text?.textContent || "Selecciona cómo quieres continuar.";

        const wrapper = document.createElement("div");
        wrapper.className = "guide-branch-options";

        const primary = document.createElement("button");
        primary.type = "button";
        primary.className = "guide-branch-primary";
        primary.textContent = options.primaryLabel || "Opción 1";
        primary.addEventListener("click", options.onPrimary);

        const secondary = document.createElement("button");
        secondary.type = "button";
        secondary.className = "guide-branch-secondary";
        secondary.textContent = options.secondaryLabel || "Opción 2";
        secondary.addEventListener("click", options.onSecondary);

        wrapper.appendChild(primary);
        wrapper.appendChild(secondary);

        card.appendChild(title);
        card.appendChild(desc);
        card.appendChild(wrapper);
        overlay.appendChild(card);
        layer.appendChild(overlay);

        return () => {
            overlay.remove();
            if (prevBtn) prevBtn.style.display = originalPrevDisplay;
            if (nextBtn) nextBtn.style.display = originalNextDisplay;
        };
    }

    function resetOverlay() {
        const { highlight, tooltip } = state.elements;
        if (highlight) {
            highlight.style.left = "-9999px";
            highlight.style.top = "-9999px";
            highlight.style.width = "0px";
            highlight.style.height = "0px";
        }
        if (tooltip) {
            tooltip.style.left = "-9999px";
            tooltip.style.top = "-9999px";
        }
    }

    function ensureTesauroPanelOpen() {
        const panel = document.getElementById("tesauroPanel");
        if (panel && !panel.classList.contains("visible")) {
            panel.classList.add("visible");
        } else if (!panel && window.DataTesauro && typeof DataTesauro.togglePanel === "function") {
            DataTesauro.togglePanel();
        }
        return document.getElementById("tesauroPanel") || panel;
    }

    function showDragDemo(panel) {
        if (!panel) return;
        removeDragDemo();
        const editor = document.getElementById("markdownText") || document.getElementById("workContainer");
        const panelRect = panel.getBoundingClientRect();
        const editorRect = editor ? editor.getBoundingClientRect() : null;

        const demo = document.createElement("div");
        demo.className = "guide-drag-demo";
        demo.innerHTML = `
            <span class="guide-drag-dot">🏷️</span>
            <span class="guide-drag-label">TESAURO</span>
        `;

        const baseLeft = Math.min(
            Math.max(panelRect.left + panelRect.width * 0.5, 12),
            window.innerWidth - 120
        );
        const baseTop = Math.min(
            Math.max(panelRect.top + panelRect.height * 0.5, 12),
            window.innerHeight - 120
        );

        demo.style.left = `${baseLeft}px`;
        demo.style.top = `${baseTop}px`;

        if (editorRect) {
            const targetX = editorRect.left + editorRect.width * 0.5;
            const targetY = editorRect.top + editorRect.height * 0.5;
            const deltaX = Math.max(-900, Math.min(160, targetX - baseLeft));
            const deltaY = Math.max(-240, Math.min(240, targetY - baseTop));
            demo.style.setProperty("--drag-x", `${deltaX}px`);
            demo.style.setProperty("--drag-y", `${deltaY}px`);
        }

        demo.style.animationIterationCount = "3";
        demo.style.animationDuration = "4.6s";
        demo.addEventListener("animationend", () => {
            removeDragDemo();
        }, { once: true });

        document.body.appendChild(demo);
        state.dragDemo = demo;
    }

    function removeDragDemo() {
        if (state.dragDemo && state.dragDemo.parentNode) {
            state.dragDemo.parentNode.removeChild(state.dragDemo);
        }
        state.dragDemo = null;
    }

    function buildTesauroTutorialSteps() {
        const createFlow = buildTesauroCreationFlow();
        const importFlow = buildTesauroImportFlow();

        const introStep = {
            title: messages.tutorial.introTitle,
            description: messages.tutorial.introDesc,
            element: () => document.getElementById("tutorialTrigger") || document.getElementById("guideTrigger"),
            onEnter: () => useBranchActions({
                primaryLabel: "No, debo crearlos",
                secondaryLabel: "Sí, ya los tengo",
                onPrimary: () => switchSteps(createFlow),
                onSecondary: () => switchSteps(importFlow)
            })
        };

        return [introStep];
    }

    function buildTesauroCreationFlow() {
        const managerBtn = document.getElementById("btnTesauroManagerFloating");

        return [
            {
                title: messages.tutorial.createTitle,
                description: `${messages.tutorial.createDesc} Pulsa en "Crear Tesauro" para añadir uno nuevo desde la plantilla y se insertará en el Markdown actual.`,
                element: () => document.getElementById("btnTesauroCrear")
            },
            {
                title: "Gestor de tesauros",
                description: `${messages.tutorial.managerEntry} También puedes gestionar las referencias sin salir del editor.`,
                element: () => managerBtn,
                onEnter: () => ensureTesauroManager()
            },
            {
                title: "Crear tesauros individuales",
                description: messages.tutorial.managerNew,
                element: () => findInManager("#tmNewTesauro"),
                onEnter: () => ensureTesauroManager()
            },
            {
                title: "Crear varios tesauros a la vez",
                description: messages.tutorial.managerBatch,
                element: () => findInManager("#tmOpenRefPopup"),
                onEnter: () => {
                    ensureTesauroManager();
                    if (window.TesauroManager?.openRefPopup) {
                        TesauroManager.openRefPopup();
                    }
                    return () => hideIfExists(window.TesauroManager?.refModal);
                }
            },
            {
                title: "Pega la lista de nombres",
                description: "Pon los nombres de los tesauros separados por salto de línea y Gcode sugerirá las referencias automáticamente.",
                element: () => document.querySelector("#refInput") || document.querySelector("#tmReferencias") || findInManager("#tmOpenRefPopup"),
                onEnter: () => {
                    ensureTesauroManager();
                    if (window.TesauroManager?.openRefPopup) {
                        TesauroManager.openRefPopup();
                    }
                    return () => hideIfExists(window.TesauroManager?.refModal);
                }
            }
        ];
    }

    function buildTesauroImportFlow() {
        return [
            {
                title: "Importa tus tesauros existentes",
                description: messages.tutorial.importIntro,
                element: () => document.getElementById("btnTesauroManagerFloating"),
                onEnter: () => ensureTesauroManager()
            },
            {
                title: "Copiar y pegar como texto",
                description: messages.tutorial.importText,
                element: () => findInManager("#tmOpenPlainImport"),
                onEnter: () => openModalWithManager(() => window.TesauroManager?.openPlainImportPopup?.(), () => window.TesauroManager?.importModal)
            },
            {
                title: "Pega los tesauros desde Gestiona",
                description: "Copia y pega directamente desde la actividad en Gestiona para cargarlos en bloque.",
                element: () => document.querySelector("#tmPlainInput") || window.TesauroManager?.importModal,
                onEnter: () => openModalWithManager(() => window.TesauroManager?.openPlainImportPopup?.(), () => window.TesauroManager?.importModal)
            },
            {
                title: "Importar desde CSV",
                description: messages.tutorial.importCsv,
                element: () => findInManager("#tmOpenCsvImport"),
                onEnter: () => openModalWithManager(() => window.TesauroManager?.openCsvImportPopup?.(), () => window.TesauroManager?.csvImportModal)
            },
            {
                title: "Adjunta los CSV de RPA",
                description: "Sube Tesauro.csv y, si los tienes, Tesauro_Valores.csv y Vinculacion_Tesauros.csv.",
                element: () => document.querySelector("#tmCsvFileMain") || window.TesauroManager?.csvImportModal,
                onEnter: () => openModalWithManager(() => window.TesauroManager?.openCsvImportPopup?.(), () => window.TesauroManager?.csvImportModal)
            },
            {
                title: "Importar desde Markdown",
                description: messages.tutorial.importMd,
                element: () => findInManager("#tmOpenMdImport"),
                onEnter: () => openModalWithManager(() => window.TesauroManager?.openMarkdownImportPopup?.(), () => window.TesauroManager?.markdownImportModal)
            },
            {
                title: "Pega tu Markdown con tesauros",
                description: "Pega aquí el código Markdown y Gcode detectará las referencias para añadirlas al gestor.",
                element: () => document.querySelector("#tmMdInput") || window.TesauroManager?.markdownImportModal,
                onEnter: () => openModalWithManager(() => window.TesauroManager?.openMarkdownImportPopup?.(), () => window.TesauroManager?.markdownImportModal)
            }
        ];
    }

    function buildInsertTesauroFlow() {
        const panelBtn = document.getElementById("btnTesauro");
        const managerBtn = document.getElementById("btnTesauroManagerFloating");

        const ensurePanel = () => {
            const panel = ensureTesauroPanelOpen();
            return panel || panelBtn;
        };

        const findInsertButton = () => {
            const panel = ensureTesauroPanelOpen();
            return panel ? panel.querySelector(".tesauro-item .tesauro-insert") : null;
        };

        return [
            {
                title: "Abre el panel lateral de tesauros",
                description: "Pulsa el botón flotante o elige \"Tesauros\" para mostrar los campos disponibles a la derecha.",
                element: () => ensurePanel(),
                onEnter: () => ensureTesauroPanelOpen()
            },
            {
                title: "Arrastra un tesauro al editor",
                description: "Puedes arrastrar cualquier campo al área de texto para insertarlo donde tengas el cursor.",
                element: () => ensureTesauroPanelOpen(),
                onEnter: () => {
                    const panel = ensureTesauroPanelOpen();
                    showDragDemo(panel);
                    return () => removeDragDemo();
                }
            },
            {
                title: "Inserta con un clic",
                description: "Si prefieres, usa el botón ➕ de cada tesauro para insertarlo automáticamente en el Markdown.",
                element: () => findInsertButton() || ensureTesauroPanelOpen(),
                onEnter: () => ensureTesauroPanelOpen()
            },
            {
                title: "Revisa el resultado en el editor",
                description: "El tesauro se coloca en la posición del cursor. Si necesitas otro, repite desde el panel lateral.",
                element: () => document.getElementById("markdownText") || document.getElementById("workContainer"),
                onEnter: () => ensureTesauroPanelOpen()
            },
            {
                title: "Gestiona tesauros sin salir",
                description: "¿Te falta algún campo? Abre el gestor completo para crear o importar nuevos antes de insertarlos.",
                element: () => managerBtn,
                onEnter: () => ensureTesauroManager()
            }
        ];
    }

    function ensureTesauroManager() {
        if (window.TesauroManager && typeof TesauroManager.open === "function") {
            TesauroManager.open();
            return TesauroManager.modal || document.getElementById("tesauroManagerModal");
        }
        return null;
    }

    function findInManager(selector) {
        const modal = ensureTesauroManager();
        return modal ? modal.querySelector(selector) : null;
    }

    function openModalWithManager(openFn, modalGetter) {
        ensureTesauroManager();
        if (typeof openFn === "function") {
            openFn();
        }
        const cleanup = () => {
            const modal = typeof modalGetter === "function" ? modalGetter() : null;
            hideIfExists(modal);
        };
        return cleanup;
    }

    function hideIfExists(modal) {
        if (modal && modal.style) {
            modal.style.display = "none";
        }
    }

    function buildTesauroManagerSteps(managerBtn) {
        const steps = [];
        const ensureManager = () => {
            if (window.TesauroManager && typeof TesauroManager.open === "function") {
                TesauroManager.open();
                return TesauroManager.modal || document.getElementById("tesauroManagerModal");
            }
            return null;
        };

        steps.push({
            title: managerBtn.textContent.trim() || "Tesauro Manager",
            description: "Este botón flotante abre el gestor completo para administrar todos los tesauros.",
            element: () => managerBtn
        });

        steps.push({
            title: messages.tesauroManager.title,
            description: messages.tesauroManager.description,
            element: () => ensureManager() || managerBtn,
            onEnter: () => ensureManager()
        });

        const managerButtons = [
            {
                id: "tmExportTesauroAll",
                title: "Exportar tesauros",
                description: "Genera los 3 CSV oficiales del tesauro con los nombres de Entidad y Actividad que definas."
            },
            {
                id: "tmOpenPlainImport",
                title: "Importar tesauros (texto)",
                description: "Pega tesauros en texto plano para cargarlos masivamente en la tabla."
            },
            {
                id: "tmOpenMdImport",
                title: "Importar desde Markdown",
                description: "Detecta tesauros dentro de un Markdown y los añade al gestor sin perder el formato."
            },
            {
                id: "tmOpenRefPopup",
                title: "Referenciar tesauros",
                description: "Crea referencias cruzadas entre tesauros existentes para reutilizarlos."
            },
            {
                id: "tmNewTesauro",
                title: "Crear tesauro",
                description: "Añade una fila nueva para definir un tesauro desde cero."
            },
            {
                id: "tmSave",
                title: "Guardar cambios",
                description: "Guarda en bloque todas las ediciones realizadas en la tabla."
            },
            {
                id: "tmClose",
                title: "Cerrar gestor",
                description: "Cierra el gestor y vuelve al editor manteniendo los cambios."
            }
        ];

        managerButtons.forEach((info) => {
            steps.push({
                title: info.title,
                description: info.description,
                element: () => {
                    const modal = ensureManager();
                    return modal ? modal.querySelector(`#${info.id}`) : null;
                },
                onEnter: () => ensureManager()
            });
        });

        return steps;
    }
})();
