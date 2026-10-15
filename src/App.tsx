import { useEffect, useState } from 'react';
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ConfirmarProvider } from './components/Confirmar';
import { Layout } from './components/Layout';
import { ReservaAcoesProvider } from './components/ReservaAcoes';
import { iniciarBackend, type Inicio } from './lib/backend';
import { DataProvider } from './lib/DataContext';
import { ToastProvider } from './lib/toast';
import Calendario from './pages/Calendario';
import Configuracao from './pages/Configuracao';
import Dashboard from './pages/Dashboard';
import Motoristas from './pages/Motoristas';
import Reservas from './pages/Reservas';
import Veiculos from './pages/Veiculos';
import logo from './assets/logo-sicoob-centro.png';

// Dentro do claude.ai a página roda num frame: a navegação fica em memória.
const Router = import.meta.env.VITE_BACKEND === 'claude' ? MemoryRouter : BrowserRouter;

export default function App() {
  const [inicio, setInicio] = useState<Inicio | null>(null);
  useEffect(() => {
    iniciarBackend().then(setInicio);
  }, []);

  if (!inicio) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-slate-500">
        <img src={logo} alt="Sicoob Centro" className="h-10 w-auto" />
        <p className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Carregando a frota…</p>
      </div>
    );
  }
  if (!inicio.ok) return <Configuracao motivo={inicio.motivo} />;

  return (
    <ToastProvider>
      <ConfirmarProvider>
        <DataProvider backend={inicio.backend} somenteLeitura={inicio.somenteLeitura}>
          <Router>
            <ReservaAcoesProvider>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="calendario" element={<Calendario />} />
                  <Route path="reservas" element={<Reservas />} />
                  <Route path="veiculos" element={<Veiculos />} />
                  <Route path="motoristas" element={<Motoristas />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </ReservaAcoesProvider>
          </Router>
        </DataProvider>
      </ConfirmarProvider>
    </ToastProvider>
  );
}
