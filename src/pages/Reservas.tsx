import { useMemo, useState } from 'react';
import { Ban, Flag, Pencil, Plus } from 'lucide-react';
import { useReservaAcoes } from '../components/ReservaAcoes';
import { aguardandoKm, StatusBadge } from '../components/StatusBadge';
import { useData } from '../lib/DataContext';
import { fmtKm, fmtPeriodo } from '../lib/format';
import type { Reserva } from '../lib/types';

const filtros = {
  todas: 'Todas',
  futuras: 'Agendadas',
  pendentes: 'Aguardando KM final',
  concluida: 'Concluídas',
  cancelada: 'Canceladas',
} as const;
type Filtro = keyof typeof filtros;

export default function Reservas() {
  const { reservas, veiculos, veiculoPorId, motoristaPorId } = useData();
  const { novaReserva, detalhar, concluir, editar, cancelar } = useReservaAcoes();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [veiculoId, setVeiculoId] = useState('');
  const [busca, setBusca] = useState('');

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return reservas
      .filter((r) => {
        if (veiculoId && r.veiculo_id !== veiculoId) return false;
        if (filtro === 'futuras' && !(r.status === 'agendada' && !aguardandoKm(r))) return false;
        if (filtro === 'pendentes' && !aguardandoKm(r)) return false;
        if ((filtro === 'concluida' || filtro === 'cancelada') && r.status !== filtro) return false;
        if (!termo) return true;
        const texto = [veiculoPorId.get(r.veiculo_id)?.placa, motoristaPorId.get(r.motorista_id)?.nome, r.destino, r.finalidade]
          .join(' ')
          .toLowerCase();
        return texto.includes(termo);
      })
      .sort((a, b) => b.inicio.localeCompare(a.inicio));
  }, [reservas, filtro, veiculoId, busca, veiculoPorId, motoristaPorId]);

  const acoes = (r: Reserva) =>
    r.status === 'agendada' && (
      <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
        <button className="btn-destaque px-2.5 py-1.5 text-xs" onClick={() => concluir(r)}><Flag className="h-3.5 w-3.5" /> Concluir</button>
        <button className="btn-secundario px-2.5 py-1.5 text-xs" onClick={() => editar(r)} aria-label="Editar"><Pencil className="h-3.5 w-3.5" /></button>
        <button className="btn-secundario px-2.5 py-1.5 text-xs text-red-600" onClick={() => cancelar(r)} aria-label="Cancelar"><Ban className="h-3.5 w-3.5" /></button>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="titulo-pagina">Saídas e reservas</h1>
          <p className="text-sm text-slate-500">Registro de saída, conclusão com KM final e histórico completo</p>
        </div>
        <button className="btn-primario self-start" onClick={() => novaReserva()}><Plus className="h-4 w-4" /> Registrar saída</button>
      </div>

      <div className="card space-y-3 p-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(Object.keys(filtros) as Filtro[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${filtro === f ? 'bg-sicoob-escuro text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {filtros[f]}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="campo" placeholder="Buscar por placa, motorista ou destino…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select className="campo" value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)}>
            <option value="">Todos os veículos</option>
            {veiculos.map((v) => <option key={v.id} value={v.id}>{v.placa} — {v.modelo}</option>)}
          </select>
        </div>
      </div>

      {lista.length === 0 ? (
        <p className="card p-10 text-center text-sm text-slate-400">Nenhuma reserva encontrada.</p>
      ) : (
        <>
          {/* Celular: cartões */}
          <ul className="space-y-3 md:hidden">
            {lista.map((r) => (
              <li key={r.id} className="card cursor-pointer p-4" onClick={() => detalhar(r)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: veiculoPorId.get(r.veiculo_id)?.cor }} />
                    <span className="font-bold text-sicoob-escuro">{veiculoPorId.get(r.veiculo_id)?.placa}</span>
                  </div>
                  <StatusBadge reserva={r} />
                </div>
                <p className="mt-1 text-sm text-slate-700">{motoristaPorId.get(r.motorista_id)?.nome}</p>
                <p className="text-xs text-slate-500">{fmtPeriodo(r.inicio, r.fim)}{r.destino ? ` · ${r.destino}` : ''}</p>
                <p className="mt-1 text-xs text-slate-500">
                  KM {fmtKm(r.km_inicial)} → {r.km_final === null ? '—' : fmtKm(r.km_final)}
                  {r.km_rodados !== null && <strong className="text-sicoob-escuro"> · {fmtKm(r.km_rodados)} rodados</strong>}
                </p>
                {r.status === 'agendada' && <div className="mt-3">{acoes(r)}</div>}
              </li>
            ))}
          </ul>

          {/* Desktop: tabela */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Veículo</th>
                  <th className="px-4 py-3">Motorista</th>
                  <th className="px-4 py-3">Período</th>
                  <th className="px-4 py-3 text-right">KM inicial</th>
                  <th className="px-4 py-3 text-right">KM final</th>
                  <th className="px-4 py-3 text-right">KM rodados</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((r) => (
                  <tr key={r.id} className="cursor-pointer hover:bg-slate-50" onClick={() => detalhar(r)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: veiculoPorId.get(r.veiculo_id)?.cor }} />
                        <span className="font-semibold text-sicoob-escuro">{veiculoPorId.get(r.veiculo_id)?.placa}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{motoristaPorId.get(r.motorista_id)?.nome}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{fmtPeriodo(r.inicio, r.fim)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtKm(r.km_inicial)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.km_final === null ? '—' : fmtKm(r.km_final)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-sicoob-escuro">{r.km_rodados === null ? '—' : fmtKm(r.km_rodados)}</td>
                    <td className="px-4 py-3"><StatusBadge reserva={r} /></td>
                    <td className="px-4 py-3">{acoes(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
