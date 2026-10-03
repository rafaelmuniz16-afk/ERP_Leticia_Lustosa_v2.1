// js/aurora/speech.js

const ReconhecimentoAPI = window.SpeechRecognition ? window.SpeechRecognition : window.webkitSpeechRecognition;
const sintetizador = ('speechSynthesis' in window) ? window.speechSynthesis : null;

let reconhecimentoAtivo = null;
let timerSilencio = null;
let bufferTexto = '';

export function suportaReconhecimento() {
  return Boolean(ReconhecimentoAPI);
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
  rec.continuous = true;
  rec.interimResults = true;

  rec.onstart = () => {
    if (onInicio) onInicio();
  };

  rec.onresult = (event) => {
    let transcricaoAtual = '';
    for (let i = 0; i < event.results.length; ++i) {
      transcricaoAtual += event.results[i][0].transcript;
    }

    bufferTexto = transcricaoAtual.trim();

    if (onResultado) onResultado(bufferTexto, false);

    if (timerSilencio) clearTimeout(timerSilencio);

    if (bufferTexto) {
      timerSilencio = setTimeout(() => {
        if (bufferTexto) {
          const falaFinal = bufferTexto;
          pararEscuta();
          if (onResultado) onResultado(falaFinal, true);
        }
      }, 2800);
    }
  };

  rec.onerror = (event) => {
    if (timerSilencio) clearTimeout(timerSilencio);
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

  const vozes = sintetizador.getVoices();
  const termosVozHumana = ['Natural', 'Neural', 'Online', 'Google', 'Francisca', 'Luciana'];
  
  let vozNatural = vozes.find(v => v.lang.includes('pt') && termosVozHumana.some(termo => v.name.includes(termo)));
  if (!vozNatural) {
    vozNatural = vozes.find(v => v.lang.includes('pt-BR') && !v.name.includes('Desktop'));
  }
  if (!vozNatural) {
    vozNatural = vozes.find(v => v.lang.includes('pt-BR'));
  }
  if (!vozNatural) {
    vozNatural = vozes.find(v => v.lang.includes('pt'));
  }

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
