import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import { Link } from 'react-router-dom';
import { ArrowRight, Car, ChevronLeft, ChevronRight, Flag, Plus, Users } from 'lucide-react';
import { Odometro } from '../components/Odometro';
import { Placa } from '../components/Placa';
import { useReservaAcoes } from '../components/ReservaAcoes';
import { aguardandoKm, emUso, StatusBadge } from '../components/StatusBadge';
import { chaveMes, useAgora } from '../lib/agora';
import { useData } from '../lib/DataContext';
import { fmtHora, fmtKm, fmtPeriodo, isoDiaLocal } from '../lib/format';
import type { Reserva, Veiculo } from '../lib/types';

const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const diaCurto = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const inicioDoMes = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

function rotuloDia(iso: string, agora: Date) {
  const d = new Date(iso);
  const hoje = isoDiaLocal(agora);
  const amanha = isoDiaLocal(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1));
  const dia = isoDiaLocal(d);
  return dia === hoje ? 'Hoje' : dia === amanha ? 'Amanhã' : maiuscula(diaCurto.format(d));
}

function duracao(ms: number) {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h}h${String(min % 60).padStart(2, '0')}`;
  return `${Math.floor(h / 24)} dias`;
}

type EstadoVeiculo =
  | { tipo: 'uso'; reserva: Reserva; progresso: number; resta: number }
  | { tipo: 'pendente'; reserva: Reserva }
  | { tipo: 'livre'; proxima?: Reserva };

export default function Dashboard() {
  const { reservas, veiculos, motoristas, veiculoPorId, motoristaPorId, carregando, somenteLeitura } = useData();
  const { concluir, detalhar, novaReserva } = useReservaAcoes();
  const agora = useAgora();

  // O mês acompanha o calendário sozinho, a menos que a pessoa tenha navegado para outro.
  const [mes, setMes] = useState(() => inicioDoMes(new Date()));
  const [seguindoAtual, setSeguindoAtual] = useState(true);
  const mesAtual = chaveMes(agora);
  useEffect(() => {
    if (seguindoAtual) setMes(inicioDoMes(new Date()));
  }, [mesAtual, seguindoAtual]);
  const mudarMes = (delta: number) => {
    const novo = new Date(mes.getFullYear(), mes.getMonth() + delta, 1);
    setMes(novo);
    setSeguindoAtual(chaveMes(novo) === mesAtual);
  };

  const ativos = useMemo(() => veiculos.filter((v) => v.ativo), [veiculos]);

  const frota = useMemo(() => {
    return ativos.map((v): { veiculo: Veiculo; estado: EstadoVeiculo } => {
      const doVeiculo = reservas.filter((r) => r.veiculo_id === v.id && r.status === 'agendada');
      const atual = doVeiculo.find((r) => emUso(r, agora));
      if (atual) {
        const ini = new Date(atual.inicio).getTime();
        const fim = new Date(atual.fim).getTime();
        return {
          veiculo: v,
          estado: { tipo: 'uso', reserva: atual, progresso: (agora.getTime() - ini) / (fim - ini), resta: fim - agora.getTime() },
        };
      }
      const pendente = doVeiculo.find((r) => aguardandoKm(r, agora));
      if (pendente) return { veiculo: v, estado: { tipo: 'pendente', reserva: pendente } };
      const proxima = doVeiculo.filter((r) => new Date(r.inicio) > agora).sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
      return { veiculo: v, estado: { tipo: 'livre', proxima } };
    });
  }, [ativos, reservas, agora]);

  const dados = useMemo(() => {
    const fim = new Date(mes.getFullYear(), mes.getMonth() + 1, 1);
    const doMes = reservas.filter((r) => r.status !== 'cancelada' && new Date(r.inicio) >= mes && new Date(r.inicio) < fim);
    const concluidas = doMes.filter((r) => r.status === 'concluida');
    const kmTotal = concluidas.reduce((s, r) => s + Number(r.km_rodados ?? 0), 0);

    const porHora = Array.from({ length: 24 }, (_, h) => ({ hora: `${String(h).padStart(2, '0')}h`, saidas: 0 }));
    doMes.forEach((r) => porHora[new Date(r.inicio).getHours()].saidas++);
    const comSaida = porHora.map((p, i) => ({ ...p, i })).filter((p) => p.saidas > 0);
    const primeira = comSaida.length ? Math.min(6, comSaida[0].i) : 6;
    const ultima = comSaida.length ? Math.max(20, comSaida[comSaida.length - 1].i) : 20;
    const pico = Math.max(0, ...porHora.map((p) => p.saidas));
    const horaPico = pico ? porHora.findIndex((p) => p.saidas === pico) : -1;

    const kmPorVeiculo = veiculos
      .map((v) => ({
        placa: v.placa,
        cor: v.cor,
        km: concluidas.filter((r) => r.veiculo_id === v.id).reduce((s, r) => s + Number(r.km_rodados ?? 0), 0),
      }))
      .filter((v) => v.km > 0)
      .sort((a, b) => b.km - a.km);

    return {
      saidas: doMes.length,
      kmTotal,
      concluidas: concluidas.length,
      porHora: porHora.slice(primeira, ultima + 1),
      pico,
      horaPico,
      kmPorVeiculo,
    };
  }, [reservas, veiculos, mes]);

  const proximas = useMemo(
    () =>
      reservas
        .filter((r) => r.status === 'agendada' && new Date(r.inicio) > agora)
        .sort((a, b) => a.inicio.localeCompare(b.inicio))
        .slice(0, 8),
    [reservas, agora],
  );
  const pendentes = useMemo(
    () => reservas.filter((r) => aguardandoKm(r, agora)).sort((a, b) => a.fim.localeCompare(b.fim)),
    [reservas, agora],
  );

  const livres = frota.filter((f) => f.estado.tipo === 'livre').length;

  // Agrupa as próximas saídas por dia (Hoje, Amanhã, ...).
  const grupos = proximas.reduce<{ dia: string; itens: Reserva[] }[]>((acc, r) => {
    const dia = rotuloDia(r.inicio, agora);
    const g = acc.find((x) => x.dia === dia);
    if (g) g.itens.push(r);
    else acc.push({ dia, itens: [r] });
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Visão geral</p>
          <h1 className="titulo-pagina">Painel da frota</h1>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!seguindoAtual && (
            <button
              className="chip-inativo"
              onClick={() => {
                setSeguindoAtual(true);
                setMes(inicioDoMes(new Date()));
              }}
            >
              Mês atual
            </button>
          )}
          <div className="flex items-center gap-1 rounded-xl border border-nevoa-200 bg-white p-1 shadow-cartao">
            <button className="rounded-lg p-1.5 text-nevoa-600 transition hover:bg-nevoa-100" onClick={() => mudarMes(-1)} aria-label="Mês anterior">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-36 text-center font-display text-sm font-semibold text-sicoob-escuro">
              {maiuscula(nomeMes.format(mes))}
            </span>
            <button className="rounded-lg p-1.5 text-nevoa-600 transition hover:bg-nevoa-100" onClick={() => mudarMes(1)} aria-label="Próximo mês">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {!carregando && !somenteLeitura && (veiculos.length === 0 || motoristas.length === 0) && (
        <section className="relative overflow-hidden rounded-2xl bg-sicoob-escuro p-6 text-white shadow-elevado">
          <svg className="absolute -right-6 -top-4 h-40 w-40 opacity-20" viewBox="0 0 100 100" aria-hidden="true">
            <path d="M0 0 L50 86 L100 0 Z" fill="#00AE9D" />
            <path d="M25 0 L50 43 L75 0 Z" fill="#C9D200" />
          </svg>
          <p className="eyebrow text-sicoob-lima">Primeiros passos</p>
          <h2 className="mt-1 text-xl font-semibold">Monte a sua frota</h2>
          <p className="mt-1 max-w-xl text-sm text-white/75">
            Cadastre os veículos e os motoristas. Depois disso, use <strong className="text-white">Nova reserva</strong> para agendar as saídas.
          </p>
          <div className="relative mt-4 flex flex-wrap gap-2">
            {veiculos.length === 0 && (
              <Link to="/veiculos" className="btn bg-sicoob-turquesa text-white hover:bg-[#00c2af]">
                <Car className="h-4 w-4" /> Cadastrar veículos
              </Link>
            )}
            {motoristas.length === 0 && (
              <Link to="/motoristas" className="btn border border-white/25 text-white hover:bg-white/10">
                <Users className="h-4 w-4" /> Cadastrar motoristas
              </Link>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        {/* Frota agora */}
        <section className="card min-w-0 p-5 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Ao vivo</p>
              <h2 className="text-lg font-semibold text-sicoob-escuro">Frota agora</h2>
            </div>
            {ativos.length > 0 && (
              <div className="text-right">
                <p className="num font-display text-sm font-semibold text-sicoob-escuro">
                  {livres} de {ativos.length} livres
                </p>
                <div className="mt-1 flex h-1.5 w-32 gap-0.5 overflow-hidden rounded-full sm:w-40">
                  {frota.map(({ veiculo, estado }) => (
                    <span
                      key={veiculo.id}
                      className={`flex-1 transition-colors duration-500 ${
                        estado.tipo === 'livre' ? 'bg-sicoob-verde' : estado.tipo === 'uso' ? 'bg-sicoob-turquesa' : 'bg-amber-400'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {ativos.length === 0 ? (
            <p className="py-10 text-center text-sm text-nevoa-400">{carregando ? 'Carregando…' : 'Nenhum veículo ativo cadastrado.'}</p>
          ) : (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {frota.map(({ veiculo, estado }) => (
                <li key={veiculo.id} className="min-w-0">
                  <button
                    onClick={() =>
                      estado.tipo === 'livre'
                        ? novaReserva({ veiculoId: veiculo.id })
                        : estado.tipo === 'pendente' && !somenteLeitura
                          ? concluir(estado.reserva)
                          : detalhar(estado.reserva)
                    }
                    className="group w-full rounded-xl border border-nevoa-200/80 bg-nevoa-50/60 p-3 text-left transition hover:border-sicoob-turquesa/50 hover:bg-white hover:shadow-cartao"
                  >
                    <div className="flex items-center gap-3">
                      <Placa placa={veiculo.placa} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-nevoa-900">{veiculo.modelo}</p>
                        <p className="truncate text-xs text-nevoa-500">
                          {estado.tipo === 'livre'
                            ? estado.proxima
                              ? `Próxima saída: ${rotuloDia(estado.proxima.inicio, agora).toLowerCase()} às ${fmtHora(estado.proxima.inicio)}`
                              : 'Sem saídas agendadas'
                            : motoristaPorId.get(estado.reserva.motorista_id)?.nome}
                        </p>
                      </div>
                      {estado.tipo === 'livre' ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-[#4d7a0c]">
                          <span className="h-1.5 w-1.5 rounded-full bg-sicoob-verde" /> Livre
                          {!somenteLeitura && <Plus className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />}
                        </span>
                      ) : (
                        <StatusBadge reserva={estado.reserva} />
                      )}
                    </div>
                    {estado.tipo === 'uso' && (
                      <div className="mt-3">
                        <div className="relative h-2 overflow-hidden rounded-full bg-nevoa-200/70">
                          <div
                            className="faixa-estrada absolute inset-y-0 left-0 rounded-full bg-sicoob-turquesa"
                            style={{ width: `${Math.min(100, Math.max(4, estado.progresso * 100))}%` }}
                          />
                        </div>
                        <p className="num mt-1 flex justify-between font-mono text-[11px] text-nevoa-500">
                          <span>{fmtHora(estado.reserva.inicio)}</span>
                          <span>volta em {duracao(estado.resta)}</span>
                          <span>{fmtHora(estado.reserva.fim)}</span>
                        </p>
                      </div>
                    )}
                    {estado.tipo === 'pendente' && !somenteLeitura && (
                      <p className="mt-2 text-xs font-semibold text-amber-700">Toque para informar o KM final</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Números do mês */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <section className="card p-5 sm:col-span-2 lg:col-span-1">
            <p className="eyebrow">KM rodados no mês</p>
            <div className="mt-3">
              <Odometro km={dados.kmTotal} />
            </div>
            <p className="mt-2 text-xs text-nevoa-500">Soma de KM final − KM inicial das reservas concluídas</p>
          </section>
          <section className="card p-5">
            <p className="eyebrow">Saídas no mês</p>
            <p className="num mt-2 font-display text-4xl font-bold text-sicoob-escuro">{dados.saidas}</p>
            <p className="text-xs text-nevoa-500">
              {dados.concluidas} concluída{dados.concluidas === 1 ? '' : 's'}
            </p>
          </section>
          <section className={`card p-5 ${pendentes.length ? 'border-amber-300 bg-amber-50/60' : ''}`}>
            <p className="eyebrow">Aguardando KM final</p>
            <p className={`num mt-2 font-display text-4xl font-bold ${pendentes.length ? 'text-amber-600' : 'text-sicoob-escuro'}`}>{pendentes.length}</p>
            <p className="text-xs text-nevoa-500">{pendentes.length ? 'reservas para concluir' : 'tudo em dia'}</p>
          </section>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <section className="card p-5">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="eyebrow">Saídas por hora de início</p>
              <h2 className="text-lg font-semibold text-sicoob-escuro">Horários de pico</h2>
            </div>
            {dados.horaPico >= 0 && (
              <p className="rounded-lg bg-sicoob-turquesa-claro px-2.5 py-1 font-mono text-xs font-semibold text-[#00766b]">
                pico às {String(dados.horaPico).padStart(2, '0')}h
              </p>
            )}
          </div>
          <div className="mt-4 h-60">
            <ResponsiveContainer>
              <BarChart data={dados.porHora} margin={{ left: -24, right: 4, top: 4 }}>
                <CartesianGrid vertical={false} stroke="#e9efef" />
                <XAxis dataKey="hora" tick={{ fontSize: 11, fill: '#61777b', fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={{ stroke: '#d7e0e1' }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#61777b' }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f4f7f7', radius: 6 }} content={<DicaGrafico unidade="saídas" />} />
                <Bar dataKey="saidas" radius={[6, 6, 2, 2]} maxBarSize={28} isAnimationActive={false}>
                  {dados.porHora.map((p) => (
                    <Cell key={p.hora} fill={p.saidas > 0 && p.saidas === dados.pico ? '#00AE9D' : '#003641'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-5">
          <p className="eyebrow">Reservas concluídas no mês</p>
          <h2 className="text-lg font-semibold text-sicoob-escuro">KM rodados por veículo</h2>
          <div className="mt-4 h-60">
            {dados.kmPorVeiculo.length === 0 ? (
              <Vazio texto={carregando ? 'Carregando…' : 'Nenhuma reserva concluída neste mês.'} />
            ) : (
              <ResponsiveContainer>
                <BarChart data={dados.kmPorVeiculo} layout="vertical" margin={{ left: 4, right: 28 }}>
                  <CartesianGrid horizontal={false} stroke="#e9efef" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#61777b' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} km`} />
                  <YAxis
                    type="category"
                    dataKey="placa"
                    width={78}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: '#003641', fontWeight: 600, fontFamily: 'IBM Plex Mono' }}
                  />
                  <Tooltip cursor={{ fill: '#f4f7f7', radius: 6 }} content={<DicaGrafico unidade="km" />} />
                  <Bar dataKey="km" radius={[2, 6, 6, 2]} maxBarSize={34} isAnimationActive={false}>
                    {dados.kmPorVeiculo.map((v) => (
                      <Cell key={v.placa} fill={v.cor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <section className="card p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="eyebrow">Agenda</p>
              <h2 className="text-lg font-semibold text-sicoob-escuro">Próximas saídas</h2>
            </div>
            <Link to="/calendario" className="flex items-center gap-1 text-xs font-semibold text-sicoob-turquesa hover:underline">
              Ver calendário <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {grupos.length === 0 ? (
            <Vazio texto="Nenhuma saída agendada." />
          ) : (
            <div className="mt-3 space-y-4">
              {grupos.map((g) => (
                <div key={g.dia}>
                  <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-nevoa-400">{g.dia}</p>
                  <ul className="space-y-1">
                    {g.itens.map((r) => (
                      <LinhaReserva key={r.id} r={r} onClick={() => detalhar(r)} veiculo={veiculoPorId.get(r.veiculo_id)} motorista={motoristaPorId.get(r.motorista_id)?.nome} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-5">
          <p className="eyebrow">Pendências</p>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-sicoob-escuro">
            <Flag className="h-4 w-4" /> Aguardando KM final
          </h2>
          {pendentes.length === 0 ? (
            <Vazio texto="Tudo em dia. Nenhuma reserva pendente de conclusão." />
          ) : (
            <ul className="mt-3 space-y-1">
              {pendentes.map((r) => (
                <LinhaReserva
                  key={r.id}
                  r={r}
                  onClick={() => (somenteLeitura ? detalhar(r) : concluir(r))}
                  acao={somenteLeitura ? undefined : 'Informar KM'}
                  veiculo={veiculoPorId.get(r.veiculo_id)}
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

function DicaGrafico({ active, payload, label, unidade }: TooltipProps<number, string> & { unidade: string }) {
  if (!active || !payload?.length) return null;
  const v = Number(payload[0].value ?? 0);
  return (
    <div className="rounded-xl bg-sicoob-noite px-3 py-2 text-white shadow-elevado">
      <p className="font-mono text-[11px] text-white/60">{label}</p>
      <p className="num font-display text-sm font-semibold">{unidade === 'km' ? fmtKm(v) : `${v} ${v === 1 ? 'saída' : unidade}`}</p>
    </div>
  );
}

function LinhaReserva({ r, onClick, veiculo, motorista, acao }: { r: Reserva; onClick: () => void; veiculo?: Veiculo; motorista?: string; acao?: string }) {
  return (
    <li>
      <button onClick={onClick} className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-nevoa-50">
        <Placa placa={veiculo?.placa} tamanho="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-nevoa-900">{motorista}</p>
          <p className="truncate text-xs text-nevoa-500">
            {fmtPeriodo(r.inicio, r.fim)}
            {r.destino ? ` · ${r.destino}` : ''}
          </p>
        </div>
        {acao ? (
          <span className="btn-destaque px-3 py-1.5 text-xs">{acao}</span>
        ) : (
          <ChevronRight className="h-4 w-4 text-nevoa-300 transition group-hover:translate-x-0.5 group-hover:text-sicoob-turquesa" />
        )}
      </button>
    </li>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="flex h-full min-h-24 items-center justify-center text-center text-sm text-nevoa-400">{texto}</p>;
}
