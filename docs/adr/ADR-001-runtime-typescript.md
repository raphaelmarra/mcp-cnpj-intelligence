# ADR-001: Runtime TypeScript

## Status
ACEITO

## Contexto
Precisamos escolher um runtime TypeScript para o MCP Server que:
- Suporte ESM nativamente (MCP SDK usa ESM)
- Suporte `import.meta.url` (necessario para MCP)
- Seja rapido para desenvolvimento
- Funcione em producao

## Opcoes Avaliadas

### Spike Executado em 2024-12-05

| Runtime         | Tempo  | ESM | import.meta | Status                    |
|-----------------|--------|-----|-------------|---------------------------|
| tsx             | 5.1s   | OK  | OK          | FUNCIONA - Zero warnings  |
| ts-node         | 4.2s   | OK  | OK          | Funciona com warnings     |
| node --loader   | 0.2s   | X   | X           | FALHA                     |

### Problemas Identificados

**ts-node:**
- `[DEP0180] DeprecationWarning: fs.Stats constructor is deprecated`
- `[MODULE_TYPELESS_PACKAGE_JSON] Warning`
- Requer configuracao adicional para ESM

**node --loader ts-node/esm:**
- `ERR_MODULE_NOT_FOUND: Cannot find package 'ts-node'`
- Instavel em diferentes ambientes

## Decisao
**tsx** e o runtime escolhido.

## Razoes
1. ESM nativo sem configuracao extra
2. `import.meta.url` funciona perfeitamente
3. Zero warnings de deprecacao
4. Melhor DX (Developer Experience)
5. Compativel com MCP SDK

## Consequencias
- Usar `tsx` para desenvolvimento: `npm run dev`
- Compilar para JS para producao: `npm run build`
- Manter `tsx` como devDependency apenas
