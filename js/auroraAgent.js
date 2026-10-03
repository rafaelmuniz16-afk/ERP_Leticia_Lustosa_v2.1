// js/auroraAgent.js

import { gerarPromptSistema } from './aurora/prompts.js';
import { AURORA_TOOLS } from './aurora/tools.js';
import { executarFerramenta } from './aurora/dispatcher.js';
import {
  suportaReconhecimento,
  iniciarEscuta,
  pararEscuta,
  falarResposta,
  pararFala,
  estaFalando,
  travarMicrofoneHardware,
  liberarMicrofoneHardware
} from './aurora/speech.js';

let ctxApp = null;
let modoVozAtivo = false;
let processandoRequisicao = false;

let chatHistory = [
  { role: 'assistant', content: 'Olá, Letícia! Eu sou a Aurora. Estou conectada ao ERP, pronta para operar o sistema, consultar dados e cadastrar casos por voz ou texto!' }
];

const MODELOS_GROQ = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b'
];

async function chamarGroqComTools(mensagens, apiKey) {
  let ultimoErro = '';

  for (const model of MODELOS_GROQ) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const payload = {
        model: model,
        messages: mensagens,
        temperature: 0.1,
        tools: AURORA_TOOLS,
        tool_choice: 'auto'
      };

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await res.json();
      if (!data.error) return data;

      ultimoErro = (data.error && data.error.message) ? data.error.message : 'Erro na Groq';

      if ([429, 503].includes(res.status)) continue;
      if (/quota|rate limit/i.test(ultimoErro)) continue;
      break;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        ultimoErro = 'Tempo limite de comunicação com a Groq excedido (30s).';
      } else {
        ultimoErro = err.message;
      }
    }
  }

  throw new Error(ultimoErro ? ultimoErro : 'Nenhum modelo da Groq respondeu.');
}

function iniciarCicloEscutaModal() {
  if (!modoVozAtivo) return;

  const modalStatus = ctxApp.$('auroraVoiceStatus');
  const modalTranscript = ctxApp.$('auroraVoiceTranscript');

  if (modalStatus) modalStatus.textContent = 'Ouvindo você…';
  if (modalTranscript) modalTranscript.textContent = 'Pode falar o que precisa…';

  iniciarEscuta({
    onInicio: () => {
      if (modalStatus) modalStatus.textContent = 'Ouvindo…';
    },
    onTranscricao: (textoEmTempoReal) => {
      if (modalTranscript) modalTranscript.textContent = textoEmTempoReal;
    },
    onFalaFinal: (comandoPronto) => {
      if (modalStatus) modalStatus.textContent = 'Processando comando…';
      processarMensagemAurora(comandoPronto, true);
    },
    onErro: (erro) => {
      console.warn('Erro voz:', erro);
    }
  });
}

