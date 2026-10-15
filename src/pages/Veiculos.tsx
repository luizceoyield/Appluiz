import { useState, type FormEvent } from 'react';
import { Car, Loader2, Pencil, Plus, Power, RotateCcw } from 'lucide-react';
import { Modal } from '../components/Modal';
import { mensagemErro } from '../lib/api';
import { useData } from '../lib/DataContext';
import { fmtKm } from '../lib/format';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/toast';
import type { Veiculo } from '../lib/types';

/** Cores para identificar cada veículo no calendário (tons da paleta Sicoob). */
const CORES = ['#00AE9D', '#003641', '#7DB61C', '#A8B000', '#49479D', '#0E7C86', '#5B8C1A', '#D97706', '#64748B', '#B91C1C'];

export default function Veiculos() {
  const { veiculos, reservas, recarregar } = useData();
  const toast = useToast();
  const [editando, setEditando] = useState<Veiculo | 'novo' | null>(null);
  const [mostrarInativos, setMostrarInativos] = useState(false);

  const lista = veiculos.filter((v) => mostrarInativos || v.ativo);

  async function alternarAtivo(v: Veiculo) {
    if (v.ativo) {
      const futuras = reservas.filter((r) => r.veiculo_id === v.id && r.status === 'agendada' && new Date(r.fim) > new Date()).length;
      const aviso = futuras ? `\n\nAtenção: este veículo tem ${futuras} reserva(s) agendada(s), que continuarão valendo.` : '';
      if (!window.confirm(`Desativar ${v.placa}? O histórico é mantido e é possível reativar depois.${aviso}`)) return;
    }
    const { error } = await supabase.from('veiculos').update({ ativo: !v.ativo }).eq('id', v.id);
    if (error) return toast('erro', mensagemErro(error));
    toast('sucesso', v.ativo ? 'Veículo desativado.' : 'Veículo reativado.');
    recarregar();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="titulo-pagina">Veículos</h1>
          <p className="text-sm text-slate-500">{veiculos.filter((v) => v.ativo).length} ativos na frota</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} /> Mostrar inativos
          </label>
          <button className="btn-primario" onClick={() => setEditando('novo')}><Plus className="h-4 w-4" /> Novo veículo</button>
        </div>
      </div>

      {lista.length === 0 ? (
        <p className="card p-10 text-center text-sm text-slate-400">Nenhum veículo cadastrado.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((v) => (
            <div key={v.id} className={`card overflow-hidden ${v.ativo ? '' : 'opacity-60'}`}>
              <div className="h-1.5" style={{ background: v.cor }} />
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: v.cor }}>
                  <Car className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold tracking-wide text-sicoob-escuro">{v.placa}</p>
                  <p className="truncate text-sm text-slate-600">{[v.marca, v.modelo, v.ano].filter(Boolean).join(' · ')}</p>
                  <p className="text-xs text-slate-500">Hodômetro: {fmtKm(v.km_atual)}{!v.ativo && ' · Inativo'}</p>
                </div>
                <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => setEditando(v)} aria-label="Editar"><Pencil className="h-4 w-4" /></button>
                <button
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                  onClick={() => alternarAtivo(v)}
                  aria-label={v.ativo ? 'Desativar' : 'Reativar'}
                  title={v.ativo ? 'Desativar' : 'Reativar'}
                >
                  {v.ativo ? <Power className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal aberto={editando !== null} titulo={editando === 'novo' ? 'Novo veículo' : 'Editar veículo'} onFechar={() => setEditando(null)}>
        {editando !== null && (
          <FormVeiculo
            veiculo={editando === 'novo' ? undefined : editando}
            corSugerida={CORES[veiculos.length % CORES.length]}
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

function FormVeiculo({ veiculo, corSugerida, onSalvo, onCancelar }: { veiculo?: Veiculo; corSugerida: string; onSalvo: () => void; onCancelar: () => void }) {
  const toast = useToast();
  const [placa, setPlaca] = useState(veiculo?.placa ?? '');
  const [modelo, setModelo] = useState(veiculo?.modelo ?? '');
  const [marca, setMarca] = useState(veiculo?.marca ?? '');
  const [ano, setAno] = useState(veiculo?.ano ? String(veiculo.ano) : '');
  const [km, setKm] = useState(veiculo ? String(veiculo.km_atual) : '0');
  const [cor, setCor] = useState(veiculo?.cor ?? corSugerida);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    const linha = {
      placa: placa.trim().toUpperCase(),
      modelo: modelo.trim(),
      marca: marca.trim() || null,
      ano: ano ? Number(ano) : null,
      km_atual: Number(km.replace(',', '.')) || 0,
      cor,
    };
    const { error } = veiculo
      ? await supabase.from('veiculos').update(linha).eq('id', veiculo.id)
      : await supabase.from('veiculos').insert(linha);
    setSalvando(false);
    if (error) {
      return setErro(error.code === '23505' ? 'Já existe um veículo com esta placa.' : `Não foi possível salvar: ${mensagemErro(error)}`);
    }
    toast('sucesso', veiculo ? 'Veículo atualizado.' : 'Veículo cadastrado.');
    onSalvo();
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="rotulo" htmlFor="placa">Placa *</label>
          <input id="placa" className="campo uppercase" required maxLength={8} placeholder="ABC1D23" value={placa} onChange={(e) => setPlaca(e.target.value)} />
        </div>
        <div>
          <label className="rotulo" htmlFor="ano">Ano</label>
          <input id="ano" type="number" className="campo" min={1950} max={2100} value={ano} onChange={(e) => setAno(e.target.value)} />
        </div>
        <div>
          <label className="rotulo" htmlFor="marca">Marca</label>
          <input id="marca" className="campo" placeholder="Ex.: Fiat" value={marca} onChange={(e) => setMarca(e.target.value)} />
        </div>
        <div>
          <label className="rotulo" htmlFor="modelo">Modelo *</label>
          <input id="modelo" className="campo" required placeholder="Ex.: Strada" value={modelo} onChange={(e) => setModelo(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="rotulo" htmlFor="km">Hodômetro atual (KM)</label>
          <input id="km" type="number" inputMode="decimal" step="0.1" min={0} className="campo" value={km} onChange={(e) => setKm(e.target.value)} />
          <p className="mt-1 text-xs text-slate-500">Atualizado automaticamente ao concluir cada reserva.</p>
        </div>
      </div>
      <div>
        <span className="rotulo">Cor no calendário</span>
        <div className="flex flex-wrap gap-2">
          {CORES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setCor(c)}
              className={`h-8 w-8 rounded-full ring-offset-2 ${cor === c ? 'ring-2 ring-sicoob-escuro' : ''}`}
              style={{ background: c }}
              aria-label={`Cor ${c}`}
            />
          ))}
        </div>
      </div>
      {erro && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secundario" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn-primario" disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin" />} Salvar</button>
      </div>
    </form>
  );
}
