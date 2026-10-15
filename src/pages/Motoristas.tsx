import { useMemo, useState, type FormEvent } from 'react';
import { Loader2, Pencil, Plus, Power, RotateCcw, Users } from 'lucide-react';
import { Modal } from '../components/Modal';
import { useConfirmar } from '../components/Confirmar';
import { mensagemErro } from '../lib/backend';
import { useData } from '../lib/DataContext';
import { fmtKm } from '../lib/format';
import { useToast } from '../lib/toast';
import type { Motorista } from '../lib/types';

export default function Motoristas() {
  const { backend, motoristas, reservas, recarregar, somenteLeitura } = useData();
  const estatisticas = useMemo(() => {
    const m = new Map<string, { viagens: number; km: number }>();
    reservas
      .filter((r) => r.status === 'concluida')
      .forEach((r) => {
        const st = m.get(r.motorista_id) ?? { viagens: 0, km: 0 };
        st.viagens++;
        st.km += Number(r.km_rodados ?? 0);
        m.set(r.motorista_id, st);
      });
    return m;
  }, [reservas]);
  const toast = useToast();
  const confirmar = useConfirmar();
  const [editando, setEditando] = useState<Motorista | 'novo' | null>(null);
  const [mostrarInativos, setMostrarInativos] = useState(false);

  const lista = motoristas.filter((m) => mostrarInativos || m.ativo);

  async function alternarAtivo(m: Motorista) {
    if (
      m.ativo &&
      !(await confirmar({
        titulo: 'Desativar motorista',
        mensagem: `Desativar ${m.nome}? O histórico de reservas é mantido e é possível reativar depois.`,
        confirmar: 'Desativar',
        perigo: true,
      }))
    )
      return;
    try {
      await backend.definirAtivo('motoristas', m.id, !m.ativo);
    } catch (e) {
      return toast('erro', mensagemErro(e));
    }
    toast('sucesso', m.ativo ? 'Motorista desativado.' : 'Motorista reativado.');
    recarregar();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Cadastro</p>
          <h1 className="titulo-pagina">Motoristas</h1>
          <p className="text-sm text-nevoa-500">{motoristas.filter((m) => m.ativo).length} ativos</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 whitespace-nowrap text-xs text-nevoa-600">
            <input type="checkbox" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} /> Mostrar inativos
          </label>
          {!somenteLeitura && <button className="btn-primario" onClick={() => setEditando('novo')}><Plus className="h-4 w-4" /> Novo motorista</button>}
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <span className="rounded-2xl bg-sicoob-turquesa-claro p-3 text-sicoob-escuro"><Users className="h-6 w-6" /></span>
          <p className="text-sm text-nevoa-500">Nenhum motorista cadastrado ainda.</p>
          {!somenteLeitura && <button className="btn-primario" onClick={() => setEditando('novo')}><Plus className="h-4 w-4" /> Cadastrar o primeiro motorista</button>}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,230px),1fr))] gap-4">
          {lista.map((m, i) => {
            const st = estatisticas.get(m.id) ?? { viagens: 0, km: 0 };
            return (
              <div key={m.id} className={`card-interativo animate-subir p-4 ${m.ativo ? '' : 'opacity-60'}`} style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-center gap-3">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sicoob-escuro font-display text-sm font-bold text-white">
                    {m.nome.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                    <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-sicoob-lima" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-semibold text-nevoa-900">{m.nome}</p>
                    <p className="truncate text-sm text-nevoa-500">{m.cargo}</p>
                  </div>
                  {!somenteLeitura && (
                    <div className="flex gap-1">
                      <button className="rounded-lg p-2 text-nevoa-500 transition hover:bg-nevoa-100 hover:text-nevoa-900" onClick={() => setEditando(m)} aria-label="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded-lg p-2 text-nevoa-500 transition hover:bg-nevoa-100 hover:text-nevoa-900"
                        onClick={() => alternarAtivo(m)}
                        aria-label={m.ativo ? 'Desativar' : 'Reativar'}
                        title={m.ativo ? 'Desativar' : 'Reativar'}
                      >
                        {m.ativo ? <Power className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-nevoa-100 pt-3 text-center">
                  <div>
                    <p className="num font-mono text-sm font-semibold text-sicoob-escuro">{st.viagens}</p>
                    <p className="text-[11px] text-nevoa-500">viagens</p>
                  </div>
                  <div>
                    <p className="num font-mono text-sm font-semibold text-sicoob-escuro">{fmtKm(st.km)}</p>
                    <p className="text-[11px] text-nevoa-500">rodados</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-semibold text-sicoob-escuro">{m.telefone || '—'}</p>
                    <p className="text-[11px] text-nevoa-500">{m.ativo ? 'telefone' : 'inativo'}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal aberto={editando !== null} titulo={editando === 'novo' ? 'Novo motorista' : 'Editar motorista'} onFechar={() => setEditando(null)}>
        {editando !== null && (
          <FormMotorista
            motorista={editando === 'novo' ? undefined : editando}
            onSalvo={() => {
              setEditando(null);
              recarregar();
            }}
            onCancelar={() => setEditando(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function FormMotorista({ motorista, onSalvo, onCancelar }: { motorista?: Motorista; onSalvo: () => void; onCancelar: () => void }) {
  const toast = useToast();
  const { backend } = useData();
  const [nome, setNome] = useState(motorista?.nome ?? '');
  const [cargo, setCargo] = useState(motorista?.cargo ?? '');
  const [telefone, setTelefone] = useState(motorista?.telefone ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      await backend.salvarMotorista({ nome: nome.trim(), cargo: cargo.trim(), telefone: telefone.trim() || null }, motorista?.id);
    } catch (err) {
      return setErro(`Não foi possível salvar: ${mensagemErro(err)}`);
    } finally {
      setSalvando(false);
    }
    toast('sucesso', motorista ? 'Motorista atualizado.' : 'Motorista cadastrado.');
    onSalvo();
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div>
        <label className="rotulo" htmlFor="nome">Nome completo *</label>
        <input id="nome" className="campo" required value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div>
        <label className="rotulo" htmlFor="cargo">Cargo *</label>
        <input id="cargo" className="campo" required placeholder="Ex.: Gerente de Relacionamento" value={cargo} onChange={(e) => setCargo(e.target.value)} />
      </div>
      <div>
        <label className="rotulo" htmlFor="telefone">Telefone</label>
        <input id="telefone" type="tel" className="campo" placeholder="(62) 90000-0000" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
      </div>
      {erro && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secundario" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn-primario" disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin" />} Salvar</button>
      </div>
    </form>
  );
}
