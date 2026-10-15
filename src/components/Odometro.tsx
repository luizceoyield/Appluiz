/** KM em estilo hodômetro: dígitos em casas escuras, última casa em destaque. */
export function Odometro({ km, casas = 6 }: { km: number; casas?: number }) {
  const v = Math.max(0, Math.round(km));
  const digitos = String(v).padStart(casas, '0').split('');
  return (
    <span className="inline-flex items-end gap-1.5" aria-label={`${v} quilômetros`}>
      <span className="inline-flex overflow-hidden rounded-md bg-sicoob-noite p-[3px] shadow-inner">
        {digitos.map((d, i) => (
          <span
            key={i}
            className={`num flex h-8 w-[22px] items-center justify-center font-mono text-lg font-semibold sm:h-9 sm:w-6 sm:text-xl ${
              i === digitos.length - 1 ? 'rounded-sm bg-sicoob-lima text-sicoob-noite' : i < digitos.length - String(v).length ? 'text-white/25' : 'text-white'
            } ${i > 0 ? 'border-l border-white/10' : ''}`}
          >
            {d}
          </span>
        ))}
      </span>
      <span className="pb-1 font-mono text-xs font-semibold text-nevoa-500">km</span>
    </span>
  );
}
