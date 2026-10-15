import { useEffect, useRef, useState } from 'react';

const semMovimento = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Anima um número do valor anterior até o novo (efeito "contador"). */
export function useContagem(alvo: number, duracao = 900) {
  const [valor, setValor] = useState(semMovimento() ? alvo : 0);
  const atual = useRef(valor);
  useEffect(() => {
    if (semMovimento()) {
      atual.current = alvo;
      setValor(alvo);
      return;
    }
    const de = atual.current;
    const inicio = performance.now();
    let quadro = 0;
    const passo = (t: number) => {
      const p = Math.min(1, (t - inicio) / duracao);
      const v = de + (alvo - de) * (1 - Math.pow(1 - p, 3));
      atual.current = v;
      setValor(v);
      if (p < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [alvo, duracao]);
  return valor;
}
