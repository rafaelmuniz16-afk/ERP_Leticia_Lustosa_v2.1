// js/aurora/dispatcher.js

// Funcao de blindagem: garante Ônus, Acordo e Êxito com acentos corretos
function normalizarTipo(valor) {
  if (!valor) return 'Ônus';
  const limpo = String(valor).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (limpo.includes('exit')) return 'Êxito';
  if (limpo.includes('onus')) return 'Ônus';
  if (limpo.includes('acord')) return 'Acordo';
  return 'Ônus';
}

// Funcao de blindagem: garante 'Sim' ou 'Não' (com til) e entende variacoes foneticas
function normalizarSimNao(valor, padrao = 'Não') {
  if (!valor) return padrao;
  const limpo = String(valor).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const afirmativos = ['sim', 's', 'true', '1', 'positivo', 'encerrado', 'foi', 'ok'];
  const negativos = ['nao', 'n', 'false', '0', 'negativo', 'recusado', 'pendente'];

  if (afirmativos.includes(limpo)) return 'Sim';
  if (negativos.includes(limpo)) return 'Não';
  return padrao;
}

// Formata CNJ para o padrao 0000000-00.0000.0.00.0000 mesmo se vier sem pontos e tracos
function formatarCNJAutomatico(valor, formatadorOriginal) {
  const digitos = String(valor || '').replace(/\D/g, '');
  if (digitos.length === 20) {
    return digitos.replace(/^(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})$/, '$1-$2.$3.$4.$5.$6');
  }
  if (typeof formatadorOriginal === 'function') {
    return formatadorOriginal(valor);
  }
  return valor;
}

