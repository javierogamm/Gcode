console.log("🚀 Editor Markdown básico iniciado");

/* =======================================
   REFERENCIAS
======================================= */
const markdownText = document.getElementById("markdownText");
const btnNuevo = document.getElementById("btnNuevo");
const btnPegarAuto = document.getElementById("btnPegarAuto");
const btnCopiar = document.getElementById("btnCopiar");
const btnDescargar = document.getElementById("btnDescargar");
const btnExportProyecto = document.getElementById("btnExportProyecto");
const btnImportDoc = document.getElementById("btnImportDoc");
if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.js";
}
if (btnExportProyecto) {
    btnExportProyecto.addEventListener("click", () => {
        const textarea = document.getElementById("markdownText");
        const markdown = textarea ? textarea.value : "";

        // Coger lista completa de tesauros desde DataTesauro
        const tesauros = (window.DataTesauro && Array.isArray(DataTesauro.campos))
            ? DataTesauro.campos
            : [];

        const proyecto = {
            markdown: markdown,
            tesauros: tesauros
        };

        const jsonStr = JSON.stringify(proyecto, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "proyecto_markdown_tesauros.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}
const btnImportProyecto = document.getElementById("btnImportProyecto");
if (btnImportProyecto) {
    btnImportProyecto.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json,.json";

        input.addEventListener("change", (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const raw = reader.result || "";
                    const data = JSON.parse(raw);

                    // 1) Restaurar markdown
                    if (data && typeof data.markdown === "string") {
                        const ta = document.getElementById("markdownText");
                        if (ta) {
                            ta.value = data.markdown;

                            // Si tienes resaltado/preview, lo actualizamos
                            if (typeof window.updateHighlight === "function") {
                                updateHighlight();
                            }
                        }
                    }

                    // 2) Restaurar tesauros completos
                    if (data && Array.isArray(data.tesauros) && window.DataTesauro) {
                        DataTesauro.campos = data.tesauros;

                        if (typeof DataTesauro.renderList === "function") {
                            DataTesauro.renderList();
                        } else if (typeof DataTesauro.render === "function") {
                            DataTesauro.render();
                        }
                    }

                    alert("✔ Proyecto importado correctamente.");
                } catch (err) {
                    console.error(err);
                    alert("No se ha podido leer el JSON del proyecto.");
                }
            };

            reader.readAsText(file, "utf-8");
        });

        input.click();
    });
}
if (btnImportDoc) {
    btnImportDoc.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

        input.addEventListener("change", async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            try {
                btnImportDoc.disabled = true;
                btnImportDoc.textContent = "⏳ Importando...";

                const markdown = await importDocumentToMarkdown(file);
                markdownText.value = markdown;
                if (typeof pushUndoState === "function") {
                    pushUndoState();
                }
                if (typeof updateHighlight === "function") {
                    updateHighlight();
                }
            } catch (err) {
                console.error(err);
                alert("No se pudo importar el documento. " + (err && err.message ? err.message : ""));
            } finally {
                btnImportDoc.disabled = false;
                btnImportDoc.textContent = "📄 Importar Word / PDF";
                input.value = "";
            }
        });

        input.click();
    });
}

async function importDocumentToMarkdown(file) {
    const name = (file && file.name ? file.name : "").toLowerCase();

    if (name.endsWith(".pdf")) {
        await ensurePdfJs();
        const text = await pdfFileToMarkdown(file);
        return (text || "").trim();
    }

    if (name.endsWith(".docx")) {
        await ensureJsZip();
        const md = await docxToMarkdown(file);
        return (md || "").trim();
    }

    throw new Error("Formato no soportado. Usa Word (.docx) o PDF.");
}

