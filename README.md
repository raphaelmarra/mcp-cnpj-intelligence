# MCP CNPJ Intelligence

MCP Server para consulta de **27 milhoes de empresas brasileiras** da Receita Federal.

Integre dados de CNPJs diretamente no Claude Desktop, Cursor, ou qualquer cliente MCP.

## Instalacao Rapida

### Claude Desktop

Adicione ao seu `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cnpj": {
      "command": "npx",
      "args": ["-y", "mcp-cnpj-intelligence"]
    }
  }
}
```

**Localizacao do arquivo:**
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

### Cursor / VS Code

Adicione ao arquivo de configuracao MCP:

```json
{
  "mcpServers": {
    "cnpj": {
      "command": "npx",
      "args": ["-y", "mcp-cnpj-intelligence"]
    }
  }
}
```

## Ferramentas Disponiveis

### Consulta Basica

| Ferramenta | Descricao |
|------------|-----------|
| `buscar_empresa` | Busca dados cadastrais por CNPJ |
| `empresa_completa` | Dados completos + socios + regime tributario |
| `filiais` | Lista todas filiais de uma empresa |
| `socios` | Quadro societario completo |
| `regime_tributario` | Simples Nacional e MEI |

### Busca e Descoberta

| Ferramenta | Descricao |
|------------|-----------|
| `buscar_por_nome` | Busca por razao social ou nome fantasia |
| `buscar_por_cnae` | Empresas de um setor especifico |
| `buscar_por_socio` | Empresas por nome do socio |
| `buscar_por_cep` | Empresas em uma regiao (CEP) |
| `buscar_avancado` | Multiplos filtros combinados |

### Analise e Benchmark

| Ferramenta | Descricao |
|------------|-----------|
| `benchmark_empresa` | Compara empresa com media do setor |
| `buscar_similares` | Encontra empresas similares (lookalike) |
| `ranking_cnae` | Ranking das maiores do setor |

### Estatisticas

| Ferramenta | Descricao |
|------------|-----------|
| `estatisticas_por_uf` | Quantidade de empresas por estado |
| `estatisticas_por_cnae` | Setores com mais empresas |
| `bulk_lookup` | Consulta multiplos CNPJs (max 100) |

## Exemplos de Uso

### No Claude Desktop

```
Busque informacoes da empresa com CNPJ 00.000.000/0001-91
```

```
Liste as 10 maiores industrias de embalagens plasticas em SP
```

```
Encontre empresas similares a CNPJ 12345678 com score minimo de 60
```

```
Quais empresas do setor de supermercados estao no CEP 01310-100?
```

### CNAEs Comuns

- `4711302` - Supermercados
- `5611201` - Restaurantes
- `2222600` - Embalagens plasticas
- `1733800` - Embalagens papelao
- `4751201` - Comercio de informatica
- `6201501` - Desenvolvimento de software

## API Publica

Este MCP consome a API publica:

```
https://api-cnpj.sdebot.top
```

**Nao requer autenticacao.** Rate limit: 60 req/min.

## Desenvolvimento Local

```bash
# Clone o repositorio
git clone https://github.com/setor-embalagem/mcp-cnpj-intelligence.git
cd mcp-cnpj-intelligence

# Instale dependencias
npm install

# Rode em modo desenvolvimento
npm run dev

# Rode testes
npm test

# Build para producao
npm run build
```

## Estrutura do Projeto

```
mcp-cnpj-intelligence/
├── src/
│   └── index.ts          # Servidor MCP
├── tests/
│   └── golden-path.test.ts
├── docs/
│   └── adr/              # Architecture Decision Records
├── .github/
│   └── workflows/
│       └── ci.yml        # CI/CD
├── package.json
├── tsconfig.json
└── README.md
```

## Contribuindo

1. Fork o repositorio
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'feat: adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## License

MIT - Setor da Embalagem 2024

## Links

- [Repositorio GitHub](https://github.com/setor-embalagem/mcp-cnpj-intelligence)
- [API Documentacao](https://api-cnpj.sdebot.top/api/cnpj/health)
- [MCP Protocol](https://modelcontextprotocol.io)
