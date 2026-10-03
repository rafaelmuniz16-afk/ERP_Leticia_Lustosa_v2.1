function renderStatus(c) {
  const pct = c.meta > 0 ? c.reais / c.meta : 0;
  const box = $('statusBanner');
  box.className = 'status ' + (pct >= 1 ? 'status-100' : pct >= .9 ? 'status-90' : pct >= .8 ? 'status-80' : 'status-bad');
  $('statusProgress').style.width = Math.min(100, pct * 100) + '%';
  $('statusTitle').textContent = pct >= 1 ? 'Meta atingida — excelente!' : pct >= .9 ? 'Você está em 90% da meta (' + (pct * 100).toFixed(1) + '%).' : pct >= .8 ? 'Você chegou à faixa de 80% (' + (pct * 100).toFixed(1) + '%).' : 'Meta ainda não atingida (' + (pct * 100).toFixed(1) + '%).';
  $('statusSub').textContent = c.reais + ' reais de ' + c.meta + ' necessários • faltam ' + Math.max(0, c.faltaReais);
}

// No js/core/render.js:

function renderCharts(c) {
  if (charts.tipos) charts.tipos.destroy();
  charts.tipos = new Chart($('tiposChart'), {
    type: 'doughnut',
    data: {
      labels: ['Ônus', 'Acordo', 'Êxito'],
      datasets: [{
        data: [c.onus, c.acordo, c.exito],
        backgroundColor: ['#dc3f5a', '#d97706', '#0f9f6e'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true, boxWidth: 8, font: { size: 10 } }
        }
      }
    }
  });

  // BLINDAGEM: Se perDay não existir por qualquer motivo, usa objeto vazio sem travar
  const mapaDias = (c && c.perDay) ? c.perDay : {};
  const mesAtual = (c && c.month) ? c.month : getSelectedMonth();
  const days = Object.keys(mapaDias).sort((a, b) => parseInt(a) - parseInt(b));

  if (charts.linha) charts.linha.destroy();
  charts.linha = new Chart($('linhaChart'), {
    type: 'line',
    data: {
      labels: days.map(d => d + '/' + mesAtual),
      datasets: [{
        data: days.map(d => mapaDias[d]),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79,70,229,.12)',
        fill: true,
        tension: .32,
        pointRadius: 3,
        pointBackgroundColor: '#4f46e5'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 9 } } },
        y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 9 } } }
      }
    }
  });
}

function renderFinancial(c) {
  const f = calcFinancial(c);
  $('val_real_onus').textContent = formatMoney(f.onus);
  $('val_real_acordo').textContent = formatMoney(f.acordo);
  $('val_real_exito').textContent = formatMoney(f.exito);
  $('val_real_total').textContent = formatMoney(f.total);
  $('val_100_onus').textContent = formatMoney(f.idealOnus);
  $('val_100_acordo').textContent = formatMoney(f.idealAcordo);
  $('val_100_exito').textContent = formatMoney(f.idealExito);
  $('val_100_total').textContent = formatMoney(f.idealTotal);
}

function renderTable() {
  const tbody = $('recordsTable');
  tbody.replaceChildren();
  const order = $('sortOrder').value;
  let data = getFiltered().sort((a,b) => {
    const dA = normalizeDate(a.data) || '', dB = normalizeDate(b.data) || '';
    if(dA !== dB) return order === 'desc' ? dB.localeCompare(dA) : dA.localeCompare(dB);
    const uA = String(a._uid || a.id), uB = String(b._uid || b.id);
    return order === 'desc' ? uB.localeCompare(uA) : uA.localeCompare(uB);
  });
  const maxPage = Math.max(1, Math.ceil(data.length / itemsPerPage));
  if(currentPage > maxPage) currentPage = maxPage;
  $('pageInfo').textContent = 'Página ' + currentPage + ' de ' + maxPage;
  $('btnPrevPage').disabled = currentPage === 1;
  $('btnNextPage').disabled = currentPage === maxPage;
  if(!data.length) {
    const tr = document.createElement('tr'), td = document.createElement('td');
    td.colSpan = 9; td.className = 'empty'; td.textContent = 'Nenhum encerramento encontrado para estes filtros.';
    tr.appendChild(td); tbody.appendChild(tr); return;
  }
  const start = (currentPage - 1) * itemsPerPage;
  data.slice(start, start + itemsPerPage).forEach(d => {
    const tr = document.createElement('tr');
    const tipoClass = d.tipo === 'Êxito' ? 'b-exito' : d.tipo === 'Acordo' ? 'b-acordo' : 'b-onus';
    const cells = [d.id || '-', d.processo || '-'];
    cells.forEach(v => { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
    const tdTipo = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'badge ' + tipoClass; badge.textContent = d.tipo || '-';
    tdTipo.appendChild(badge); tr.appendChild(tdTipo);
    const vals = [normalizeDate(d.data) ? normalizeDate(d.data).split('-').reverse().join('/') : '-', getMesCorreto(d), d.panjud || 'Não', d.recusado || 'Não'];
    vals.forEach((v,i) => {
      const td = document.createElement('td');
      td.textContent = i === 1 ? monthName(v) : v;
      if(i === 2 || i === 3) td.className = v === 'Sim' ? 'yes' : 'no';
      tr.appendChild(td);
    });
    const tdObs = document.createElement('td');
    tdObs.className = 'ellipsis'; tdObs.title = d.observacoes || ''; tdObs.textContent = d.observacoes || '-';
    tr.appendChild(tdObs);
    const tdAct = document.createElement('td');
    tdAct.className = 'actions';
    const eb = document.createElement('button');
    eb.className = 'icon-btn'; eb.title = 'Editar'; eb.textContent = '✎';
    eb.addEventListener('click', () => startEdit(d._uid));
    const db = document.createElement('button');
    db.className = 'icon-btn danger-btn'; db.title = 'Excluir'; db.textContent = '⌫';
    db.addEventListener('click', () => deleteRecord(d._uid));
    tdAct.append(eb, db); tr.appendChild(tdAct);
    tbody.appendChild(tr);
  });
}

function renderAll() {
  const c = calculate();
  renderStatus(c);
  $('m5_quant').textContent = c.quant;
  $('m8_recusados').textContent = c.recusados;
  $('m7_reais').textContent = c.reais;
  $('falta_reais').textContent = c.faltaReais;
  $('count_onus').textContent = c.onus;
  $('count_acordo').textContent = c.acordo;
  $('count_exito').textContent = c.exito;
  $('m6_totais').textContent = c.totais;
  $('falta_quant').textContent = c.faltaQuant;
  $('labelQuant').textContent = c.quant + ' / ' + c.meta;
  $('labelTotais').textContent = c.totais + ' / ' + c.meta;
  $('labelReais').textContent = c.reais + ' / ' + c.meta;
  const dt = dailyTarget(c.faltaReais, c.month);
  $('meta_diaria').textContent = dt;
  $('meta_diaria_2').textContent = dt;
  renderCharts(c);
  renderFinancial(c);
  renderTable();
  renderLogs();
  $('sideCount').textContent = bd.length;
}

