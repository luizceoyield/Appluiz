import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface Props {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
  largura?: string;
}

/** Quantas janelas estão abertas (uma confirmação pode abrir por cima de outra). */
let abertas = 0;

export function Modal({ aberto, titulo, onFechar, children, largura = 'max-w-lg' }: Props) {
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [aberto, onFechar]);

  // Trava a rolagem da página de fundo enquanto a janela está aberta.
  useEffect(() => {
    if (!aberto) return;
    abertas++;
    document.body.style.overflow = 'hidden';
    return () => {
      abertas--;
      if (abertas === 0) document.body.style.overflow = '';
    };
  }, [aberto]);

  if (!aberto) return null;

  // Renderiza direto no <body>: assim a janela fica sempre acima do menu,
  // do botão flutuante e de qualquer animação da página.
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex animate-aparecer items-end justify-center bg-sicoob-noite/45 backdrop-blur-[3px] sm:items-center sm:p-4"
      onMouseDown={onFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`flex max-h-[92dvh] w-full animate-gaveta flex-col overflow-hidden rounded-t-3xl bg-white shadow-elevado sm:max-h-[88dvh] sm:animate-surgir sm:rounded-3xl ${largura}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative flex shrink-0 items-center justify-between border-b border-nevoa-100 px-5 pb-4 pt-5 sm:px-6 sm:pt-4">
          <span className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-nevoa-200 sm:hidden" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold text-sicoob-escuro">{titulo}</h2>
          <button
            onClick={onFechar}
            className="rounded-full p-1.5 text-nevoa-500 transition-colors hover:bg-nevoa-100 hover:text-nevoa-900"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div
          className="overflow-y-auto overscroll-contain p-5 sm:p-6"
          style={{ paddingBottom: 'max(20px, calc(env(safe-area-inset-bottom, 0px) + 16px))' }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
