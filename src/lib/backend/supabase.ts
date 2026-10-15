import { createClient } from '@supabase/supabase-js';
import type { Motorista, Reserva, Veiculo } from '../types';
import { ConflitoReservaError, PlacaDuplicadaError, type Backend, type DadosReserva, type Ouvintes } from './types';

/** Código do Postgres para violação da constraint EXCLUDE (sobreposição). */
const PG_EXCLUSION_VIOLATION = '23P01';
const PG_UNIQUE_VIOLATION = '23505';

export function criarBackendSupabase(url: string, anonKey: string): Backend {
  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  let ouvintes: Ouvintes | null = null;

  async function buscarTudo<T>(tabela: string, ordem: string): Promise<T[]> {
    const todos: T[] = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await supabase.from(tabela).select('*').order(ordem).range(de, de + 999);
      if (error) throw error;
      todos.push(...((data ?? []) as T[]));
      if (!data || data.length < 1000) return todos;
    }
  }

  async function recarregar() {
    try {
      const [veiculos, motoristas, reservas] = await Promise.all([
        buscarTudo<Veiculo>('veiculos', 'placa'),
        buscarTudo<Motorista>('motoristas', 'nome'),
        buscarTudo<Reserva>('reservas', 'inicio'),
      ]);
      ouvintes?.dados({ veiculos, motoristas, reservas });
      ouvintes?.erro(null);
    } catch (e) {
      ouvintes?.erro(e instanceof Error ? e.message : 'Não foi possível carregar os dados.');
    }
  }

  async function buscarConflitos(veiculoId: string, inicio: Date, fim: Date, ignorarId?: string) {
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

  async function atualizar(tabela: string, id: string, valores: Record<string, unknown>) {
    const { error } = await supabase.from(tabela).update(valores).eq('id', id);
    if (error) throw error;
  }

  return {
    assinar(o) {
      ouvintes = o;
      recarregar();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const agendar = () => {
        clearTimeout(timer);
        timer = setTimeout(recarregar, 250);
      };
      const canal = supabase
        .channel('frota-tempo-real')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, agendar)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'veiculos' }, agendar)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'motoristas' }, agendar)
        .subscribe((status) => {
          o.online(status === 'SUBSCRIBED');
          if (status === 'SUBSCRIBED') agendar(); // sincroniza ao reconectar
        });
      // Rede de segurança: ressincroniza ao voltar para a aba e a cada minuto.
      const aoFocar = () => document.visibilityState === 'visible' && agendar();
      document.addEventListener('visibilitychange', aoFocar);
      const intervalo = setInterval(recarregar, 60_000);
      return () => {
        ouvintes = null;
        clearTimeout(timer);
        clearInterval(intervalo);
        document.removeEventListener('visibilitychange', aoFocar);
        supabase.removeChannel(canal);
      };
    },

    recarregar,

    /**
     * Verifica conflito antes e, mesmo que duas pessoas salvem ao mesmo
     * tempo, o banco recusa a segunda (constraint EXCLUDE).
     */
    async salvarReserva(dados: DadosReserva, id?: string) {
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
    },

    // O banco calcula km_rodados e atualiza o hodômetro do veículo (trigger).
    concluirReserva: (id, kmInicial, kmFinal) =>
      atualizar('reservas', id, {
        status: 'concluida',
        km_inicial: kmInicial,
        km_final: kmFinal,
        concluida_em: new Date().toISOString(),
      }),

    cancelarReserva: (id) => atualizar('reservas', id, { status: 'cancelada', cancelada_em: new Date().toISOString() }),

    async salvarVeiculo(dados, id) {
      const { error } = id
        ? await supabase.from('veiculos').update(dados).eq('id', id)
        : await supabase.from('veiculos').insert(dados);
      if (error?.code === PG_UNIQUE_VIOLATION) throw new PlacaDuplicadaError();
      if (error) throw error;
    },

    async salvarMotorista(dados, id) {
      const { error } = id
        ? await supabase.from('motoristas').update(dados).eq('id', id)
        : await supabase.from('motoristas').insert(dados);
      if (error) throw error;
    },

    definirAtivo: (tabela, id, ativo) => atualizar(tabela, id, { ativo }),

    async exportarBackup() {
      const resultado: Record<string, unknown[]> = {};
      for (const t of ['veiculos', 'motoristas', 'reservas', 'auditoria']) {
        resultado[t] = await buscarTudo(t, 'id');
      }
      const blob = new Blob([JSON.stringify({ gerado_em: new Date().toISOString(), ...resultado }, null, 2)], {
        type: 'application/json',
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `backup-frota-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    },
  };
}
