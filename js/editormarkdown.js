console.log("🚀 Editor Markdown iniciado (modo depuración)");

/* =======================================
   REFERENCIAS
======================================= */
const visualEditor = document.getElementById("visualEditor");
const markdownText = document.getElementById("markdownText");
// El panel de la derecha (Markdown) será solo lectura
markdownText.setAttribute("readonly", "true");
markdownText.style.background = "#f9fafb";
markdownText.style.cursor = "not-allowed";
markdownText.style.color = "#333";
const btnPegarAuto = document.getElementById("btnPegarAuto");
const btnNuevo = document.getElementById("btnNuevo");
const btnCopiar = document.getElementById("btnCopiar");
const btnDescargar = document.getElementById("btnDescargar");

/* =======================================
   BOTONES DE FORMATO — CON FOCO CORREGIDO
======================================= */

let lastFocusedEditor = null;
let isSyncingFromVisual = false;
let isSyncingFromMarkdown = false;

visualEditor.setAttribute("contenteditable", "true");

// Detectamos cuál editor tuvo el último foco
visualEditor.addEventListener("focus", () => {
    lastFocusedEditor = visualEditor;
});
markdownText.addEventListener("focus", () => {
    lastFocusedEditor = markdownText;
});
visualEditor.addEventListener("mousedown", () => lastFocusedEditor = visualEditor);
markdownText.addEventListener("mousedown", () => lastFocusedEditor = markdownText);

// Escuchamos clicks en la toolbar
document.querySelectorAll("#toolbar button, .md-btn").forEach(btn => {
    btn.addEventListener("mousedown", e => e.preventDefault());
    btn.addEventListener("click", () => {
        const type = btn.dataset.md;
        if (!lastFocusedEditor) return;
        if (lastFocusedEditor === visualEditor) applyVisualFormat(type);
        else applyMarkdownFormat(type);
    });
});

/* =======================================
   FORMATO VISUAL — SOLO SOBRE SELECCIÓN
   (sin heredar en nuevas líneas)
======================================= */
function applyVisualFormat(type) {
    // 🔹 Caso especial: crear tabla directamente
    if (type === "table") {
        insertVisualTable();
        return;
    }

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return; // nada seleccionado

    const range = sel.getRangeAt(0);
    const selectedText = range.toString();
    if (!selectedText.trim()) return;

    // Crear nodo según formato
    let el;
    switch (type) {
        case "bold": el = document.createElement("strong"); break;
        case "italic": el = document.createElement("em"); break;
        case "underline": el = document.createElement("u"); break;
        case "h1": el = document.createElement("h1"); break;
        case "h2": el = document.createElement("h2"); break;
        case "quote": el = document.createElement("blockquote"); break;
        case "code": el = document.createElement("code"); break;
        default: el = null;
    }

    if (el) {
        el.textContent = selectedText;
        range.deleteContents();
        range.insertNode(el);
        sel.removeAllRanges();

        // Colocar el cursor justo después del nuevo nodo
        const newRange = document.createRange();
        newRange.setStartAfter(el);
        newRange.setEndAfter(el);
        sel.addRange(newRange);
    }

    // 🔹 Forzar sincronización Markdown inmediata
    visualEditor.dispatchEvent(new Event("input"));
    if (!isSyncingFromMarkdown) {
        let html = visualEditor.innerHTML;

        let md = html
            .replace(/<\/?(html|body|span|font|div)[^>]*>/gi, "")
            .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
            .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
            .replace(/<(b|strong)[^>]*>(.*?)<\/\1>/gi, "**$2**")
            .replace(/<(i|em)[^>]*>(.*?)<\/\1>/gi, "*$2*")
            .replace(/<u[^>]*>(.*?)<\/u>/gi, "_$1_")
            .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "> $1\n")
            .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (m, c) => c.replace(/<li[^>]*>(.*?)<\/li>/g, "- $1\n"))
            .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (m, c) => c.replace(/<li[^>]*>(.*?)<\/li>/g, "1. $1\n"))
            .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, "```\n$1\n```")
            .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<p[^>]*>/gi, "\n\n")
            .replace(/<\/p>/gi, "\n\n")
            .replace(/<\/?tr[^>]*>/gi, "\n")
            .replace(/<\/?td[^>]*>/gi, "|")
            .replace(/<\/?table[^>]*>/gi, "\n")
            .replace(/&nbsp;/gi, " ")
            .replace(/<[^>]+>/g, "")
            .replace(/\n{3,}/g, "\n\n")
            .trim();

        markdownText.value = md;
    }
}

// Envolver selección en etiqueta
function wrapSelectionWithTag(tag) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const content = range.extractContents();
    const el = document.createElement(tag);
    el.appendChild(content);
    range.insertNode(el);
}

