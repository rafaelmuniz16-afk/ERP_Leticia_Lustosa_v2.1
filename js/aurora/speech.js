// js/aurora/speech.js

const ReconhecimentoAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
const sintetizador = 'speechSynthesis' in window ? window.speechSynthesis : null;

let reconhecimentoAtivo = null;
let vozHabilitada = true;

/**
 * Verifica se o navegador atual suporta captura de microfone.
 */
export function suportaReconhecimento() {
  return !!ReconhecimentoAPI;
}

/**
 * Permite ligar ou desligar a fala da Aurora (modo mudo/ativo).
 */
export function alternarVoz(habilitar) {
  vozHabilitada = !!habilitar;
  if (!vozHabilitada && sintetizador) {
    sintetizador.cancel();
  }
}

/**
 * Inicia a escuta do microfone com callbacks de ciclo de vida.
 */
export function iniciarEscuta({ onInicio, onResultado, onErro, onFim }) {
  if (!suportaReconhecimento()) {
    if (onErro) onErro('Navegador não possui suporte para reconhecimento de voz.');
    return null;
  }

  // Interrompe qualquer escuta anterior aberta
  if (reconhecimentoAtivo) {
    try { reconhecimentoAtivo.abort(); } catch(e) {}
  }

  const rec = new ReconhecimentoAPI();
  rec.lang = 'pt-BR';
  rec.continuous = false;
  rec.interimResults = false;

  rec.onstart = () => {
    if (onInicio) onInicio();
  };

  rec.onresult = (event) => {
    const textoTranscrito = event.results[0]?.[0]?.transcript || '';
    if (onResultado) onResultado(textoTranscrito);
  };

  rec.onerror = (event) => {
    console.warn('Erro de voz capturado:', event.error);
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
    console.error('Falha ao acionar microfone:', err);
    if (onErro) onErro(err.message);
  }

  return rec;
}

/**
 * Força a parada da escuta do microfone.
 */
export function pararEscuta() {
  if (reconhecimentoAtivo) {
    try { reconhecimentoAtivo.stop(); } catch(e) {}
    reconhecimentoAtivo = null;
  }
}

/**
 * Interrompe qualquer áudio em reprodução.
 */
export function pararFala() {
  if (sintetizador) {
    sintetizador.cancel();
  }
}

/**
 * Sintetiza o texto em voz natural, limpando Markdown e termos técnicos.
 */
export function falarResposta(textoOriginal) {
  if (!sintetizador || !vozHabilitada || !textoOriginal) return;

  // Interrompe fala anterior imediatamente para não sobrepor
  sintetizador.cancel();

  // Limpa marcações markdown, blocos JSON e símbolos antes de ler
  const textoParaVoz = textoOriginal
    .replace(/```[\s\S]*?```/g, '')  // remove blocos inteiros de código/JSON
    .replace(/`.*?`/g, '')            // remove inline code
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // simplifica links deixando apenas o rótulo
    .replace(/[#*_~>•✦🏆✓]/g, '')     // limpa caracteres e emojis decorativos
    .replace(/\n+/g, '. ')            // transforma quebras em pausas naturais
    .trim();

  if (!textoParaVoz) return;

  const utterance = new SpeechSynthesisUtterance(textoParaVoz);
  utterance.lang = 'pt-BR';
  utterance.rate = 1.08; // Ritmo ágil e natural
  utterance.pitch = 1.02;

  // Seleciona voz brasileira de qualidade quando disponível
  const vozes = sintetizador.getVoices();
  const vozBrasileira = vozes.find(v => 
    v.lang.includes('pt') && (
      v.name.includes('Luciana') || 
      v.name.includes('Maria') || 
      v.name.includes('Google') || 
      v.name.includes('Francisca') ||
      v.name.includes('Yara') ||
      v.name.includes('Female')
    )
  ) || vozes.find(v => v.lang.includes('pt-BR')) || vozes.find(v => v.lang.includes('pt'));

  if (vozBrasileira) {
    utterance.voice = vozBrasileira;
  }

  sintetizador.speak(utterance);
}
