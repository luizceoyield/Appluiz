import { supabase } from './supabase';
import type { Reserva } from './types';

/** Código do Postgres para violação da constraint EXCLUDE (sobreposição). */
const PG_EXCLUSION_VIOLATION = '23P01';

export class ConflitoReservaError extends Error {
  constructor(public conflitos: Reserva[]) {
    super('Veículo Ocupado neste Horário');
  }
}

export function mensagemErro(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return 'Erro inesperado. Nenhum dado foi alterado.';
}

/**
 * Reservas ativas do veículo que se sobrepõem ao intervalo.
 * Regra: inicio < fim_existente E fim > inicio_existente.
 */
export async function buscarConflitos(veiculoId: string, inicio: Date, fim: Date, ignorarId?: string) {
  let q = supabase
    .from('reservas')
    .select('*')
    .eq('veiculo_id', veiculoId)
    .neq('status', 'cancelada')
    .lt('inicio', fim.toISOString())
    .gt('fim', inicio.toISOString())
    .order('inicio');
  if (ignorarId) q = q.neq('id', ignorarId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Reserva[];
}

export interface DadosReserva {
  veiculo_id: string;
  motorista_id: string;
  inicio: Date;
  fim: Date;
  km_inicial: number;
  destino: string | null;
  finalidade: string | null;
}

/**
 * Grava a reserva. Verifica conflito antes e, mesmo que duas pessoas
 * salvem ao mesmo tempo, o banco recusa a segunda (constraint EXCLUDE).
 */
export async function salvarReserva(dados: DadosReserva, id?: string) {
  const conflitos = await buscarConflitos(dados.veiculo_id, dados.inicio, dados.fim, id);
  if (conflitos.length) throw new ConflitoReservaError(conflitos);

  const linha = { ...dados, inicio: dados.inicio.toISOString(), fim: dados.fim.toISOString() };
  const { error } = id
    ? await supabase.from('reservas').update(linha).eq('id', id)
    : await supabase.from('reservas').insert(linha);

  if (error) {
    if (error.code === PG_EXCLUSION_VIOLATION) {
      throw new ConflitoReservaError(await buscarConflitos(dados.veiculo_id, dados.inicio, dados.fim, id));
    }
    throw error;
  }
}

export async function concluirReserva(id: string, kmFinal: number) {
  const { error } = await supabase
    .from('reservas')
    .update({ status: 'concluida', km_final: kmFinal, concluida_em: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function cancelarReserva(id: string) {
  const { error } = await supabase
    .from('reservas')
    .update({ status: 'cancelada', cancelada_em: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Baixa um arquivo JSON com todos os dados (cópia de segurança local). */
export async function exportarBackup() {
  const tabelas = ['veiculos', 'motoristas', 'reservas', 'auditoria'] as const;
  const resultado: Record<string, unknown[]> = {};
  for (const t of tabelas) {
    const todos: unknown[] = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await supabase.from(t).select('*').range(de, de + 999);
      if (error) throw error;
      todos.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    resultado[t] = todos;
  }
  const blob = new Blob([JSON.stringify({ gerado_em: new Date().toISOString(), ...resultado }, null, 2)], {
    type: 'application/json',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `backup-frota-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
