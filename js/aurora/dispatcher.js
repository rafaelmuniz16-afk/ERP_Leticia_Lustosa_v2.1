// js/aurora/dispatcher.js

export async function executarFerramenta(nome, args, ctx) {
  const { $, bd, metas, memoriaIA, calculate, renderAll, updateMetaInput, saveRecord, registrarLog, toast, formatarProcessoCNJ, validarDigitoCNJ, getTodayLocal, getSelectedMonth, uid } = ctx;

  switch (nome) {
    // -------------------------------------------------------------
    // RANKING E DIA MAIS PRODUTIVO (SUPER LEVE EM TOKENS)
    // -------------------------------------------------------------
    case 'consultarRankingDiario': {
      const mAlvo = String(args.mes || getSelectedMonth()).padStart(2, '0');
      const lista = (Array.isArray(bd) ? bd : []).filter(r => String(r.mesReferencia || '').padStart(2, '0') === mAlvo);
      
      const porDia = {};
      lista.forEach(r => {
        const dia = r.data || 'Sem data';
        porDia[dia] = (porDia[dia] || 0) + 1;
      });

      const ordenado = Object.entries(porDia).sort((a, b) => b[1] - a[1]);
      const melhor = ordenado[0] ? { data: ordenado[0][0], totalCasos: ordenado[0][1] } : null;

      return JSON.stringify({
        mesReferencia: mAlvo,
        totalCasosNoMes: lista.length,
        diaCampeao: melhor,
        rankingTop3: ordenado.slice(0, 3).map(([data, total]) => ({ data, total }))
      });
    }

    // -------------------------------------------------------------
    // CONSULTA DE CASOS (ENXUTA E LIMITADA A 5 CASOS MAX)
    // -------------------------------------------------------------
    case 'consultarCasos': {
      const { mes, tipo, panjud, termo, limite = 3, ordem = 'recente' } = args;
      let lista = Array.isArray(bd) ? [...bd] : [];

      if (mes) {
        const mAlvo = String(mes).padStart(2, '0');
        lista = lista.filter(r => String(r.mesReferencia || '').padStart(2, '0') === mAlvo);
      }
      if (tipo && tipo !== 'Todos') {
        lista = lista.filter(r => r.tipo === tipo);
      }
      if (panjud && panjud !== 'Todos') {
        lista = lista.filter(r => r.panjud === panjud);
      }
      if (termo) {
        const t = String(termo).toLowerCase();
        lista = lista.filter(r => String(r.id).toLowerCase().includes(t) || String(r.processo).toLowerCase().includes(t));
      }

      lista.sort((a, b) => {
        const dA = new Date(a.data || 0);
        const dB = new Date(b.data || 0);
        return ordem === 'recente' ? dB - dA : dA - dB;
      });

      // Trava de segurança: nunca entrega mais de 5 casos para não estourar tokens
      const max = Math.min(Number(limite) || 3, 5);
      const casosFiltrados = lista.slice(0, max).map(r => ({
        id: r.id,
        processo: r.processo,
        tipo: r.tipo,
        data: r.data,
        mes: r.mesReferencia,
        panjud: r.panjud
      }));

      return JSON.stringify({
        totalEncontrados: lista.length,
        casos: casosFiltrados
      });
    }

    case 'navegarEcra': {
      const { destino } = args;
      if (destino === 'auditoria') {
        const win = $('winAuditoria');
        if (win) {
          win.style.display = 'flex';
          if (ctx.renderLogs) ctx.renderLogs();
        }
        return 'Abri a janela flutuante de auditoria na tela.';
      }

      const elemento = $(destino);
      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (destino === 'cadastro') {
          setTimeout(() => $('idCaso')?.focus(), 400);
        }
        return `Naveguei com sucesso ate a secao de ${destino}.`;
      }
      return `Nao encontrei a secao ${destino} na pagina.`;
    }

    case 'filtrarTabela': {
      const { tipo, panjud, mes, busca } = args;
      if (tipo && $('filterTipo'))$('filterTipo').value = tipo;
      if (panjud && $('filterEncerrado'))$('filterEncerrado').value = panjud;
      if (mes && $('filterMonth')) {$('filterMonth').value = mes;
        if (updateMetaInput) updateMetaInput();
      }
      if (busca !== undefined && $('searchInput')) {$('searchInput').value = busca;
      }
      if (ctx.setCurrentPage) ctx.setCurrentPage(1);
      renderAll();
      return 'Filtros aplicados com sucesso na tabela.';
    }

    case 'consultarMetricas': {
      const mesConsultado = args.mes || getSelectedMonth();
      const c = calculate();
      return JSON.stringify({
        mes: mesConsultado,
        meta: c.meta,
        reais: c.reais,
        totais: c.totais,
        recusados: c.recusados,
        faltaMeta: Math.max(0, c.faltaReais),
        metaBatida: c.faltaReais <= 0
      });
    }

    case 'cadastrarCaso': {
      const { id, processo, tipo, data, mesReferencia, panjud, recusado, observacoes } = args;
      const processoFormatado = formatarProcessoCNJ(processo || '');
      const digitos = processoFormatado.replace(/\D/g, '');

      if (digitos.length !== 20) {
        throw new Error(`Processo incompleto (${digitos.length}/20 digitos). O CNJ exige 20 digitos.`);
      }
      if (!validarDigitoCNJ(processoFormatado)) {
        throw new Error('Digitos verificadores do processo CNJ invalidos.');
      }

      const registro = {
        id: String(id).trim(),
        processo: processoFormatado,
        tipo: tipo || 'Ônus',
        data: data || getTodayLocal(),
        mesReferencia: String(mesReferencia || getSelectedMonth()).padStart(2, '0'),
        panjud: panjud || 'Não',
        recusado: recusado || 'Não',
        observacoes: (observacoes || '').trim(),
        _uid: uid()
      };

      await saveRecord(registro);
      bd.push(registro);
      localStorage.setItem('bd_oficial_leticia', JSON.stringify(bd));
      registrarLog('CADASTRAR (AURORA TOOL)', registro.id, `Processo: ${registro.processo} | Tipo: ${registro.tipo}`);
      renderAll();
      toast('success', `Caso ${registro.id} cadastrado via Aurora!`);
      return `Caso ${registro.id} cadastrado com sucesso!`;
    }

    case 'alterarMeta': {
      const { mes, valor } = args;
      const mesFormatado = String(mes).padStart(2, '0');
      const numValor = Number(valor);

      metas[mesFormatado] = numValor;
      localStorage.setItem('metas_oficial_leticia', JSON.stringify(metas));
      if (getSelectedMonth() === mesFormatado && $('metaInput')) {$('metaInput').value = numValor;
      }
      if (ctx.serverMutation) {
        ctx.serverMutation('salvarMeta', { mes: mesFormatado, meta: numValor }).catch(() => {});
      }
      renderAll();
      toast('success', `Meta de ${mesFormatado} atualizada para ${numValor}!`);
      return `Meta do mes ${mesFormatado} alterada para ${numValor}.`;
    }

    case 'gravarMemoria': {
      const { texto } = args;
      if (!texto) throw new Error('Texto vazio.');
      memoriaIA.push(texto);
      localStorage.setItem('memoria_oficial_ia', JSON.stringify(memoriaIA));
      if (ctx.API_URL) {
        fetch(ctx.API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ acao: 'salvarMemoria', texto })
        }).catch(() => {});
      }
      registrarLog('MEMORIA (AURORA)', '-', `Anotacao: ${texto}`);
      return `Lembrete salvo na memoria: "${texto}"`;
    }

    default:
      throw new Error(`Ferramenta "${nome}" nao implementada.`);
  }
}
