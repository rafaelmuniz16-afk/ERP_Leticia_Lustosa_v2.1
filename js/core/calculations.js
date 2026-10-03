function fillMonths() {
  const fm = $('filterMonth'), fr = $('mesReferenciaForm');
  fm.innerHTML = MONTHS.map(([v,n]) => '<option value="' + v + '">' + n + '</option>').join('');
  fr.innerHTML = MONTHS.map(([v,n]) => '<option value="' + v + '">' + n + '</option>').join('');
  const now = getTodayLocal().split('-')[1];
  const last = localStorage.getItem(LAST_MONTH_KEY) || now;
  const chosen = MONTHS.some(x => x[0] === last) ? last : '06';
  fm.value = chosen;
  fr.value = chosen;
  updateMetaInput();
}

function getSelectedMonth() { return $('filterMonth').value; }
function updateMetaInput() { $('metaInput').value = parseNum(metas[getSelectedMonth()]); }

function getFiltered() {
  const month = getSelectedMonth();
  let rows = bd.filter(d => getMesCorreto(d) === month);
  const tipo = $('filterTipo').value, pan = $('filterEncerrado').value, q = $('searchInput').value.toLowerCase().trim(), st = $('searchType').value, dStart = $('dateStart').value, dEnd = $('dateEnd').value;
  if(tipo !== 'Todos') rows = rows.filter(d => d.tipo === tipo);
  if(pan !== 'Todos') rows = rows.filter(d => d.panjud === pan);
  if(q) rows = rows.filter(d => String(st === 'id' ? d.id : d.processo).toLowerCase().includes(q));
  if(dStart) rows = rows.filter(d => normalizeDate(d.data) >= dStart);
  if(dEnd) rows = rows.filter(d => normalizeDate(d.data) <= dEnd);
  return rows;
}

function calculate() {
  const month = getSelectedMonth(), meta = parseNum($('metaInput').value), rows = bd.filter(d => getMesCorreto(d) === month);
  let onus = 0, acordo = 0, exito = 0, recusados = 0, reais = 0, perDay = {};
  rows.forEach(d => {
    if(d.tipo === 'Ônus') onus++;
    if(d.tipo === 'Acordo') acordo++;
    if(d.tipo === 'Êxito') exito++;
    if(d.recusado === 'Sim') recusados++;
    if(d.panjud === 'Sim') reais++;
    const dt = normalizeDate(d.data);
    const dia = dt && dt.includes('-') ? dt.split('-')[2].slice(0,2) : '00';
    perDay[dia] = (perDay[dia] || 0) + 1;
  });
  const quant = onus + acordo + exito, totais = quant - recusados;
  const faltaQuant = meta - quant, faltaTotais = meta - totais, faltaReais = meta - reais;
  return {month, meta, rows, onus, acordo, exito, recusados, reais, quant, totais, faltaQuant, faltaTotais, faltaReais, perDay};
}

function dailyTarget(falta, month) {
  if(falta <= 0) return 'Meta batida! 🏆';
  const now = new Date();
  now.setHours(0,0,0,0);
  const year = now.getFullYear(), idx = parseInt(month, 10) - 1;
  let start = new Date(year, idx, 1), end = new Date(year, idx + 1, 0);
  if(idx < now.getMonth()) return 'Mês encerrado';
  if(idx === now.getMonth()) start = new Date(now);
  let days = 0;
  for(let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if(day !== 0 && day !== 6) days++;
  }
  if(!days) return 'Sem dias úteis';
  return Math.max(0, Math.ceil(falta / days)) + ' casos/dia';
}

function calcFinancial(c) {
  const p = c.meta > 0 ? c.reais / c.meta : 0;
  let r = {onus: 0, acordo: 0, exito: 0};
  if(p >= 1) {
    r = {onus: c.onus * 4, acordo: c.acordo * 3, exito: c.exito * 2};
  } else if(p >= .9) {
    r = {onus: c.onus * 2.2, acordo: c.acordo * 1.7, exito: c.exito * 1.2};
  } else if(p >= .8) {
    r = {onus: c.onus * 1.1, acordo: c.acordo * .85, exito: c.exito * .6};
  }
  return {percent: p, ...r, total: r.onus + r.acordo + r.exito, idealOnus: c.onus * 4, idealAcordo: c.acordo * 3, idealExito: c.exito * 2, idealTotal: c.onus * 4 + c.acordo * 3 + c.exito * 2};
}