/* =======================================
   FORMATO MARKDOWN (textarea)
======================================= */
function applyMarkdownFormat(type) {
    const ta = markdownText;
    ta.focus();
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.slice(start, end);
    const before = ta.value.slice(0, start);
    const after = ta.value.slice(end);
    let formatted = selected;

    switch (type) {
        case "bold": formatted = `**${selected}**`; break;
        case "italic": formatted = `*${selected}*`; break;
        case "underline": formatted = `<u>${selected}</u>`; break;
        case "h1": formatted = `# ${selected}`; break;
        case "h2": formatted = `## ${selected}`; break;
        case "ul": formatted = `- ${selected}`; break;
        case "ol": formatted = `1. ${selected}`; break;
        case "quote": formatted = `> ${selected}`; break;
        case "code": formatted = "```\n" + selected + "\n```"; break;
        case "table": formatted = createMarkdownTable(); break;
    }

    ta.value = before + formatted + after;
    markdownText.dispatchEvent(new Event("input"));
}

/* =======================================
   CREAR TABLA EN VISUAL + SINCRONIZACIÓN
======================================= */
function insertVisualTable() {
    const filas = parseInt(prompt("Número de filas:", "3"));
    const columnas = parseInt(prompt("Número de columnas:", "3"));
    if (isNaN(filas) || isNaN(columnas) || filas <= 0 || columnas <= 0) return;

    // Crear tabla HTML visible
    const table = document.createElement("table");
    table.classList.add("markdown-table");
    table.style.borderCollapse = "collapse";
    table.style.margin = "10px 0";

    for (let f = 0; f < filas; f++) {
        const tr = document.createElement("tr");
        for (let c = 0; c < columnas; c++) {
            const cell = document.createElement(f === 0 ? "th" : "td");
            cell.textContent = f === 0 ? `Columna ${c + 1}` : `Celda ${f}.${c + 1}`;
            cell.style.border = "1px solid #999";
            cell.style.padding = "4px 8px";
            cell.contentEditable = "true";
            tr.appendChild(cell);
        }
        table.appendChild(tr);
    }

    // Insertar tabla donde esté el cursor o al final
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.insertNode(table);
    } else {
        visualEditor.appendChild(table);
    }

    // 🔹 Colocar el cursor después de la tabla
    const range = document.createRange();
    range.setStartAfter(table);
    range.setEndAfter(table);
    sel.removeAllRanges();
    sel.addRange(range);

    // 🔹 Forzar sincronización Markdown
    visualEditor.dispatchEvent(new Event("input"));

    // 🔹 Convertir la tabla recién creada a Markdown limpio
    const rows = Array.from(table.querySelectorAll("tr"));
    let mdTable = "";
    rows.forEach((tr, i) => {
        const cells = Array.from(tr.querySelectorAll("td,th")).map(td => td.innerText.trim());
        mdTable += `| ${cells.join(" | ")} |\n`;
        if (i === 0) mdTable += "|" + cells.map(() => "---").join("|") + "|\n";
    });

    // Añadir la tabla Markdown al panel derecho
    markdownText.value += "\n" + mdTable + "\n";
}

