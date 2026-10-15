import { useMemo, useState } from 'react';
import { Ban, Flag, Pencil, Plus } from 'lucide-react';
import { useReservaAcoes } from '../components/ReservaAcoes';
import { Placa } from '../components/Placa';
import { aguardandoKm, StatusBadge } from '../components/StatusBadge';
import { useAgora } from '../lib/agora';
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
  const { reservas, veiculos, veiculoPorId, motoristaPorId, somenteLeitura } = useData();
  const { novaReserva, detalhar, concluir, editar, cancelar } = useReservaAcoes();
  const agora = useAgora();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [veiculoId, setVeiculoId] = useState('');
  const [busca, setBusca] = useState('');

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return reservas
      .filter((r) => {
        if (veiculoId && r.veiculo_id !== veiculoId) return false;
        if (filtro === 'futuras' && !(r.status === 'agendada' && !aguardandoKm(r, agora))) return false;
        if (filtro === 'pendentes' && !aguardandoKm(r, agora)) return false;
        if ((filtro === 'concluida' || filtro === 'cancelada') && r.status !== filtro) return false;
        if (!termo) return true;
        const texto = [veiculoPorId.get(r.veiculo_id)?.placa, motoristaPorId.get(r.motorista_id)?.nome, r.destino, r.finalidade]
          .join(' ')
          .toLowerCase();
        return texto.includes(termo);
      })
      .sort((a, b) => b.inicio.localeCompare(a.inicio));
  }, [reservas, filtro, veiculoId, busca, veiculoPorId, motoristaPorId, agora]);

  const acoes = (r: Reserva) =>
    r.status === 'agendada' && !somenteLeitura && (
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
          <p className="eyebrow">Registro de uso</p>
          <h1 className="titulo-pagina">Saídas e reservas</h1>
          <p className="text-sm text-nevoa-500">Registro de saída, conclusão com KM final e histórico completo</p>
        </div>
        {!somenteLeitura && <button className="btn-primario self-start" onClick={() => novaReserva()}><Plus className="h-4 w-4" /> Registrar saída</button>}
      </div>

      <div className="card space-y-3 p-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(Object.keys(filtros) as Filtro[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`whitespace-nowrap ${filtro === f ? 'chip-ativo' : 'chip-inativo'}`}
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
        <p className="card p-10 text-center text-sm text-nevoa-400">Nenhuma reserva encontrada.</p>
      ) : (
        <>
          {/* Celular: cartões */}
          <ul className="space-y-3 md:hidden">
            {lista.map((r, i) => (
              <li key={r.id} className="card-interativo animate-subir cursor-pointer p-4" style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }} onClick={() => detalhar(r)}>
                <div className="flex items-start justify-between gap-2">
                  <Placa placa={veiculoPorId.get(r.veiculo_id)?.placa} />
                  <StatusBadge reserva={r} />
                </div>
                <p className="mt-1 text-sm text-nevoa-700">{motoristaPorId.get(r.motorista_id)?.nome}</p>
                <p className="text-xs text-nevoa-500">{fmtPeriodo(r.inicio, r.fim)}{r.destino ? ` · ${r.destino}` : ''}</p>
                <p className="mt-1 text-xs text-nevoa-500">
                  KM {fmtKm(r.km_inicial)} → {r.km_final === null ? '—' : fmtKm(r.km_final)}
                  {r.km_rodados !== null && <strong className="text-sicoob-escuro"> · {fmtKm(r.km_rodados)} rodados</strong>}
                </p>
                {r.status === 'agendada' && !somenteLeitura && <div className="mt-3">{acoes(r)}</div>}
              </li>
            ))}
          </ul>

          {/* Desktop: tabela */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-nevoa-50 text-left text-[11px] uppercase tracking-[0.1em] text-nevoa-500">
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
              <tbody className="divide-y divide-nevoa-100">
                {lista.map((r) => (
                  <tr key={r.id} className="cursor-pointer transition hover:bg-sicoob-turquesa-claro/40" onClick={() => detalhar(r)}>
                    <td className="px-4 py-3">
                      <Placa placa={veiculoPorId.get(r.veiculo_id)?.placa} tamanho="sm" />
                    </td>
                    <td className="px-4 py-3">{motoristaPorId.get(r.motorista_id)?.nome}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-nevoa-600">{fmtPeriodo(r.inicio, r.fim)}</td>
                    <td className="num px-4 py-3 text-right font-mono text-[13px]">{fmtKm(r.km_inicial)}</td>
                    <td className="num px-4 py-3 text-right font-mono text-[13px]">{r.km_final === null ? '—' : fmtKm(r.km_final)}</td>
                    <td className="num px-4 py-3 text-right font-mono text-[13px] font-semibold text-sicoob-escuro">{r.km_rodados === null ? '—' : fmtKm(r.km_rodados)}</td>
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
