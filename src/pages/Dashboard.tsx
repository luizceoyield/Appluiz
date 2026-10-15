import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Car, ChevronLeft, ChevronRight, Clock, Flag, Gauge, Route } from 'lucide-react';
import { useReservaAcoes } from '../components/ReservaAcoes';
import { aguardandoKm, StatusBadge } from '../components/StatusBadge';
import { useData } from '../lib/DataContext';
import { fmtKm, fmtPeriodo } from '../lib/format';
import type { Reserva } from '../lib/types';

const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Dashboard() {
  const { reservas, veiculos, veiculoPorId, motoristaPorId, carregando } = useData();
  const { concluir, detalhar } = useReservaAcoes();
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const dados = useMemo(() => {
    const ini = mes;
    const fim = new Date(mes.getFullYear(), mes.getMonth() + 1, 1);
    const doMes = reservas.filter((r) => r.status !== 'cancelada' && new Date(r.inicio) >= ini && new Date(r.inicio) < fim);
    const concluidas = doMes.filter((r) => r.status === 'concluida');
    const kmTotal = concluidas.reduce((s, r) => s + Number(r.km_rodados ?? 0), 0);

    const porHora = Array.from({ length: 24 }, (_, h) => ({ hora: `${String(h).padStart(2, '0')}h`, saidas: 0 }));
    doMes.forEach((r) => porHora[new Date(r.inicio).getHours()].saidas++);
    const comSaida = porHora.map((p, i) => ({ ...p, i })).filter((p) => p.saidas > 0);
    const primeira = comSaida.length ? Math.min(6, comSaida[0].i) : 6;
    const ultima = comSaida.length ? Math.max(20, comSaida[comSaida.length - 1].i) : 20;
    const pico = Math.max(0, ...porHora.map((p) => p.saidas));

    const kmPorVeiculo = veiculos
      .map((v) => ({
        placa: v.placa,
        cor: v.cor,
        km: concluidas.filter((r) => r.veiculo_id === v.id).reduce((s, r) => s + Number(r.km_rodados ?? 0), 0),
      }))
      .filter((v) => v.km > 0)
      .sort((a, b) => b.km - a.km);

    const agora = new Date();
    const proximas = reservas
      .filter((r) => r.status === 'agendada' && new Date(r.inicio) >= agora)
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
      .slice(0, 8);
    const pendentes = reservas.filter(aguardandoKm).sort((a, b) => a.fim.localeCompare(b.fim));
    const emUso = new Set(
      reservas
        .filter((r) => r.status === 'agendada' && new Date(r.inicio) <= agora && new Date(r.fim) > agora)
        .map((r) => r.veiculo_id),
    );
    const ativos = veiculos.filter((v) => v.ativo);

    return {
      saidas: doMes.length,
      kmTotal,
      concluidas: concluidas.length,
      porHora: porHora.slice(primeira, ultima + 1),
      pico,
      kmPorVeiculo,
      proximas,
      pendentes,
      disponiveis: ativos.filter((v) => !emUso.has(v.id)).length,
      totalAtivos: ativos.length,
    };
  }, [reservas, veiculos, mes]);

  const mudarMes = (delta: number) => setMes((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="titulo-pagina">Dashboard</h1>
          <p className="text-sm text-slate-500">Visão geral da frota</p>
        </div>
        <div className="flex items-center gap-1 self-start rounded-lg border border-slate-200 bg-white p-1">
          <button className="rounded-md p-1.5 hover:bg-slate-100" onClick={() => mudarMes(-1)} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></button>
          <span className="min-w-36 text-center text-sm font-semibold text-sicoob-escuro">{maiuscula(nomeMes.format(mes))}</span>
          <button className="rounded-md p-1.5 hover:bg-slate-100" onClick={() => mudarMes(1)} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <CardResumo icone={Route} titulo="Saídas no mês" valor={String(dados.saidas)} detalhe={`${dados.concluidas} concluídas`} cor="bg-sicoob-escuro" />
        <CardResumo icone={Gauge} titulo="KM rodados no mês" valor={fmtKm(dados.kmTotal)} detalhe="KM final − KM inicial" cor="bg-sicoob-turquesa" />
        <CardResumo icone={Car} titulo="Disponíveis agora" valor={`${dados.disponiveis}/${dados.totalAtivos}`} detalhe="veículos ativos" cor="bg-sicoob-verde" />
        <CardResumo icone={AlertTriangle} titulo="Aguardando KM final" valor={String(dados.pendentes.length)} detalhe="reservas a concluir" cor="bg-amber-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold text-sicoob-escuro">Horários de pico</h2>
          <p className="mb-4 text-xs text-slate-500">Quantidade de saídas por hora de início</p>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={dados.porHora} margin={{ left: -20, right: 8 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="hora" tick={{ fontSize: 11, fill: '#64748b' }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(v) => [v, 'Saídas']} />
                <Bar dataKey="saidas" radius={[4, 4, 0, 0]}>
                  {dados.porHora.map((p) => (
                    <Cell key={p.hora} fill={p.saidas > 0 && p.saidas === dados.pico ? '#00AE9D' : '#003641'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold text-sicoob-escuro">KM rodados por veículo</h2>
          <p className="mb-4 text-xs text-slate-500">Soma de (KM final − KM inicial) das reservas concluídas no mês</p>
          <div className="h-64">
            {dados.kmPorVeiculo.length === 0 ? (
              <Vazio texto={carregando ? 'Carregando…' : 'Nenhuma reserva concluída neste mês.'} />
            ) : (
              <ResponsiveContainer>
                <BarChart data={dados.kmPorVeiculo} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `${v} km`} />
                  <YAxis type="category" dataKey="placa" width={80} tick={{ fontSize: 12, fill: '#003641', fontWeight: 600 }} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(v) => [fmtKm(Number(v)), 'KM rodados']} />
                  <Bar dataKey="km" radius={[0, 4, 4, 0]}>
                    {dados.kmPorVeiculo.map((v) => <Cell key={v.placa} fill={v.cor} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-sicoob-escuro"><Clock className="h-4 w-4" /> Próximas saídas</h2>
          {dados.proximas.length === 0 ? (
            <Vazio texto="Nenhuma saída agendada." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {dados.proximas.map((r) => (
                <LinhaReserva key={r.id} r={r} onClick={() => detalhar(r)} placa={veiculoPorId.get(r.veiculo_id)?.placa} cor={veiculoPorId.get(r.veiculo_id)?.cor} motorista={motoristaPorId.get(r.motorista_id)?.nome} />
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-sicoob-escuro"><Flag className="h-4 w-4" /> Aguardando KM final</h2>
          {dados.pendentes.length === 0 ? (
            <Vazio texto="Tudo em dia. Nenhuma reserva pendente de conclusão." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {dados.pendentes.map((r) => (
                <LinhaReserva
                  key={r.id}
                  r={r}
                  onClick={() => concluir(r)}
                  acao="Informar KM"
                  placa={veiculoPorId.get(r.veiculo_id)?.placa}
                  cor={veiculoPorId.get(r.veiculo_id)?.cor}
                  motorista={motoristaPorId.get(r.motorista_id)?.nome}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function CardResumo({ icone: Icone, titulo, valor, detalhe, cor }: { icone: typeof Car; titulo: string; valor: string; detalhe: string; cor: string }) {
  return (
    <div className="card p-4 lg:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-500 sm:text-sm">{titulo}</p>
        <span className={`rounded-lg p-2 text-white ${cor}`}><Icone className="h-4 w-4" /></span>
      </div>
      <p className="mt-2 text-xl font-bold text-sicoob-escuro sm:text-2xl">{valor}</p>
      <p className="text-xs text-slate-500">{detalhe}</p>
    </div>
  );
}

function LinhaReserva({ r, onClick, placa, cor, motorista, acao }: { r: Reserva; onClick: () => void; placa?: string; cor?: string; motorista?: string; acao?: string }) {
  return (
    <li>
      <button onClick={onClick} className="flex w-full items-center gap-3 py-3 text-left hover:bg-slate-50">
        <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: cor }} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{placa} · {motorista}</p>
          <p className="truncate text-xs text-slate-500">{fmtPeriodo(r.inicio, r.fim)}{r.destino ? ` · ${r.destino}` : ''}</p>
        </div>
        {acao ? <span className="btn-destaque px-3 py-1.5 text-xs">{acao}</span> : <StatusBadge reserva={r} />}
      </button>
    </li>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="flex h-full min-h-20 items-center justify-center text-center text-sm text-slate-400">{texto}</p>;
}
