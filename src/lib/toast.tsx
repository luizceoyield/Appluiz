import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

type Tipo = 'sucesso' | 'erro';
interface Toast { id: number; tipo: Tipo; texto: string }

const ToastContext = createContext<(tipo: Tipo, texto: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const mostrar = useCallback((tipo: Tipo, texto: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tipo, texto }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tipo === 'erro' ? 7000 : 3500);
  }, []);
  return (
    <ToastContext.Provider value={mostrar}>
      {children}
      <div className="fixed bottom-40 right-4 z-[80] flex flex-col gap-2 md:bottom-6 md:right-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`flex max-w-sm animate-aparecer items-start gap-2 rounded-2xl px-4 py-3 text-sm text-white shadow-elevado ${
              t.tipo === 'sucesso' ? 'bg-sicoob-noite' : 'bg-red-600'
            }`}
          >
            {t.tipo === 'sucesso' ? <CheckCircle2 className="h-5 w-5 shrink-0 text-sicoob-lima" /> : <XCircle className="h-5 w-5 shrink-0" />}
            <span>{t.texto}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
