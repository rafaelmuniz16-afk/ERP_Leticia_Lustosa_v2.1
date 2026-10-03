// js/aurora/speech.js

const ReconhecimentoAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
const sintetizador = 'speechSynthesis' in window ? window.speechSynthesis : null;

let reconhecimentoAtivo = null;

export function suportaReconhecimento() {
  return !!ReconhecimentoAPI;
}

export function iniciarEscuta({ onInicio, onResultado, onErro, onFim }) {
  if (!suportaReconhecimento()) {
    if (onErro) onErro('Navegador sem suporte a voz.');
    return null;
  }

  if (reconhecimentoAtivo) {
    try { reconhecimentoAtivo.abort(); } catch(e) {}
  }

  const rec = new ReconhecimentoAPI();
  rec.lang = 'pt-BR';
  rec.continuous = false;
  rec.interimResults = true; // Permite ver a transcrição em tempo real enquanto fala

  rec.onstart = () => { if (onInicio) onInicio(); };

  rec.onresult = (event) => {
    let final = '';
    let parcial = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        final += event.results[i][0].transcript;
      } else {
        parcial += event.results[i][0].transcript;
      }
    }
    if (onResultado) onResultado(final || parcial, !!final);
  };

  rec.onerror = (event) => {
    if (onErro) onErro(event.error);
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
  if (reconhecimentoAtivo) {
    try { reconhecimentoAtivo.stop(); } catch(e) {}
    reconhecimentoAtivo = null;
  }
}

export function pararFala() {
  if (sintetizador) {
    sintetizador.cancel();
  }
}

/**
 * Fala com voz natural, sem robotização e em ritmo dinâmico.
 */
export function falarResposta(textoOriginal, onEnd) {
  if (!sintetizador || !textoOriginal) return;

  sintetizador.cancel();

  // Limpa caracteres técnicos
  const textoLimpo = textoOriginal
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`.*?`/g, '')
    .replace(/[#*_~>•✦📌✓]/g, '')
    .replace(/\n+/g, '. ')
    .trim();

  if (!textoLimpo) return;

  const utterance = new SpeechSynthesisUtterance(textoLimpo);
  utterance.lang = 'pt-BR';
  utterance.rate = 1.25; // Ritmo fluido, natural e sem lentidão
  utterance.pitch = 1.05;

  const vozes = sintetizador.getVoices();

  // Prioridade absoluta para vozes Neurais, Online ou da Google (as mais humanas)
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
    utterance.onend = onEnd;
  }

  sintetizador.speak(utterance);
}
