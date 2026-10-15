import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import type { EventContentArg } from '@fullcalendar/core';
import { useReservaAcoes } from '../components/ReservaAcoes';
import { useData } from '../lib/DataContext';

export default function Calendario() {
  const { reservas, veiculos, veiculoPorId, motoristaPorId } = useData();
  const { novaReserva, detalhar } = useReservaAcoes();
  const [filtro, setFiltro] = useState<string>('');
  const [mostrarCanceladas, setMostrarCanceladas] = useState(false);
  const celular = typeof window !== 'undefined' && window.innerWidth < 640;

  const eventos = useMemo(
    () =>
      reservas
        .filter((r) => (mostrarCanceladas || r.status !== 'cancelada') && (!filtro || r.veiculo_id === filtro))
        .map((r) => {
          const v = veiculoPorId.get(r.veiculo_id);
          const m = motoristaPorId.get(r.motorista_id);
          return {
            id: r.id,
            title: `${v?.placa ?? 'Veículo'} · ${m?.nome ?? ''}`,
            start: r.inicio,
            end: r.fim,
            backgroundColor: v?.cor ?? '#003641',
            borderColor: v?.cor ?? '#003641',
            textColor: '#ffffff',
            display: 'block',
            classNames: r.status === 'cancelada' ? ['fc-event-cancelada'] : [],
            extendedProps: { placa: v?.placa, modelo: v?.modelo, motorista: m?.nome, status: r.status },
          };
        }),
    [reservas, veiculoPorId, motoristaPorId, filtro, mostrarCanceladas],
  );

  const veiculosAtivos = veiculos.filter((v) => v.ativo);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="titulo-pagina">Calendário de reservas</h1>
        <p className="text-sm text-slate-500">Clique em um dia para reservar · clique em uma reserva para ver detalhes ou concluir</p>
      </div>

      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFiltro('')}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${!filtro ? 'border-sicoob-escuro bg-sicoob-escuro text-white' : 'border-slate-300 text-slate-600'}`}
          >
            Todos os veículos
          </button>
          {veiculosAtivos.map((v) => (
            <button
              key={v.id}
              onClick={() => setFiltro(filtro === v.id ? '' : v.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                filtro === v.id ? 'border-sicoob-escuro bg-slate-100 text-sicoob-escuro' : 'border-slate-300 text-slate-600'
              }`}
              title={v.modelo}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: v.cor }} /> {v.placa}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={mostrarCanceladas} onChange={(e) => setMostrarCanceladas(e.target.checked)} /> Mostrar canceladas
        </label>
      </div>

      <div className="card p-2 sm:p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          locale={ptBrLocale}
          initialView={celular ? 'listWeek' : 'dayGridMonth'}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listWeek' }}
          buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', list: 'Lista' }}
          height="auto"
          events={eventos}
          dayMaxEvents={4}
          nowIndicator
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          dateClick={(info) => {
            const data = info.date;
            novaReserva({ data, veiculoId: filtro || undefined });
          }}
          eventClick={(info) => {
            const r = reservas.find((x) => x.id === info.event.id);
            if (r) detalhar(r);
          }}
          eventContent={renderEvento}
        />
      </div>
    </div>
  );
}

function renderEvento(arg: EventContentArg) {
  const { placa, motorista } = arg.event.extendedProps as { placa?: string; motorista?: string };
  if (arg.view.type === 'listWeek') {
    return (
      <span>
        <strong>{placa}</strong> · {motorista}
      </span>
    );
  }
  return (
    <div className="overflow-hidden leading-tight">
      <span className="mr-1 opacity-90">{arg.timeText}</span>
      <strong>{placa}</strong>
      <span className="hidden opacity-90 lg:inline"> · {motorista}</span>
    </div>
  );
}
