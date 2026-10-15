import { useState, type FormEvent } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { mensagemErro } from '../lib/backend';
import { useData } from '../lib/DataContext';
import { fmtKm, fmtPeriodo } from '../lib/format';
import { useToast } from '../lib/toast';
import type { Reserva } from '../lib/types';
import { Placa } from './Placa';

interface Props {
  reserva: Reserva;
  onConcluido: () => void;
  onCancelar: () => void;
}

const lerKm = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(',', '.')));

export function ConcluirForm({ reserva, onConcluido, onCancelar }: Props) {
  const { backend, veiculoPorId, motoristaPorId } = useData();
  const toast = useToast();
  const veiculo = veiculoPorId.get(reserva.veiculo_id);

  // O KM inicial parte do hodômetro registrado do veículo (atualizado a cada conclusão).
  const base = reserva.km_inicial ?? veiculo?.km_atual ?? null;
  const [kmInicial, setKmInicial] = useState(base === null ? '' : String(base));
  const [kmFinal, setKmFinal] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const ini = lerKm(kmInicial);
  const fim = lerKm(kmFinal);
  const iniValido = Number.isFinite(ini) && ini >= 0;
  const valido = iniValido && Number.isFinite(fim) && fim >= ini;
  const rodados = valido ? Math.round((fim - ini) * 10) / 10 : null;
  const abaixoDaBase = iniValido && veiculo && ini < veiculo.km_atual;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setSalvando(true);
    setErro(null);
    try {
      await backend.concluirReserva(reserva.id, ini, fim);
      toast('sucesso', `Reserva concluída: ${fmtKm(rodados)} rodados.`);
      onConcluido();
    } catch (err) {
      setErro(`Não foi possível concluir: ${mensagemErro(err)}`);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl bg-nevoa-50 p-3 text-sm">
        <Placa placa={veiculo?.placa} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-sicoob-escuro">
            {veiculo?.modelo} · {motoristaPorId.get(reserva.motorista_id)?.nome}
          </p>
          <p className="truncate text-nevoa-600">{fmtPeriodo(reserva.inicio, reserva.fim)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="rotulo" htmlFor="kmInicial">KM inicial *</label>
          <input
            id="kmInicial"
            required
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0}
            className="campo font-mono"
            value={kmInicial}
            onChange={(e) => setKmInicial(e.target.value)}
          />
          {veiculo && <p className="mt-1 text-xs text-nevoa-500">Último registro do veículo: {fmtKm(veiculo.km_atual)}</p>}
        </div>
        <div>
          <label className="rotulo" htmlFor="kmFinal">KM final *</label>
          <input
            id="kmFinal"
            autoFocus
            required
            type="number"
            inputMode="decimal"
            step="0.1"
            min={iniValido ? ini : 0}
            className="campo font-mono"
            value={kmFinal}
            onChange={(e) => setKmFinal(e.target.value)}
          />
        </div>
      </div>

      {kmFinal !== '' && iniValido && !valido && (
        <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          O KM final não pode ser menor que o KM inicial ({fmtKm(ini)}).
        </p>
      )}
      {abaixoDaBase && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          O KM inicial está abaixo do último registro do veículo ({fmtKm(veiculo.km_atual)}). Confira o hodômetro.
        </p>
      )}

      <div className="relative overflow-hidden rounded-2xl bg-sicoob-noite p-5 text-center text-white">
        <p className="text-xs uppercase tracking-wider text-sicoob-lima">KM rodados (final − inicial)</p>
        <p className="num mt-1 font-mono text-4xl font-semibold">
          {fmtKm(rodados)}
        </p>
      </div>

      {erro && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secundario" onClick={onCancelar}>Voltar</button>
        <button type="submit" className="btn-destaque" disabled={!valido || salvando}>
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
          Concluir reserva
        </button>
      </div>
    </form>
  );
}
