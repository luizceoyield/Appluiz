import { AlertOctagon } from 'lucide-react';
import { useData } from '../lib/DataContext';
import { fmtPeriodo } from '../lib/format';
import type { Reserva } from '../lib/types';

export function ConflitoAlerta({ conflitos }: { conflitos: Reserva[] }) {
  const { motoristaPorId } = useData();
  return (
    <div role="alert" className="rounded-xl border-2 border-red-500 bg-red-50 p-4">
      <div className="flex items-center gap-2 text-red-700">
        <AlertOctagon className="h-6 w-6 shrink-0" />
        <p className="text-base font-bold uppercase tracking-wide">Veículo Ocupado neste Horário</p>
      </div>
      <p className="mt-1 text-sm text-red-700">A reserva não pode ser gravada. Escolha outro horário ou outro veículo.</p>
      {conflitos.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-red-800">
          {conflitos.map((c) => (
            <li key={c.id} className="rounded-md bg-white/70 px-2 py-1">
              <strong>{fmtPeriodo(c.inicio, c.fim)}</strong> — {motoristaPorId.get(c.motorista_id)?.nome ?? 'Motorista'}
              {c.destino ? ` · ${c.destino}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
