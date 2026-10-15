import { useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import type { EventContentArg } from '@fullcalendar/core';
import { CalendarCheck, CalendarPlus, ChevronRight } from 'lucide-react';
import { Modal } from '../components/Modal';
import { Placa } from '../components/Placa';
import { useReservaAcoes } from '../components/ReservaAcoes';
import { StatusBadge } from '../components/StatusBadge';
import { chaveMes, useAgora } from '../lib/agora';
import { useData } from '../lib/DataContext';
import { fmtPeriodo } from '../lib/format';

const dataLonga = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Calendario() {
  const { reservas, veiculos, veiculoPorId, motoristaPorId, somenteLeitura } = useData();
  const { novaReserva, detalhar } = useReservaAcoes();
  const [filtro, setFiltro] = useState<string>('');
  const [mostrarCanceladas, setMostrarCanceladas] = useState(false);
  const [diaAberto, setDiaAberto] = useState<Date | null>(null);
  const calendario = useRef<FullCalendar>(null);

  // Na virada do mês, se a tela estava mostrando o mês que acabou, passa sozinha para o novo.
  const mesAtual = chaveMes(useAgora());
  const mesAnterior = useRef(mesAtual);
  useEffect(() => {
    const api = calendario.current?.getApi();
    if (api && chaveMes(api.getDate()) === mesAnterior.current) api.today();
    mesAnterior.current = mesAtual;
  }, [mesAtual]);

  const visiveis = useMemo(
    () => reservas.filter((r) => (mostrarCanceladas || r.status !== 'cancelada') && (!filtro || r.veiculo_id === filtro)),
    [reservas, filtro, mostrarCanceladas],
  );

  const eventos = useMemo(
    () =>
      visiveis.map((r) => {
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
          extendedProps: { placa: v?.placa, motorista: m?.nome },
        };
      }),
    [visiveis, veiculoPorId, motoristaPorId],
  );

  // Reservas que ocupam qualquer parte do dia clicado.
  const doDia = useMemo(() => {
    if (!diaAberto) return [];
    const ini = new Date(diaAberto.getFullYear(), diaAberto.getMonth(), diaAberto.getDate());
    const fim = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 1);
    return visiveis
      .filter((r) => new Date(r.inicio) < fim && new Date(r.fim) > ini)
      .sort((a, b) => a.inicio.localeCompare(b.inicio));
  }, [diaAberto, visiveis]);

  const veiculosAtivos = veiculos.filter((v) => v.ativo);
  const ocupados = new Set(doDia.filter((r) => r.status !== 'cancelada').map((r) => r.veiculo_id));
  const livres = veiculosAtivos.filter((v) => !ocupados.has(v.id) && (!filtro || v.id === filtro));

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Agenda mensal</p>
        <h1 className="titulo-pagina">Calendário de reservas</h1>
        <p className="text-sm text-nevoa-500">Toque em um dia para ver as reservas daquele dia</p>
      </div>

      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFiltro('')}
            className={!filtro ? 'chip-ativo' : 'chip-inativo'}
          >
            Todos os veículos
          </button>
          {veiculosAtivos.map((v) => (
            <button
              key={v.id}
              onClick={() => setFiltro(filtro === v.id ? '' : v.id)}
              className={filtro === v.id ? 'chip-ativo' : 'chip-inativo'}
              title={v.modelo}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: v.cor }} /> {v.placa}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-nevoa-600">
          <input id="mostrarCanceladas" type="checkbox" checked={mostrarCanceladas} onChange={(e) => setMostrarCanceladas(e.target.checked)} /> Mostrar canceladas
        </label>
      </div>

      <div className="card p-2 sm:p-4">
        <FullCalendar
          ref={calendario}
          plugins={[dayGridPlugin, interactionPlugin]}
          locale={ptBrLocale}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
          buttonText={{ today: 'Hoje' }}
          height="auto"
          events={eventos}
          dayMaxEvents={3}
          moreLinkClick={(info) => {
            setDiaAberto(info.date);
            // Qualquer valor verdadeiro que não seja texto impede o popover padrão.
            return true as never;
          }}
          moreLinkContent={(arg) => `+${arg.num} mais`}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          dateClick={(info) => setDiaAberto(info.date)}
          eventClick={(info) => {
            const r = reservas.find((x) => x.id === info.event.id);
            if (r) detalhar(r);
          }}
          eventContent={renderEvento}
        />
      </div>

      <Modal aberto={diaAberto !== null} titulo={diaAberto ? maiuscula(dataLonga.format(diaAberto)) : ''} onFechar={() => setDiaAberto(null)}>
        {diaAberto && (
          <div className="space-y-4">
            {doDia.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl bg-sicoob-turquesa-claro p-4 text-sicoob-escuro">
                <CalendarCheck className="h-6 w-6 shrink-0" />
                <div>
                  <p className="font-semibold">Nenhuma reserva neste dia</p>
                  <p className="text-sm">{filtro ? 'Este veículo está livre o dia todo.' : 'Todos os veículos estão livres o dia todo.'}</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="mb-2 text-sm font-semibold text-sicoob-escuro">
                  {doDia.length} {doDia.length === 1 ? 'reserva' : 'reservas'} neste dia
                </p>
                <ul className="divide-y divide-nevoa-100 overflow-hidden rounded-2xl border border-nevoa-200">
                  {doDia.map((r) => {
                    const v = veiculoPorId.get(r.veiculo_id);
                    return (
                      <li key={r.id}>
                        <button
                          onClick={() => {
                            setDiaAberto(null);
                            detalhar(r);
                          }}
                          className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-nevoa-50"
                        >
                          <Placa placa={v?.placa} tamanho="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-nevoa-800">
                              {motoristaPorId.get(r.motorista_id)?.nome}
                            </p>
                            <p className="truncate text-xs text-nevoa-500">
                              {fmtPeriodo(r.inicio, r.fim)}
                              {r.destino ? ` · ${r.destino}` : ''}
                            </p>
                          </div>
                          <StatusBadge reserva={r} />
                          <ChevronRight className="h-4 w-4 shrink-0 text-nevoa-400" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {doDia.length > 0 && veiculosAtivos.length > 0 && (
              <p className="text-sm text-nevoa-600">
                <span className="font-medium">Livres o dia todo:</span>{' '}
                {livres.length ? livres.map((v) => v.placa).join(', ') : 'nenhum veículo'}
              </p>
            )}

            {!somenteLeitura && (
              <div className="flex justify-end">
                <button
                  className="btn-primario"
                  onClick={() => {
                    const dia = diaAberto;
                    setDiaAberto(null);
                    novaReserva({ data: dia, veiculoId: filtro || undefined });
                  }}
                >
                  <CalendarPlus className="h-4 w-4" /> Reservar neste dia
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function renderEvento(arg: EventContentArg) {
  const { placa, motorista } = arg.event.extendedProps as { placa?: string; motorista?: string };
  return (
    <div className="overflow-hidden leading-tight">
      <span className="mr-1 hidden opacity-90 sm:inline">{arg.timeText}</span>
      <strong>{placa}</strong>
      <span className="hidden opacity-90 lg:inline"> · {motorista}</span>
    </div>
  );
}