export async function processarMensagemAurora(textoUsuario, viaVoz = false) {
  if (!textoUsuario) return;

  if (processandoRequisicao) {
    console.warn('[Aurora] Já existe uma requisição em andamento.');
    return;
  }
  processandoRequisicao = true;

  if (typeof window.obterContextoERP === 'function') {
    ctxApp = window.obterContextoERP();
  }

  if (!ctxApp) {
    processandoRequisicao = false;
    return;
  }

  const { $, apiKey, appendMessage, summarizeForAI, metas, memoriaIA, configAPIKey } = ctxApp;

  if (!apiKey) {
    processandoRequisicao = false;
    if (configAPIKey) await configAPIKey();
    return;
  }

  pararFala();
  appendMessage('user', textoUsuario);

  appendMessage('system', 'Consultando ERP...');
  const containerMsgs = $('chatMessages');
  const indicadorCarregando = containerMsgs ? containerMsgs.lastElementChild : null;

  const modalStatus = $('auroraVoiceStatus');
  if (viaVoz && modalStatus) {
    modalStatus.textContent = 'Pensando e consultando ERP…';
  }

  const systemPrompt = gerarPromptSistema(summarizeForAI(), metas, memoriaIA);
  const historicoEnxuto = chatHistory.slice(-4).filter(m => ['user', 'assistant'].includes(m.role));

  const mensagensTurno = [
    { role: 'system', content: systemPrompt },
    ...historicoEnxuto,
    { role: 'user', content: textoUsuario }
  ];

  try {
    let passos = 0;
    const maxPassos = 5;
    let respostaConcluida = false;

    while (passos < maxPassos) {
      passos++;
      const respostaGroq = await chamarGroqComTools(mensagensTurno, apiKey);
      const escolha = (respostaGroq.choices && respostaGroq.choices[0]) ? respostaGroq.choices[0].message : null;
      if (!escolha) throw new Error('Resposta vazia da Aurora.');

      if (escolha.tool_calls && escolha.tool_calls.length > 0) {
        mensagensTurno.push(escolha);

        for (const chamada of escolha.tool_calls) {
          const nomeFerramenta = chamada.function.name;
          let args = {};
          try {
            args = JSON.parse(chamada.function.arguments ? chamada.function.arguments : '{}');
          } catch (e) {
            args = {};
          }

          appendMessage('system', 'Executando ação: ' + nomeFerramenta + '...');
          if (viaVoz && modalStatus) {
            modalStatus.textContent = 'Executando no ERP: ' + nomeFerramenta + '…';
          }

          try {
            const resultado = await executarFerramenta(nomeFerramenta, args, ctxApp);
            mensagensTurno.push({
              role: 'tool',
              tool_call_id: chamada.id,
              name: nomeFerramenta,
              content: typeof resultado === 'string' ? resultado : JSON.stringify(resultado)
            });
          } catch (errErroFerramenta) {
            mensagensTurno.push({
              role: 'tool',
              tool_call_id: chamada.id,
              name: nomeFerramenta,
              content: JSON.stringify({ erro: errErroFerramenta.message })
            });
          }
        }
      } else {
        respostaConcluida = true;
        if (indicadorCarregando && indicadorCarregando.parentNode) {
          indicadorCarregando.remove();
        }
        const textoFinal = escolha.content ? escolha.content : 'Compreendido!';

        chatHistory.push({ role: 'user', content: textoUsuario });
        chatHistory.push({ role: 'assistant', content: textoFinal });

        appendMessage('bot', textoFinal);

        if (viaVoz) {
          if (modalStatus) modalStatus.textContent = 'Aurora falando… (clique no orbe para interromper)';
          const modalTranscript = $('auroraVoiceTranscript');
          if (modalTranscript) modalTranscript.textContent = textoFinal;

          falarResposta(textoFinal, () => {
            if (modoVozAtivo) {
              setTimeout(() => {
                iniciarCicloEscutaModal();
              }, 400);
            }
          });
        }
        return;
      }
    }

    if (!respostaConcluida) {
      throw new Error('A Aurora atingiu o limite de etapas sem produzir a resposta final.');
    }
  } catch (errGeral) {
    if (indicadorCarregando && indicadorCarregando.parentNode) {
      indicadorCarregando.remove();
    }
    appendMessage('bot', 'Ops! Não consegui concluir o comando: ' + errGeral.message);
    if (viaVoz && modalStatus) {
      modalStatus.textContent = 'Erro ao processar';
      setTimeout(() => {
        if (modoVozAtivo) iniciarCicloEscutaModal();
      }, 1500);
    }
  } finally {
    processandoRequisicao = false;
  }
}

export function inicializarAuroraAgent(contexto) {
  ctxApp = contexto;
  const { $ } = contexto;

  let btnVoz = $('btnVoiceInput');
  if (!btnVoz) {
    btnVoz = $('btnAiVoice');
  }

  const modalVoz = $('auroraVoiceModal');
  const btnFecharVoz = $('btnFecharVoz');
  const orbVoz = $('auroraVoiceOrb');

  function fecharModalVoz() {
    modoVozAtivo = false;
    pararFala();
    pararEscuta();
    liberarMicrofoneHardware();
    if (modalVoz) {
      modalVoz.classList.remove('active');
      modalVoz.setAttribute('aria-hidden', 'true');
    }
  }

  if (btnFecharVoz) {
    btnFecharVoz.onclick = (e) => {
      e.stopPropagation();
      fecharModalVoz();
    };
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modoVozAtivo) {
      fecharModalVoz();
    }
  });

  // TOQUE NO ORBE: Cala a fala imediatamente e REARMA O MICROFONE NA HORA SEM TRAVAR!
  if (orbVoz) {
    orbVoz.style.cursor = 'pointer';
    orbVoz.onclick = () => {
      pararFala();
      if (modoVozAtivo) {
        // Dá um respiro de 120ms para o sintetizador liberar e arma a escuta limpinha
        setTimeout(() => {
          iniciarCicloEscutaModal();
        }, 120);
      }
    };
  }

  if (btnVoz) {
    if (!suportaReconhecimento()) {
      btnVoz.style.display = 'none';
    } else {
      btnVoz.onclick = async (e) => {
        e.preventDefault();
        pararFala();

        modoVozAtivo = true;
        if (modalVoz) {
          modalVoz.classList.add('active');
          modalVoz.setAttribute('aria-hidden', 'false');
        }

        await travarMicrofoneHardware();
        iniciarCicloEscutaModal();
      };
    }
  }

  // ELIMINADA DUPLICIDADE: Não adicionamos onclick/onkeydown aqui,
  // pois o init.js já escuta o botão e delega para o processAI() perfeitamente!

  const msgsBox = $('chatMessages');
  if (msgsBox && !msgsBox.children.length) {
    chatHistory.forEach(m => {
      if (['assistant', 'user'].includes(m.role)) {
        ctxApp.appendMessage(m.role === 'assistant' ? 'bot' : 'user', m.content);
      }
    });
  }
}

function inicializarGlobal() {
  const contexto = (typeof window.obterContextoERP === 'function') ? window.obterContextoERP() : null;
  if (contexto) {
    inicializarAuroraAgent(contexto);
  }
  window.processarMensagemAurora = processarMensagemAurora;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarGlobal);
} else {
  inicializarGlobal();
}
