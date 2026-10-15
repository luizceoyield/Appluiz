import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
  largura?: string;
}

export function Modal({ aberto, titulo, onFechar, children, largura = 'max-w-lg' }: Props) {
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [aberto, onFechar]);

  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-sicoob-noite/45 backdrop-blur-[3px] animate-[subir_.2s_ease-out_both] sm:items-center sm:p-4" onMouseDown={onFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`max-h-[92vh] w-full animate-gaveta overflow-y-auto rounded-t-3xl bg-white shadow-elevado sm:animate-surgir sm:rounded-3xl ${largura}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-nevoa-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <span className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-nevoa-200 sm:hidden" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold text-sicoob-escuro">{titulo}</h2>
          <button onClick={onFechar} className="rounded-full p-1.5 text-nevoa-500 transition hover:rotate-90 hover:bg-nevoa-100 hover:text-nevoa-900" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
