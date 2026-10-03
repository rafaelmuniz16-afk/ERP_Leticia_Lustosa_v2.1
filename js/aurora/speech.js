// js/aurora/speech.js

const ReconhecimentoAPI = window.SpeechRecognition ? window.SpeechRecognition : window.webkitSpeechRecognition;
const sintetizador = ('speechSynthesis' in window) ? window.speechSynthesis : null;

let reconhecimentoAtivo = null;
let timerSilencio = null;
let bufferTexto = '';
let escutaContinuaAtiva = false;

export function suportaReconhecimento() {
  return Boolean(ReconhecimentoAPI);
}

/**
 * Transforma respostas tecnicas e cheias de tabelas/codigos
 * em uma fala humana, concisa e 100% natural.
 */
export function limparTextoParaVoz(textoOriginal) {
  if (!textoOriginal) return '';

  let texto = textoOriginal;

  // 1. Remove blocos de codigo e JSONs
  texto = texto.replace(/```[\s\S]*?```/g, '');
  texto = texto.replace(/`.*?`/g, '');

  // 2. Remove formulas LaTeX (ex: \frac{354}{31}, \text{}, etc.)
  texto = texto.replace(/\\[a-zA-Z]+\{[^}]*\}\{[^}]*\}/g, '');
  texto = texto.replace(/\\[a-zA-Z]+\{[^}]*\}/g, '');
  texto = texto.replace(/\\[a-zA-Z]+/g, '');

  // 3. Remove tabelas Markdown inteiras (qualquer linha com pipes | )
  const linhas = texto.split('\n');
  const linhasSemTabela = linhas.filter(l => !l.includes('|'));
  texto = linhasSemTabela.join(' ');

  // 4. Converte simbolos matematicos para palavras faladas normais
  texto = texto.replace(/≈/g, ' aproximadamente ');
  texto = texto.replace(/÷/g, ' dividido por ');
  texto = texto.replace(/%/g, ' por cento ');
  texto = texto.replace(/\+/g, ' mais ');

  // 5. Remove marcadores visuais (hashtags, asteriscos, tracos, emojis)
  texto = texto.replace(/[#*_~>•✓❌🚀💪📌✨✦]/g, '');
  texto = texto.replace(/\[\d+\]/g, '');
  texto = texto.replace(/[-]{2,}/g, '');

  // 6. Limpa espacos excessivos
  texto = texto.replace(/\s+/g, ' ').trim();

  // 7. FILTRO OBJETIVO DE VOZ: Se a resposta for um textao enorme,
  // pega as 2 primeiras frases de conclusao e avisa que o resto ta na tela!
  const frases = texto.match(/[^.!?]+[.!?]+/g);
  if (frases && frases.length > 2) {
    const resumoFalado = frases.slice(0, 2).join(' ').trim();
    return resumoFalado + ' Deixei o detalhamento e as tabelas completas na tela pra voce conferir!';
  }

  return texto;
}

export function iniciarEscuta({ onInicio, onTranscricao, onFalaFinal, onErro }) {
  if (!suportaReconhecimento()) {
    if (onErro) onErro('Navegador sem suporte a voz.');
    return;
  }

  escutaContinuaAtiva = true;
  bufferTexto = '';
  pararEscutaInterna();

  function iniciarInstancia() {
    if (!escutaContinuaAtiva) return;

    try {
      const rec = new ReconhecimentoAPI();
      rec.lang = 'pt-BR';
      rec.continuous = true;
      rec.interimResults = true;

      rec.onstart = () => {
        if (onInicio) onInicio();
      };

      rec.onresult = (event) => {
        let textoAtual = '';
        for (let i = 0; i < event.results.length; ++i) {
          textoAtual += event.results[i][0].transcript;
        }

        bufferTexto = textoAtual.trim();

        if (onTranscricao && bufferTexto) {
          onTranscricao(bufferTexto);
        }

        if (timerSilencio) clearTimeout(timerSilencio);

        if (bufferTexto) {
          timerSilencio = setTimeout(() => {
            if (bufferTexto && escutaContinuaAtiva) {
              const comandoFinal = bufferTexto;
              escutaContinuaAtiva = false;
              pararEscutaInterna();
              if (onFalaFinal) onFalaFinal(comandoFinal);
            }
          }, 2400);
        }
      };

      rec.onerror = (event) => {
        if (['no-speech', 'aborted'].includes(event.error)) return;
        if (event.error === 'not-allowed') {
          escutaContinuaAtiva = false;
          if (onErro) onErro('Permissao de microfone negada.');
        }
      };

      rec.onend = () => {
        reconhecimentoAtivo = null;
        if (escutaContinuaAtiva) {
          setTimeout(iniciarInstancia, 250);
        }
      };

      rec.start();
      reconhecimentoAtivo = rec;
    } catch (e) {
      if (escutaContinuaAtiva) {
        setTimeout(iniciarInstancia, 400);
      }
    }
  }

  iniciarInstancia();
}

function pararEscutaInterna() {
  if (timerSilencio) {
    clearTimeout(timerSilencio);
    timerSilencio = null;
  }
  if (reconhecimentoAtivo) {
    try {
      reconhecimentoAtivo.stop();
    } catch (e) {}
    reconhecimentoAtivo = null;
  }
}

export function pararEscuta() {
  escutaContinuaAtiva = false;
  pararEscutaInterna();
}

/**
 * Corta o som imediatamente sem travar o navegador.
 */
export function pararFala() {
  if (sintetizador) {
    sintetizador.cancel();
    window._utteranceAtiva = null;
  }
}

export function estaFalando() {
  return Boolean(sintetizador && sintetizador.speaking);
}

export function falarResposta(textoOriginal, onEnd) {
  if (!sintetizador || !textoOriginal) {
    if (onEnd) onEnd();
    return;
  }

  pararFala();

  // Aplica a faxina para falar apenas o que faz sentido em voz alta
  const textoLimpo = limparTextoParaVoz(textoOriginal);

  if (!textoLimpo) {
    if (onEnd) onEnd();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(textoLimpo);
  utterance.lang = 'pt-BR';
  utterance.rate = 1.25;
  utterance.pitch = 1.05;

  window._utteranceAtiva = utterance;

  const vozes = sintetizador.getVoices();
  const termosHumanos = ['Natural', 'Neural', 'Online', 'Google', 'Francisca', 'Luciana'];
  
  let vozEscolhida = vozes.find(v => v.lang.includes('pt') && termosHumanos.some(t => v.name.includes(t)));
  if (!vozEscolhida) {
    vozEscolhida = vozes.find(v => v.lang.includes('pt-BR') && !v.name.includes('Desktop'));
  }
  if (!vozEscolhida) {
    vozEscolhida = vozes.find(v => v.lang.includes('pt-BR'));
  }

  if (vozEscolhida) {
    utterance.voice = vozEscolhida;
  }

  utterance.onend = () => {
    window._utteranceAtiva = null;
    if (onEnd) onEnd();
  };

  utterance.onerror = () => {
    window._utteranceAtiva = null;
    if (onEnd) onEnd();
  };

  sintetizador.speak(utterance);
}
