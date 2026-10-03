// ==== RADAR: 15 DIAGNÓSTICOS EM TEMPO REAL ====
let diagnosticIndex = 0;
let diagnosticTimer = null;

function get15BusinessDiagnostics() {
  const c = calculate();
  const f = calcFinancial(c);
  const hoje = getTodayLocal();
  const casosHoje = bd.filter(d => normalizeDate(d.data) === hoje && getMesCorreto(d) === c.month).length;

  const now = new Date();
  const year = now.getFullYear();
  const idx = parseInt(c.month, 10) - 1;
  let startMes = new Date(year, idx, 1);
  let endMes = new Date(year, idx + 1, 0);
  let diasUteisTotais = 0;
  let diasUteisRestantes = 0;

  for (let d = new Date(startMes); d <= endMes; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) diasUteisTotais++;
  }

  if (idx === now.getMonth()) {
    for (let d = new Date(now); d <= endMes; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) diasUteisRestantes++;
    }
  } else if (idx > now.getMonth()) {
    diasUteisRestantes = diasUteisTotais;
  } else {
    diasUteisRestantes = 0;
  }

  const pctMeta = c.meta > 0 ? (c.reais / c.meta) * 100 : 0;
  const taxaHomologacao = c.quant > 0 ? Math.round((c.reais / c.quant) * 100) : 0;
  const ganhoPerdidoRecusados = c.recusados * 3;
  const diferencaPara100 = Math.max(0, f.idealTotal - f.total);

  let projecaoFechamento = c.reais;
  let diasDecorridos = Math.max(1, diasUteisTotais - diasUteisRestantes);
  if (diasDecorridos > 0 && diasUteisRestantes > 0) {
    let mediaDiaria = c.reais / diasDecorridos;
    projecaoFechamento = Math.round(c.reais + (mediaDiaria * diasUteisRestantes));
  }

  const d = [];
  d.push('📈 Projeção: ritmo para fechar o mês com ~' + projecaoFechamento + ' casos reais.');
  if (pctMeta >= 100) d.push('🏆 Faixa máxima (100%) garantida no bolso com honras!');
  else if (pctMeta >= 90) d.push('🎯 Faixa de 90% ativa! Faltam só ' + Math.max(0, c.meta - c.reais) + ' casos p/ 100%');
  else if (pctMeta >= 80) d.push('💰 Faixa de 80% atingida! Faltam ' + Math.max(0, Math.ceil(c.meta * 0.9) - c.reais) + ' p/ 90%');
  else d.push('🎯 Faltam ' + Math.max(0, Math.ceil(c.meta * 0.8) - c.reais) + ' casos reais para ativar o bônus (80%)');

  d.push('💵 Ganho real atual consolidado: ' + formatMoney(f.total));
  if (diferencaPara100 > 0) d.push('✨ Bater 100% adiciona +' + formatMoney(diferencaPara100) + ' de bônus na sua conta');
  else d.push('⭐ Bônus máximo conquistado: teto financeiro de ' + formatMoney(f.idealTotal) + '!');

  d.push('⏱️ Meta diária necessária: ' + dailyTarget(c.faltaReais, c.month));
  d.push('⚡ Hoje você já registrou ' + casosHoje + ' caso(s) neste mês');
  d.push('✅ Taxa de conversão Panjud: ' + taxaHomologacao + '% dos seus casos foram homologados');

  if (c.recusados > 0) d.push('⚠️ ' + c.recusados + ' recusado(s) Panjud tiraram ~' + formatMoney(ganhoPerdidoRecusados) + ' da meta real');
  else d.push('💎 Zero recusados no Panjud: precisão operacional de 100%!');

  d.push('💼 Ônus (R$ 4 a 100%): ' + c.onus + ' casos = ' + formatMoney(f.idealOnus));
  d.push('🤝 Acordo (R$ 3 a 100%): ' + c.acordo + ' casos = ' + formatMoney(f.idealAcordo));
  d.push('🎉 Êxito (R$ 2 a 100%): ' + c.exito + ' casos = ' + formatMoney(f.idealExito));
  d.push('📊 Balanço: ' + c.quant + ' casos cadastrados contra ' + c.reais + ' confirmados Panjud');
  d.push('📅 Restam ' + diasUteisRestantes + ' dia(s) útil(eis) de trabalho até fechar o mês');

  if (c.quant > 0) {
    let maxTipo = 'Êxito', maxPct = Math.round((c.exito / c.quant) * 100);
    if (c.acordo >= c.exito && c.acordo >= c.onus) { maxTipo = 'Acordo'; maxPct = Math.round((c.acordo / c.quant) * 100); }
    else if (c.onus >= c.exito && c.onus >= c.acordo) { maxTipo = 'Ônus'; maxPct = Math.round((c.onus / c.quant) * 100); }
    d.push('📌 Mix: ' + maxTipo + ' é o tipo líder representando ' + maxPct + '% da carteira');
  } else {
    d.push('📌 Cadastre encerramentos para traçar o mix da carteira');
  }

  d.push('🏁 Placar global: ' + c.reais + ' de ' + c.meta + ' necessários (' + pctMeta.toFixed(1) + '% batido)');
  return d;
}

function rotateBusinessDiagnostic() {
  const msgEl = $('sideAuroraMsg');
  if (!msgEl) return;
  const pool = get15BusinessDiagnostics();
  if (!pool.length) return;

  diagnosticIndex = (diagnosticIndex + 1) % pool.length;
  msgEl.style.opacity = '0.25';
  setTimeout(() => {
    msgEl.textContent = pool[diagnosticIndex];
    msgEl.style.opacity = '1';
  }, 220);
}

function startDiagnosticLoop() {
  clearInterval(diagnosticTimer);
  const pool = get15BusinessDiagnostics();
  if (pool.length && $('sideAuroraMsg')) {
    $('sideAuroraMsg').textContent = pool[0];
  }
  diagnosticTimer = setInterval(rotateBusinessDiagnostic, 8500);
}