/* ============================================================
   PEGADO DESDE WORD → LIMPIEZA Y CONVERSIÓN A TABLA VISIBLE
============================================================ */
markdownText.addEventListener("paste", (e) => {
    const html = e.clipboardData?.getData("text/html");
    if (!html || !html.includes("<table")) return; // no hay tabla → dejar pasar normal
    e.preventDefault();

    console.log("🧩 Pegado desde Word detectado con tabla. Limpiando y renderizando...");

    let cleaned = html;

    // 🔹 1. Limpiar etiquetas y estilos de Word
    cleaned = cleaned
        .replace(/<!--\[if.*?endif\]-->/gis, "")
        .replace(/<\/?o:p[^>]*>/gi, "")
        .replace(/class="?Mso[^">]*"?.*?/gi, "")
        .replace(/style="[^"]*"/gi, "")
        .replace(/<span[^>]*>/gi, "")
        .replace(/<\/span>/gi, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/<p[^>]*>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .trim();

    // 🔹 2. Extraer tablas del HTML
    const temp = document.createElement("div");
    temp.innerHTML = cleaned;
    const tables = temp.querySelectorAll("table");

    tables.forEach(tbl => {
        const rows = Array.from(tbl.querySelectorAll("tr"));
        let mdTable = "";
        rows.forEach((tr, i) => {
            const cells = Array.from(tr.querySelectorAll("td,th"))
                .map(td => td.innerText.trim().replace(/\n+/g, " "));
            mdTable += `| ${cells.join(" | ")} |\n`;
            if (i === 0) mdTable += "|" + cells.map(() => "---").join("|") + "|\n";
        });

        // 🔹 Reemplazar tabla HTML por Markdown visible en el derecho
        tbl.outerHTML = "\n" + mdTable + "\n";

        // 🔹 Y además dibujar una tabla HTML editable en el visual
        const table = document.createElement("table");
        table.classList.add("markdown-table");
        table.style.borderCollapse = "collapse";
        table.style.margin = "10px 0";

        rows.forEach((tr, i) => {
            const trHTML = document.createElement("tr");
            const cells = Array.from(tr.querySelectorAll("td,th"));
            cells.forEach((td, c) => {
                const cell = document.createElement(i === 0 ? "th" : "td");
                cell.textContent = td.innerText.trim();
                cell.style.border = "1px solid #999";
                cell.style.padding = "4px 8px";
                cell.contentEditable = "true";
                trHTML.appendChild(cell);
            });
            table.appendChild(trHTML);
        });

        visualEditor.appendChild(table);
    });

    // 🔹 3. Insertar Markdown limpio en el derecho
    const cleanedText = temp.innerText.trim();
    const start = markdownText.selectionStart;
    const before = markdownText.value.slice(0, start);
    const after = markdownText.value.slice(markdownText.selectionEnd);
    markdownText.value = before + cleanedText + "\n\n" + after;

    markdownText.dispatchEvent(new Event("input"));
    console.log("✅ Tabla pegada y renderizada correctamente en ambos paneles");
});
/* =======================================
   SINCRONIZACIÓN BIDIRECCIONAL
======================================= */
const renderer = new marked.Renderer();
renderer.table = (header, body) => `
<table class="markdown-table">
<thead>${header}</thead><tbody>${body}</tbody>
</table>`;
marked.setOptions({ breaks: true, gfm: true, renderer });

/* =======================================
   VISUAL → MARKDOWN LIMPIO (sin HTML)
======================================= */
visualEditor.addEventListener("input", () => {
    if (isSyncingFromMarkdown) return;
    isSyncingFromVisual = true;

    let html = visualEditor.innerHTML;

    // Limpieza y conversión manual a Markdown puro
    let md = html
        .replace(/<\/?(html|body|span|font|div)[^>]*>/gi, "")
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
        .replace(/<(b|strong)[^>]*>(.*?)<\/\1>/gi, "**$2**")
        .replace(/<(i|em)[^>]*>(.*?)<\/\1>/gi, "*$2*")
        .replace(/<u[^>]*>(.*?)<\/u>/gi, "_$1_")
        .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "> $1\n")
        .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (m, c) => c.replace(/<li[^>]*>(.*?)<\/li>/g, "- $1\n"))
        .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (m, c) => c.replace(/<li[^>]*>(.*?)<\/li>/g, "1. $1\n"))
        .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, "```\n$1\n```")
        .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<p[^>]*>/gi, "\n\n")
        .replace(/<\/p>/gi, "\n\n")
// --- TABLAS: convertir correctamente a Markdown ---
.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, (tableHTML) => {
    const temp = document.createElement("div");
    temp.innerHTML = tableHTML.trim();

    const rows = Array.from(temp.querySelectorAll("tr"));
    let mdTable = "";

    rows.forEach((tr, i) => {
        const cells = Array.from(tr.querySelectorAll("td,th")).map(td =>
            td.innerText.trim().replace(/\n+/g, " ")
        );
        mdTable += `| ${cells.join(" | ")} |\n`;
        if (i === 0) mdTable += "|" + cells.map(() => "---").join("|") + "|\n";
    });

    return "\n" + mdTable + "\n";
})
        .replace(/&nbsp;/gi, " ")
        .replace(/<[^>]+>/g, "") // elimina cualquier etiqueta restante
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    markdownText.value = md;
    markdownText.dispatchEvent(new Event("input"));
    isSyncingFromVisual = false;
});

