/* ============================================================
   GESTIONA TRANSLATOR — Capa intermedia DOM ↔ Markdown CODE
   Convierte las cajitas visuales en código Gestiona CODE
============================================================ */
const GestionaTranslator = {
  // 🔹 Convierte los elementos visuales en texto Gestiona CODE
  serializeVisualToCode(container) {
    let md = "";
    container.childNodes.forEach(node => {
      if (node.nodeType === 3) {
        md += node.textContent; // texto normal
      } else if (node.classList && node.classList.contains("gc-field")) {
        const ref = node.dataset.reference || "";
        md += `{{personalized | reference: ${ref}}}`;
      } else if (node.tagName === "BR") {
        md += "\n";
      } else {
        // recorrer recursivamente hijos (por si hay párrafos o spans anidados)
        md += this.serializeVisualToCode(node);
      }
    });
    return md;
  },

  // 🔹 Convierte texto Gestiona CODE en HTML visual
  renderCodeToVisual(text) {
    const container = document.createElement("div");
    const tokens = text.split(/(\{\{.*?\}\})/g); // separar por tokens {{...}}
    tokens.forEach(tok => {
      const match = tok.match(/\{\{personalized\s*\|\s*reference:\s*([^}]+)\}\}/i);
      if (match) {
        const ref = match[1].trim();
        const span = document.createElement("span");
        span.className = "gc-field";
        span.dataset.reference = ref;
        span.dataset.name = ref;
        span.textContent = `[${ref}]`;
        span.contentEditable = "false";
        container.appendChild(span);
      } else {
        container.appendChild(document.createTextNode(tok));
      }
    });
    return container.innerHTML;
  }
};
