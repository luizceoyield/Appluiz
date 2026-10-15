export type StatusReserva = 'agendada' | 'concluida' | 'cancelada';

export interface Motorista {
  id: string;
  nome: string;
  cargo: string;
  telefone: string | null;
  ativo: boolean;
  criado_em: string;
}

export interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  marca: string | null;
  ano: number | null;
  cor: string;
  km_atual: number;
  ativo: boolean;
  criado_em: string;
}

export interface Reserva {
  id: string;
  veiculo_id: string;
  motorista_id: string;
  inicio: string;
  fim: string;
  km_inicial: number | null; // informado só na conclusão
  km_final: number | null;
  km_rodados: number | null;
  destino: string | null;
  finalidade: string | null;
  status: StatusReserva;
  concluida_em: string | null;
  cancelada_em: string | null;
  criado_em: string;
}
