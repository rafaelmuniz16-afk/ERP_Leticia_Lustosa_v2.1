// js/core/aurora.js - Ponte Oficial entre ERP e Aurora Agent

function summarizeForAI() {
  const by = {};
  if (typeof bd !== 'undefined' && Array.isArray(bd)) {
    bd.forEach(d => {
      const m = typeof getMesCorreto === 'function' ? getMesCorreto(d) : d.mesReferencia;
      if (!by[m]) by[m] = { total: 0, onus: 0, acordo: 0, exito: 0, recusados: 0, reais: 0 };
      by[m].total++;
      if (d.tipo === 'Ônus') by[m].onus++;
      if (d.tipo === 'Acordo') by[m].acordo++;
      if (d.tipo === 'Êxito') by[m].exito++;
      if (d.recusado === 'Sim') by[m].recusados++;
      if (d.panjud === 'Sim') by[m].reais++;
    });
  }
  return by;
}

function appendMessage(sender, text) {
  const container = $('chatMessages');
  if (!container) return;

  const wrap = document.createElement('div');
  wrap.className = 'msg-wrap ' + sender;
  const msg = document.createElement('div');
  msg.className = 'msg ' + sender;
  msg.innerHTML = typeof safeText === 'function' ? safeText(text) : text;
  wrap.appendChild(msg);
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
}

// Ponte que extrai os dados reais da ERP e entrega para o Aurora Agent
function obterContextoERP() {
  return {
    $: typeof $ === 'function' ? $ : (id => document.getElementById(id)),
    bd: typeof bd !== 'undefined' ? bd : [],
    metas: typeof metas !== 'undefined' ? metas : {},
    memoriaIA: typeof memoriaIA !== 'undefined' ? memoriaIA : [],
    calculate: typeof calculate === 'function' ? calculate : (() => ({})),
    renderAll: typeof renderAll === 'function' ? renderAll : (() => {}),
    updateMetaInput: typeof updateMetaInput === 'function' ? updateMetaInput : (() => {}),
    saveRecord: typeof saveRecord === 'function' ? saveRecord : (async () => {}),
    registrarLog: typeof registrarLog === 'function' ? registrarLog : (() => {}),
    toast: typeof toast === 'function' ? toast : (() => {}),
    formatarProcessoCNJ: typeof formatarProcessoCNJ === 'function' ? formatarProcessoCNJ : (p => p),
    validarDigitoCNJ: typeof validarDigitoCNJ === 'function' ? validarDigitoCNJ : (() => true),
    getTodayLocal: typeof getTodayLocal === 'function' ? getTodayLocal : (() => new Date().toISOString().split('T')[0]),
    getSelectedMonth: typeof getSelectedMonth === 'function' ? getSelectedMonth : (() => '10'),
    uid: typeof uid === 'function' ? uid : (() => Math.random().toString(36).slice(2)),
    renderLogs: typeof renderLogs === 'function' ? renderLogs : (() => {}),
    setCurrentPage: (p) => { if (typeof currentPage !== 'undefined') currentPage = p; },
    serverMutation: typeof serverMutation === 'function' ? serverMutation : null,
    API_URL: typeof API_URL !== 'undefined' ? API_URL : '',
    get apiKey() { return typeof apiKey !== 'undefined' ? apiKey : (localStorage.getItem(typeof AI_KEY !== 'undefined' ? AI_KEY : 'groq_api_key') || ''); },
    appendMessage,
    summarizeForAI,
    configAPIKey
  };
}
window.obterContextoERP = obterContextoERP;

// Disparado ao clicar em enviar ou dar Enter
async function processAI() {
  const input = $('chatInputText');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  if (typeof window.processarMensagemAurora === 'function') {
    input.value = '';
    return window.processarMensagemAurora(text);
  }

  if (typeof apiKey !== 'undefined' && !apiKey) {
    await configAPIKey();
  }
}

async function configAPIKey() {
  const currentKey = typeof apiKey !== 'undefined' ? apiKey : (localStorage.getItem('groq_api_key') || '');
  const result = await Swal.fire({
    title: 'Chave Groq Cloud',
    input: 'password',
    inputValue: currentKey,
    inputLabel: 'A chave fica salva neste navegador para ativar a Aurora.',
    showCancelButton: true,
    confirmButtonText: 'Salvar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#4f46e5',
    inputAttributes: { autocomplete: 'off' }
  });
  if (result.isConfirmed) {
    const novaChave = (result.value || '').trim();
    if (typeof apiKey !== 'undefined') apiKey = novaChave;
    if (novaChave) localStorage.setItem(typeof AI_KEY !== 'undefined' ? AI_KEY : 'groq_api_key', novaChave);
    else localStorage.removeItem(typeof AI_KEY !== 'undefined' ? AI_KEY : 'groq_api_key');
    if (typeof toast === 'function') toast('success', novaChave ? 'Chave salva com sucesso!' : 'Chave removida.');
    if ($('aiState')) $('aiState').textContent = novaChave ? 'Pronta para operar' : 'Aguardando chave Groq';
  }
}

function openAI() {
  $('aiDrawer')?.classList.add('ai-open');
  $('aiDrawer')?.setAttribute('aria-hidden', 'false');
  $('chatInputText')?.focus();
}

function closeAI() {
  $('aiDrawer')?.classList.remove('ai-open');
  $('aiDrawer')?.setAttribute('aria-hidden', 'true');
}
