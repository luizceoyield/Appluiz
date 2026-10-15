import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Modal } from './Modal';

interface Pedido { titulo: string; mensagem: string; confirmar: string; perigo?: boolean }
type Pedir = (p: Pedido) => Promise<boolean>;

const Ctx = createContext<Pedir>(async () => false);

/** Confirmação dentro da página (o navegador do claude.ai bloqueia window.confirm). */
export function ConfirmarProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const resolver = useRef<(ok: boolean) => void>();

  const pedir = useCallback<Pedir>(
    (p) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setPedido(p);
      }),
    [],
  );
  const responder = (ok: boolean) => {
    resolver.current?.(ok);
    setPedido(null);
  };

  return (
    <Ctx.Provider value={pedir}>
      {children}
      <Modal aberto={pedido !== null} titulo={pedido?.titulo ?? ''} onFechar={() => responder(false)} largura="max-w-md">
        <p className="whitespace-pre-line text-sm text-nevoa-700">{pedido?.mensagem}</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button className="btn-secundario" onClick={() => responder(false)}>Voltar</button>
          <button className={pedido?.perigo ? 'btn-perigo' : 'btn-primario'} onClick={() => responder(true)} autoFocus>
            {pedido?.confirmar}
          </button>
        </div>
      </Modal>
    </Ctx.Provider>
  );
}

export const useConfirmar = () => useContext(Ctx);
