import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { CalendarDays, Car, ClipboardList, DatabaseBackup, LayoutDashboard, Loader2, Plus, Users } from 'lucide-react';
import { useAgora } from '../lib/agora';
import { mensagemErro } from '../lib/backend';
import { useData } from '../lib/DataContext';
import { useToast } from '../lib/toast';
import { useReservaAcoes } from './ReservaAcoes';
import logo from '../assets/logo-sicoob-centro.png';

const menu = [
  { to: '/', rotulo: 'Dashboard', icone: LayoutDashboard },
  { to: '/calendario', rotulo: 'Calendário', icone: CalendarDays },
  { to: '/reservas', rotulo: 'Saídas', icone: ClipboardList },
  { to: '/veiculos', rotulo: 'Veículos', icone: Car },
  { to: '/motoristas', rotulo: 'Motoristas', icone: Users },
];

const dataLonga = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function saudacao(d: Date) {
  const h = d.getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export function Layout() {
  const { novaReserva } = useReservaAcoes();
  const { backend, online, erro, somenteLeitura } = useData();
  const agora = useAgora();
  const toast = useToast();
  const local = useLocation();
  const [exportando, setExportando] = useState(false);

  async function backup() {
    setExportando(true);
    try {
      await backend.exportarBackup();
      toast('sucesso', 'Backup baixado com sucesso.');
    } catch (e) {
      toast('erro', `Falha ao gerar backup: ${mensagemErro(e)}`);
    } finally {
      setExportando(false);
    }
  }

  const statusConexao = (
    <span className={`inline-flex items-center gap-2 text-xs font-medium ${online ? 'text-sicoob-verde' : 'text-amber-500'}`}>
      <span className="relative flex h-2 w-2">
        {online && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sicoob-verde opacity-60" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${online ? 'bg-sicoob-verde' : 'bg-amber-500'}`} />
      </span>
      {online ? 'Ao vivo' : 'Reconectando…'}
    </span>
  );

  return (
    <div className="min-h-screen md:flex">
      {/* Menu lateral (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col bg-sicoob-noite text-white md:flex">
        <div className="p-5">
          <div className="rounded-2xl bg-white px-4 py-3.5 shadow-lg shadow-black/20">
            <img src={logo} alt="Sicoob Centro" className="h-9 w-auto" />
          </div>
          <p className="eyebrow mt-4 px-1 text-white/45">Gestão de Frota</p>
        </div>

        {!somenteLeitura && (
          <div className="px-5">
            <button onClick={() => novaReserva()} className="btn w-full bg-sicoob-turquesa py-3 text-white shadow-lg shadow-sicoob-turquesa/20 hover:bg-[#00c2af]">
              <Plus className="h-4 w-4" /> Nova reserva
            </button>
          </div>
        )}

        <nav className="mt-6 flex-1 space-y-1 px-3">
          {menu.map(({ to, rotulo, icone: Icone }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sicoob-lima transition-all ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <Icone className={`h-[18px] w-[18px] transition ${isActive ? 'text-sicoob-turquesa' : 'group-hover:translate-x-0.5'}`} />
                  {rotulo}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-3 border-t border-white/10 p-5">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/75 transition hover:border-white/30 hover:text-white disabled:opacity-50"
            onClick={backup}
            disabled={exportando}
          >
            {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseBackup className="h-4 w-4" />} Exportar backup
          </button>
          <div className="flex items-center justify-between px-1">{statusConexao}<span className="num font-mono text-xs text-white/50">{hora.format(agora)}</span></div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topo (celular) */}
        <header
          style={{ top: 'env(safe-area-inset-top, 0px)' }}
          className="sticky z-30 flex items-center justify-between border-b border-nevoa-200/70 bg-white/90 px-4 py-3 backdrop-blur md:hidden"
        >
          <img src={logo} alt="Sicoob Centro" className="h-8 w-auto" />
          <div className="flex items-center gap-3">
            {statusConexao}
            <button className="rounded-full p-2 text-nevoa-600 hover:bg-nevoa-100" onClick={backup} aria-label="Exportar backup">
              <DatabaseBackup className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Barra superior (desktop) */}
        <div className="hidden items-end justify-between gap-4 px-8 pt-7 md:flex">
          <div>
            <p className="font-display text-sm font-semibold text-sicoob-turquesa">{saudacao(agora)}!</p>
            <p className="text-sm text-nevoa-500">{maiuscula(dataLonga.format(agora))}</p>
          </div>
          <p className="num font-mono text-2xl font-semibold text-sicoob-escuro">{hora.format(agora)}</p>
        </div>

        {erro && (
          <div role="alert" className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:mx-8">
            Não foi possível falar com o banco de dados: {erro}. Nada foi perdido: os dados continuam guardados no servidor. Tente novamente em instantes.
          </div>
        )}
        {somenteLeitura && (
          <div className="mx-4 mt-4 rounded-xl border border-nevoa-200 bg-white px-4 py-3 text-sm text-nevoa-600 md:mx-8">
            Você tem acesso apenas para visualizar. Para criar reservas, peça ao responsável acesso de <strong>Colaborador</strong>.
          </div>
        )}

        <main className="flex-1 px-4 pb-32 pt-5 md:px-8 md:pb-12 md:pt-5">
          <div key={local.pathname} className="animate-aparecer">
            <Outlet />
          </div>
        </main>

        {/* Botão flutuante de nova reserva (celular) */}
        {!somenteLeitura && (
          <button
            onClick={() => novaReserva()}
            style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
            className="fixed bottom-[84px] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-sicoob-turquesa text-white shadow-elevado transition active:scale-95 md:hidden"
            aria-label="Nova reserva"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}

        {/* Navegação inferior (celular) */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-1 border-t border-nevoa-200/70 bg-white/95 px-2 pt-1.5 backdrop-blur md:hidden"
          style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom, 0px))' }}
        >
          {menu.map(({ to, rotulo, icone: Icone }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10.5px] font-semibold transition ${
                  isActive ? 'bg-sicoob-turquesa-claro text-sicoob-escuro' : 'text-nevoa-500'
                }`
              }
            >
              <Icone className="h-5 w-5" /> {rotulo}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
