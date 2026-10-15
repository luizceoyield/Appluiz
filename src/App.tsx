import { useEffect, useState } from 'react';
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ConfirmarProvider } from './components/Confirmar';
import { Layout } from './components/Layout';
import { Splash } from './components/Splash';
import { ReservaAcoesProvider } from './components/ReservaAcoes';
import { iniciarBackend, type Inicio } from './lib/backend';
import { AgoraProvider } from './lib/agora';
import { DataProvider, useData } from './lib/DataContext';
import { ToastProvider } from './lib/toast';
import Calendario from './pages/Calendario';
import Configuracao from './pages/Configuracao';
import Dashboard from './pages/Dashboard';
import Motoristas from './pages/Motoristas';
import Reservas from './pages/Reservas';
import Veiculos from './pages/Veiculos';

// Dentro do claude.ai a página roda num frame: a navegação fica em memória.
const Router = import.meta.env.VITE_BACKEND === 'claude' ? MemoryRouter : BrowserRouter;

export default function App() {
  const [inicio, setInicio] = useState<Inicio | null>(null);
  const [dadosProntos, setDadosProntos] = useState(false);
  useEffect(() => {
    iniciarBackend().then(setInicio);
  }, []);

  const pronto = inicio !== null && (!inicio.ok || dadosProntos);

  return (
    <>
      {inicio && !inicio.ok && <Configuracao motivo={inicio.motivo} />}
      {inicio?.ok && (
        <ToastProvider>
          <ConfirmarProvider>
            <AgoraProvider>
              <DataProvider backend={inicio.backend} somenteLeitura={inicio.somenteLeitura}>
                <AvisarQuandoCarregar onPronto={() => setDadosProntos(true)} />
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
            </AgoraProvider>
          </ConfirmarProvider>
        </ToastProvider>
      )}
      <Splash pronto={pronto} />
    </>
  );
}

/** Avisa a tela de abertura quando a primeira leva de dados chegou. */
function AvisarQuandoCarregar({ onPronto }: { onPronto: () => void }) {
  const { carregando } = useData();
  useEffect(() => {
    if (!carregando) onPronto();
  }, [carregando, onPronto]);
  return null;
}