async function pdfFileToMarkdown(file) {
    const arrayBuffer = await file.arrayBuffer();
    if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.js";
    }

    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const items = content.items || [];
        let currentLine = "";
        const lines = [];

        items.forEach((item) => {
            const chunk = (item.str || "").trim();
            if (!chunk) return;

            currentLine += chunk;
            if (!item.hasEOL) {
                currentLine += " ";
                return;
            }

            lines.push(currentLine.trim());
            currentLine = "";
        });

        if (currentLine.trim()) {
            lines.push(currentLine.trim());
        }

        if (lines.length) {
            pages.push(lines.join("\n"));
        }
    }

    return pages.join("\n\n");
}

async function docxToMarkdown(file) {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await window.JSZip.loadAsync(arrayBuffer);
    const documentFile = zip.file("word/document.xml");

    if (!documentFile) {
        throw new Error("El archivo Word no tiene el contenido esperado.");
    }

    const xmlContent = await documentFile.async("text");
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlContent, "application/xml");

    const paragraphs = [...xml.getElementsByTagName("w:p")];
    const blocks = [];

    paragraphs.forEach(p => {
        const text = extractDocxParagraphText(p);
        if (!text) return;

        const isList = p.getElementsByTagName("w:numPr").length > 0;
        const styleNode = p.querySelector("w\\:pPr w\\:pStyle");
        const styleVal = styleNode ? (styleNode.getAttribute("w:val") || styleNode.getAttribute("val") || "") : "";
        const headingLevel = getHeadingLevel(styleVal);

        if (headingLevel) {
            blocks.push(`${"#".repeat(headingLevel)} ${text}`);
            return;
        }

        if (isList) {
            blocks.push(`- ${text}`);
            return;
        }

        blocks.push(text);
        blocks.push("");
    });

    return blocks.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function getHeadingLevel(styleVal) {
    const style = (styleVal || "").toLowerCase();
    if (style.includes("heading1")) return 1;
    if (style.includes("heading2")) return 2;
    if (style.includes("heading3")) return 3;
    return 0;
}

function extractDocxParagraphText(paragraph) {
    const runs = [...paragraph.getElementsByTagName("w:r")];
    let result = "";

    runs.forEach(run => {
        const texts = [...run.getElementsByTagName("w:t")].map(t => t.textContent).join("");
        if (!texts) return;

        const isBold = run.getElementsByTagName("w:b").length > 0;
        const isItalic = run.getElementsByTagName("w:i").length > 0;
        let chunk = texts;

        if (isBold) chunk = `**${chunk}**`;
        if (isItalic) chunk = `*${chunk}*`;

        result += chunk;
    });

    return result.trim();
}

async function ensurePdfJs() {
    if (window.pdfjsLib) return;
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.min.js");
    if (!window.pdfjsLib) {
        throw new Error("No se pudo cargar PDF.js para leer el PDF.");
    }
    if (window.pdfjsLib.GlobalWorkerOptions && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.js";
    }
}

async function ensureJsZip() {
    if (window.JSZip) return;
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
    if (!window.JSZip) {
        throw new Error("No se pudo cargar JSZip para leer el archivo de Word.");
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            if (existing.dataset.loaded === "1" || existing.readyState === "complete" || existing.readyState === "loaded") {
                resolve();
                return;
            }

            existing.addEventListener("load", () => resolve());
            existing.addEventListener("error", () => reject(new Error("Error al cargar script externo.")));
            return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = () => {
            script.dataset.loaded = "1";
            resolve();
        };
        script.onerror = () => reject(new Error("Error al cargar script externo."));
        document.head.appendChild(script);
    });
}

/* =======================================
   SISTEMA DE UNDO / REDO
   - Guarda todos los cambios de texto
   - Funciona con:
       · Teclado
       · Botones toolbar
       · Pegado "limpio" desde Word
======================================= */
const UndoManager = {
    undoStack: [],
    redoStack: [],
    lastValue: "",

    // Guarda un nuevo estado si ha cambiado
    push(newValue) {
        if (newValue === this.lastValue) return;
        this.undoStack.push(this.lastValue);
        this.lastValue = newValue;
        this.redoStack = [];
    },

    // Alias por compatibilidad (Tesauro, etc.)
    saveState() {
        this.push(markdownText.value);
    },

    undo() {
        if (this.undoStack.length === 0) return null;

        const prev = this.undoStack.pop();
        this.redoStack.push(this.lastValue);
        this.lastValue = prev;
        return prev;
    },

    redo() {
        if (this.redoStack.length === 0) return null;

        const next = this.redoStack.pop();
        this.undoStack.push(this.lastValue);
        this.lastValue = next;
        return next;
    }
};

