// ==== AURORA AI & CHAT ====
function summarizeForAI() {
  const by = {};
  bd.forEach(d => {
    const m = getMesCorreto(d);
    if(!by[m]) by[m] = {total: 0, onus: 0, acordo: 0, exito: 0, recusados: 0, reais: 0};
    by[m].total++;
    if(d.tipo === 'Ônus') by[m].onus++;
    if(d.tipo === 'Acordo') by[m].acordo++;
    if(d.tipo === 'Êxito') by[m].exito++;
    if(d.recusado === 'Sim') by[m].recusados++;
    if(d.panjud === 'Sim') by[m].reais++;
  });
  return by;
}

function findCandidates(action) {
  let candidates = [];
  if(action._uid) candidates = bd.filter(r => String(r._uid) === String(action._uid));
  else if(action.id) candidates = bd.filter(r => String(r.id) === String(action.id));
  if(action.processo) candidates = candidates.filter(r => String(r.processo) === String(action.processo));
  return candidates;
}

function validateAction(a) {
  if(!a || typeof a !== 'object') return {ok: false, error: 'Ação inválida.'};
  const op = a.acao;
  if(!['cadastrar','editar','apagar','lembrar'].includes(op)) return {ok: false, error: 'Operação não permitida.'};
  if(op === 'lembrar') return a.texto ? {ok: true} : {ok: false, error: 'Memória sem texto.'};
  if(op === 'cadastrar') {
    if(!a.id || !a.processo || !['Ônus','Acordo','Êxito'].includes(a.tipo || '')) return {ok: false, error: 'Cadastro precisa de id, processo e tipo válido.'};
    if(a.panjud === 'Sim' && a.recusado === 'Sim') return {ok: false, error: 'Cadastro inválido: Panjud e recusado não podem ser Sim simultaneamente.'};
    return {ok: true};
  }
  if(!a.id && !a._uid) return {ok: false, error: 'Edição/exclusão precisa de id ou _uid.'};
  const matches = findCandidates(a);
  if(matches.length !== 1) return {ok: false, error: matches.length === 0 ? 'Caso não localizado na base atual.' : 'Há mais de um caso com esse ID. Informe também o número do processo ou _uid.'};
  if(op === 'editar') {
    const next = {...matches[0], ...a};
    delete next.acao;
    if(next.panjud === 'Sim' && next.recusado === 'Sim') return {ok: false, error: 'Edição inválida: Panjud e recusado não podem ser Sim.'};
    return {ok: true, record: matches[0], next};
  }
  return {ok: true, record: matches[0]};
}

function actionPreview(actions) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'text-align:left;font-size:12px;display:grid;gap:8px';
  actions.forEach(a => {
    const row = document.createElement('div');
    row.style.cssText = 'padding:9px;border:1px solid #dfe6ef;border-radius:10px;background:#f8fafc';
    const strong = document.createElement('strong');
    strong.textContent = '[' + a.acao.toUpperCase() + '] ';
    row.appendChild(strong);
    const text = document.createElement('span');
    if(a.acao === 'lembrar') text.textContent = 'Memória: ' + a.texto;
    else text.textContent = 'ID ' + (a.id || '—') + (a.processo ? ' • ' + a.processo : '');
    row.appendChild(text);
    wrap.appendChild(row);
  });
  return wrap;
}

async function executeAIAction(a) {
  const v = validateAction(a);
  if(!v.ok) throw new Error(v.error);
  if(a.acao === 'lembrar') {
    if (!Array.isArray(memoriaIA)) memoriaIA = [];
    memoriaIA.push(a.texto);
    localStorage.setItem(MEMORIA_KEY, JSON.stringify(memoriaIA));
    fetch(API_URL, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({acao: 'salvarMemoria', texto: a.texto})
    }).catch(err => console.log('Erro ao salvar memoria na nuvem:', err));
    registrarLog('LEMBRAR (IA)', '-', 'Anotação: ' + a.texto);
    return 'Memória salva.';
  }
  if(a.acao === 'cadastrar') {
    const rec = {
      id: String(a.id),
      processo: String(a.processo),
      tipo: a.tipo,
      data: normalizeDate(a.data) || getTodayLocal(),
      mesReferencia: String(a.mesReferencia || getSelectedMonth()).padStart(2,'0'),
      panjud: a.panjud || 'Não',
      recusado: a.recusado || 'Não',
      observacoes: a.observacoes || '',
      _uid: uid()
    };
    await saveRecord(rec);
    bd.push(rec);
    localStorage.setItem(CACHE_KEY, JSON.stringify(bd));
    registrarLog('CADASTRAR (IA)', rec.id, 'Processo: ' + rec.processo + ' | Tipo: ' + rec.tipo);
    return 'Cadastro confirmado.';
  }
  if(a.acao === 'editar') {
    const next = {...v.next};
    delete next.acao;
    await editServer(next);
    const idx = bd.findIndex(r => String(r._uid) === String(v.record._uid));
    if(idx >= 0) bd[idx] = next;
    localStorage.setItem(CACHE_KEY, JSON.stringify(bd));
    registrarLog('EDITAR (IA)', next.id, 'Atualizado via Chat. Processo: ' + next.processo);
    return 'Edição confirmada.';
  }
  if(a.acao === 'apagar') {
    await deleteServer(v.record._uid);
    bd = bd.filter(r => String(r._uid) !== String(v.record._uid));
    localStorage.setItem(CACHE_KEY, JSON.stringify(bd));
    registrarLog('APAGAR (IA)', v.record.id, 'Removido via Chat.');
    return 'Exclusão confirmada.';
  }
}

