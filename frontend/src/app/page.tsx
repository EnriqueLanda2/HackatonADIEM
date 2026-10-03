'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback } from 'react';
import { useDashboard, useBackendStatus } from '@/hooks/useDashboard';
import { api } from '@/lib/api';
import ParcelaCard from '@/components/dashboard/ParcelaCard';
import {
  WeatherPanel,
  TankPanel,
  Header,
  SimulationPanel,
} from '@/components/dashboard/Widgets';

// Carga perezosa del componente 3D para evitar errores de renderizado en servidor
const TerrainScene3D = dynamic(
  () => import('@/components/3d/TerrainScene3D'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[420px] rounded-xl bg-[#18181b] border border-white/5 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-2 animate-bounce">🌱</div>
          <p className="text-zinc-500 text-xs">Cargando vista 3D...</p>
        </div>
      </div>
    ),
  }
);

export default function DashboardPage() {
  const { data, loading, error, refresh } = useDashboard(3000);
  const { isAvailable: backendAvailable, checking: backendChecking } = useBackendStatus();
  const [selectedParcelaId, setSelectedParcelaId] = useState<string | null>(null);

  // Toggle de válvula
  const handleToggleValve = useCallback(
    async (valvulaId: string) => {
      try {
        await api.toggleValvula(valvulaId);
        refresh();
      } catch (err) {
        console.error('Error al cambiar estado de válvula:', err);
      }
    },
    [refresh]
  );

  // Actualización de sliders de simulación
  const handleSimulationUpdate = useCallback((key: string, value: number) => {
    api.updateMockData({ [key]: value });
  }, []);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🌱</div>
          <p className="text-zinc-400 text-sm">Iniciando Sistema de Riego...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-zinc-400 text-sm mb-4">{error || 'Error al conectar'}</p>
          <button
            onClick={refresh}
            className="text-xs px-4 py-2 rounded-full bg-emerald-600 text-white font-medium"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const stats = data.estadisticas;
  const simData = api.getSimulationData();

  return (
    <div className="min-h-screen bg-[#111111] text-white selection:bg-emerald-500/20 antialiased font-sans">
      {/* Barra de Navegación Superior */}
      <Header
        backendStatus={backendAvailable}
        checking={backendChecking}
        onRefresh={refresh}
      />

      <main className="max-w-7xl mx-auto px-6 py-7">
        {/* ========================================================================= */}
        {/* FILA DE ESTADÍSTICAS SUPERIORES                                           */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div>
            <div className="text-zinc-400 text-sm mb-1.5 font-normal">Parcelas activas</div>
            <div className="text-3xl font-semibold tracking-tight">
              {stats.parcelas_activas} / {stats.total_parcelas}
            </div>
          </div>

          <div>
            <div className="text-zinc-400 text-sm mb-1.5 font-normal">Válvulas abiertas</div>
            <div className="text-3xl font-semibold tracking-tight">
              {stats.valvulas_abiertas}
            </div>
          </div>

          <div
            className={`transition-colors ${
              stats.alertas_sin_leer > 0
                ? 'bg-[#2a0e12] border border-rose-950/60 rounded-xl px-4 py-3 -my-3'
                : ''
            }`}
          >
            <div
              className={`text-sm mb-1.5 font-normal ${
                stats.alertas_sin_leer > 0 ? 'text-rose-400' : 'text-zinc-400'
              }`}
            >
              Alertas
            </div>
            <div
              className={`text-3xl font-semibold tracking-tight ${
                stats.alertas_sin_leer > 0 ? 'text-rose-400' : 'text-white'
              }`}
            >
              {stats.alertas_sin_leer}
            </div>
          </div>

          <div>
            <div className="text-zinc-400 text-sm mb-1.5 font-normal">Litros hoy</div>
            <div className="text-3xl font-semibold tracking-tight">
              {stats.litros_hoy.toLocaleString('es-MX')}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECCIÓN PRINCIPAL: PARCELAS A LA IZQUIERDA, VISTA 3D A LA DERECHA        */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMNA IZQUIERDA: Tarjetas de Información de las Parcelas (5 columnas) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {data.parcelas.map((pd) => (
              <ParcelaCard
                key={pd.parcela.id}
                data={pd}
                onToggleValve={() => handleToggleValve(pd.parcela.id)}
              />
            ))}
          </div>

          {/* COLUMNA DERECHA: Vista 3D del Terreno + Cisterna y Clima (7 columnas) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Tarjeta de la Vista del Terreno 3D */}
            <div className="bg-[#18181b] rounded-2xl p-5 border border-white/5 flex flex-col">
              <div className="flex items-center gap-2 text-white font-semibold text-base mb-4">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-zinc-400"
                >
                  <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
                  <path d="M9 3.2v15.6" />
                  <path d="M15 5.2v15.6" />
                </svg>
                <span>Vista del terreno</span>
              </div>

              {/* Contenedor del lienzo 3D */}
              <div className="w-full h-[400px] md:h-[440px] rounded-xl overflow-hidden">
                <TerrainScene3D
                  parcelas={data.parcelas}
                  tanqueNivel={data.tanques[0]?.nivel_actual_porcentaje ?? 79}
                  tanqueCapacidad={data.tanques[0]?.capacidad_litros ?? 50000}
                  onParcelaSelect={setSelectedParcelaId}
                  selectedParcelaId={selectedParcelaId ?? undefined}
                />
              </div>
            </div>

            {/* Fila con Cisterna y Clima */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {data.tanques[0] && <TankPanel tanque={data.tanques[0]} />}
              <WeatherPanel clima={data.clima} />
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* PANEL DE SIMULACIÓN (PARA PRESENTACIÓN / DEMO HACKATHON)                   */}
        {/* ========================================================================= */}
        <SimulationPanel onUpdateData={handleSimulationUpdate} data={simData} />
      </main>
    </div>
  );
}
