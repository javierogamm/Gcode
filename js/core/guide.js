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
            exitBtn: null
        },
        dragDemo: null
    };

    document.addEventListener("DOMContentLoaded", () => {
        ensureTrigger();
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
            exitBtn: tooltip.querySelector(".guide-exit")
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
        const steps = buildSteps();
        if (!steps.length) return;

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
            <span class="guide-drag-label">Arrastra al texto</span>
        `;

        const baseLeft = panelRect.left + panelRect.width * 0.15;
        const baseTop = panelRect.top + 80;

        demo.style.left = `${baseLeft}px`;
        demo.style.top = `${baseTop}px`;

        if (editorRect) {
            const deltaX = Math.max(-250, editorRect.left - baseLeft + 20);
            const deltaY = Math.max(-60, Math.min(120, editorRect.top - baseTop + 60));
            demo.style.setProperty("--drag-x", `${deltaX}px`);
            demo.style.setProperty("--drag-y", `${deltaY}px`);
        }

        document.body.appendChild(demo);
        state.dragDemo = demo;
    }

    function removeDragDemo() {
        if (state.dragDemo && state.dragDemo.parentNode) {
            state.dragDemo.parentNode.removeChild(state.dragDemo);
        }
        state.dragDemo = null;
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