export async function executarFerramenta(nome, args, ctx) {
  const { $, bd, metas, memoriaIA, calculate, renderAll, updateMetaInput, saveRecord, registrarLog, toast, formatarProcessoCNJ, validarDigitoCNJ, getTodayLocal, getSelectedMonth, uid } = ctx;

  switch (nome) {
    case 'consultarRankingDiario': {
      const mAlvo = String(args.mes ? args.mes : getSelectedMonth()).padStart(2, '0');
      const lista = (Array.isArray(bd) ? bd : []).filter(r => String(r.mesReferencia ? r.mesReferencia : '').padStart(2, '0') === mAlvo);
      
      const porDia = {};
      lista.forEach(r => {
        const dia = r.data ? r.data : 'Sem data';
        porDia[dia] = (porDia[dia] ? porDia[dia] : 0) + 1;
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

    case 'consultarCasos': {
      const { mes, tipo, panjud, termo, limite = 3, ordem = 'recente' } = args;
      let lista = Array.isArray(bd) ? [...bd] : [];

      if (mes) {
        const mAlvo = String(mes).padStart(2, '0');
        lista = lista.filter(r => String(r.mesReferencia ? r.mesReferencia : '').padStart(2, '0') === mAlvo);
      }
      if (tipo && tipo !== 'Todos') {
        const tNormalizado = normalizarTipo(tipo);
        lista = lista.filter(r => normalizarTipo(r.tipo) === tNormalizado);
      }
      if (panjud && panjud !== 'Todos') {
        const pNormalizado = normalizarSimNao(panjud);
        lista = lista.filter(r => normalizarSimNao(r.panjud) === pNormalizado);
      }
      if (termo) {
        const t = String(termo).toLowerCase();
        lista = lista.filter(r => String(r.id).toLowerCase().includes(t) || String(r.processo).toLowerCase().includes(t));
      }

      lista.sort((a, b) => {
        const dA = new Date(a.data ? a.data : 0);
        const dB = new Date(b.data ? b.data : 0);
        return ordem === 'recente' ? dB - dA : dA - dB;
      });

      const max = Math.min(Number(limite) ? Number(limite) : 3, 5);
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
          setTimeout(() => {
            const inp = $('idCaso');
            if (inp) inp.focus();
          }, 400);
        }
        return 'Naveguei com sucesso ate a secao de ' + destino + '.';
      }
      return 'Nao encontrei a secao ' + destino + ' na pagina.';
    }

    case 'filtrarTabela': {
      const { tipo, panjud, mes, busca } = args;
      if (tipo && $('filterTipo')) {
        $('filterTipo').value = tipo === 'Todos' ? 'Todos' : normalizarTipo(tipo);
      }
      if (panjud && $('filterEncerrado')) {
        $('filterEncerrado').value = panjud === 'Todos' ? 'Todos' : normalizarSimNao(panjud);
      }
      if (mes && $('filterMonth')) {
        $('filterMonth').value = mes;
        if (updateMetaInput) updateMetaInput();
      }
      if (busca !== undefined && $('searchInput')) {
        $('searchInput').value = busca;
      }
      if (ctx.setCurrentPage) ctx.setCurrentPage(1);
      renderAll();
      return 'Filtros aplicados com sucesso na tabela.';
    }

    case 'consultarMetricas': {
      const mesConsultado = args.mes ? args.mes : getSelectedMonth();
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

    // -----------------------------------------------------------------
    // CADASTRO 100% BLINDADO CONTRA ERROS DE DIGITAÇÃO E FONÉTICA
    // -----------------------------------------------------------------
    case 'cadastrarCaso': {
      const { id, processo, tipo, data, mesReferencia, panjud, recusado, observacoes } = args;

      // 1. Acentuacao estrita para a planilha reconhecer
      const tipoHigienizado = normalizarTipo(tipo);

      // 2. Formatacao e validacao do CNJ
      const processoFormatado = formatarCNJAutomatico(processo, formatarProcessoCNJ);
      const digitos = processoFormatado.replace(/\D/g, '');

      if (digitos.length !== 20) {
        throw new Error('Processo incompleto (' + digitos.length + '/20 digitos). O CNJ exige 20 digitos.');
      }

      // 3. Normalizacao fonetica e gramatical do Panjud (garante "Sim" e "Não" com til)
      let panjudHigienizado = normalizarSimNao(panjud, 'Não');
      let recusadoHigienizado = normalizarSimNao(recusado, 'Não');

      // Se a transcricao de voz colocou pistas no texto de observacoes
      const obsTexto = String(observacoes ? observacoes : '').toLowerCase();
      if (/panjud[eg]?\s*(e|foi|ta|esta)?\s*(sim|ok|positivo)/i.test(obsTexto)) {
        panjudHigienizado = 'Sim';
      }
      if (/recusad[oa]\s*(no\s*panjud[eg]?)?\s*(e|foi|ta|esta)?\s*(sim|positivo)/i.test(obsTexto)) {
        recusadoHigienizado = 'Sim';
      }

      // Regra de integridade do ERP: Panjud e Recusado nao podem ser ambos "Sim"
      if (panjudHigienizado === 'Sim' && recusadoHigienizado === 'Sim') {
        recusadoHigienizado = 'Não';
      }

      const registro = {
        id: String(id).trim(),
        processo: processoFormatado,
        tipo: tipoHigienizado, // "Êxito", "Ônus" ou "Acordo"
        data: data ? data : getTodayLocal(),
        mesReferencia: String(mesReferencia ? mesReferencia : getSelectedMonth()).padStart(2, '0'),
        panjud: panjudHigienizado, // "Sim" ou "Não"
        recusado: recusadoHigienizado, // "Sim" ou "Não"
        observacoes: (observacoes ? observacoes : '').trim(),
        _uid: uid()
      };

      await saveRecord(registro);
      bd.push(registro);
      localStorage.setItem('bd_oficial_leticia', JSON.stringify(bd));
      registrarLog('CADASTRAR (AURORA TOOL)', registro.id, 'Processo: ' + registro.processo + ' | Tipo: ' + registro.tipo + ' | Panjud: ' + registro.panjud);
      renderAll();
      toast('success', 'Caso ' + registro.id + ' cadastrado com sucesso!');
      return 'Caso ' + registro.id + ' cadastrado perfeitamente! Tipo: ' + registro.tipo + ', Panjud: ' + registro.panjud + ', Processo: ' + registro.processo + '.';
    }

    case 'alterarMeta': {
      const { mes, valor } = args;
      const mesFormatado = String(mes).padStart(2, '0');
      const numValor = Number(valor);

      metas[mesFormatado] = numValor;
      localStorage.setItem('metas_oficial_leticia', JSON.stringify(metas));
      if (getSelectedMonth() === mesFormatado && $('metaInput')) {
        $('metaInput').value = numValor;
      }
      if (ctx.serverMutation) {
        ctx.serverMutation('salvarMeta', { mes: mesFormatado, meta: numValor }).catch(() => {});
      }
      renderAll();
      toast('success', 'Meta de ' + mesFormatado + ' atualizada para ' + numValor + '!');
      return 'Meta do mes ' + mesFormatado + ' alterada para ' + numValor + '.';
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
      registrarLog('MEMORIA (AURORA)', '-', 'Anotacao: ' + texto);
      return 'Lembrete salvo na memoria: "' + texto + '"';
    }

    default:
      throw new Error('Ferramenta "' + nome + '" nao implementada.');
  }
}
