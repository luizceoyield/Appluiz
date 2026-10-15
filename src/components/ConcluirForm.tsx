import { useState, type FormEvent } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { concluirReserva, mensagemErro } from '../lib/api';
import { useData } from '../lib/DataContext';
import { fmtKm, fmtPeriodo } from '../lib/format';
import { useToast } from '../lib/toast';
import type { Reserva } from '../lib/types';

interface Props {
  reserva: Reserva;
  onConcluido: () => void;
  onCancelar: () => void;
}

export function ConcluirForm({ reserva, onConcluido, onCancelar }: Props) {
  const { veiculoPorId, motoristaPorId } = useData();
  const toast = useToast();
  const [kmFinal, setKmFinal] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const km = Number(kmFinal.replace(',', '.'));
  const valido = kmFinal !== '' && Number.isFinite(km) && km >= reserva.km_inicial;
  const rodados = valido ? km - reserva.km_inicial : null;
  const veiculo = veiculoPorId.get(reserva.veiculo_id);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setSalvando(true);
    setErro(null);
    try {
      await concluirReserva(reserva.id, km);
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
      <div className="rounded-lg bg-slate-50 p-3 text-sm">
        <p className="font-semibold text-sicoob-escuro">{veiculo?.placa} — {veiculo?.modelo}</p>
        <p className="text-slate-600">{motoristaPorId.get(reserva.motorista_id)?.nome} · {fmtPeriodo(reserva.inicio, reserva.fim)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="rotulo">KM inicial</label>
          <input className="campo" disabled value={fmtKm(reserva.km_inicial)} />
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
            min={reserva.km_inicial}
            className="campo"
            value={kmFinal}
            onChange={(e) => setKmFinal(e.target.value)}
          />
        </div>
      </div>

      {kmFinal !== '' && !valido && (
        <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          O KM final não pode ser menor que o KM inicial ({fmtKm(reserva.km_inicial)}).
        </p>
      )}

      <div className="rounded-xl bg-sicoob-escuro p-4 text-center text-white">
        <p className="text-xs uppercase tracking-wider text-sicoob-lima">KM rodados (final − inicial)</p>
        <p className="text-3xl font-bold">{rodados === null ? '—' : fmtKm(rodados)}</p>
      </div>

      {erro && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

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
