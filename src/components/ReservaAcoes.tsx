import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Ban, Flag, Pencil } from 'lucide-react';
import { mensagemErro } from '../lib/backend';
import { useData } from '../lib/DataContext';
import { fmtKm, fmtPeriodo } from '../lib/format';
import { useToast } from '../lib/toast';
import type { Reserva } from '../lib/types';
import { ConcluirForm } from './ConcluirForm';
import { useConfirmar } from './Confirmar';
import { Modal } from './Modal';
import { ReservaForm, type PrefillReserva } from './ReservaForm';
import { Placa } from './Placa';
import { StatusBadge } from './StatusBadge';

type Estado =
  | { tipo: 'nova'; prefill?: PrefillReserva }
  | { tipo: 'editar'; reserva: Reserva }
  | { tipo: 'concluir'; reserva: Reserva }
  | { tipo: 'detalhe'; reserva: Reserva }
  | null;

interface Acoes {
  novaReserva: (prefill?: PrefillReserva) => void;
  editar: (r: Reserva) => void;
  concluir: (r: Reserva) => void;
  detalhar: (r: Reserva) => void;
  cancelar: (r: Reserva) => Promise<void>;
}

const Ctx = createContext<Acoes | null>(null);

export function ReservaAcoesProvider({ children }: { children: ReactNode }) {
  const { backend, recarregar, veiculoPorId, motoristaPorId, somenteLeitura } = useData();
  const confirmar = useConfirmar();
  const toast = useToast();
  const [estado, setEstado] = useState<Estado>(null);
  const fechar = useCallback(() => setEstado(null), []);
  const aposGravar = useCallback(() => {
    setEstado(null);
    recarregar();
  }, [recarregar]);

  const cancelar = useCallback(
    async (r: Reserva) => {
      const v = veiculoPorId.get(r.veiculo_id);
      const ok = await confirmar({
        titulo: 'Cancelar reserva',
        mensagem: `Cancelar a reserva de ${v?.placa ?? 'veículo'} em ${fmtPeriodo(r.inicio, r.fim)}?\n\nO horário fica livre e o registro continua guardado no histórico.`,
        confirmar: 'Cancelar reserva',
        perigo: true,
      });
      if (!ok) return;
      try {
        await backend.cancelarReserva(r.id);
        toast('sucesso', 'Reserva cancelada. O horário foi liberado.');
        aposGravar();
      } catch (e) {
        toast('erro', `Não foi possível cancelar: ${mensagemErro(e)}`);
      }
    },
    [veiculoPorId, toast, aposGravar, confirmar, backend],
  );

  const acoes: Acoes = {
    novaReserva: (prefill) => (somenteLeitura ? toast('erro', 'Você tem acesso apenas para visualizar.') : setEstado({ tipo: 'nova', prefill })),
    editar: (reserva) => setEstado({ tipo: 'editar', reserva }),
    concluir: (reserva) => setEstado({ tipo: 'concluir', reserva }),
    detalhar: (reserva) => setEstado({ tipo: 'detalhe', reserva }),
    cancelar,
  };

  const r = estado && 'reserva' in estado ? estado.reserva : null;

  return (
    <Ctx.Provider value={acoes}>
      {children}

      <Modal aberto={estado?.tipo === 'nova' || estado?.tipo === 'editar'} titulo={estado?.tipo === 'editar' ? 'Editar reserva' : 'Nova reserva / Registro de saída'} onFechar={fechar} largura="max-w-2xl">
        {(estado?.tipo === 'nova' || estado?.tipo === 'editar') && (
          <ReservaForm
            key={estado.tipo === 'editar' ? estado.reserva.id : 'nova'}
            reserva={estado.tipo === 'editar' ? estado.reserva : undefined}
            prefill={estado.tipo === 'nova' ? estado.prefill : undefined}
            onSalvo={aposGravar}
            onCancelar={fechar}
          />
        )}
      </Modal>

      <Modal aberto={estado?.tipo === 'concluir'} titulo="Concluir reserva" onFechar={fechar}>
        {estado?.tipo === 'concluir' && <ConcluirForm reserva={estado.reserva} onConcluido={aposGravar} onCancelar={fechar} />}
      </Modal>

      <Modal aberto={estado?.tipo === 'detalhe'} titulo="Detalhes da reserva" onFechar={fechar}>
        {estado?.tipo === 'detalhe' && r && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Placa placa={veiculoPorId.get(r.veiculo_id)?.placa} tamanho="lg" />
                <div>
                  <p className="font-display font-semibold text-sicoob-escuro">{veiculoPorId.get(r.veiculo_id)?.modelo}</p>
                  <p className="text-sm text-nevoa-500">{veiculoPorId.get(r.veiculo_id)?.marca}</p>
                </div>
              </div>
              <StatusBadge reserva={r} />
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-nevoa-50 p-4 text-sm">
              <Item rotulo="Motorista" valor={`${motoristaPorId.get(r.motorista_id)?.nome ?? '—'}`} />
              <Item rotulo="Cargo" valor={motoristaPorId.get(r.motorista_id)?.cargo ?? '—'} />
              <Item rotulo="Período" valor={fmtPeriodo(r.inicio, r.fim)} span />
              <Item rotulo="Destino" valor={r.destino ?? '—'} span />
              {r.status === 'concluida' ? (
                <>
                  <Item rotulo="KM inicial" valor={fmtKm(r.km_inicial)} />
                  <Item rotulo="KM final" valor={fmtKm(r.km_final)} />
                  <Item rotulo="KM rodados" valor={fmtKm(r.km_rodados)} span />
                </>
              ) : (
                r.status === 'agendada' && <Item rotulo="Quilometragem" valor="Informada ao concluir a reserva" span />
              )}
              {r.finalidade && <Item rotulo="Finalidade" valor={r.finalidade} span />}
            </dl>
            {r.status === 'agendada' && !somenteLeitura && (
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button className="btn-secundario" onClick={() => cancelar(r)}><Ban className="h-4 w-4" /> Cancelar reserva</button>
                <button className="btn-secundario" onClick={() => setEstado({ tipo: 'editar', reserva: r })}><Pencil className="h-4 w-4" /> Editar</button>
                <button className="btn-destaque" onClick={() => setEstado({ tipo: 'concluir', reserva: r })}><Flag className="h-4 w-4" /> Concluir (KM final)</button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Ctx.Provider>
  );
}

function Item({ rotulo, valor, span }: { rotulo: string; valor: string; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <dt className="eyebrow">{rotulo}</dt>
      <dd className="font-medium text-nevoa-800">{valor}</dd>
    </div>
  );
}

export function useReservaAcoes() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useReservaAcoes precisa estar dentro de <ReservaAcoesProvider>');
  return ctx;
}
