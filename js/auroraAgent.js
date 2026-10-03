// js/auroraAgent.js

import { gerarPromptSistema } from './aurora/prompts.js';
import { AURORA_TOOLS } from './aurora/tools.js';
import { executarFerramenta } from './aurora/dispatcher.js';
import {
  suportaReconhecimento,
  iniciarEscuta,
  pararEscuta,
  falarResposta,
  pararFala
} from './aurora/speech.js';

let ctxApp = null;
let chatHistory = [
  { role: 'assistant', content: 'Ola, Leticia! Eu sou a Aurora. Estou conectada ao ERP, pronta para operar o sistema, consultar dados e cadastrar casos por voz ou texto!' }
];

const MODELOS_GROQ = [
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b'
];

async function chamarGroqComTools(mensagens, apiKey) {
  let ultimoErro = '';

  for (const model of MODELOS_GROQ) {
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
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.error) return data;

      ultimoErro = (data.error && data.error.message) ? data.error.message : 'Erro na Groq';
      if ([429, 503].includes(res.status) || /quota|rate limit/i.test(ultimoErro)) {
        continue;
      }
      break;
    } catch (err) {
      ultimoErro = err.message;
    }
  }

  throw new Error(ultimoErro || 'Nenhum modelo da Groq respondeu.');
}

/**
 * Processa a mensagem. Se viaVoz = true, sintetiza fala e atualiza o modal de voz.
 */
export async function processarMensagemAurora(textoUsuario, viaVoz = false) {
  if (!textoUsuario) return;

  if (typeof window.obterContextoERP === 'function') {
    ctxApp = window.obterContextoERP();
  }

  if (!ctxApp) return;
  const { $, apiKey, appendMessage, summarizeForAI, metas, memoriaIA, configAPIKey } = ctxApp;

  if (!apiKey) {
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
  const historicoEnxuto = chatHistory.slice(-4).filter(m => m.role === 'user' || m.role === 'assistant');

  const mensagensTurno = [
    { role: 'system', content: systemPrompt },
    ...historicoEnxuto,
    { role: 'user', content: textoUsuario }
  ];

  try {
    let passos = 0;
    const maxPassos = 3;

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
            args = JSON.parse(chamada.function.arguments || '{}');
          } catch (e) {
            args = {};
          }

          appendMessage('system', 'Executando acao: ' + nomeFerramenta + '...');
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
        // Concluiu!
        if (indicadorCarregando && indicadorCarregando.parentNode) {
          indicadorCarregando.remove();
        }
        const textoFinal = escolha.content ? escolha.content : 'Compreendido!';

        chatHistory.push({ role: 'user', content: textoUsuario });
        chatHistory.push({ role: 'assistant', content: textoFinal });

        appendMessage('bot', textoFinal);

        // SE FOI POR VOZ: Fala a resposta e fecha o modal ao terminar
        if (viaVoz) {
          if (modalStatus) modalStatus.textContent = 'Aurora falando…';
          const modalTranscript = $('auroraVoiceTranscript');
          if (modalTranscript) modalTranscript.textContent = textoFinal;

          falarResposta(textoFinal, () => {
            // Fecha o modal suavemente quando a fala terminar
            setTimeout(() => {
              $('auroraVoiceModal')?.classList.remove('active');
            }, 1200);
          });
        }
        return;
      }
    }
  } catch (errGeral) {
    if (indicadorCarregando && indicadorCarregando.parentNode) {
      indicadorCarregando.remove();
    }
    appendMessage('bot', 'Ops! Nao consegui concluir o comando agora: ' + errGeral.message);
    if (viaVoz && modalStatus) {
      modalStatus.textContent = 'Erro ao processar';
    }
  }
}

export function inicializarAuroraAgent(contexto) {
  ctxApp = contexto;
  const { $ } = contexto;

  const btnVoz = $('btnVoiceInput') || $('btnAiVoice');
  const modalVoz = $('auroraVoiceModal');
  const btnFecharVoz = $('btnFecharVoz');
  const modalStatus = $('auroraVoiceStatus');
  const modalTranscript = $('auroraVoiceTranscript');

  if (btnFecharVoz && modalVoz) {
    btnFecharVoz.onclick = () => {
      pararEscuta();
      pararFala();
      modalVoz.classList.remove('active');
    };
  }

  // 1. Controle do Botão de Microfone com o Pop-up
  if (btnVoz) {
    if (!suportaReconhecimento()) {
      btnVoz.style.display = 'none';
    } else {
      btnVoz.onclick = (e) => {
        e.preventDefault();
        pararFala();
        
        // Abre o pop-up
        if (modalVoz) modalVoz.classList.add('active');
        if (modalStatus) modalStatus.textContent = 'Ouvindo você…';
        if (modalTranscript) modalTranscript.textContent = 'Pode falar o seu comando…';

        iniciarEscuta({
          onInicio: () => {
            if (modalStatus) modalStatus.textContent = 'Ouvindo…';
          },
          onResultado: (texto, isFinal) => {
            if (modalTranscript) modalTranscript.textContent = texto;
            if (isFinal) {
              pararEscuta();
              if (modalStatus) modalStatus.textContent = 'Processando comando…';
              processarMensagemAurora(texto, true); // true = MODO VOZ ATIVO
            }
          },
          onErro: (erro) => {
            console.warn('Erro de voz:', erro);
            if (modalStatus) modalStatus.textContent = 'Não entendi bem…';
          },
          onFim: () => {}
        });
      };
    }
  }

  // 2. Chat de Texto (Garante limpeza imediata e MODO SILENCIOSO)
  const btnEnviar = $('btnChatSend');
  const inputTexto = $('chatInputText');

  const enviarTextoChat = () => {
    if (!inputTexto) return;
    const txt = inputTexto.value.trim();
    if (txt) {
      inputTexto.value = ''; // Limpa NA HORA o campo
      processarMensagemAurora(txt, false); // false = MODO TEXTO (SEM ÁUDIO)
    }
  };

  if (btnEnviar) {
    btnEnviar.onclick = (e) => {
      e.preventDefault();
      enviarTextoChat();
    };
  }

  if (inputTexto) {
    inputTexto.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enviarTextoChat();
      }
    };
  }

  const msgsBox = $('chatMessages');
  if (msgsBox && !msgsBox.children.length) {
    chatHistory.forEach(m => {
      if (m.role === 'assistant' || m.role === 'user') {
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
