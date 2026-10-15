import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface Props {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
  largura?: string;
  /** Janela pequena (confirmações): centralizada também no celular. */
  compacta?: boolean;
}

/** Quantas janelas estão abertas (uma confirmação pode abrir por cima de outra). */
let abertas = 0;

export function Modal({ aberto, titulo, onFechar, children, largura = 'max-w-lg', compacta = false }: Props) {
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
      className={`fixed inset-0 z-[70] flex animate-aparecer justify-center bg-sicoob-noite/50 sm:items-center sm:p-4 ${compacta ? 'items-center p-4' : 'items-stretch'}`}
      onMouseDown={onFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`flex w-full flex-col overflow-hidden bg-white sm:h-auto sm:max-h-[88dvh] sm:rounded-3xl sm:shadow-elevado ${compacta ? 'max-h-[88dvh] rounded-3xl shadow-elevado' : 'h-[100dvh]'} ${largura}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="flex shrink-0 items-center justify-between border-b border-nevoa-100 px-5 pb-3.5 pt-4 sm:px-6"
          style={{ paddingTop: compacta ? undefined : 'max(14px, calc(env(safe-area-inset-top, 0px) + 10px))' }}
        >
          <h2 className="font-display text-lg font-semibold text-sicoob-escuro">{titulo}</h2>
          <button
            onClick={onFechar}
            className="-mr-1.5 rounded-full p-2 text-nevoa-500 transition-colors hover:bg-nevoa-100 hover:text-nevoa-900"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div
          className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6"
          style={{ paddingBottom: 'max(20px, calc(env(safe-area-inset-bottom, 0px) + 16px))' }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
