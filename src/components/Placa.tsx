/** Placa no padrão Mercosul: faixa azul "BRASIL" e caracteres em fonte mono. */
export function Placa({ placa, tamanho = 'md' }: { placa?: string; tamanho?: 'sm' | 'md' | 'lg' }) {
  const t = {
    sm: { caixa: 'min-w-[64px] rounded-[4px]', faixa: 'h-[5px] text-[0px]', texto: 'px-1.5 py-[1px] text-[11px]' },
    md: { caixa: 'min-w-[84px] rounded-[5px]', faixa: 'h-[9px] text-[6px]', texto: 'px-2 py-[2px] text-[14px]' },
    lg: { caixa: 'min-w-[120px] rounded-[7px]', faixa: 'h-[13px] text-[8px]', texto: 'px-3 py-[3px] text-[20px]' },
  }[tamanho];
  return (
    <span className={`inline-flex shrink-0 flex-col overflow-hidden border-[1.5px] border-nevoa-900 bg-white align-middle ${t.caixa}`} aria-label={`Placa ${placa ?? ''}`}>
      <span className={`flex items-center justify-center bg-placa-azul font-sans font-semibold leading-none tracking-[0.2em] text-white ${t.faixa}`}>
        BRASIL
      </span>
      <span className={`text-center font-mono font-semibold leading-tight tracking-[0.08em] text-nevoa-900 ${t.texto}`}>
        {(placa ?? '———').toUpperCase()}
      </span>
    </span>
  );
}
