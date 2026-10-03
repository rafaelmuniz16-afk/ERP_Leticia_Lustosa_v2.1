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

        // Mostra o que você está falando em tempo real na tela
        if (onTranscricao && bufferTexto) {
          onTranscricao(bufferTexto);
        }

        if (timerSilencio) clearTimeout(timerSilencio);

        // PACIÊNCIA DE 2.5 SEGUNDOS APÓS VOCÊ PARAR DE FALAR
        if (bufferTexto) {
          timerSilencio = setTimeout(() => {
            if (bufferTexto && escutaContinuaAtiva) {
              const comandoFinal = bufferTexto;
              escutaContinuaAtiva = false;
              pararEscutaInterna();
              if (onFalaFinal) onFalaFinal(comandoFinal);
            }
          }, 2500);
        }
      };

      rec.onerror = (event) => {
        // Ignora erros normais de pausa ou cancelamento momentâneo
        if (['no-speech', 'aborted'].includes(event.error)) {
          return;
        }
        if (event.error === 'not-allowed') {
          escutaContinuaAtiva = false;
          if (onErro) onErro('Permissao de microfone negada.');
        }
      };

      rec.onend = () => {
        reconhecimentoAtivo = null;
        // SE AINDA DEVERIA ESTAR ESCUTANDO (ex: você ficou pensando em silêncio), REINICIA NA HORA!
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

export function pararFala() {
  if (sintetizador) {
    sintetizador.cancel();
  }
}

export function falarResposta(textoOriginal, onEnd) {
  if (!sintetizador || !textoOriginal) {
    if (onEnd) onEnd();
    return;
  }

  sintetizador.cancel();

  const textoLimpo = textoOriginal
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`.*?`/g, '')
    .replace(/[#*_~>•✦📌✓]/g, '')
    .replace(/\n+/g, '. ')
    .trim();

  if (!textoLimpo) {
    if (onEnd) onEnd();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(textoLimpo);
  utterance.lang = 'pt-BR';
  utterance.rate = 1.25;
  utterance.pitch = 1.05;

  // Previne o bug do Chrome de descartar a voz antes do fim
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