function buildPrompt(userText) {
  const mentions = bd.filter(c => String(userText).includes(String(c.id)) || String(userText).includes(String(c.processo || ''))).slice(0, 15);
  const context = mentions.length ? JSON.stringify(mentions) : 'Nenhum caso específico detectado.';
  const lembrancasAnteriores = memoriaIA.length > 0 ? memoriaIA.join(' | ') : 'Nenhuma memória registrada ainda.';
  
  return [
    'Seu nome é Aurora. Você é a assistente administrativa do ERP da Letícia. Responda com muito carinho e entusiasmo!',
    'REGRAS: Encerramento real significa panjud === Sim. Nunca invente dados.',
    'Para cadastrar, editar, apagar ou lembrar, gere OBRIGATORIAMENTE um bloco JSON com array de ações.',
    'LEMBRANÇAS DA IA: ' + lembrancasAnteriores,
    'BASE ESPECÍFICA: ' + context,
    'RESUMO MENSAL: ' + JSON.stringify(summarizeForAI()),
    'METAS: ' + JSON.stringify(metas),
    'SOLICITAÇÃO: ' + userText
  ].join('\n\n');
}

function appendMessage(sender, text) {
  const wrap = document.createElement('div');
  wrap.className = 'msg-wrap ' + sender;
  const msg = document.createElement('div');
  msg.className = 'msg ' + sender;
  msg.innerHTML = safeText(text);
  wrap.appendChild(msg);
  $('chatMessages').appendChild(wrap);
  $('chatMessages').scrollTop = $('chatMessages').scrollHeight;
}

function stripJsonBlock(text) {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/i);
  return {clean: match ? text.replace(match[0], '').trim() : text, json: match ? match[1] : null};
}

async function processAI() {
  const text = $('chatInputText').value.trim();
  if(!text) return;
  if(!apiKey) {
    await configAPIKey();
    return;
  }
  appendMessage('user', text);
  $('chatInputText').value = '';
  chatHistory.push({role: 'user', content: text});
  appendMessage('system', 'Processando…');
  const system = buildPrompt(text);
  const payload = [{role: 'system', content: system}, ...chatHistory];
  
  try {
    let data = null, success = false, errMsg = '';
    for(const model of ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'qwen/qwen3.6-27b']) {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey},
        body: JSON.stringify({model, messages: payload, temperature: .1})
      });
      data = await r.json();
      if(!data.error) { success = true; break; }
      errMsg = data.error.message || 'Erro';
      if([429, 503].includes(r.status) || /quota|rate limit/i.test(errMsg)) break;
    }
    $('chatMessages').lastElementChild?.remove();
    if(!success) throw new Error(errMsg || 'Nenhum modelo respondeu.');
    const answer = data.choices?.[0]?.message?.content || 'Não recebi conteúdo da Aurora.';
    chatHistory.push({role: 'assistant', content: answer});
    const parsed = stripJsonBlock(answer);
    appendMessage('bot', parsed.clean || 'Certo.');
    if(parsed.json) {
      let actions;
      try {
        actions = JSON.parse(parsed.json);
        if(!Array.isArray(actions)) throw new Error('JSON de ações precisa ser um array.');
      } catch(err) {
        appendMessage('system', 'A Aurora respondeu com uma ação em formato inválido; nada foi executado.');
        return;
      }
      const invalid = actions.map(validateAction).find(v => !v.ok);
      if(invalid) {
        appendMessage('system', 'Nenhuma ação foi executada: ' + invalid.error);
        return;
      }
      const confirm = document.createElement('div');
      confirm.appendChild(actionPreview(actions));
      const result = await Swal.fire({
        title: 'Confirmar ações',
        html: confirm,
        showCancelButton: true,
        confirmButtonText: 'Executar ações',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#4f46e5',
        reverseButtons: true
      });
      if(!result.isConfirmed) {
        appendMessage('system', 'Operação cancelada.');
        return;
      }
      let count = 0;
      setLoading(true, 'Executando ações confirmadas…');
      try {
        for(const a of actions) {
          await executeAIAction(a);
          count++;
        }
        renderAll();
        appendMessage('system', '✓ ' + count + ' ação(ões) confirmada(s) pela nuvem.');
      } catch(err) {
        appendMessage('system', 'A execução foi interrompida: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  } catch(err) {
    $('chatMessages').lastElementChild?.remove();
    appendMessage('bot', 'Não consegui concluir a solicitação agora. Detalhe: ' + err.message);
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
    inputAttributes: {autocomplete: 'off'}
  });
  if(result.isConfirmed) {
    apiKey = (result.value || '').trim();
    if(apiKey) localStorage.setItem(AI_KEY, apiKey);
    else localStorage.removeItem(AI_KEY);
    toast('success', apiKey ? 'Chave salva com sucesso!' : 'Chave removida.');
    $('aiState').textContent = apiKey ? 'Pronta para uso' : 'Aguardando chave Groq';
  }
}

function openAI() {
  $('aiDrawer').classList.add('ai-open');$('aiDrawer').setAttribute('aria-hidden', 'false');
  if(!$('chatMessages').children.length) {
    chatHistory.forEach(m => appendMessage(m.role === 'assistant' ? 'bot' : 'user', m.content));
  }$('chatInputText').focus();
}

function closeAI() {
  $('aiDrawer').classList.remove('ai-open');$('aiDrawer').setAttribute('aria-hidden', 'true');
}

