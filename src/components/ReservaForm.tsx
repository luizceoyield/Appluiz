import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { ConflitoReservaError, mensagemErro, sobrepoe } from '../lib/backend';
import { useData } from '../lib/DataContext';
import { fmtKm, isoDiaLocal, isoHoraLocal, juntarDataHora } from '../lib/format';
import { useToast } from '../lib/toast';
import type { Reserva } from '../lib/types';
import { ConflitoAlerta } from './ConflitoAlerta';

export interface PrefillReserva {
  data?: Date;
  veiculoId?: string;
}

interface Props {
  reserva?: Reserva; // edição
  prefill?: PrefillReserva;
  onSalvo: () => void;
  onCancelar: () => void;
}

export function ReservaForm({ reserva, prefill, onSalvo, onCancelar }: Props) {
  const { backend, veiculos, motoristas, reservas, veiculoPorId } = useData();
  const toast = useToast();

  const base = reserva ? new Date(reserva.inicio) : prefill?.data ?? new Date();
  const baseFim = reserva ? new Date(reserva.fim) : null;
  const temHora = reserva || (prefill?.data && (prefill.data.getHours() || prefill.data.getMinutes()));

  const [veiculoId, setVeiculoId] = useState(reserva?.veiculo_id ?? prefill?.veiculoId ?? '');
  const [motoristaId, setMotoristaId] = useState(reserva?.motorista_id ?? '');
  const [dataIni, setDataIni] = useState(isoDiaLocal(base));
  const [horaIni, setHoraIni] = useState(temHora ? isoHoraLocal(base) : '08:00');
  const [dataFim, setDataFim] = useState(isoDiaLocal(baseFim ?? base));
  const [horaFim, setHoraFim] = useState(
    baseFim ? isoHoraLocal(baseFim) : temHora ? isoHoraLocal(new Date(base.getTime() + 3600_000)) : '12:00',
  );
  const [kmInicial, setKmInicial] = useState(reserva ? String(reserva.km_inicial) : '');
  const [destino, setDestino] = useState(reserva?.destino ?? '');
  const [finalidade, setFinalidade] = useState(reserva?.finalidade ?? '');
  const [salvando, setSalvando] = useState(false);
  const [conflitosServidor, setConflitosServidor] = useState<Reserva[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Ao escolher o veículo, sugere o hodômetro atual como KM inicial.
  useEffect(() => {
    if (reserva) return;
    const v = veiculoPorId.get(veiculoId);
    if (v) setKmInicial(String(v.km_atual));
  }, [veiculoId, veiculoPorId, reserva]);

  // Mantém a data de retorno coerente quando a data de saída muda.
  useEffect(() => {
    setDataFim((f) => (f < dataIni ? dataIni : f));
  }, [dataIni]);

  const inicio = dataIni && horaIni ? juntarDataHora(dataIni, horaIni) : null;
  const fim = dataFim && horaFim ? juntarDataHora(dataFim, horaFim) : null;
  const intervaloInvalido = inicio && fim ? fim <= inicio : false;

  // Verificação instantânea com os dados em tempo real.
  const conflitosLocais = useMemo(() => {
    if (!veiculoId || !inicio || !fim || intervaloInvalido) return [];
    return reservas.filter(
      (r) =>
        r.veiculo_id === veiculoId &&
        r.status !== 'cancelada' &&
        r.id !== reserva?.id &&
        sobrepoe(inicio, fim, new Date(r.inicio), new Date(r.fim)),
    );
  }, [veiculoId, dataIni, horaIni, dataFim, horaFim, reservas, reserva?.id, intervaloInvalido]);

  useEffect(() => setConflitosServidor(null), [veiculoId, dataIni, horaIni, dataFim, horaFim]);

  const conflitos = conflitosServidor ?? conflitosLocais;
  const ocupado = conflitos.length > 0;
  const disponivel = Boolean(veiculoId && inicio && fim && !intervaloInvalido && !ocupado);

  const veiculosAtivos = veiculos.filter((v) => v.ativo || v.id === reserva?.veiculo_id);
  const motoristasAtivos = motoristas.filter((m) => m.ativo || m.id === reserva?.motorista_id);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!inicio || !fim || intervaloInvalido || ocupado) return;
    const km = Number(kmInicial.replace(',', '.'));
    if (!Number.isFinite(km) || km < 0) {
      setErro('Informe uma quilometragem inicial válida.');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await backend.salvarReserva(
        {
          veiculo_id: veiculoId,
          motorista_id: motoristaId,
          inicio,
          fim,
          km_inicial: km,
          destino: destino.trim() || null,
          finalidade: finalidade.trim() || null,
        },
        reserva?.id,
      );
      toast('sucesso', reserva ? 'Reserva atualizada.' : 'Reserva gravada com sucesso.');
      onSalvo();
    } catch (err) {
      if (err instanceof ConflitoReservaError) setConflitosServidor(err.conflitos);
      else setErro(`Não foi possível salvar: ${mensagemErro(err)}. Seus dados continuam no formulário.`);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="veiculo">Veículo *</label>
          <select id="veiculo" className="campo" required value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)}>
            <option value="">Selecione…</option>
            {veiculosAtivos.map((v) => (
              <option key={v.id} value={v.id}>{v.placa} — {v.modelo}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="rotulo" htmlFor="motorista">Motorista *</label>
          <select id="motorista" className="campo" required value={motoristaId} onChange={(e) => setMotoristaId(e.target.value)}>
            <option value="">Selecione…</option>
            {motoristasAtivos.map((m) => (
              <option key={m.id} value={m.id}>{m.nome} — {m.cargo}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="rotulo" htmlFor="dataIni">Data de saída *</label>
          <input id="dataIni" type="date" className="campo" required value={dataIni} onChange={(e) => setDataIni(e.target.value)} />
        </div>
        <div>
          <label className="rotulo" htmlFor="horaIni">Hora início *</label>
          <input id="horaIni" type="time" className="campo" required value={horaIni} onChange={(e) => setHoraIni(e.target.value)} />
        </div>
        <div>
          <label className="rotulo" htmlFor="dataFim">Data de retorno *</label>
          <input id="dataFim" type="date" className="campo" required min={dataIni} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        </div>
        <div>
          <label className="rotulo" htmlFor="horaFim">Hora fim *</label>
          <input id="horaFim" type="time" className="campo" required value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
        </div>
        <div>
          <label className="rotulo" htmlFor="kmIni">KM inicial *</label>
          <input id="kmIni" type="number" inputMode="decimal" min={0} step="0.1" className="campo" required value={kmInicial} onChange={(e) => setKmInicial(e.target.value)} />
          {veiculoPorId.get(veiculoId) && (
            <p className="mt-1 text-xs text-nevoa-500">Hodômetro atual: {fmtKm(veiculoPorId.get(veiculoId)!.km_atual)}</p>
          )}
        </div>
        <div>
          <label className="rotulo">KM final</label>
          <input className="campo" disabled value="Informado ao concluir a reserva" />
        </div>
        <div className="sm:col-span-2">
          <label className="rotulo" htmlFor="destino">Destino</label>
          <input id="destino" className="campo" placeholder="Ex.: Agência Centro – Goiânia" value={destino} onChange={(e) => setDestino(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="rotulo" htmlFor="finalidade">Finalidade</label>
          <textarea id="finalidade" rows={2} className="campo" placeholder="Ex.: Visita a cooperados" value={finalidade} onChange={(e) => setFinalidade(e.target.value)} />
        </div>
      </div>

      {intervaloInvalido && (
        <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          O horário de fim precisa ser depois do horário de início.
        </p>
      )}
      {ocupado && <ConflitoAlerta conflitos={conflitos} />}
      {disponivel && (
        <p className="flex items-center gap-2 rounded-lg bg-sicoob-turquesa-claro px-3 py-2 text-sm font-medium text-teal-800">
          <CheckCircle2 className="h-4 w-4" /> Veículo disponível neste horário.
        </p>
      )}
      {erro && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secundario" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn-primario" disabled={salvando || ocupado || intervaloInvalido}>
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
          {reserva ? 'Salvar alterações' : 'Confirmar reserva'}
        </button>
      </div>
    </form>
  );
}