// Estado inicial
UndoManager.lastValue = markdownText.value || "";

// Helper global (lo usan también otros scripts si quieren)
function pushUndoState() {
    UndoManager.push(markdownText.value);
}

// Registrar un cambio desde cualquier textarea (por ejemplo, inserciones programáticas)
function recordUndoAfterChange(targetTextarea) {
    const source = targetTextarea || markdownText;
    if (!source) return;

    const value = source.value;
    if (window.UndoManager && typeof UndoManager.push === "function") {
        UndoManager.push(value);
    } else if (typeof window.pushUndoState === "function") {
        pushUndoState();
    }
}

/* =======================================
   TOOLBAR → APLICAR FORMATO MARKDOWN
======================================= */
document.querySelectorAll("#toolbar button").forEach(btn => {
    btn.addEventListener("mousedown", e => e.preventDefault());
    btn.addEventListener("click", () => {
        const type = btn.dataset.md;
        applyMarkdownFormat(type);
        // Tras cambiar el texto, registramos el estado
        pushUndoState();
        updateHighlight();
    });
});

function applyMarkdownFormat(type) {
    const ta = markdownText;
    ta.focus();

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    let selected = ta.value.slice(start, end);
    let formatted = selected;

    function unformat(regex) {
        // Sustituye **texto** → texto (o equivalente)
        return selected.replace(regex, "$1");
    }

    switch (type) {

        // --- BOLD ---
        case "bold":
            if (/\*\*(.*?)\*\*/.test(selected)) {
                formatted = unformat(/\*\*(.*?)\*\*/g);
            } else {
                formatted = `**${selected}**`;
            }
            break;

        // --- ITALIC ---
        case "italic":
            if (/\*(.*?)\*/.test(selected)) {
                formatted = unformat(/\*(.*?)\*/g);
            } else {
                formatted = `*${selected}*`;
            }
            break;

        // --- UNDERLINE ---
        case "underline":
            if (/<u>(.*?)<\/u>/.test(selected)) {
                formatted = unformat(/<u>(.*?)<\/u>/g);
            } else {
                formatted = `<u>${selected}</u>`;
            }
            break;

        // --- H1 ---
        case "h1":
            if (selected.includes("# ")) {
                formatted = selected.replace(/# /g, "");
            } else {
                formatted = `# ${selected}`;
            }
            break;

        // --- H2 ---
        case "h2":
            if (selected.includes("## ")) {
                formatted = selected.replace(/## /g, "");
            } else {
                formatted = `## ${selected}`;
            }
            break;

        // --- UL ---
        case "ul":
            if (/- /.test(selected)) {
                formatted = selected.replace(/- /g, "");
            } else {
                formatted = `- ${selected}`;
            }
            break;

        // --- OL ---
        case "ol":
            if (/1\. /.test(selected)) {
                formatted = selected.replace(/1\. /g, "");
            } else {
                formatted = `1. ${selected}`;
            }
            break;

        // --- QUOTE ---
        case "quote":
            if (/^> /.test(selected) || /> /.test(selected)) {
                formatted = selected.replace(/^> /gm, "");
            } else {
                formatted = `> ${selected}`;
            }
            break;

        // --- CODE BLOCK ---
        case "code":
            if (/```([\s\S]*?)```/.test(selected)) {
                formatted = selected.replace(/```([\s\S]*?)```/g, "$1");
            } else {
                formatted = "```\n" + selected + "\n```";
            }
            break;

        // --- TABLE ---
        case "table":
            formatted = createMarkdownTable();
            break;
    }

    ta.setRangeText(formatted, start, end, "end");
}

/* =======================================
   CREAR TABLA MARKDOWN BÁSICA
======================================= */
function createMarkdownTable() {
    return (
`| Columna 1 | Columna 2 |
|----------|----------|
| Valor 1  | Valor 2  |
`
    );
}

/* =======================================
   BOTONES LATERALES
======================================= */

btnNuevo.addEventListener("click", () => {
    markdownText.value = "";
    pushUndoState();
    updateHighlight();
});

btnPegarAuto.addEventListener("click", async () => {
    const text = await navigator.clipboard.readText();
    markdownText.value += text;
    pushUndoState();
    updateHighlight();
});

btnCopiar.addEventListener("click", () => {
    navigator.clipboard.writeText(markdownText.value);
});

btnDescargar.addEventListener("click", () => {
    const blob = new Blob([markdownText.value], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "documento.md";
    a.click();
    URL.revokeObjectURL(url);
});

/* =======================================
   PEGADO DESDE WORD → LIMPIEZA + MARKDOWN
======================================= */
markdownText.addEventListener("paste", (e) => {
    const html = e.clipboardData.getData("text/html");
    const plain = e.clipboardData.getData("text/plain");

    // Si no viene en HTML → pegar normal
    if (!html) return;

    // Detectar si viene de Word
    const isWord = html.includes("Mso") || html.includes("<w:") || html.includes("class=Mso");
    if (!isWord) return; // pegar normal si no es Word

    e.preventDefault();

    const cleanedHTML = cleanWordHTML(html);
    const temp = document.createElement("div");
    temp.innerHTML = cleanedHTML;

    let md = htmlToMarkdown(temp);

    // Insertar en el textarea
    const ta = markdownText;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    ta.setRangeText(md, start, end, "end");
    pushUndoState();
    updateHighlight();
});

/* =======================================
   HTML → MARKDOWN
======================================= */
function htmlToMarkdown(root) {
    let md = "";

    function process(node) {

        // Texto simple
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent.replace(/\s+/g, " ");
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return "";

        const tag = node.tagName.toLowerCase();
        let content = [...node.childNodes].map(process).join("");

        switch (tag) {

            case "b":
            case "strong":
                return `**${content.trim()}**`;

            case "i":
            case "em":
                return `*${content.trim()}*`;

            case "u":
                return `<u>${content.trim()}</u>`; // Markdown no soporta subrayado

            case "h1":
                return `\n# ${content}\n\n`;

            case "h2":
                return `\n## ${content}\n\n`;

            case "h3":
                return `\n### ${content}\n\n`;

            case "p":
            case "div":
                return `\n${content}\n`;

            case "br":
                return "\n";

            case "ul":
                return (
                    "\n" +
                    [...node.querySelectorAll(":scope > li")]
                        .map(li => `- ${process(li).trim()}`)
                        .join("\n") +
                    "\n"
                );

            case "ol":
                let n = 1;
                return (
                    "\n" +
                    [...node.querySelectorAll(":scope > li")]
                        .map(li => `${n++}. ${process(li).trim()}`)
                        .join("\n") +
                    "\n"
                );

            case "li":
                return content.trim();

            case "table":
                return convertTableToMarkdown(node);

            default:
                return content;
        }
    }

    md = process(root);

    // Limpieza final
    md = md
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]+/g, " ")
        .trim();

    return md + "\n";
}

function convertTableToMarkdown(tbl) {
    const rows = [...tbl.querySelectorAll("tr")];
    if (rows.length === 0) return "";

    let out = "\n";

    rows.forEach((tr, i) => {
        const cells = [...tr.querySelectorAll("td,th")].map(td =>
            td.innerText.trim().replace(/\n+/g, " ")
        );
        out += `| ${cells.join(" | ")} |\n`;

        if (i === 0) {
            out += "|" + cells.map(() => "---").join("|") + "|\n";
        }
    });

    return out + "\n";
}

function cleanWordHTML(html) {

    // 1) Eliminar comentarios Word <!-- ... -->
    html = html.replace(/<!--[\s\S]*?-->/g, "");

    // 2) Eliminar bloques <style> completos
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

    // 3) Eliminar cosas tipo <xml> de Word
    html = html.replace(/<xml[^>]*>[\s\S]*?<\/xml>/gi, "");

    // 4) Eliminar @font-face
    html = html.replace(/@font-face[^}]*}/gi, "");

    // 5) Eliminar atributos mso-*
    html = html.replace(/mso-[^:;"']+:[^;"']+;?/gi, "");

    // 6) Eliminar atributos style por completo (Word siempre mete basura ahí)
    html = html.replace(/style="[^"]*"/gi, "");

    // 7) Eliminar clases Mso pero NO el contenido
    html = html.replace(/class="[^"]*Mso[^"]*"/gi, "");

    // 8) Mantener span y div, solo quitar atributos
    html = html.replace(/<span[^>]*>/gi, "<span>");
    html = html.replace(/<div[^>]*>/gi, "<div>");

    // 9) Normalizar saltos Word dentro de <p>
    html = html.replace(/<p>\s*<\/p>/gi, "");

    // 10) Eliminar <meta>, <link>, <head>, <title>, <script>
    html = html.replace(/<\/?(meta|link|head|title|script)[^>]*>/gi, "");

    // 11) Mantener solo body si existe
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) html = bodyMatch[1];

    // 12) Asteriscos automáticos de Word → eliminarlos
    html = html.replace(/^\*\s*/gm, "");

    return html.trim();
}

