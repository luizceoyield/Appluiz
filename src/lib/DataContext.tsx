import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Backend } from './backend';
import type { Motorista, Reserva, Veiculo } from './types';

interface DataState {
  backend: Backend;
  somenteLeitura: boolean;
  veiculos: Veiculo[];
  motoristas: Motorista[];
  reservas: Reserva[];
  carregando: boolean;
  erro: string | null;
  online: boolean;
  recarregar: () => Promise<void>;
  veiculoPorId: Map<string, Veiculo>;
  motoristaPorId: Map<string, Motorista>;
}

const DataContext = createContext<DataState | null>(null);

export function DataProvider({ backend, somenteLeitura, children }: { backend: Backend; somenteLeitura: boolean; children: ReactNode }) {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(
    () =>
      backend.assinar({
        dados: (s) => {
          setVeiculos(s.veiculos);
          setMotoristas(s.motoristas);
          setReservas(s.reservas);
          setCarregando(false);
        },
        online: setOnline,
        erro: (m) => {
          setErro(m);
          if (m) setCarregando(false);
        },
      }),
    [backend],
  );

  const valor = useMemo<DataState>(
    () => ({
      backend,
      somenteLeitura,
      veiculos,
      motoristas,
      reservas,
      carregando,
      erro,
      online,
      recarregar: backend.recarregar,
      veiculoPorId: new Map(veiculos.map((v) => [v.id, v])),
      motoristaPorId: new Map(motoristas.map((m) => [m.id, m])),
    }),
    [backend, somenteLeitura, veiculos, motoristas, reservas, carregando, erro, online],
  );

  return <DataContext.Provider value={valor}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData precisa estar dentro de <DataProvider>');
  return ctx;
}
