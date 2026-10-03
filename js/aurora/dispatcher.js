// js/aurora/dispatcher.js

/**
 * Despachante oficial de comandos da Aurora para a ERP da Letícia.
 * Cada função aqui mapeia diretamente para uma ação real no sistema.
 */
export async function executarFerramenta(nome, args, ctx) {
  const { $, bd, metas, memoriaIA, calculate, renderAll, updateMetaInput, saveRecord, registrarLog, toast, formatarProcessoCNJ, validarDigitoCNJ, getTodayLocal, getSelectedMonth, uid } = ctx;

  switch (nome) {
    // -------------------------------------------------------------
    // 1. NAVEGAÇÃO DE INTERFACE
    // -------------------------------------------------------------
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

      // Mapeamento dos IDs de seção no HTML
      const mapaSecao = {
        dashboard: 'dashboard',
        cadastro: 'cadastro',
        historico: 'historico'
      };

      const secaoId = mapaSecao[destino] || destino;
      const elemento = $(secaoId);

      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (destino === 'cadastro') {
          setTimeout(() => $('idCaso')?.focus(), 400);
        }
        return `Naveguei com sucesso até a seção de ${destino}.`;
      }

      return `Não encontrei o elemento da seção ${destino} na página.`;
    }

    // -------------------------------------------------------------
    // 2. FILTRAGEM AUTOMÁTICA DA TABELA
    // -------------------------------------------------------------
    case 'filtrarTabela': {
      const { tipo, panjud, mes, busca } = args;

      if (tipo && $('filterTipo'))$('filterTipo').value = tipo;
      if (panjud && $('filterEncerrado'))$('filterEncerrado').value = panjud;
      
      if (mes && $('filterMonth')) {$('filterMonth').value = mes;
        if (updateMetaInput) updateMetaInput();
      }

      if (busca !== undefined && $('searchInput')) {$('searchInput').value = busca;
      }

      // Reinicia paginação e renderiza a tela com os novos filtros
      if (ctx.setCurrentPage) ctx.setCurrentPage(1);
      renderAll();

      return 'Filtros aplicados com sucesso na tabela de encerramentos.';
    }

    // -------------------------------------------------------------
    // 3. CONSULTA INTELIGENTE DE MÉTRICAS
    // -------------------------------------------------------------
    case 'consultarMetricas': {
      const mesConsultado = args.mes || getSelectedMonth();
      const c = calculate();

      return JSON.stringify({
        mes: mesConsultado,
        metaDefinida: c.meta,
        reaisPanjud: c.reais,
        totaisLiquidos: c.totais,
        totalBruto: c.quant,
        recusados: c.recusados,
        onus: c.onus,
        acordos: c.acordo,
        exitos: c.exito,
        faltaParaMeta: Math.max(0, c.faltaReais),
        metaBatida: c.faltaReais <= 0,
        mediaDiariaNecessaria: $('meta_diaria')?.textContent || 'Consulte o painel'
      });
    }

    // -------------------------------------------------------------
    // 4. CADASTRO OPERACIONAL DE CASO COM MÁSCARA/VALIDAÇÃO CNJ
    // -------------------------------------------------------------
    case 'cadastrarCaso': {
      const { id, processo, tipo, data, mesReferencia, panjud, recusado, observacoes } = args;

      // Validação do padrão CNJ (20 dígitos obrigatórios)
      const processoFormatado = formatarProcessoCNJ(processo || '');
      const digitos = processoFormatado.replace(/\D/g, '');

      if (digitos.length !== 20) {
        throw new Error(`Número de processo incompleto (${digitos.length}/20 dígitos). O padrão oficial CNJ exige 20 dígitos.`);
      }

      if (!validarDigitoCNJ(processoFormatado)) {
        throw new Error('Dígitos verificadores do processo CNJ inválidos conforme a regra oficial do CNJ.');
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

      if (registro.panjud === 'Sim' && registro.recusado === 'Sim') {
        throw new Error('Inconsistência: um caso não pode ser "Panjud Sim" e "Recusado Sim" simultaneamente.');
      }

      // Envia para o servidor e atualiza estado local
      await saveRecord(registro);
      bd.push(registro);
      localStorage.setItem('bd_oficial_leticia', JSON.stringify(bd));

      registrarLog('CADASTRAR (AURORA TOOL)', registro.id, `Processo: ${registro.processo} | Tipo: ${registro.tipo} | Panjud: ${registro.panjud}`);
      renderAll();
      toast('success', `Caso ${registro.id} cadastrado via comando da Aurora!`);

      return `Caso ${registro.id} (Processo: ${registro.processo}) cadastrado e sincronizado com a nuvem com sucesso!`;
    }

    // -------------------------------------------------------------
    // 5. ATUALIZAÇÃO DE META
    // -------------------------------------------------------------
    case 'alterarMeta': {
      const { mes, valor } = args;
      const mesFormatado = String(mes).padStart(2, '0');
      const numValor = Number(valor);

      metas[mesFormatado] = numValor;
      localStorage.setItem('metas_oficial_leticia', JSON.stringify(metas));

      if (getSelectedMonth() === mesFormatado && $('metaInput')) {$('metaInput').value = numValor;
      }

      // Sincroniza com o Google Apps Script
      if (ctx.serverMutation) {
        ctx.serverMutation('salvarMeta', { mes: mesFormatado, meta: numValor })
          .catch(err => console.error('Erro ao sincronizar meta:', err));
      }

      renderAll();
      toast('success', `Meta de ${mesFormatado} atualizada para ${numValor}!`);

      return `Meta do mês ${mesFormatado} atualizada para ${numValor} casos com sucesso.`;
    }

    // -------------------------------------------------------------
    // 6. MEMÓRIA PERSISTENTE DA IA
    // -------------------------------------------------------------
    case 'gravarMemoria': {
      const { texto } = args;
      if (!texto) throw new Error('Texto de memória vazio.');

      memoriaIA.push(texto);
      localStorage.setItem('memoria_oficial_ia', JSON.stringify(memoriaIA));

      // Sincroniza no Apps Script em background
      if (ctx.API_URL) {
        fetch(ctx.API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ acao: 'salvarMemoria', texto })
        }).catch(err => console.error('Erro ao salvar memória na nuvem:', err));
      }

      registrarLog('MEMÓRIA (AURORA)', '-', `Anotação: ${texto}`);
      return `Lembrete anotado na minha memória operacional: "${texto}"`;
    }

    default:
      throw new Error(`Ferramenta "${nome}" não implementada no dispatcher.`);
  }
}
