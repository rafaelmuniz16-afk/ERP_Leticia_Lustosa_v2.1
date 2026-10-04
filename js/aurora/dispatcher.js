// DENTRO DO SWITCH DO dispatcher.js:

    case 'cadastrarCaso': {
      const { id, processo, tipo, data, mesReferencia, panjud, recusado, observacoes } = args;

      const tipoHigienizado = normalizarTipoEstrito(tipo);
      const processoFormatado = formatarCNJAutomatico(processo, formatarProcessoCNJ);
      const digitos = processoFormatado.replace(/\D/g, '');

      if (digitos.length !== 20) {
        throw new Error('Processo incompleto (' + digitos.length + '/20 dígitos). O padrão CNJ exige 20 dígitos.');
      }

      if (typeof validarDigitoCNJ === 'function' && !validarDigitoCNJ(processoFormatado)) {
        throw new Error('Dígitos verificadores do processo CNJ inválidos.');
      }

      let panjudHigienizado = normalizarPanjud(panjud, 'Não');
      let recusadoHigienizado = normalizarSimNaoEstrito(recusado, 'Recusado');

      const obsTexto = String(observacoes || '').toLowerCase();
      if (/panjud[eg]?\s*(e|foi|ta|esta)?\s*(sim|ok|positivo)/i.test(obsTexto)) panjudHigienizado = 'Sim';
      if (/recusad[oa]\s*(no\s*panjud[eg]?)?\s*(e|foi|ta|esta)?\s*(sim|positivo)/i.test(obsTexto)) recusadoHigienizado = 'Sim';

      if (panjudHigienizado === 'Sim' && recusadoHigienizado === 'Sim') {
        throw new Error('Inconsistência: um caso não pode estar encerrado no Panjud (Sim) e Recusado no Panjud (Sim) ao mesmo tempo.');
      }

      // Se o modal de voz estiver ativo, a confirmação já aconteceu via diálogo de voz!
      // Só dispara SweetAlert se o usuário estiver digitando no chat normal sem a tela de voz aberta.
      const modalVozAberto = document.getElementById('auroraVoiceModal')?.classList.contains('active');
      if (!modalVozAberto && typeof Swal !== 'undefined') {
        const confirmacao = await Swal.fire({
          title: 'Confirmar Cadastro?',
          html: `<b>ID:</b> ${id}<br><b>Processo:</b> ${processoFormatado}<br><b>Tipo:</b> ${tipoHigienizado}<br><b>Panjud:</b> ${panjudHigienizado}`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sim, cadastrar',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#4f46e5'
        });

        if (!confirmacao.isConfirmed) {
          throw new Error('Cadastro cancelado pelo usuário.');
        }
      }

      const registro = {
        id: String(id).trim(),
        processo: processoFormatado,
        tipo: tipoHigienizado,
        data: data || getTodayLocal(),
        mesReferencia: String(mesReferencia || getSelectedMonth()).padStart(2, '0'),
        panjud: panjudHigienizado,
        recusado: recusadoHigienizado,
        observacoes: (observacoes || '').trim(),
        _uid: uid()
      };

      await saveRecord(registro);
      bd.push(registro);
      localStorage.setItem('bd_oficial_leticia', JSON.stringify(bd));
      registrarLog('CADASTRAR (AURORA TOOL)', registro.id, 'Processo: ' + registro.processo + ' | Tipo: ' + registro.tipo + ' | Panjud: ' + registro.panjud);
      renderAll();
      toast('success', 'Caso ' + registro.id + ' cadastrado com sucesso!');

      return {
        status: 'sucesso',
        id: registro.id,
        processo: registro.processo,
        tipo: registro.tipo,
        panjud: registro.panjud
      };
    }

    case 'alterarMeta': {
      const { mes, valor } = args;
      const mesFormatado = String(mes).padStart(2, '0');
      const numValor = Number(valor);

      if (isNaN(numValor) || numValor < 0) {
        throw new Error('Valor de meta inválido: ' + valor);
      }

      // Só dispara SweetAlert se NÃO for por voz
      const modalVozAberto = document.getElementById('auroraVoiceModal')?.classList.contains('active');
      if (!modalVozAberto && typeof Swal !== 'undefined') {
        const confirmacao = await Swal.fire({
          title: 'Alterar Meta?',
          text: `Deseja alterar a meta do mês ${mesFormatado} para ${numValor}?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Confirmar alteração',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#4f46e5'
        });

        if (!confirmacao.isConfirmed) {
          throw new Error('Alteração de meta cancelada pelo usuário.');
        }
      }

      const mutacaoFn = serverMutation || window.serverMutation;
      if (typeof mutacaoFn === 'function') {
        await mutacaoFn('salvarMeta', { mes: mesFormatado, meta: numValor });
      }

      metas[mesFormatado] = numValor;
      localStorage.setItem('metas_oficial_leticia', JSON.stringify(metas));
      
      if (getSelectedMonth() === mesFormatado && $('metaInput')) {$('metaInput').value = numValor;
      }
      
      renderAll();
      toast('success', 'Meta de ' + mesFormatado + ' atualizada para ' + numValor + ' pela nuvem!');
      
      return {
        status: 'sucesso',
        mes: mesFormatado,
        novaMeta: numValor,
        confirmadoNuvem: true
      };
    }
