import { useAgora } from '../lib/agora';
import type { Reserva } from '../lib/types';

export function aguardandoKm(r: Reserva, agora = new Date()) {
  return r.status === 'agendada' && new Date(r.fim) < agora;
}

export function emUso(r: Reserva, agora = new Date()) {
  return r.status === 'agendada' && new Date(r.inicio) <= agora && new Date(r.fim) > agora;
}

export function StatusBadge({ reserva }: { reserva: Reserva }) {
  const agora = useAgora();
  const [texto, classe, ponto] =
    reserva.status === 'concluida'
      ? ['Concluída', 'bg-sicoob-verde/12 text-[#4d7a0c]', 'bg-sicoob-verde']
      : reserva.status === 'cancelada'
        ? ['Cancelada', 'bg-nevoa-100 text-nevoa-500', 'bg-nevoa-300']
        : aguardandoKm(reserva, agora)
          ? ['Aguardando KM final', 'bg-amber-100 text-amber-800', 'bg-amber-500']
          : emUso(reserva, agora)
            ? ['Em uso', 'bg-sicoob-turquesa/12 text-[#00766b]', 'bg-sicoob-turquesa']
            : ['Agendada', 'bg-sicoob-escuro/[.07] text-sicoob-escuro', 'bg-sicoob-escuro'];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${classe}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ponto}`} />
      {texto}
    </span>
  );
}
