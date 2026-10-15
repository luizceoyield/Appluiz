/**
 * Impede zooms acidentais:
 * - pinça no iPhone/iPad (eventos gesture* do Safari);
 * - pinça no trackpad do computador (chega como roda do mouse com Ctrl);
 * - roda do mouse alterando sem querer o valor de um campo numérico (KM).
 * O toque duplo é tratado no CSS (touch-action: manipulation).
 */
export function bloquearZoomAcidental() {
  const impedir = (e: Event) => e.preventDefault();
  document.addEventListener('gesturestart', impedir, { passive: false });
  document.addEventListener('gesturechange', impedir, { passive: false });
  document.addEventListener('gestureend', impedir, { passive: false });

  document.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        return;
      }
      const alvo = e.target as HTMLElement | null;
      if (alvo instanceof HTMLInputElement && alvo.type === 'number' && document.activeElement === alvo) alvo.blur();
    },
    { passive: false },
  );

  // Dois toques rápidos (iOS antigos ignoram touch-action).
  let ultimoToque = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const agora = Date.now();
      const alvo = e.target as HTMLElement | null;
      const campo = alvo?.closest('input, textarea, select, [contenteditable]');
      if (!campo && agora - ultimoToque < 300) e.preventDefault();
      ultimoToque = agora;
    },
    { passive: false },
  );
}
