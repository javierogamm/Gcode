/**
 * @jest-environment jsdom
 */

describe('Editor Markdown features', () => {
  let originalCreateElement;

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = `
      <div id="workContainer">
        <textarea id="markdownText"></textarea>
      </div>
      <div id="toolbar"><button data-md="bold"></button></div>
      <button id="btnNuevo"></button>
      <button id="btnPegarAuto"></button>
      <button id="btnCopiar"></button>
      <button id="btnDescargar"></button>
      <button id="btnExportProyecto"></button>
      <button id="btnImportProyecto"></button>
    `;

    originalCreateElement = document.createElement;
    global.alert = jest.fn();
    global.updateHighlight = jest.fn();
    global.recordUndoAfterChange = jest.fn();
    global.navigator = {
      clipboard: {
        readText: jest.fn().mockResolvedValue(''),
        writeText: jest.fn(),
      },
    };
    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    document.createElement = originalCreateElement;
  });

  function loadModule(path) {
    return jest.isolateModules(() => require(path));
  }

  test('limpia pegado desde Word y convierte a Markdown', () => {
    loadModule('../js/core/editormarkdown.js');
    const ta = document.getElementById('markdownText');
    ta.value = '';
    ta.selectionStart = 0;
    ta.selectionEnd = 0;

    const wordHtml = '<html><body><p class="MsoNormal"><b>Hola</b></p></body></html>';
    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: {
        getData: (type) => (type === 'text/html' ? wordHtml : ''),
      },
    });

    document.getElementById('markdownText').dispatchEvent(pasteEvent);

    expect(ta.value).toBe('**Hola**\n');
    expect(global.recordUndoAfterChange).not.toHaveBeenCalled();
  });

  test('inserta referencia de tesauro en el cursor', () => {
    loadModule('../js/core/editormarkdown.js');
    loadModule('../js/tesauro/datatesauro_md.js');
    const ta = document.getElementById('markdownText');
    ta.value = 'Texto';
    ta.selectionStart = ta.selectionEnd = ta.value.length;

    global.DataTesauro.initForMarkdown(ta);
    global.DataTesauro.insertReferenceIntoMarkdown('REF_TEST');

    expect(ta.value).toBe('Texto {{personalized | reference: REF_TEST}} ');
    expect(global.recordUndoAfterChange).toHaveBeenCalled();
  });

  test('envuelve selección con sección y condiciones', () => {
    loadModule('../js/core/editormarkdown.js');
    loadModule('../js/features/sections.js');
    const ta = document.getElementById('markdownText');
    ta.value = 'contenido';
    ta.selectionStart = 0;
    ta.selectionEnd = ta.value.length;

    const Sections = global.Sections;
    Sections.textarea = ta;
    Sections.selStart = 0;
    Sections.selEnd = ta.value.length;

    Sections.wrapSelection('Mi Sección', [
      {
        logic: null,
        subConds: [
          { logic: null, ref: 'Campo1', value: 'VALOR', isNumeric: false, op: '!=' },
        ],
      },
    ]);

    expect(ta.value).toContain('{{#section_Mi_Sección | condition:(personalized.Campo1 != "VALOR")}}');
    expect(global.recordUndoAfterChange).toHaveBeenCalled();
  });

  test('crea bloque LET con referencia y fórmula', () => {
    loadModule('../js/core/editormarkdown.js');
    loadModule('../js/features/let.js');
    const ta = document.getElementById('markdownText');
    ta.value = '';
    ta.selectionStart = ta.selectionEnd = 0;

    const LetManager = global.LetManager;
    LetManager.textarea = ta;
    LetManager.refInput = { value: 'Resultado' };
    LetManager.formulaInput = { value: 'monto + 1' };
    LetManager.decimalsInput = { value: '2' };
    LetManager.zeroIfNullInput = { checked: true };
    LetManager.tokenMap = {};
    LetManager.caretPos = 0;
    LetManager.editingLetRange = null;
    LetManager.currentDestField = null;

    LetManager.apply();

    expect(ta.value).toBe('{{let | reference: personalized.Resultado | result: monto + 1 | decimals:2 | zeroIfNull:true}}');
    expect(global.recordUndoAfterChange).toHaveBeenCalled();
  });

  test('crea definition al inicio del documento', () => {
    loadModule('../js/core/editormarkdown.js');
    loadModule('../js/features/definition.js');
    const ta = document.getElementById('markdownText');
    ta.value = 'contenido previo';

    const DefinitionManager = global.DefinitionManager;
    DefinitionManager.textarea = ta;
    DefinitionManager.refInput = { value: 'miVariable' };
    DefinitionManager.typeSelect = { value: 'text' };
    DefinitionManager.valueInput = { value: 'valor' };
    DefinitionManager.valueSelectBool = { value: 'true' };

    DefinitionManager.applyDefinition();

    expect(ta.value.startsWith('{{definition | reference: miVariable | type: text | value: valor}}'))
      .toBe(true);
    expect(global.recordUndoAfterChange).toHaveBeenCalled();
  });

  test('exporta e importa proyecto en JSON', async () => {
    global.FileReader = class {
      constructor() { this.onload = null; }
      readAsText(file) { this.result = file; if (this.onload) this.onload(); }
    };

    loadModule('../js/core/editormarkdown.js');
    global.DataTesauro = { campos: [{ ref: 'R1' }], renderList: jest.fn() };

    const ta = document.getElementById('markdownText');
    ta.value = '# titulo';

    const exportBtn = document.getElementById('btnExportProyecto');
    exportBtn.click();

    const blobArg = global.URL.createObjectURL.mock.calls[0][0];
    const jsonText = await blobArg.text();
    const parsed = JSON.parse(jsonText);
    expect(parsed.markdown).toBe('# titulo');
    expect(parsed.tesauros[0].ref).toBe('R1');

    const createdInputs = [];
    document.createElement = (tag) => {
      const el = originalCreateElement.call(document, tag);
      if (tag === 'input' && el.type === '') {
        el.type = 'file';
      }
      if (tag === 'input') createdInputs.push(el);
      return el;
    };

    const importBtn = document.getElementById('btnImportProyecto');
    importBtn.click();

    const input = createdInputs.find((el) => el.type === 'file');
    const fileContent = JSON.stringify({ markdown: 'nuevo', tesauros: [{ ref: 'R2' }] });
    Object.defineProperty(input, 'files', { value: [fileContent] });
    input.dispatchEvent(new Event('change'));

    expect(ta.value).toBe('nuevo');
    expect(global.DataTesauro.campos[0].ref).toBe('R2');
  });

  test('gestor de tesauros genera exportaciones CSV', () => {
    loadModule('../js/tesauro/tesauromanager_md.js');
    global.DataTesauro = {
      campos: [
        { ref: 'REF1', nombre: 'Campo 1', tipo: 'texto', agrupacion: 'A1', momento: 'Solicitud' },
        { ref: 'SEL1', nombre: 'Selector', tipo: 'selector', opciones: [{ ref: 'opt1', valor: 'Uno' }] },
      ],
    };

    const TesauroManager = global.TesauroManager;
    TesauroManager.downloadCsvWithBom = jest.fn();
    TesauroManager.doExportTesauro('Entidad', 'Actividad');

    expect(TesauroManager.downloadCsvWithBom).toHaveBeenCalledWith(
      'Tesauro.csv',
      expect.stringContaining('Tesauro.csv')
    );
    expect(TesauroManager.downloadCsvWithBom).toHaveBeenCalledWith(
      'Tesauro_Valores.csv',
      expect.stringContaining('Referencia Tesauro')
    );
    expect(TesauroManager.downloadCsvWithBom).toHaveBeenCalledWith(
      'Vinculacion_Tesauros.csv',
      expect.stringContaining('Nombre Entidad')
    );
  });
});
