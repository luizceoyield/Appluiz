import type { Backend } from './types';

export * from './types';

export type Inicio =
  | { ok: true; backend: Backend; somenteLeitura: boolean }
  | { ok: false; motivo: 'config' | 'sem-acesso' };

/**
 * Escolhe onde os dados ficam, conforme o build:
 * - VITE_BACKEND=claude  → banco de dados do Artifact no claude.ai
 * - padrão               → Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
 */
export async function iniciarBackend(): Promise<Inicio> {
  if (import.meta.env.VITE_BACKEND === 'claude') {
    const { obterDb, podeEscrever, criarBackendClaude } = await import('./claude');
    const db = await obterDb();
    if (!db) return { ok: false, motivo: 'sem-acesso' };
    return { ok: true, backend: criarBackendClaude(db), somenteLeitura: (await podeEscrever()) === false };
  }
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !chave) return { ok: false, motivo: 'config' };
  const { criarBackendSupabase } = await import('./supabase');
  return { ok: true, backend: criarBackendSupabase(url, chave), somenteLeitura: false };
}
