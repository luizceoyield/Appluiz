import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { CalendarDays, Car, ClipboardList, DatabaseBackup, LayoutDashboard, Loader2, Plus, Users } from 'lucide-react';
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

export function Layout() {
  const { novaReserva } = useReservaAcoes();
  const { backend, online, erro, somenteLeitura } = useData();
  const toast = useToast();
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

  return (
    <div className="min-h-screen md:flex">
      {/* Barra lateral (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-200 px-6 py-5">
          <img src={logo} alt="Sicoob Centro" className="h-10 w-auto" />
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Gestão de Frota</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {menu.map(({ to, rotulo, icone: Icone }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-sicoob-escuro text-white' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Icone className="h-5 w-5" /> {rotulo}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t border-slate-200 p-3">
          <button className="btn-secundario w-full" onClick={backup} disabled={exportando}>
            {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseBackup className="h-4 w-4" />} Exportar backup
          </button>
          <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <span className={`h-2 w-2 rounded-full ${online ? 'bg-sicoob-verde' : 'bg-amber-500'}`} />
            {online ? 'Sincronizado em tempo real' : 'Reconectando…'}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topo (celular) */}
        <header style={{ top: 'env(safe-area-inset-top, 0px)' }} className="sticky z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <img src={logo} alt="Sicoob Centro" className="h-8 w-auto" />
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${online ? 'bg-sicoob-verde' : 'bg-amber-500'}`} title={online ? 'Sincronizado' : 'Reconectando'} />
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" onClick={backup} aria-label="Exportar backup">
              <DatabaseBackup className="h-5 w-5" />
            </button>
          </div>
        </header>

        {erro && (
          <div role="alert" className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:mx-8">
            Não foi possível falar com o banco de dados: {erro}. Nada foi perdido: os dados continuam guardados no servidor. Tente novamente em instantes.
          </div>
        )}

        {somenteLeitura && (
          <div className="mx-4 mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 md:mx-8">
            Você tem acesso apenas para visualizar. Para criar reservas, peça ao responsável acesso de <strong>Colaborador</strong>.
          </div>
        )}

        <main className="flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-10 md:pt-8">
          <Outlet />
        </main>

        {/* Botão flutuante de nova reserva */}
        {!somenteLeitura && <button
          onClick={() => novaReserva()}
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-sicoob-turquesa text-white shadow-lg hover:brightness-95 md:bottom-8 md:right-8 md:h-auto md:w-auto md:gap-2 md:px-5 md:py-3 md:font-semibold"
          aria-label="Nova reserva"
        >
          <Plus className="h-6 w-6" /> <span className="hidden md:inline">Nova reserva</span>
        </button>}

        {/* Navegação inferior (celular) */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {menu.map(({ to, rotulo, icone: Icone }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-sicoob-turquesa' : 'text-slate-500'}`
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
