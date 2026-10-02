'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback } from 'react';
import { useDashboard, useBackendStatus } from '@/hooks/useDashboard';
import { api } from '@/lib/api';
import ParcelaCard from '@/components/dashboard/ParcelaCard';
import AlertsPanel from '@/components/dashboard/AlertsPanel';
import {
  WeatherPanel,
  TankPanel,
  StatsPanel,
  SimulationPanel,
  Header,
} from '@/components/dashboard/Widgets';

// Lazy load del componente 3D (evita SSR con Three.js)
const TerrainScene3D = dynamic(
  () => import('@/components/3d/TerrainScene3D'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] md:h-[600px] rounded-2xl bg-gradient-to-b from-sky-900/50 to-sky-700/50 border border-white/10 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🌍</div>
          <p className="text-white/50 text-sm">Cargando visualización 3D...</p>
        </div>
      </div>
    ),
  }
);

export default function DashboardPage() {
  const { data, loading, error, refresh } = useDashboard(3000);
  const { isAvailable: backendAvailable, checking: backendChecking } = useBackendStatus();
  const [selectedParcelaId, setSelectedParcelaId] = useState<string | null>(null);
  const [showSimulation, setShowSimulation] = useState(true);

  // Handler para toggle de válvula
  const handleToggleValve = useCallback(async (valvulaId: string) => {
    try {
      await api.toggleValvula(valvulaId);
      refresh();
    } catch (err) {
      console.error('Error toggling valve:', err);
    }
  }, [refresh]);

  // Handler para simulación manual
  const handleSimulationUpdate = useCallback(
    (key: string, value: number) => {
      api.updateMockData({ [key]: value });
    },
    []
  );

  // Handler para marcar alerta como leída
  const handleDismissAlert = useCallback(
    async (alertaId: string) => {
      try {
        await api.marcarAlertaLeida(alertaId);
        refresh();
      } catch (err) {
        console.error('Error dismissing alert:', err);
      }
    },
    [refresh]
  );

  // Estado de carga
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-950 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🌱</div>
          <h2 className="text-white text-xl font-bold mb-2">
            Riego Inteligente
          </h2>
          <p className="text-white/50">Inicializando sistema...</p>
          <div className="mt-4 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-950 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-white text-xl font-bold mb-2">
            Error al cargar datos
          </h2>
          <p className="text-white/50 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const simData = api.getSimulationData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-950 to-gray-900">
      <Header backendStatus={backendAvailable} checking={backendChecking} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Título de sección */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white text-xl font-bold">
              🗺️ Vista del Terreno
            </h2>
            <p className="text-white/40 text-xs">
              Visualización 3D en tiempo real · Morelos, México
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSimulation(!showSimulation)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                showSimulation
                  ? 'bg-purple-500/30 text-purple-300 border border-purple-500/30'
                  : 'bg-white/5 text-white/50 border border-white/10'
              }`}
            >
              🎮 {showSimulation ? 'Ocultar' : 'Mostrar'} Simulación
            </button>
            <button
              onClick={refresh}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 transition-colors"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>

        {/* Visualización 3D */}
        <TerrainScene3D
          parcelas={data.parcelas}
          tanqueNivel={data.tanques[0]?.nivel_actual_porcentaje ?? 50}
          tanqueCapacidad={data.tanques[0]?.capacidad_litros ?? 50000}
          onParcelaSelect={setSelectedParcelaId}
          selectedParcelaId={selectedParcelaId ?? undefined}
        />

        {/* Grid de contenido */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Columna izquierda: Parcelas */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              🌱 Parcelas Monitoreadas
              <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                {data.estadisticas.parcelas_activas} activas
              </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {data.parcelas.map((pd) => (
                <ParcelaCard
                  key={pd.parcela.id}
                  data={pd}
                  selected={selectedParcelaId === pd.parcela.id}
                  onSelect={() => setSelectedParcelaId(pd.parcela.id)}
                  onToggleValve={() =>
                    handleToggleValve(pd.parcela.id)
                  }
                />
              ))}
            </div>

            {/* Alertas */}
            <div className="mt-4">
              <AlertsPanel
                alertas={data.alertas_activas}
                onDismiss={handleDismissAlert}
              />
            </div>
          </div>

          {/* Columna derecha: Widgets */}
          <div className="space-y-4">
            {/* Clima */}
            <WeatherPanel clima={data.clima} />

            {/* Tanque */}
            {data.tanques[0] && <TankPanel tanque={data.tanques[0]} />}

            {/* Estadísticas */}
            <StatsPanel stats={data.estadisticas} />

            {/* Panel de Simulación */}
            {showSimulation && (
              <SimulationPanel
                onUpdateData={handleSimulationUpdate}
                data={simData}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 py-4 border-t border-white/5 text-center">
          <p className="text-white/20 text-xs">
            Sistema de Riego Inteligente · Hackathon ADIEM 2024 · Estado de
            Morelos, México
          </p>
          <p className="text-white/10 text-[10px] mt-1">
            Next.js + Three.js + NestJS + PostgreSQL
          </p>
        </footer>
      </main>
    </div>
  );
}
