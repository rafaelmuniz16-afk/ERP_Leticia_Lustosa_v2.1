// js/core/aurora.js - Ponte Limpa para o Aurora Agent Moderno

function summarizeForAI() {
  const by = {};
  if (Array.isArray(bd)) {
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

// Quando clicar em enviar ou der Enter, entrega direto para a Aurora nova
async function processAI() {
  const input = $('chatInputText');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  if (window.processarMensagemAurora) {
    input.value = '';
    return window.processarMensagemAurora(text);
  }

  if (!apiKey) {
    await configAPIKey();
  }
}

async function configAPIKey() {
  const result = await Swal.fire({
    title: 'Chave Groq Cloud',
    input: 'password',
    inputValue: apiKey || '',
    inputLabel: 'A chave fica salva neste navegador para ativar a Aurora.',
    showCancelButton: true,
    confirmButtonText: 'Salvar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#4f46e5',
    inputAttributes: { autocomplete: 'off' }
  });
  if (result.isConfirmed) {
    apiKey = (result.value || '').trim();
    if (apiKey) localStorage.setItem(AI_KEY, apiKey);
    else localStorage.removeItem(AI_KEY);
    if (typeof toast === 'function') toast('success', apiKey ? 'Chave salva com sucesso!' : 'Chave removida.');
    if ($('aiState')) $('aiState').textContent = apiKey ? 'Pronta para operar' : 'Aguardando chave Groq';
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
