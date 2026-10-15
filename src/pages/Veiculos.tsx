import { useState, type FormEvent } from 'react';
import { Car, Loader2, Pencil, Plus, Power, RotateCcw } from 'lucide-react';
import { Modal } from '../components/Modal';
import { Placa } from '../components/Placa';
import { useAgora } from '../lib/agora';
import { useConfirmar } from '../components/Confirmar';
import { mensagemErro, PlacaDuplicadaError } from '../lib/backend';
import { useData } from '../lib/DataContext';
import { fmtKm } from '../lib/format';
import { useToast } from '../lib/toast';
import type { Veiculo } from '../lib/types';

/** Cores para identificar cada veículo no calendário (tons da paleta Sicoob). */
const CORES = ['#00AE9D', '#003641', '#7DB61C', '#A8B000', '#49479D', '#0E7C86', '#5B8C1A', '#D97706', '#64748B', '#B91C1C'];

export default function Veiculos() {
  const { backend, veiculos, reservas, recarregar, somenteLeitura } = useData();
  const toast = useToast();
  const confirmar = useConfirmar();
  const agora = useAgora();
  const [editando, setEditando] = useState<Veiculo | 'novo' | null>(null);
  const [mostrarInativos, setMostrarInativos] = useState(false);

  const lista = veiculos.filter((v) => mostrarInativos || v.ativo);

  async function alternarAtivo(v: Veiculo) {
    if (v.ativo) {
      const futuras = reservas.filter((r) => r.veiculo_id === v.id && r.status === 'agendada' && new Date(r.fim) > new Date()).length;
      const aviso = futuras ? `\n\nAtenção: este veículo tem ${futuras} reserva(s) agendada(s), que continuarão valendo.` : '';
      const ok = await confirmar({
        titulo: 'Desativar veículo',
        mensagem: `Desativar ${v.placa}? O histórico é mantido e é possível reativar depois.${aviso}`,
        confirmar: 'Desativar',
        perigo: true,
      });
      if (!ok) return;
    }
    try {
      await backend.definirAtivo('veiculos', v.id, !v.ativo);
    } catch (e) {
      return toast('erro', mensagemErro(e));
    }
    toast('sucesso', v.ativo ? 'Veículo desativado.' : 'Veículo reativado.');
    recarregar();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Cadastro</p>
          <h1 className="titulo-pagina">Veículos</h1>
          <p className="text-sm text-nevoa-500">{veiculos.filter((v) => v.ativo).length} ativos na frota</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 whitespace-nowrap text-xs text-nevoa-600">
            <input type="checkbox" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} /> Mostrar inativos
          </label>
          {!somenteLeitura && <button className="btn-primario" onClick={() => setEditando('novo')}><Plus className="h-4 w-4" /> Novo veículo</button>}
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <span className="rounded-2xl bg-sicoob-turquesa-claro p-3 text-sicoob-escuro"><Car className="h-6 w-6" /></span>
          <p className="text-sm text-nevoa-500">Nenhum veículo cadastrado ainda.</p>
          {!somenteLeitura && <button className="btn-primario" onClick={() => setEditando('novo')}><Plus className="h-4 w-4" /> Cadastrar o primeiro veículo</button>}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,230px),1fr))] gap-4">
          {lista.map((v, i) => {
            const emUsoAgora = reservas.some(
              (r) => r.veiculo_id === v.id && r.status === 'agendada' && new Date(r.inicio) <= agora && new Date(r.fim) > agora,
            );
            return (
              <div key={v.id} className={`card-interativo group animate-subir overflow-hidden ${v.ativo ? '' : 'opacity-60'}`} style={{ animationDelay: `${i * 40}ms` }}>
                <div className="relative flex h-24 items-center justify-center overflow-hidden" style={{ background: v.cor }}>
                  <svg className="absolute -right-4 -top-6 h-28 w-28 opacity-15" viewBox="0 0 100 100" aria-hidden="true">
                    <path d="M0 0 L50 86 L100 0 Z" fill="#fff" />
                  </svg>
                  <div>
                    <Placa placa={v.placa} tamanho="lg" />
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-semibold text-nevoa-900">{[v.marca, v.modelo].filter(Boolean).join(' ')}</p>
                    <p className="text-xs text-nevoa-500">{v.ano ?? 'Ano não informado'}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span className="num whitespace-nowrap rounded-md bg-sicoob-noite px-2 py-1 font-mono text-xs font-semibold text-white">{fmtKm(v.km_atual)}</span>
                      {!v.ativo ? (
                        <span className="text-xs font-semibold text-nevoa-500">Inativo</span>
                      ) : emUsoAgora ? (
                        <span className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-[#00766b]"><span className="h-1.5 w-1.5 animate-pulsar rounded-full bg-sicoob-turquesa" /> Em uso</span>
                      ) : (
                        <span className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-[#4d7a0c]"><span className="h-1.5 w-1.5 rounded-full bg-sicoob-verde" /> Livre</span>
                      )}
                    </div>
                  </div>
                  {!somenteLeitura && (
                    <div className="flex gap-1">
                      <button className="rounded-lg p-2 text-nevoa-500 transition hover:bg-nevoa-100 hover:text-nevoa-900" onClick={() => setEditando(v)} aria-label="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded-lg p-2 text-nevoa-500 transition hover:bg-nevoa-100 hover:text-nevoa-900"
                        onClick={() => alternarAtivo(v)}
                        aria-label={v.ativo ? 'Desativar' : 'Reativar'}
                        title={v.ativo ? 'Desativar' : 'Reativar'}
                      >
                        {v.ativo ? <Power className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
  const { backend } = useData();
  const [placa, setPlaca] = useState(veiculo?.placa ?? '');
  const [modelo, setModelo] = useState(veiculo?.modelo ?? '');
  const [marca, setMarca] = useState(veiculo?.marca ?? '');
  const [ano, setAno] = useState(veiculo?.ano ? String(veiculo.ano) : '');
  const [km, setKm] = useState(veiculo ? String(veiculo.km_atual) : '');
  const [cor, setCor] = useState(veiculo?.cor ?? corSugerida);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    const kmNum = Number(km.replace(',', '.'));
    if (km.trim() === '' || !Number.isFinite(kmNum) || kmNum < 0) {
      setSalvando(false);
      return setErro('Informe o KM atual do veículo.');
    }
    const linha = {
      placa: placa.trim().toUpperCase(),
      modelo: modelo.trim(),
      marca: marca.trim() || null,
      ano: ano ? Number(ano) : null,
      km_atual: kmNum,
      cor,
    };
    try {
      await backend.salvarVeiculo(linha, veiculo?.id);
    } catch (err) {
      return setErro(err instanceof PlacaDuplicadaError ? err.message : `Não foi possível salvar: ${mensagemErro(err)}`);
    } finally {
      setSalvando(false);
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
          <label className="rotulo" htmlFor="km">KM atual do veículo *</label>
          <input id="km" type="number" inputMode="decimal" step="0.1" min={0} required placeholder="Ex.: 15230" className="campo font-mono" value={km} onChange={(e) => setKm(e.target.value)} />
          <p className="mt-1 text-xs text-nevoa-500">
            Leia no painel do veículo. Serve de base para o KM inicial da próxima conclusão e é atualizado sozinho a cada reserva concluída.
          </p>
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
