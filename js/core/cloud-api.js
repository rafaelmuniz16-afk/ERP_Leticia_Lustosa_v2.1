// ==== API & NUVEM ====
async function fetchAPI(acao, payload={}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40000);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({acao, ...payload}),
      signal: controller.signal
    });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch(err) {
    console.error('API', err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function serverMutation(acao, payload) {
  setConn('syncing', 'Salvando…');
  const res = await fetchAPI(acao, payload);
  if(!res || res.status !== 'sucesso') {
    setConn('offline', 'Falha na nuvem');
    throw new Error(res?.mensagem || res?.message || 'Servidor não confirmou a operação.');
  }
  return res;
}

async function loadCloud(initial=false) {
  setConn('syncing', 'Conectando…');
  if(initial && bd.length) renderAll();
  const res = await fetchAPI('ler');
  if(res && res.status === 'sucesso') {
    bd = Array.isArray(res.dados) ? res.dados : [];
    if(res.metas && typeof res.metas === 'object') {
      metas = res.metas;
      lastConfirmedMetas = JSON.parse(JSON.stringify(metas));
      localStorage.setItem(META_KEY, JSON.stringify(metas));
    }
    if(res.logs && Array.isArray(res.logs)) {
      logsAuditoria = res.logs;
      localStorage.setItem(LOGS_KEY, JSON.stringify(logsAuditoria));
    }
    if(res.memoria && Array.isArray(res.memoria)) {
      memoriaIA = res.memoria;
      localStorage.setItem(MEMORIA_KEY, JSON.stringify(memoriaIA));
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(bd));
    setConn('online', 'Online');
    $('sideCount').textContent = bd.length;
    renderAll();
    if (typeof startDiagnosticLoop === 'function') {
      startDiagnosticLoop();
    }
  } else {
    setConn('offline', 'Sem conexão');
    toast('warning', 'Não foi possível confirmar os dados da nuvem.');
  }
  return res;
}