function plainTextTableToMarkdown(plain) {
    const lines = plain.trim().split(/\r?\n/);

    // Dividir cada línea por 2+ espacios consecutivos
    const rows = lines.map(line =>
        line.split(/ {2,}/).map(c => c.trim()).filter(Boolean)
    );

    let md = "";

    rows.forEach((cells, i) => {
        md += "| " + cells.join(" | ") + " |\n";
        if (i === 0) {
            md += "|" + cells.map(() => "---").join("|") + "|\n";
        }
    });

    return "\n" + md + "\n";
}

/* ============================================================
   RESALTADO VISUAL TESAUROS / SECTIONS
============================================================ */
const highlighter = document.createElement("div");
highlighter.id = "mdHighlighter";

// ⭐ NUEVO: estado de toggles
let highlightSections = true; // amarillo / rojo
let highlightTesauros = true; // verde
let highlightLet       = true;
// El contenedor (#workContainer) ya existe
if (markdownText.parentElement) {
    const parent = markdownText.parentElement;
    if (getComputedStyle(parent).position === "static") {
        parent.style.position = "relative";
    }
    parent.appendChild(highlighter);

    // ⭐ NUEVO: caja de toggles arriba-derecha del editor
    if (!document.getElementById("mdHighlightToggles")) {
        const tbox = document.createElement("div");
        tbox.id = "mdHighlightToggles";
        tbox.style.position = "absolute";
        tbox.style.top = "8px";
        tbox.style.right = "12px";
        tbox.style.zIndex = "3";
        tbox.style.display = "flex";
        tbox.style.gap = "6px";
        tbox.style.fontSize = "11px";
        tbox.style.background = "rgba(255,255,255,0.85)";
        tbox.style.borderRadius = "999px";
        tbox.style.padding = "3px 8px";
        tbox.style.border = "1px solid #d1d5db";
        tbox.style.alignItems = "center";

        tbox.innerHTML = `
            <label style="display:flex;align-items:center;gap:3px;cursor:pointer;">
                <input id="toggleAllHighlight" type="checkbox" checked style="margin:0;" />
                <span>Todo</span>
            </label>
            <label style="display:flex;align-items:center;gap:3px;cursor:pointer;">
                <input id="toggleSections" type="checkbox" checked style="margin:0;" />
                <span>Sections</span>
            </label>
            <label style="display:flex;align-items:center;gap:3px;cursor:pointer;">
                <input id="toggleTesauros" type="checkbox" checked style="margin:0;" />
                <span>Tesauros</span>
            </label>
            <label style="display:flex;align-items:center;gap:3px;cursor:pointer;">
                <input id="toggleLet" type="checkbox" checked style="margin:0;" />
                <span>LET/Def</span>
            </label>
        `;

        parent.appendChild(tbox);

        const chkAll = tbox.querySelector("#toggleAllHighlight");
        const chkSec = tbox.querySelector("#toggleSections");
        const chkTes = tbox.querySelector("#toggleTesauros");
        const chkLet = tbox.querySelector("#toggleLet");

        const refreshAllState = () => {
            if (!chkAll) return;
            const allOn = highlightSections && highlightTesauros && highlightLet;
            const anyOn = highlightSections || highlightTesauros || highlightLet;
            chkAll.checked = allOn;
            chkAll.indeterminate = !allOn && anyOn;
        };

        if (chkAll) {
            chkAll.addEventListener("change", () => {
                const enabled = chkAll.checked;
                highlightSections = enabled;
                highlightTesauros = enabled;
                highlightLet = enabled;

                if (chkSec) chkSec.checked = enabled;
                if (chkTes) chkTes.checked = enabled;
                if (chkLet) chkLet.checked = enabled;

                chkAll.indeterminate = false;
                updateHighlight();
            });
        }
        if (chkSec) {
            chkSec.addEventListener("change", () => {
                highlightSections = chkSec.checked;
                refreshAllState();
                updateHighlight();
            });
        }
        if (chkTes) {
            chkTes.addEventListener("change", () => {
                highlightTesauros = chkTes.checked;
                refreshAllState();
                updateHighlight();
            });
        }
        if (chkLet) {
            chkLet.addEventListener("change", () => {
                highlightLet = chkLet.checked;
                refreshAllState();
                updateHighlight();
            });
        }

        refreshAllState();
    }
}

