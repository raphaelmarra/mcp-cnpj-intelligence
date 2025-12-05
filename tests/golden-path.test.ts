/**
 * Golden Path Test - MCP CNPJ Intelligence
 *
 * Este teste valida o fluxo completo de uso do MCP:
 * 1. Listar ferramentas disponiveis
 * 2. Buscar empresa por CNPJ
 * 3. Buscar empresa por nome
 * 4. Buscar por CNAE
 *
 * TDD: Criado ANTES da implementacao!
 */

import { describe, it, expect } from 'vitest';

// API base para testes diretos (sem MCP layer)
const API_URL = 'https://api-cnpj.sdebot.top';

describe('Golden Path - CNPJ Intelligence MCP', () => {
  // Teste 1: API esta online
  it('deve verificar que a API esta online', async () => {
    const response = await fetch(`${API_URL}/api/cnpj/health`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  // Teste 2: Buscar empresa por CNPJ (ferramenta core)
  it('deve buscar empresa por CNPJ', async () => {
    // CNPJ do Banco do Brasil para teste
    const cnpj = '00000000000191';
    const response = await fetch(`${API_URL}/api/cnpj/${cnpj}`);
    expect(response.ok).toBe(true);

    const empresa = await response.json();
    expect(empresa.razao_social).toBeDefined();
    expect(empresa.cnpj_basico).toBeDefined();
  });

  // Teste 3: Buscar por CNAE
  it('deve buscar empresas por CNAE', async () => {
    // CNAE 4711302 = Supermercados
    const response = await fetch(`${API_URL}/api/cnpj/buscar/cnae/4711302?limite=5`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.total).toBeGreaterThan(0);
    expect(data.empresas).toBeDefined();
  });

  // Teste 4: Benchmark de empresa
  it('deve retornar benchmark de empresa', async () => {
    const cnpj = '67616128'; // AYUMI
    const response = await fetch(`${API_URL}/api/cnpj/${cnpj}/benchmark`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.empresa).toBeDefined();
    expect(data.setor).toBeDefined();
  });
});
