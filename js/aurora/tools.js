// js/aurora/tools.js

export const AURORA_TOOLS = [
  {
    type: "function",
    function: {
      name: "navegarEcra",
      description: "Muda a visualização ou rola a tela para uma seção específica da interface da ERP.",
      parameters: {
        type: "object",
        properties: {
          destino: {
            type: "string",
            enum: ["dashboard", "cadastro", "historico", "auditoria"],
            description: "A seção ou tela para onde o usuário quer navegar."
          }
        },
        required: ["destino"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "filtrarTabela",
      description: "Aplica filtros automáticos na tabela de encerramentos/histórico.",
      parameters: {
        type: "object",
        properties: {
          tipo: {
            type: "string",
            enum: ["Todos", "Ônus", "Acordo", "Êxito"],
            description: "Filtrar por tipo de encerramento."
          },
          panjud: {
            type: "string",
            enum: ["Todos", "Sim", "Não"],
            description: "Filtrar por status no Panjud (Sim = encerramento real)."
          },
          mes: {
            type: "string",
            description: "Dois dígitos do mês de referência (ex: '06', '07', '08', '09', '10', '11', '12')."
          },
          busca: {
            type: "string",
            description: "Termo de busca textual para ID ou número de processo."
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "consultarMetricas",
      description: "Consulta indicadores consolidados de encerramentos, faltas para meta e projeção diária.",
      parameters: {
        type: "object",
        properties: {
          mes: {
            type: "string",
            description: "Mês a consultar com dois dígitos (ex: '09', '10'). Se omitido, consulta o mês atualmente selecionado."
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "cadastrarCaso",
      description: "Cadastra um novo processo/caso diretamente na base de dados da ERP.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID interno do caso/pasta." },
          processo: { type: "string", description: "Número do processo (formatado ou apenas dígitos)." },
          tipo: { type: "string", enum: ["Ônus", "Acordo", "Êxito"], description: "Tipo de encerramento." },
          data: { type: "string", description: "Data no formato AAAA-MM-DD. Se não informado, usar a data de hoje." },
          mesReferencia: { type: "string", description: "Dois dígitos do mês de referência (ex: '10')." },
          panjud: { type: "string", enum: ["Sim", "Não"], description: "Se foi encerrado no Panjud (encerramento real)." },
          recusado: { type: "string", enum: ["Sim", "Não"], description: "Se o encerramento foi recusado no Panjud." },
          observacoes: { type: "string", description: "Observações adicionais do caso." }
        },
        required: ["id", "processo", "tipo"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "alterarMeta",
      description: "Atualiza a meta quantitativa de encerramentos para um determinado mês.",
      parameters: {
        type: "object",
        properties: {
          mes: { type: "string", description: "Dois dígitos do mês (ex: '10')." },
          valor: { type: "number", description: "Novo valor numérico da meta." }
        },
        required: ["mes", "valor"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "gravarMemoria",
      description: "Salva uma nota, preferência ou lembrete importante na memória persistente da Aurora.",
      parameters: {
        type: "object",
        properties: {
          texto: { type: "string", description: "O fato ou instrução a ser lembrada." }
        },
        required: ["texto"]
      }
    }
  }
];
