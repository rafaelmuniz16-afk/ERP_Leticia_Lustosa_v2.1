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
  alternarVoz
} from './aurora/speech.js';

let ctxApp = null;
let chatHistory = [
  { role: 'assistant', content: 'Ola, Leticia! Eu sou a Aurora. Estou conectada ao ERP, pronta para operar o sistema, consultar dados e cadastrar casos por voz ou texto!' }
];

// Modelos oficiais da Groq com suporte nativo a Tool Calling
const MODELOS_GROQ = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant'
];

async function chamarGroqComTools(mensagens, apiKey, usarTools = true) {
  let ultimoErro = '';

  for (const model of MODELOS_GROQ) {
    try {
      const payload = {
        model: model,
        messages: mensagens,
        temperature: 0.1
      };

      if (usarTools) {
        payload.tools = AURORA_TOOLS;
        payload.tool_choice = 'auto';
      }

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
      console.warn(`[Aurora] Tentativa com modelo ${model} retornou:`, data.error);

      // Se for limite de cota/minuto (429 ou 503), tenta o modelo reserva (8B)
      if ([429, 503].includes(res.status) || /quota|rate limit|overloaded/i.test(ultimoErro)) {
        continue;
      }

      // Se for outro erro (ex: chave invalida), para na hora
      break;
    } catch (err) {
      ultimoErro = err.message;
    }
  }

  throw new Error(ultimoErro ? ultimoErro : 'Nenhum modelo da Groq respondeu.');
}

export async function processarMensagemAurora(textoUsuario) {
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
  chatHistory.push({ role: 'user', content: textoUsuario });

  appendMessage('system', 'Consultando ERP...');
  const containerMsgs = $('chatMessages');
  const indicadorCarregando = containerMsgs ? containerMsgs.lastElementChild : null;

  const systemPrompt = gerarPromptSistema(summarizeForAI(), metas, memoriaIA);
  const mensagensParaEnvio = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.slice(-10)
  ];

  try {
    const respostaGroq = await chamarGroqComTools(mensagensParaEnvio, apiKey, true);
    if (indicadorCarregando && indicadorCarregando.parentNode) {
      indicadorCarregando.remove();
    }

    const escolha = (respostaGroq.choices && respostaGroq.choices[0]) ? respostaGroq.choices[0].message : null;
    if (!escolha) throw new Error('Resposta vazia da Aurora.');

    if (escolha.tool_calls && escolha.tool_calls.length > 0) {
      mensagensParaEnvio.push(escolha);
      chatHistory.push(escolha);

      for (const chamada of escolha.tool_calls) {
        const nomeFerramenta = chamada.function.name;
        let args = {};
        try {
          args = JSON.parse(chamada.function.arguments || '{}');
        } catch (e) {
          args = {};
        }

        appendMessage('system', 'Executando acao: ' + nomeFerramenta + '...');

        try {
          const resultado = await executarFerramenta(nomeFerramenta, args, ctxApp);
          const msgTool = {
            role: 'tool',
            tool_call_id: chamada.id,
            name: nomeFerramenta,
            content: typeof resultado === 'string' ? resultado : JSON.stringify(resultado)
          };
          mensagensParaEnvio.push(msgTool);
          chatHistory.push(msgTool);
        } catch (errErroFerramenta) {
          const msgErro = {
            role: 'tool',
            tool_call_id: chamada.id,
            name: nomeFerramenta,
            content: JSON.stringify({ erro: errErroFerramenta.message })
          };
          mensagensParaEnvio.push(msgErro);
          chatHistory.push(msgErro);
        }
      }

      appendMessage('system', 'Finalizando resposta...');
      const ind2 = containerMsgs ? containerMsgs.lastElementChild : null;
      
      const respostaFinal = await chamarGroqComTools(mensagensParaEnvio, apiKey, false);
      if (ind2 && ind2.parentNode) {
        ind2.remove();
      }

      const textoFinal = (respostaFinal.choices && respostaFinal.choices[0] && respostaFinal.choices[0].message && respostaFinal.choices[0].message.content) 
        ? respostaFinal.choices[0].message.content 
        : 'Acao concluida com sucesso!';
      
      chatHistory.push({ role: 'assistant', content: textoFinal });
      appendMessage('bot', textoFinal);
      falarResposta(textoFinal);
    } else {
      const textoDireto = escolha.content ? escolha.content : 'Compreendido!';
      chatHistory.push({ role: 'assistant', content: textoDireto });
      appendMessage('bot', textoDireto);
      falarResposta(textoDireto);
    }
  } catch (errGeral) {
    if (indicadorCarregando && indicadorCarregando.parentNode) {
      indicadorCarregando.remove();
    }
    appendMessage('bot', 'Ops! Nao consegui concluir o comando agora: ' + errGeral.message);
  }
}

export function inicializarAuroraAgent(contexto) {
  ctxApp = contexto;
  const { $ } = contexto;

  let btnVoz = $('btnVoiceInput');
  if (!btnVoz) {
    btnVoz = $('btnAiVoice');
  }

  if (btnVoz) {
    if (!suportaReconhecimento()) {
      btnVoz.style.display = 'none';
    } else {
      let gravando = false;
      btnVoz.addEventListener('click', () => {
        if (gravando) {
          pararEscuta();
          gravando = false;
          btnVoz.classList.remove('recording');
        } else {
          iniciarEscuta({
            onInicio: () => {
              gravando = true;
              btnVoz.classList.add('recording');
            },
            onResultado: (textoTranscrito) => {
              gravando = false;
              btnVoz.classList.remove('recording');
              const inputChat = $('chatInputText');
              if (inputChat) inputChat.value = textoTranscrito;
              processarMensagemAurora(textoTranscrito);
            },
            onErro: (erro) => {
              gravando = false;
              btnVoz.classList.remove('recording');
              console.warn('Erro de voz:', erro);
            },
            onFim: () => {
              gravando = false;
              btnVoz.classList.remove('recording');
            }
          });
        }
      });
    }
  }

  const btnEnviar = $('btnChatSend');
  const inputTexto = $('chatInputText');

  if (btnEnviar && inputTexto) {
    btnEnviar.onclick = (e) => {
      e.preventDefault();
      const txt = inputTexto.value.trim();
      if (txt) {
        inputTexto.value = '';
        processarMensagemAurora(txt);
      }
    };

    inputTexto.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const txt = inputTexto.value.trim();
        if (txt) {
          inputTexto.value = '';
          processarMensagemAurora(txt);
        }
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
