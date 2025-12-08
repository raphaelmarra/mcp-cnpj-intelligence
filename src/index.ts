#!/usr/bin/env node
/**
 * MCP CNPJ Intelligence Server v1.0.1
 *
 * Base de dados: ~27 milhoes de empresas brasileiras (Receita Federal)
 *
 * CAPACIDADES:
 * - Consulta cadastral completa de empresas (CNPJ, razao social, endereco, CNAE)
 * - Busca por nome, CNAE, socio, CEP
 * - Analise de benchmark e similares
 * - Estatisticas de mercado
 *
 * Instalacao:
 *   npx mcp-cnpj-intelligence
 *
 * Ou adicione ao claude_desktop_config.json:
 * {
 *   "mcpServers": {
 *     "cnpj": {
 *       "command": "npx",
 *       "args": ["-y", "mcp-cnpj-intelligence"]
 *     }
 *   }
 * }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// API publica - nao requer autenticacao
const VERSION = "1.0.2";
const API_URL = "https://api-cnpj.sdebot.top";

// =============================================================================
// DEFINICAO DE FERRAMENTAS
// =============================================================================

const tools: Tool[] = [
  // ---------------------------------------------------------------------------
  // CONSULTA BASICA
  // ---------------------------------------------------------------------------
  {
    name: "buscar_empresa",
    description: `Busca dados cadastrais de uma empresa brasileira pelo CNPJ.

QUANDO USAR:
- Voce tem um CNPJ especifico e precisa dos dados cadastrais
- Precisa validar se um CNPJ existe e esta ativo
- Quer saber razao social, endereco, CNAE, porte de uma empresa

RETORNA:
- cnpj, razao_social, nome_fantasia
- endereco completo (logradouro, municipio, uf, cep)
- cnae_principal, data_abertura, capital_social
- situacao_cadastral, porte_empresa

EXEMPLO: { "cnpj": "00000000000191" } (Banco do Brasil)`,
    inputSchema: {
      type: "object",
      properties: {
        cnpj: {
          type: "string",
          description: "CNPJ da empresa. Use 8 digitos para matriz ou 14 digitos completo",
        },
      },
      required: ["cnpj"],
    },
  },

  {
    name: "empresa_completa",
    description: `Retorna dados COMPLETOS de uma empresa: cadastro + socios + regime tributario.

QUANDO USAR:
- Precisa de informacoes detalhadas para due diligence
- Quer saber quem sao os socios e suas participacoes
- Precisa verificar se empresa e Simples Nacional ou MEI

RETORNA:
- Todos os dados de buscar_empresa +
- Lista de socios com nome, cpf/cnpj, qualificacao
- Regime tributario: simples_nacional, mei`,
    inputSchema: {
      type: "object",
      properties: {
        cnpj: {
          type: "string",
          description: "CNPJ da empresa (8 ou 14 digitos)",
        },
      },
      required: ["cnpj"],
    },
  },

  {
    name: "filiais",
    description: `Lista todas as filiais de uma empresa (mesmo CNPJ base).

QUANDO USAR:
- Quer mapear a presenca geografica de uma empresa
- Precisa saber quantas unidades uma empresa tem

RETORNA:
- Lista de todas filiais com cnpj completo, endereco, situacao`,
    inputSchema: {
      type: "object",
      properties: {
        cnpj: {
          type: "string",
          description: "CNPJ base (8 digitos) ou completo (14 digitos)",
        },
      },
      required: ["cnpj"],
    },
  },

  {
    name: "socios",
    description: `Lista o quadro societario completo de uma empresa.

QUANDO USAR:
- Quer identificar quem sao os donos/socios
- Precisa do CPF/CNPJ dos socios para outras buscas

RETORNA:
- Lista de socios com: nome, cpf_cnpj, qualificacao, data_entrada`,
    inputSchema: {
      type: "object",
      properties: {
        cnpj: {
          type: "string",
          description: "CNPJ da empresa",
        },
      },
      required: ["cnpj"],
    },
  },

  {
    name: "regime_tributario",
    description: `Verifica regime tributario: Simples Nacional ou MEI.

QUANDO USAR:
- Precisa saber se empresa pode emitir NF simplificada
- Quer filtrar empresas por regime

RETORNA:
- simples_nacional: true/false
- mei: true/false
- datas de opcao/exclusao`,
    inputSchema: {
      type: "object",
      properties: {
        cnpj: {
          type: "string",
          description: "CNPJ da empresa",
        },
      },
      required: ["cnpj"],
    },
  },

  // ---------------------------------------------------------------------------
  // BUSCA E DESCOBERTA
  // ---------------------------------------------------------------------------
  {
    name: "buscar_por_nome",
    description: `Busca empresas pelo NOME (razao social ou nome fantasia).

QUANDO USAR:
- Sabe o nome mas nao o CNPJ
- Quer encontrar todas as unidades de uma rede

PARAMETROS:
- nome: Termo de busca (minimo 3 caracteres)
- uf: Filtrar por estado (opcional)
- limite: Quantidade maxima (padrao: 50)`,
    inputSchema: {
      type: "object",
      properties: {
        nome: {
          type: "string",
          description: "Nome ou parte do nome da empresa (minimo 3 caracteres)",
        },
        uf: {
          type: "string",
          description: "Filtrar por estado (sigla 2 letras)",
        },
        limite: {
          type: "number",
          description: "Quantidade maxima de resultados (padrao: 50)",
        },
      },
      required: ["nome"],
    },
  },

  {
    name: "buscar_por_cnae",
    description: `Lista empresas de um SETOR especifico (por CNAE).

QUANDO USAR:
- Quer todas empresas de uma atividade economica
- Prospeccao por vertical/segmento

CNAES COMUNS:
- 4711302: Supermercados
- 5611201: Restaurantes
- 2222600: Embalagens plasticas
- 4751201: Comercio de informatica`,
    inputSchema: {
      type: "object",
      properties: {
        cnae: {
          type: "string",
          description: "Codigo CNAE de 7 digitos. Exemplo: 4711302",
        },
        uf: {
          type: "string",
          description: "Filtrar por estado (sigla 2 letras)",
        },
        limite: {
          type: "number",
          description: "Quantidade maxima de resultados (padrao: 100)",
        },
      },
      required: ["cnae"],
    },
  },

  {
    name: "buscar_por_socio",
    description: `Busca empresas por NOME DE SOCIO.

QUANDO USAR:
- Quer encontrar todas empresas de um empresario
- Precisa mapear portfolio de um investidor

PARAMETROS:
- nome: Nome do socio (minimo 3 caracteres)
- uf: Filtrar por estado (opcional)
- limite: Quantidade maxima (padrao: 50)`,
    inputSchema: {
      type: "object",
      properties: {
        nome: {
          type: "string",
          description: "Nome do socio (minimo 3 caracteres)",
        },
        uf: {
          type: "string",
          description: "Filtrar por estado (sigla 2 letras)",
        },
        limite: {
          type: "number",
          description: "Quantidade maxima de resultados (padrao: 50)",
        },
      },
      required: ["nome"],
    },
  },

  {
    name: "buscar_por_cep",
    description: `Busca empresas por CEP.

QUANDO USAR:
- Quer empresas em uma regiao especifica
- Prospeccao geografica localizada

PARAMETROS:
- cep: CEP de 8 digitos
- cnae: Filtrar por CNAE (opcional)
- situacao: Filtrar por situacao cadastral (padrao: 02=ativas)
- limite: Quantidade maxima (padrao: 50)`,
    inputSchema: {
      type: "object",
      properties: {
        cep: {
          type: "string",
          description: "CEP de 8 digitos (so numeros)",
        },
        cnae: {
          type: "string",
          description: "Filtrar por CNAE (opcional)",
        },
        situacao: {
          type: "string",
          description: "Situacao cadastral: 02=ativa, 01=nula, etc (padrao: 02)",
        },
        limite: {
          type: "number",
          description: "Quantidade maxima de resultados (padrao: 50)",
        },
      },
      required: ["cep"],
    },
  },

  {
    name: "buscar_avancado",
    description: `Busca com MULTIPLOS FILTROS combinados.

QUANDO USAR:
- Precisa de filtros que outras ferramentas nao oferecem
- Query complexa combinando varios criterios

FILTROS DISPONIVEIS:
- cnae, uf, municipio, porte
- capital_min/capital_max
- situacao, limite`,
    inputSchema: {
      type: "object",
      properties: {
        cnae: {
          type: "string",
          description: "Codigo CNAE de 7 digitos",
        },
        uf: {
          type: "string",
          description: "Sigla do estado (2 letras)",
        },
        municipio: {
          type: "string",
          description: "Nome do municipio",
        },
        porte: {
          type: "string",
          enum: ["01", "03", "05"],
          description: "Porte: 01=Micro, 03=Pequeno, 05=Medio/Grande",
        },
        capital_min: {
          type: "number",
          description: "Capital social minimo em reais",
        },
        capital_max: {
          type: "number",
          description: "Capital social maximo em reais",
        },
        situacao: {
          type: "string",
          description: "Situacao cadastral",
        },
        limite: {
          type: "number",
          description: "Quantidade de resultados (padrao: 50)",
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // ANALISE E BENCHMARK
  // ---------------------------------------------------------------------------
  {
    name: "benchmark_empresa",
    description: `Compara empresa com a MEDIA DO SETOR.

QUANDO USAR:
- Quer saber se empresa esta acima ou abaixo da media
- Analise comparativa de porte/capital

RETORNA:
- Dados da empresa
- Estatisticas do setor (media, mediana, total)
- Posicao relativa no ranking`,
    inputSchema: {
      type: "object",
      properties: {
        cnpj: {
          type: "string",
          description: "CNPJ da empresa",
        },
        uf: {
          type: "string",
          description: "Filtrar setor por UF (opcional)",
        },
      },
      required: ["cnpj"],
    },
  },

  {
    name: "buscar_similares",
    description: `Encontra empresas SIMILARES usando scoring multi-dimensional.

QUANDO USAR:
- Tem um cliente bom e quer encontrar mais parecidos (lookalike)
- Quer expandir carteira com empresas do mesmo perfil

ALGORITMO DE SIMILARIDADE:
- Mesmo CNAE (atividade economica)
- Mesmo porte (capital social similar)
- Mesma regiao`,
    inputSchema: {
      type: "object",
      properties: {
        cnpj: {
          type: "string",
          description: "CNPJ da empresa de referencia",
        },
        limite: {
          type: "number",
          description: "Quantidade maxima de resultados (padrao: 50)",
        },
        score_minimo: {
          type: "number",
          description: "Score minimo de similaridade 0-100 (padrao: 40)",
        },
        uf: {
          type: "string",
          description: "Filtrar por estado (sigla 2 letras)",
        },
      },
      required: ["cnpj"],
    },
  },

  {
    name: "ranking_cnae",
    description: `RANKING das maiores empresas de um setor.

QUANDO USAR:
- Quer identificar os lideres de mercado
- Account-Based Marketing (ABM)

ORDENACAO:
- capital: Por capital social (padrao)
- filiais: Por quantidade de unidades`,
    inputSchema: {
      type: "object",
      properties: {
        cnae: {
          type: "string",
          description: "Codigo CNAE de 7 digitos",
        },
        uf: {
          type: "string",
          description: "Filtrar por estado (opcional)",
        },
        limite: {
          type: "number",
          description: "Top N resultados (padrao: 15)",
        },
        ordenar_por: {
          type: "string",
          enum: ["capital", "filiais"],
          description: "Criterio de ordenacao (padrao: capital)",
        },
      },
      required: ["cnae"],
    },
  },

  // ---------------------------------------------------------------------------
  // ESTATISTICAS
  // ---------------------------------------------------------------------------
  {
    name: "estatisticas_por_uf",
    description: `Retorna QUANTIDADE de empresas por estado brasileiro.

QUANDO USAR:
- Analise de mercado por regiao
- Priorizando estados para expansao

RETORNA:
- Lista de UFs com quantidade de empresas ativas
- Ordenado por quantidade (maior primeiro)`,
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  {
    name: "estatisticas_por_cnae",
    description: `Retorna SETORES com mais empresas (ranking de CNAEs).

QUANDO USAR:
- Identificando mercados maiores
- Analise de oportunidade por vertical

PARAMETROS:
- limite: Top N CNAEs (padrao: 20)`,
    inputSchema: {
      type: "object",
      properties: {
        limite: {
          type: "number",
          description: "Quantidade de CNAEs no ranking (padrao: 20)",
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // BULK OPERATIONS
  // ---------------------------------------------------------------------------
  {
    name: "bulk_lookup",
    description: `Consulta MULTIPLOS CNPJs de uma vez (lote).

QUANDO USAR:
- Tem uma lista de CNPJs para enriquecer
- Importando dados de planilha/CRM

LIMITES:
- Maximo 100 CNPJs por requisicao`,
    inputSchema: {
      type: "object",
      properties: {
        cnpjs: {
          type: "array",
          items: { type: "string" },
          description: "Lista de CNPJs (max 100)",
        },
      },
      required: ["cnpjs"],
    },
  },
];

// =============================================================================
// FUNCOES DE CHAMADA A API
// =============================================================================

async function callApi(endpoint: string, params?: Record<string, unknown>): Promise<unknown> {
  const url = new URL(endpoint, API_URL);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: "Erro desconhecido" })) as { message?: string };

      if (response.status === 404) {
        return { error: "CNPJ nao encontrado", code: "NOT_FOUND" };
      }
      if (response.status === 429) {
        return { error: "Limite de requisicoes excedido. Aguarde alguns segundos.", code: "RATE_LIMIT" };
      }

      return { error: errorBody.message || "Erro na API", code: "API_ERROR", status: response.status };
    }

    return await response.json();
  } catch (error) {
    return { error: `Erro de conexao: ${String(error)}`, code: "CONNECTION_ERROR" };
  }
}

async function postApi(endpoint: string, body: unknown): Promise<unknown> {
  const url = new URL(endpoint, API_URL);

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: "Erro desconhecido" })) as { message?: string };
      return { error: errorBody.message || "Erro na API", code: "API_ERROR", status: response.status };
    }

    return await response.json();
  } catch (error) {
    return { error: `Erro de conexao: ${String(error)}`, code: "CONNECTION_ERROR" };
  }
}

// =============================================================================
// HANDLER DE FERRAMENTAS
// =============================================================================

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<string> {
  let result: unknown;

  switch (name) {
    // Consulta basica
    case "buscar_empresa":
      result = await callApi(`/api/cnpj/${args.cnpj}`);
      break;

    case "empresa_completa":
      result = await callApi(`/api/cnpj/${args.cnpj}/completo`);
      break;

    case "filiais":
      result = await callApi(`/api/cnpj/${args.cnpj}/filiais`);
      break;

    case "socios":
      result = await callApi(`/api/cnpj/${args.cnpj}/socios`);
      break;

    case "regime_tributario":
      result = await callApi(`/api/cnpj/${args.cnpj}/regime`);
      break;

    // Busca e descoberta
    case "buscar_por_nome":
      result = await callApi("/api/cnpj/buscar/nome", {
        nome: args.nome,
        uf: args.uf,
        limite: args.limite,
      });
      break;

    case "buscar_por_cnae":
      result = await callApi(`/api/cnpj/buscar/cnae/${args.cnae}`, {
        uf: args.uf,
        limite: args.limite,
      });
      break;

    case "buscar_por_socio":
      result = await callApi("/api/cnpj/buscar/socio", {
        nome: args.nome,
        uf: args.uf,
        limite: args.limite,
      });
      break;

    case "buscar_por_cep":
      result = await callApi(`/api/cnpj/buscar/cep/${args.cep}`, {
        cnae: args.cnae,
        situacao: args.situacao,
        limite: args.limite,
      });
      break;

    case "buscar_avancado":
      result = await callApi("/api/cnpj/buscar/avancado", args);
      break;

    // Analise e benchmark
    case "benchmark_empresa":
      result = await callApi(`/api/cnpj/${args.cnpj}/benchmark`, {
        uf: args.uf,
      });
      break;

    case "buscar_similares":
      result = await callApi(`/api/cnpj/${args.cnpj}/similares`, {
        limite: args.limite,
        score_minimo: args.score_minimo,
        uf: args.uf,
      });
      break;

    case "ranking_cnae":
      result = await callApi(`/api/cnpj/ranking/cnae/${args.cnae}`, {
        uf: args.uf,
        limite: args.limite,
        ordenar_por: args.ordenar_por,
      });
      break;

    // Estatisticas
    case "estatisticas_por_uf":
      result = await callApi("/api/cnpj/stats/por-uf");
      break;

    case "estatisticas_por_cnae":
      result = await callApi("/api/cnpj/stats/por-cnae", {
        limite: args.limite,
      });
      break;

    // Bulk
    case "bulk_lookup":
      result = await postApi("/api/cnpj/bulk", { cnpjs: args.cnpjs });
      break;

    default:
      result = { error: `Ferramenta desconhecida: ${name}`, code: "UNKNOWN_TOOL" };
  }

  return JSON.stringify(result, null, 2);
}

// =============================================================================
// SERVIDOR MCP
async function main() {
  // Verificar flags de CLI
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`MCP CNPJ Intelligence v${VERSION}

ATENÇÃO: Este é um servidor MCP. Não execute diretamente no terminal!

INSTALAÇÃO:
  npm install -g mcp-cnpj-intelligence

CONFIGURAÇÃO (Gemini CLI ou Claude Desktop):
  Adicione ao ~/.gemini/settings.json ou claude_desktop_config.json:
  {
    "mcpServers": {
      "cnpj-intelligence": {
        "command": "npx",
        "args": ["-y", "mcp-cnpj-intelligence"]
      }
    }
  }

USO:
  gemini "busque CNPJ 00.000.000/0001-91"

DOCUMENTAÇÃO: https://github.com/setor-embalagem/mcp-cnpj-intelligence
API: https://api-cnpj.sdebot.top`);
    process.exit(0);
  }

  if (args.includes("--version") || args.includes("-v")) {
    console.log(`${VERSION}`);
    process.exit(0);
  }

  const server = new Server(
    {
      name: "mcp-cnpj-intelligence",
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const resultText = await handleToolCall(name, (args || {}) as Record<string, unknown>);

    return {
      content: [{ type: "text", text: resultText }],
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`MCP CNPJ Intelligence v${VERSION} iniciado`);
  console.error("Base: ~27M empresas brasileiras | 16 ferramentas disponiveis");
}

main().catch(console.error);
