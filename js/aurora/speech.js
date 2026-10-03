// js/aurora/speech.js

const ReconhecimentoAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
const sintetizador = 'speechSynthesis' in window ? window.speechSynthesis : null;

let reconhecimentoAtivo = null;
let timerSilencio = null;
let bufferTexto = '';

export function suportaReconhecimento() {
  return !!ReconhecimentoAPI;
}

export function iniciarEscuta({ onInicio, onResultado, onErro, onFim }) {
  if (!suportaReconhecimento()) {
    if (onErro) onErro('Navegador sem suporte a voz.');
    return null;
  }

  pararEscuta();
  bufferTexto = '';

  const rec = new ReconhecimentoAPI();
  rec.lang = 'pt-BR';
  rec.continuous = true; // Mantem o microfone aberto sem cortar nas pausas
  rec.interimResults = true; // Captura em tempo real enquanto voce fala

  rec.onstart = () => {
    if (onInicio) onInicio();
  };

  rec.onresult = (event) => {
    let transcricaoAtual = '';
    for (let i = 0; i < event.results.length; ++i) {
      transcricaoAtual += event.results[i][0].transcript;
    }

    bufferTexto = transcricaoAtual.trim();

    // Atualiza a tela com o que voce esta falando em tempo real
    if (onResultado) onResultado(bufferTexto, false);

    // BUFFER DE PACIÊNCIA: Reinicia a contagem de silêncio a cada nova palavra falada
    if (timerSilencio) clearTimeout(timerSilencio);

    if (bufferTexto) {
      // Aguarda 2.8 segundos de silencio absoluto antes de considerar a fala concluida
      timerSilencio = setTimeout(() => {
        if (bufferTexto) {
          const falaFinal = bufferTexto;
          pararEscuta();
          if (onResultado) onResultado(falaFinal, true); // Envia o comando
        }
      }, 2800);
    }
  };

  rec.onerror = (event) => {
    if (timerSilencio) clearTimeout(timerSilencio);
    // Ignora erros comuns de nao capturar audio momentaneo
    if (event.error !== 'no-speech') {
      if (onErro) onErro(event.error);
    }
  };

  rec.onend = () => {
    reconhecimentoAtivo = null;
    if (onFim) onFim();
  };

  try {
    rec.start();
    reconhecimentoAtivo = rec;
  } catch (err) {
    if (onErro) onErro(err.message);
  }

  return rec;
}

export function pararEscuta() {
  if (timerSilencio) {
    clearTimeout(timerSilencio);
    timerSilencio = null;
  }
  if (reconhecimentoAtivo) {
    try { reconhecimentoAtivo.abort(); } catch(e) {}
    reconhecimentoAtivo = null;
  }
}

export function pararFala() {
  if (sintetizador) {
    sintetizador.cancel();
  }
}

/**
 * Fala com voz natural e avisa quando terminar para reabrir o microfone.
 */
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
  utterance.rate = 1.25; // Ritmo ágil e dinâmico
  utterance.pitch = 1.05;

  const vozes = sintetizador.getVoices();
  const vozNatural = vozes.find(v => v.lang.includes('pt') && (
      v.name.includes('Natural') || 
      v.name.includes('Neural') || 
      v.name.includes('Online') ||
      v.name.includes('Google') ||
      v.name.includes('Francisca') ||
      v.name.includes('Luciana')
    )) || vozes.find(v => v.lang.includes('pt-BR') && !v.name.includes('Desktop'))
       || vozes.find(v => v.lang.includes('pt-BR'))
       || vozes.find(v => v.lang.includes('pt'));

  if (vozNatural) {
    utterance.voice = vozNatural;
  }

  if (onEnd) {
    utterance.onend = () => {
      onEnd();
    };
  }

  sintetizador.speak(utterance);
}
