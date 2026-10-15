/**
 * Armazenamento no banco de dados do próprio Artifact (claude.ai).
 *
 * Coleções: veiculos, motoristas, reservas. Nada é apagado: veículos e
 * motoristas são desativados, reservas são canceladas, e cada documento
 * guarda o histórico das suas versões anteriores no campo `historico`.
 *
 * O banco não tem transações, então a reserva usa uma trava curta por
 * veículo (`travas/<veiculo>`): só quem segura a trava relê as reservas
 * do veículo, confere conflito e grava. Assim duas pessoas salvando ao
 * mesmo tempo não conseguem reservar o mesmo horário.
 */
import type { Motorista, Reserva, Veiculo } from '../types';
import {
  ConflitoReservaError,
  PlacaDuplicadaError,
  sobrepoe,
  type Backend,
  type DadosReserva,
  type Ouvintes,
  type Snapshot,
} from './types';

// ---- Tipos mínimos do runtime (ver artifact-capabilities, contrato 0.2.80) ----
interface DocSnap { id: string; exists: boolean; data(): Record<string, unknown> | undefined }
interface QuerySnap { docs: DocSnap[] }
interface DbError { code: string; message: string }
interface DocRef {
  id: string;
  get(): Promise<DocSnap>;
  set(d: Record<string, unknown>): Promise<void>;
  update(d: Record<string, unknown>): Promise<void>;
  acquire(o: { holder: string; ttlMs?: number }): Promise<{ acquired: boolean; expiresAt?: string }>;
}
interface Query {
  where(f: string, op: string, v: unknown): Query;
  get(): Promise<QuerySnap>;
  onSnapshot(next: (s: QuerySnap) => void, err?: (e: DbError) => void): () => void;
}
interface CollRef extends Query { doc(id?: string): DocRef }
interface DB { doc(p: string): DocRef; collection(p: string): CollRef }
interface Downloads { save(r: { filename: string; data: string | Blob }): Promise<unknown> }
interface ClaudeRuntime { use(name: string): Promise<unknown> }

const runtime = (): ClaudeRuntime | undefined => (window as unknown as { claude?: ClaudeRuntime }).claude;

export async function obterDb(): Promise<DB | null> {
  const c = runtime();
  return c ? ((await c.use('db')) as DB | null) : null;
}

export async function podeEscrever(): Promise<boolean | null> {
  const c = runtime();
  const user = c ? ((await c.use('user')) as { can(n: string): Promise<boolean | null> } | null) : null;
  return user ? user.can('data.write') : null;
}

const HISTORICO_MAX = 40;
const agora = () => new Date().toISOString();
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const idAba = `aba-${Math.random().toString(36).slice(2)}-${Date.now()}`;

type Doc = Record<string, unknown> & { historico?: unknown[] };

/** Acrescenta a versão anterior do documento ao histórico (sem apagar nada). */
function comHistorico(anterior: Doc | undefined, acao: string, novo: Record<string, unknown>) {
  const { historico = [], ...antes } = anterior ?? {};
  const entrada = { em: agora(), acao, ...(anterior ? { antes } : {}) };
  return { ...novo, historico: [...historico, entrada].slice(-HISTORICO_MAX) };
}

const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));

function paraVeiculo(d: DocSnap): Veiculo {
  const x = d.data() ?? {};
  return {
    id: d.id,
    placa: String(x.placa ?? ''),
    modelo: String(x.modelo ?? ''),
    marca: (x.marca as string) ?? null,
    ano: num(x.ano),
    cor: String(x.cor ?? '#00AE9D'),
    km_atual: Number(x.km_atual ?? 0),
    ativo: x.ativo !== false,
    criado_em: String(x.criado_em ?? ''),
  };
}

function paraMotorista(d: DocSnap): Motorista {
  const x = d.data() ?? {};
  return {
    id: d.id,
    nome: String(x.nome ?? ''),
    cargo: String(x.cargo ?? ''),
    telefone: (x.telefone as string) ?? null,
    ativo: x.ativo !== false,
    criado_em: String(x.criado_em ?? ''),
  };
}

function paraReserva(d: DocSnap): Reserva {
  const x = d.data() ?? {};
  const kmIni = num(x.km_inicial);
  const kmFim = num(x.km_final);
  return {
    id: d.id,
    veiculo_id: String(x.veiculo_id ?? ''),
    motorista_id: String(x.motorista_id ?? ''),
    inicio: String(x.inicio ?? ''),
    fim: String(x.fim ?? ''),
    km_inicial: kmIni,
    km_final: kmFim,
    km_rodados: kmFim === null || kmIni === null ? null : Math.round((kmFim - kmIni) * 10) / 10,
    destino: (x.destino as string) ?? null,
    finalidade: (x.finalidade as string) ?? null,
    status: (x.status as Reserva['status']) ?? 'agendada',
    concluida_em: (x.concluida_em as string) ?? null,
    cancelada_em: (x.cancelada_em as string) ?? null,
    criado_em: String(x.criado_em ?? ''),
  };
}

