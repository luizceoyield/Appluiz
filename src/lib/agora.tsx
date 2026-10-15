import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const AgoraContext = createContext<Date>(new Date());

/**
 * Relógio compartilhado: atualiza a cada 30 s (e ao voltar para a aba),
 * para que "Em uso", "Aguardando KM final" e a virada de mês se recalculem
 * sozinhos mesmo com a tela parada.
 */
export function AgoraProvider({ children }: { children: ReactNode }) {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const tic = () => setAgora(new Date());
    const id = setInterval(tic, 30_000);
    const visivel = () => document.visibilityState === 'visible' && tic();
    document.addEventListener('visibilitychange', visivel);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', visivel);
    };
  }, []);
  return <AgoraContext.Provider value={agora}>{children}</AgoraContext.Provider>;
}

export const useAgora = () => useContext(AgoraContext);

/** Chave "AAAA-MM" do mês, para detectar a virada. */
export const chaveMes = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