markdownText.addEventListener("input", () => {
    if (isSyncingFromVisual) return;
    isSyncingFromMarkdown = true;

    // 🧹 Limpieza de texto de Word antes de renderizar
    let raw = markdownText.value;

    // Elimina etiquetas basura de Word
    raw = raw
        .replace(/<\/?o:p[^>]*>/gi, "")
        .replace(/<p[^>]*class="?Mso[^">]*"?.*?>/gi, "\n\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<span[^>]*>/gi, "")
        .replace(/<\/span>/gi, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/<br[^>]*>/gi, "\n")
        .replace(/<table[^>]*>/gi, "\n\n")
        .replace(/<\/table>/gi, "\n\n")
        .replace(/<tr[^>]*>/gi, "\n")
        .replace(/<\/tr>/gi, "")
        .replace(/<td[^>]*>/gi, "| ")
        .replace(/<\/td>/gi, " ")
        .replace(/class="?Mso[^">]*"?.*?/gi, "")
        .replace(/style="[^"]*"/gi, "")
        .replace(/<!--\[if.*?endif\]-->/gi, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    // Elimina HTML sobrante si queda
    const tmp = document.createElement("div");
    tmp.innerHTML = raw;
    raw = tmp.innerText || tmp.textContent || "";

    // Si detectamos tablas en texto (por filas separadas)
    if (raw.includes("|")) {
        raw = raw.replace(/(\|.*\|)/g, "$1\n");
    }

    // Render limpio en el panel izquierdo
visualEditor.innerHTML = GestionaTranslator.renderCodeToVisual(raw);
    visualEditor.setAttribute("contenteditable", "true");

    // Aplicar estilo a las tablas
    visualEditor.querySelectorAll("table").forEach(tbl => {
        tbl.classList.add("markdown-table");
        tbl.querySelectorAll("th,td").forEach(c => {
            c.style.border = "1px solid #999";
            c.style.padding = "4px 8px";
        });
    });

    isSyncingFromMarkdown = false;
});


/* =======================================
   NUEVO / COPIAR / DESCARGAR / PEGAR
======================================= */
btnNuevo.addEventListener("click", () => {
    visualEditor.innerHTML = "";
    markdownText.value = "";
});
btnCopiar.addEventListener("click", () => navigator.clipboard.writeText(markdownText.value));
btnDescargar.addEventListener("click", () => {
    const blob = new Blob([markdownText.value], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "documento.md";
    a.click();
    URL.revokeObjectURL(url);
});
btnPegarAuto.addEventListener("click", async () => {
    const text = await navigator.clipboard.readText();
    markdownText.value = text;
    markdownText.dispatchEvent(new Event("input"));
});
/* ============================================================
   PEGADO DESDE WORD → LIMPIEZA Y CONVERSIÓN A MARKDOWN
============================================================ */
markdownText.addEventListener("paste", (e) => {
    const html = e.clipboardData?.getData("text/html");
    const plain = e.clipboardData?.getData("text/plain");

    if (!html || !html.includes("Mso")) return; // no es de Word → dejar pasar normal
    e.preventDefault();

    console.log("🧹 Detectado contenido de Word. Limpiando...");

    let cleaned = html;

    // 🔹 1. Eliminar etiquetas y atributos basura
    cleaned = cleaned
        .replace(/<!--\[if.*?endif\]-->/gis, "")
        .replace(/<\/?o:p[^>]*>/gi, "")
        .replace(/<span[^>]*>/gi, "")
        .replace(/<\/span>/gi, "")
        .replace(/class="?Mso[^">]*"?.*?/gi, "")
        .replace(/style="[^"]*"/gi, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/<p[^>]*>/gi, "\n\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<br[^>]*>/gi, "\n")
        .replace(/<\/?(div|font)[^>]*>/gi, "")
        .trim();

    // 🔹 2. Procesar tablas Word → Markdown
    if (cleaned.includes("<table")) {
        const temp = document.createElement("div");
        temp.innerHTML = cleaned;
        const tables = temp.querySelectorAll("table");

        tables.forEach(tbl => {
            const rows = Array.from(tbl.querySelectorAll("tr"));
            let mdTable = "";

            rows.forEach((tr, i) => {
                const cells = Array.from(tr.querySelectorAll("td,th"))
                    .map(td => td.innerText.trim().replace(/\n+/g, " "));
                mdTable += `| ${cells.join(" | ")} |\n`;
                if (i === 0) mdTable += "|" + cells.map(() => "---").join("|") + "|\n";
            });

            tbl.outerHTML = "\n" + mdTable + "\n";
        });

        cleaned = temp.innerHTML;
    }

    // 🔹 3. Quitar cualquier etiqueta HTML restante
    const tmp = document.createElement("div");
    tmp.innerHTML = cleaned;
    cleaned = tmp.innerText || tmp.textContent || "";

    // 🔹 4. Insertar texto limpio en el Markdown
    const start = markdownText.selectionStart;
    const before = markdownText.value.slice(0, start);
    const after = markdownText.value.slice(markdownText.selectionEnd);
    markdownText.value = before + cleaned.trim() + after;

    // 🔹 5. Sincronizar vista renderizada
    markdownText.dispatchEvent(new Event("input"));

    console.log("✅ Contenido de Word convertido a Markdown limpio");
});