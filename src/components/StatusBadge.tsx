import type { Reserva } from '../lib/types';

export function aguardandoKm(r: Reserva) {
  return r.status === 'agendada' && new Date(r.fim) < new Date();
}

export function StatusBadge({ reserva }: { reserva: Reserva }) {
  const [texto, classe] =
    reserva.status === 'concluida'
      ? ['Concluída', 'bg-sicoob-verde/15 text-green-800']
      : reserva.status === 'cancelada'
        ? ['Cancelada', 'bg-slate-200 text-slate-600']
        : aguardandoKm(reserva)
          ? ['Aguardando KM final', 'bg-amber-100 text-amber-800']
          : new Date(reserva.inicio) <= new Date()
            ? ['Em uso', 'bg-sicoob-turquesa/15 text-teal-800']
            : ['Agendada', 'bg-sicoob-escuro/10 text-sicoob-escuro'];
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${classe}`}>{texto}</span>;
}
