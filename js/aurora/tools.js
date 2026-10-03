// js/aurora/tools.js

export const AURORA_TOOLS = [
  {
    type: "function",
    function: {
      name: "consultarCasos",
      description: "Consulta e lista os casos cadastrados no ERP com filtros por mes, tipo, panjud ou busca textual, ordenados por data.",
      parameters: {
        type: "object",
        properties: {
          mes: { type: "string", description: "Dois digitos do mes de referencia (ex: '08', '09', '10')." },
          tipo: { type: "string", description: "Tipo de encerramento ('Onus', 'Acordo', 'Exito' ou 'Todos')." },
          panjud: { type: "string", description: "Status no Panjud: 'Sim' ou 'Nao'." },
          termo: { type: "string", description: "Termo de busca para ID ou numero do processo." },
          limite: { type: "number", description: "Quantidade maxima de casos a listar (padrao 5)." },
          ordem: { type: "string", enum: ["recente", "antigo"], description: "Ordenacao por data (padrao: 'recente')." }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "navegarEcra",
      description: "Muda a visualizacao ou rola a tela para uma secao especifica da interface da ERP.",
      parameters: {
        type: "object",
        properties: {
          destino: {
            type: "string",
            enum: ["dashboard", "cadastro", "historico", "auditoria"],
            description: "A secao ou tela para onde o usuario quer navegar."
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
      description: "Aplica filtros automaticos na tabela de encerramentos/historico na interface.",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", description: "Filtrar por tipo de encerramento ('Onus', 'Acordo', 'Exito' ou 'Todos')." },
          panjud: { type: "string", description: "Filtrar por status no Panjud ('Sim', 'Nao' ou 'Todos')." },
          mes: { type: "string", description: "Dois digitos do mes de referencia (ex: '08', '09', '10')." },
          busca: { type: "string", description: "Termo de busca textual para ID ou numero de processo." }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "consultarMetricas",
      description: "Consulta indicadores consolidados de encerramentos, faltas para meta e projecao diaria.",
      parameters: {
        type: "object",
        properties: {
          mes: { type: "string", description: "Mes a consultar com dois digitos (ex: '08', '09', '10')." }
        },
        required: []
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
          processo: { type: "string", description: "Numero do processo judicial (CNJ)." },
          tipo: { type: "string", description: "Tipo de encerramento: 'Onus', 'Acordo' ou 'Exito'." },
          data: { type: "string", description: "Data no formato AAAA-MM-DD." },
          mesReferencia: { type: "string", description: "Dois digitos do mes de referencia (ex: '10')." },
          panjud: { type: "string", description: "Se foi encerrado no Panjud: 'Sim' ou 'Nao'." },
          recusado: { type: "string", description: "Se o encerramento foi recusado: 'Sim' ou 'Nao'." },
          observacoes: { type: "string", description: "Observacoes adicionais do caso." }
        },
        required: ["id", "processo", "tipo"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "alterarMeta",
      description: "Atualiza a meta quantitativa de encerramentos para um determinado mes.",
      parameters: {
        type: "object",
        properties: {
          mes: { type: "string", description: "Dois digitos do mes (ex: '10')." },
          valor: { type: "number", description: "Novo valor numerico da meta." }
        },
        required: ["mes", "valor"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "gravarMemoria",
      description: "Salva uma nota ou lembrete importante na memoria persistente da Aurora.",
      parameters: {
        type: "object",
        properties: {
          texto: { type: "string", description: "O fato ou instrucao a ser lembrada." }
        },
        required: ["texto"]
      }
    }
  }
];