/* 🔹 Cualquier cambio en el textarea (teclado, Ctrl+V texto plano, borrar...) */
markdownText.addEventListener("input", () => {
    UndoManager.push(markdownText.value);
    updateHighlight();
});

function updateHighlight() {
    const txt = markdownText.value;

    const hl = document.getElementById("mdHighlighter");
    if (!hl) return;

    // Escapar HTML básico
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    // Comprobación de paréntesis balanceados dentro de condition:
    function areParenthesesBalanced(s) {
        let count = 0;
        for (let i = 0; i < s.length; i++) {
            const ch = s.charAt(i);
            if (ch === "(") count++;
            else if (ch === ")") {
                count--;
                if (count < 0) return false;
            }
        }
        return count === 0;
    }

    // 1) TOKENIZAR texto en:
    //    - trozos normales
    //    - tags de sección {{#section_NAME ...}} / {{/section_NAME}}
    const tokens = [];
    const tagRegex = /\{\{(#|\/)section_([^}\s|]+)[^}]*\}\}/g;
    let lastIndex = 0;
    let m;

    while ((m = tagRegex.exec(txt)) !== null) {
        const index = m.index;
        const full = m[0];
        const kind = m[1]; // "#" o "/"
        const name = m[2];

        // Texto previo al tag
        if (index > lastIndex) {
            tokens.push({
                type: "text",
                text: txt.slice(lastIndex, index)
            });
        }

        if (kind === "#") {
            // APERTURA VÁLIDA SOLO SI:  {{#section_NOMBRE | condition:...}}
            let syntaxOk = /^\{\{#section_[^}\s|]+\s*\|\s*condition:/i.test(full);

            // Validar paréntesis en la expresión de condition:
            if (syntaxOk) {
                const lower = full.toLowerCase();
                const condIndex = lower.indexOf("condition:");
                if (condIndex !== -1) {
                    const expr = full.slice(
                        condIndex + "condition:".length,
                        full.length - 2 // quitar "}}"
                    );
                    if (!areParenthesesBalanced(expr)) {
                        syntaxOk = false;
                    }
                }
            }

            tokens.push({
                type: "open",
                name: name,
                text: full,
                syntaxOk: syntaxOk,
                paired: false,
                invalid: !syntaxOk
            });
        } else {
            // CIERRE VÁLIDO SOLO SI: {{/section_NOMBRE}}
            const syntaxOkClose = /^\{\{\/section_[^}\s|]+\s*\}\}$/i.test(full);
            tokens.push({
                type: "close",
                name: name,
                text: full,
                syntaxOk: syntaxOkClose,
                paired: false,
                invalid: !syntaxOkClose
            });
        }

        lastIndex = tagRegex.lastIndex;
    }

    // Cola final de texto
    if (lastIndex < txt.length) {
        tokens.push({
            type: "text",
            text: txt.slice(lastIndex)
        });
    }

    // 2) EMPAREJAR TAGS → detectar cuáles son válidos y cuáles rotos
    const openStack = [];

    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];

        if (t.type === "open") {
            t.paired = false;
            // solo apilamos si la SINTAXIS del tag de apertura es correcta
            if (t.syntaxOk) {
                openStack.push(t);
            }
        } else if (t.type === "close") {
            t.paired = false;

            // si la sintaxis del cierre ya es mala, no intentamos emparejar
            if (!t.syntaxOk) {
                t.invalid = true;
                continue;
            }

            // debe cerrar al último open con el mismo nombre
            if (
                openStack.length > 0 &&
                openStack[openStack.length - 1].name === t.name
            ) {
                const openTok = openStack.pop();
                openTok.paired = true;
                t.paired = true;
            } else {
                // cierre sin apertura / mal anidado
                t.invalid = true;
            }
        }
    }

    // Todo lo que quede abierto en la pila es inválido (sin cierre)
    for (let j = 0; j < openStack.length; j++) {
        openStack[j].invalid = true;
    }

    // 3) CONSTRUIR SEGMENTOS CON PROFUNDIDAD Y ERRORES
    const segments = [];
    let depth = 0; // solo cuenta sections correctamente emparejadas + sintaxis OK

    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];

        if (t.type === "text") {
            // texto normal → se pinta con la profundidad actual
            segments.push({
                text: t.text,
                depth: depth,
                error: false
            });
        } else if (t.type === "open") {
            if (t.invalid || !t.paired) {
                // TAG DE APERTURA ROTO → solo él se marca como error
                segments.push({
                    text: t.text,
                    depth: 0,
                    error: true
                });
            } else {
                // apertura válida → subimos profundidad y bloque amarillo
                const newDepth = depth + 1;
                const d = newDepth > 5 ? 5 : newDepth;

                segments.push({
                    text: t.text,
                    depth: d,
                    error: false
                });

                depth = newDepth;
            }
        } else if (t.type === "close") {
            if (t.invalid || !t.paired) {
                // TAG DE CIERRE ROTO → solo él se marca como error
                segments.push({
                    text: t.text,
                    depth: 0,
                    error: true
                });
            } else {
                // cierre válido → el tag se pinta con la profundidad actual
                let d = depth;
                if (d < 1) d = 1;
                if (d > 5) d = 5;

                segments.push({
                    text: t.text,
                    depth: d,
                    error: false
                });

                depth = Math.max(0, depth - 1);
            }
        }
    }

    // 4) GENERAR HTML FINAL (secciones + tesauros + LET + tags parciales rotos)
    let html = "";

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];

        // Escapamos HTML
        let safe = escapeHtml(seg.text);

        // TESAUROS (toggle)
        if (typeof highlightTesauros === "undefined" || highlightTesauros) {
            safe = safe.replace(
                /\{\{\s*personalized\s*\|\s*reference\s*:[^}]+\}\}/g,
                function (matchTesauro) {
                    const safeMatch = matchTesauro.replace(/&/g, "&amp;");
                    return '<span class="tesauro-block">' + safeMatch + '</span>';
                }
            );
        }

        // LET / DEFINITION (toggle compartido)
        if (typeof highlightLet === "undefined" || highlightLet) {
            safe = safe.replace(
                /\{\{\s*let\b[^}]*\}\}/gi,
                function (matchLet) {
                    return '<span class="let-block">' + matchLet + '</span>';
                }
            );
            safe = safe.replace(
                /\{\{\s*definition\b[^}]*\}\}/gi,
                function (matchDef) {
                    return '<span class="definition-block">' + matchDef + '</span>';
                }
            );
        }
        // TAGS PARCIALES de sección (sin cerrar con "}}") solo cuando
        // no estamos ya en una sección y con highlightSections activo
        if (
            (typeof highlightSections === "undefined" || highlightSections) &&
            !seg.error &&
            seg.depth === 0
        ) {
            safe = safe.replace(
                /\{\{[#\/]section_[^}]*$/gm,
                function (matchPartial) {
                    return '<span class="section-error-block">' + matchPartial + '</span>';
                }
            );
        }

        const doSections = (typeof highlightSections === "undefined" || highlightSections);

        if (seg.error) {
            // Tag de section incorrecto → solo se pinta él (no el contenido)
            if (doSections) {
                html += '<span class="section-error-block">' + safe + '</span>';
            } else {
                html += safe;
            }
        } else if (seg.depth > 0) {
            // Dentro de sections emparejadas Y bien formadas → amarillo por profundidad
            if (doSections) {
                const d = seg.depth > 5 ? 5 : seg.depth;
                html += '<span class="section-block section-depth-' + d + '">' + safe + '</span>';
            } else {
                html += safe;
            }
        } else {
            // Sin sección → texto normal
            html += safe;
        }
    }

    hl.innerHTML = html;

    // 🔧 Ajustar altura del overlay al contenido TOTAL del textarea
    const contentHeight = markdownText.scrollHeight;
    hl.style.top = "0px";
    hl.style.left = "0px";
    hl.style.right = "0px";
    hl.style.bottom = "auto";          // anula bottom de inset:0 del CSS
    hl.style.height = contentHeight + "px";
    hl.style.overflow = "visible";

    // Scroll sincronizado: movemos el overlay en sentido contrario
    const offsetY = markdownText.scrollTop;
    const offsetX = markdownText.scrollLeft || 0;
    hl.style.transform = "translate(" + (-offsetX) + "px, " + (-offsetY) + "px)";
}



// Scroll del textarea → mover overlay
markdownText.addEventListener("scroll", function () {
    const hl = document.getElementById("mdHighlighter");
    if (!hl) return;

    const offsetY = markdownText.scrollTop;
    const offsetX = markdownText.scrollLeft || 0;
    hl.style.transform = "translate(" + (-offsetX) + "px, " + (-offsetY) + "px)";
});

/* =======================================
   CTRL + Z / CTRL + Y
======================================= */
document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();

    // Ctrl+Z (sin Shift) → Undo
    if (e.ctrlKey && !e.shiftKey && key === "z") {
        e.preventDefault();
        const value = UndoManager.undo();
        if (value !== null) {
            markdownText.value = value;
            updateHighlight();
        }
        return;
    }

    // Ctrl+Y o Ctrl+Shift+Z → Redo
    if ((e.ctrlKey && key === "y") || (e.ctrlKey && e.shiftKey && key === "z")) {
        e.preventDefault();
        const value = UndoManager.redo();
        if (value !== null) {
            markdownText.value = value;
            updateHighlight();
        }
    }
});

/* Primera pintura al cargar */
updateHighlight();
