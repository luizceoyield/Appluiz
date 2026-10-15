import { useState, type FormEvent } from 'react';
import { Loader2, Pencil, Plus, Power, RotateCcw } from 'lucide-react';
import { Modal } from '../components/Modal';
import { mensagemErro } from '../lib/api';
import { useData } from '../lib/DataContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/toast';
import type { Motorista } from '../lib/types';

export default function Motoristas() {
  const { motoristas, recarregar } = useData();
  const toast = useToast();
  const [editando, setEditando] = useState<Motorista | 'novo' | null>(null);
  const [mostrarInativos, setMostrarInativos] = useState(false);

  const lista = motoristas.filter((m) => mostrarInativos || m.ativo);

  async function alternarAtivo(m: Motorista) {
    if (m.ativo && !window.confirm(`Desativar ${m.nome}? O histórico de reservas é mantido e é possível reativar depois.`)) return;
    const { error } = await supabase.from('motoristas').update({ ativo: !m.ativo }).eq('id', m.id);
    if (error) return toast('erro', mensagemErro(error));
    toast('sucesso', m.ativo ? 'Motorista desativado.' : 'Motorista reativado.');
    recarregar();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="titulo-pagina">Motoristas</h1>
          <p className="text-sm text-slate-500">{motoristas.filter((m) => m.ativo).length} ativos</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} /> Mostrar inativos
          </label>
          <button className="btn-primario" onClick={() => setEditando('novo')}><Plus className="h-4 w-4" /> Novo motorista</button>
        </div>
      </div>

      {lista.length === 0 ? (
        <p className="card p-10 text-center text-sm text-slate-400">Nenhum motorista cadastrado.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((m) => (
            <div key={m.id} className={`card flex items-center gap-3 p-4 ${m.ativo ? '' : 'opacity-60'}`}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sicoob-turquesa-claro font-bold text-sicoob-escuro">
                {m.nome.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-800">{m.nome}</p>
                <p className="truncate text-sm text-slate-500">{m.cargo}{m.telefone ? ` · ${m.telefone}` : ''}</p>
                {!m.ativo && <p className="text-xs font-semibold text-slate-500">Inativo</p>}
              </div>
              <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => setEditando(m)} aria-label="Editar"><Pencil className="h-4 w-4" /></button>
              <button
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                onClick={() => alternarAtivo(m)}
                aria-label={m.ativo ? 'Desativar' : 'Reativar'}
                title={m.ativo ? 'Desativar' : 'Reativar'}
              >
                {m.ativo ? <Power className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
              </button>
            </div>
          ))}
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
  const [nome, setNome] = useState(motorista?.nome ?? '');
  const [cargo, setCargo] = useState(motorista?.cargo ?? '');
  const [telefone, setTelefone] = useState(motorista?.telefone ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    const linha = { nome: nome.trim(), cargo: cargo.trim(), telefone: telefone.trim() || null };
    const { error } = motorista
      ? await supabase.from('motoristas').update(linha).eq('id', motorista.id)
      : await supabase.from('motoristas').insert(linha);
    setSalvando(false);
    if (error) return setErro(`Não foi possível salvar: ${mensagemErro(error)}`);
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
