import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { Motorista, Reserva, Veiculo } from './types';

interface DataState {
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

async function buscarTudo<T>(tabela: string, ordem: string): Promise<T[]> {
  const todos: T[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from(tabela).select('*').order(ordem).range(de, de + 999);
    if (error) throw error;
    todos.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return todos;
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  const recarregar = useCallback(async () => {
    try {
      const [v, m, r] = await Promise.all([
        buscarTudo<Veiculo>('veiculos', 'placa'),
        buscarTudo<Motorista>('motoristas', 'nome'),
        buscarTudo<Reserva>('reservas', 'inicio'),
      ]);
      setVeiculos(v);
      setMotoristas(m);
      setReservas(r);
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar os dados.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
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
        setOnline(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') agendar(); // sincroniza ao reconectar
      });
    // Rede de segurança: ressincroniza ao voltar para a aba e a cada minuto.
    const aoFocar = () => document.visibilityState === 'visible' && agendar();
    document.addEventListener('visibilitychange', aoFocar);
    const intervalo = setInterval(recarregar, 60_000);
    return () => {
      clearTimeout(timer);
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', aoFocar);
      supabase.removeChannel(canal);
    };
  }, [recarregar]);

  const valor = useMemo<DataState>(
    () => ({
      veiculos,
      motoristas,
      reservas,
      carregando,
      erro,
      online,
      recarregar,
      veiculoPorId: new Map(veiculos.map((v) => [v.id, v])),
      motoristaPorId: new Map(motoristas.map((m) => [m.id, m])),
    }),
    [veiculos, motoristas, reservas, carregando, erro, online, recarregar],
  );

  return <DataContext.Provider value={valor}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData precisa estar dentro de <DataProvider>');
  return ctx;
}
