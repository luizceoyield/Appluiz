import { useEffect, useState } from 'react';
import logo from '../assets/logo-sicoob-centro.png';

/**
 * Tela de abertura: a logo se revela da esquerda para a direita e uma
 * "estrada" com as três cores da marca carrega embaixo. Fica no mínimo
 * ~1,6 s e some com um fade quando os dados chegam.
 */
export function Splash({ pronto }: { pronto: boolean }) {
  const [tempoMinimo, setTempoMinimo] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [fim, setFim] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTempoMinimo(true), 1600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!pronto || !tempoMinimo) return;
    setSaindo(true);
    const t = setTimeout(() => setFim(true), 500);
    return () => clearTimeout(t);
  }, [pronto, tempoMinimo]);

  if (fim) return null;
  return (
    <div
      role="status"
      aria-label="Carregando a gestão de frota"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white px-6 transition-opacity duration-500 ${
        saindo ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {/* Desenho de fundo: triângulos sutis na geometria da marca */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ maskImage: 'radial-gradient(circle at center, transparent 0 240px, #000 520px)', WebkitMaskImage: 'radial-gradient(circle at center, transparent 0 240px, #000 520px)' }}
        aria-hidden="true"
      >
        <defs>
          <pattern id="tri" width="56" height="48" patternUnits="userSpaceOnUse">
            <path d="M0 0 L28 48 L56 0 Z" fill="#003641" fillOpacity="0.035" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tri)" />
      </svg>

      <div className={`relative flex flex-col items-center transition-transform duration-500 ${saindo ? 'scale-[1.04]' : ''}`}>
        <img src={logo} alt="Sicoob Centro" className="w-[min(300px,70vw)] animate-revelar" />
        <p className="eyebrow mt-6 animate-subir [animation-delay:.6s]">Gestão de Frota</p>

        <div className="mt-8 w-[min(260px,64vw)] animate-subir [animation-delay:.75s]">
          <div className="relative h-2 overflow-hidden rounded-full bg-nevoa-100">
            <div className="absolute inset-y-0 left-0 flex w-full origin-left animate-carregar">
              <span className="h-full flex-1 bg-sicoob-verde" />
              <span className="h-full flex-1 bg-sicoob-turquesa" />
              <span className="h-full flex-1 bg-sicoob-lima" />
            </div>
            <div className="faixa-estrada absolute inset-0 animate-estrada opacity-60" />
          </div>
          <p className="mt-3 text-center text-xs text-nevoa-500">
            {tempoMinimo && !pronto ? 'Sincronizando reservas…' : 'Preparando a frota…'}
          </p>
        </div>
      </div>
    </div>
  );
}