export function criarBackendClaude(db: DB): Backend {
  const estado: Snapshot = { veiculos: [], motoristas: [], reservas: [] };
  const brutos = new Map<string, Doc>(); // caminho -> corpo atual (para o histórico)

  async function lerDoc(caminho: string): Promise<Doc | undefined> {
    const snap = await db.doc(caminho).get();
    return snap.exists ? (snap.data() as Doc) : undefined;
  }

  /** Atualiza mesclando campos, guardando a versão anterior no histórico. */
  async function alterar(colecao: string, id: string, acao: string, campos: Record<string, unknown>) {
    const caminho = `${colecao}/${id}`;
    const anterior = brutos.get(caminho) ?? (await lerDoc(caminho));
    if (!anterior) throw new Error('Registro não encontrado. Recarregue a página e tente de novo.');
    const novo = comHistorico(anterior, acao, { ...campos, atualizado_em: agora() });
    await db.doc(caminho).update(novo);
  }

  async function criar(colecao: string, campos: Record<string, unknown>) {
    const ref = db.collection(colecao).doc();
    await ref.set(comHistorico(undefined, 'criado', { ...campos, criado_em: agora(), atualizado_em: agora() }));
  }

  /** Segura a trava do veículo; espera a de outra pessoa expirar (até ~10 s). */
  async function travar(veiculoId: string) {
    const ref = db.doc(`travas/${veiculoId}`);
    for (let tentativa = 0; tentativa < 8; tentativa++) {
      const r = await ref.acquire({ holder: idAba, ttlMs: 4000 });
      if (r.acquired) return;
      const falta = r.expiresAt ? new Date(r.expiresAt).getTime() - Date.now() : 500;
      await esperar(Math.min(Math.max(falta, 150), 4000) + Math.random() * 200);
    }
    throw new Error('Outra pessoa está reservando este veículo agora. Tente de novo em alguns segundos.');
  }

  return {
    assinar(o: Ouvintes) {
      const entregar = () => o.dados({ ...estado });
      const erro = (e: DbError) => {
        o.online(false);
        o.erro(e.code === 'revoked' ? 'Seu acesso a esta página mudou. Recarregue a página.' : e.message);
      };
      const ouvir = <T,>(colecao: keyof Snapshot, mapear: (d: DocSnap) => T, ordenar: (a: T, b: T) => number) =>
        db.collection(colecao).onSnapshot((snap) => {
          snap.docs.forEach((d) => brutos.set(`${colecao}/${d.id}`, d.data() as Doc));
          (estado[colecao] as T[]) = snap.docs.filter((d) => d.exists).map(mapear).sort(ordenar);
          o.online(true);
          o.erro(null);
          entregar();
        }, erro);

      const paradas = [
        ouvir('veiculos', paraVeiculo, (a, b) => a.placa.localeCompare(b.placa)),
        ouvir('motoristas', paraMotorista, (a, b) => a.nome.localeCompare(b.nome)),
        ouvir('reservas', paraReserva, (a, b) => a.inicio.localeCompare(b.inicio)),
      ];
      return () => paradas.forEach((p) => p());
    },

    // Os dados chegam sozinhos pelas assinaturas em tempo real.
    recarregar: async () => {},

    async salvarReserva(dados: DadosReserva, id?: string) {
      await travar(dados.veiculo_id);

      // Releitura direto do banco (não do que está na tela) com a trava em mãos.
      const snap = await db.collection('reservas').where('veiculo_id', '==', dados.veiculo_id).get();
      const conflitos = snap.docs
        .map(paraReserva)
        .filter(
          (r) => r.id !== id && r.status !== 'cancelada' && sobrepoe(dados.inicio, dados.fim, new Date(r.inicio), new Date(r.fim)),
        );
      if (conflitos.length) throw new ConflitoReservaError(conflitos);

      const campos = { ...dados, inicio: dados.inicio.toISOString(), fim: dados.fim.toISOString() };
      if (id) await alterar('reservas', id, 'editado', campos);
      else await criar('reservas', { ...campos, status: 'agendada', km_inicial: null, km_final: null, concluida_em: null, cancelada_em: null });
    },

    async concluirReserva(id, kmInicial, kmFinal) {
      if (!(kmInicial >= 0) || !(kmFinal >= kmInicial)) throw new Error('O KM final não pode ser menor que o KM inicial.');
      const r = estado.reservas.find((x) => x.id === id);
      await alterar('reservas', id, 'concluido', {
        status: 'concluida',
        km_inicial: kmInicial,
        km_final: kmFinal,
        concluida_em: agora(),
      });
      // Atualiza o hodômetro do veículo (nunca para trás).
      const v = r && estado.veiculos.find((x) => x.id === r.veiculo_id);
      if (v && kmFinal > v.km_atual) await alterar('veiculos', v.id, 'hodometro', { km_atual: kmFinal });
    },

    cancelarReserva: (id) => alterar('reservas', id, 'cancelado', { status: 'cancelada', cancelada_em: agora() }),

    async salvarVeiculo(dados, id) {
      const placa = dados.placa.trim().toUpperCase();
      if (estado.veiculos.some((v) => v.id !== id && v.placa.toUpperCase() === placa)) throw new PlacaDuplicadaError();
      const campos = { ...dados, placa };
      if (id) await alterar('veiculos', id, 'editado', campos);
      else await criar('veiculos', { ...campos, ativo: true });
    },

    async salvarMotorista(dados, id) {
      if (id) await alterar('motoristas', id, 'editado', { ...dados });
      else await criar('motoristas', { ...dados, ativo: true });
    },

    definirAtivo: (tabela, id, ativo) => alterar(tabela, id, ativo ? 'reativado' : 'desativado', { ativo }),

    async exportarBackup() {
      const c = runtime();
      const downloads = c ? ((await c.use('downloads')) as Downloads | null) : null;
      if (!downloads) throw new Error('O download não está disponível nesta visualização.');
      const corpo: Record<string, unknown> = { gerado_em: agora() };
      for (const col of ['veiculos', 'motoristas', 'reservas']) {
        const s = await db.collection(col).get();
        corpo[col] = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      try {
        await downloads.save({
          filename: `backup-frota-${agora().slice(0, 10)}.json`,
          data: new Blob([JSON.stringify(corpo, null, 2)], { type: 'application/json' }),
        });
      } catch (e) {
        if ((e as DbError)?.code === 'declined') throw new Error('Download cancelado.');
        throw e;
      }
    },
  };
}
