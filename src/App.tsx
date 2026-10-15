import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ReservaAcoesProvider } from './components/ReservaAcoes';
import { DataProvider } from './lib/DataContext';
import { supabaseConfigurado } from './lib/supabase';
import { ToastProvider } from './lib/toast';
import Calendario from './pages/Calendario';
import Configuracao from './pages/Configuracao';
import Dashboard from './pages/Dashboard';
import Motoristas from './pages/Motoristas';
import Reservas from './pages/Reservas';
import Veiculos from './pages/Veiculos';

export default function App() {
  if (!supabaseConfigurado) return <Configuracao />;
  return (
    <ToastProvider>
      <DataProvider>
        <BrowserRouter>
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
        </BrowserRouter>
      </DataProvider>
    </ToastProvider>
  );
}
