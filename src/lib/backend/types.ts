import type { Motorista, Reserva, Veiculo } from '../types';

export interface Snapshot {
  veiculos: Veiculo[];
  motoristas: Motorista[];
  reservas: Reserva[];
}

export interface Ouvintes {
  dados: (s: Snapshot) => void;
  online: (ok: boolean) => void;
  erro: (msg: string | null) => void;
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

export type DadosVeiculo = Pick<Veiculo, 'placa' | 'modelo' | 'marca' | 'ano' | 'km_atual' | 'cor'>;
export type DadosMotorista = Pick<Motorista, 'nome' | 'cargo' | 'telefone'>;

/** Tudo que as telas precisam do armazenamento, independente de onde os dados vivem. */
export interface Backend {
  /** Começa a entregar os dados (e mudanças em tempo real). Retorna a função de parar. */
  assinar(o: Ouvintes): () => void;
  recarregar(): Promise<void>;
  salvarReserva(dados: DadosReserva, id?: string): Promise<void>;
  concluirReserva(id: string, kmFinal: number): Promise<void>;
  cancelarReserva(id: string): Promise<void>;
  salvarVeiculo(dados: DadosVeiculo, id?: string): Promise<void>;
  salvarMotorista(dados: DadosMotorista, id?: string): Promise<void>;
  definirAtivo(tabela: 'veiculos' | 'motoristas', id: string, ativo: boolean): Promise<void>;
  exportarBackup(): Promise<void>;
}

export class ConflitoReservaError extends Error {
  constructor(public conflitos: Reserva[]) {
    super('Veículo Ocupado neste Horário');
  }
}

export class PlacaDuplicadaError extends Error {
  constructor() {
    super('Já existe um veículo com esta placa.');
  }
}

export function mensagemErro(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return 'Erro inesperado. Nenhum dado foi alterado.';
}

/** Regra de sobreposição: início < fim_existente E fim > início_existente. */
export const sobrepoe = (aIni: Date, aFim: Date, bIni: Date, bFim: Date) => aIni < bFim && aFim > bIni;
