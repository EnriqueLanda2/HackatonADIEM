'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect } from 'react';
import { useDashboard, useBackendStatus } from '@/hooks/useDashboard';
import { api } from '@/lib/api';
import { fetchLiveWeather } from '@/lib/weather-service';
import ParcelaCard from '@/components/dashboard/ParcelaCard';
import WeatherWidgetIOS from '@/components/dashboard/WeatherWidgetIOS';
import CreateParcelModal from '@/components/dashboard/CreateParcelModal';
import {
  TankPanel,
  Header,
  SimulationPanel,
} from '@/components/dashboard/Widgets';
import { PronosticoClima, CreateParcelaDTO } from '@/types';

// Carga dinámica del componente 3D para evitar errores de renderizado en servidor
const TerrainScene3D = dynamic(
  () => import('@/components/3d/TerrainScene3D'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[440px] rounded-xl bg-[#18181b] border border-white/5 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-2 animate-bounce">🌱</div>
          <p className="text-zinc-500 text-xs">Cargando modelo 3D del terreno...</p>
        </div>
      </div>
    ),
  }
);

export default function DashboardPage() {
  const { data, loading, error, refresh } = useDashboard(3000);
  const { isAvailable: backendAvailable, checking: backendChecking } = useBackendStatus();
  const [selectedParcelaId, setSelectedParcelaId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [liveWeather, setLiveWeather] = useState<PronosticoClima | null>(null);

  // Consulta meteorológica en tiempo real (Google Weather API / Open-Meteo)
  useEffect(() => {
    let mounted = true;
    const loadWeather = async () => {
      try {
        const w = await fetchLiveWeather();
        if (mounted) setLiveWeather(w);
      } catch (err) {
        console.error('Error al cargar clima en vivo:', err);
      }
    };
    loadWeather();
    const interval = setInterval(loadWeather, 60000); // 1 minuto
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

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

  // Crear nueva parcela
  const handleCreateParcel = useCallback(
    async (dto: CreateParcelaDTO) => {
      try {
        await api.createParcela(dto);
        refresh();
      } catch (err) {
        console.error('Error al crear parcela:', err);
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
          <p className="text-zinc-400 text-sm font-medium">Iniciando Sistema de Riego Inteligente...</p>
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
            className="text-xs px-5 py-2 rounded-full bg-emerald-600 text-white font-medium"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const stats = data.estadisticas;
  const simData = api.getSimulationData();
  const climaDisplay = liveWeather || data.clima;

  return (
    <div className="min-h-screen bg-[#111111] text-white selection:bg-emerald-500/20 antialiased font-sans">
      {/* Barra de Navegación Superior con botón de Nueva Parcela */}
      <Header
        backendStatus={backendAvailable}
        checking={backendChecking}
        onRefresh={refresh}
        onOpenCreateParcel={() => setIsCreateModalOpen(true)}
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
          
          {/* COLUMNA IZQUIERDA: Tarjetas de Información de Sensores por Parcela */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                Monitoreo de Sensores
              </h2>
              <span className="text-xs text-zinc-500 font-medium">
                {data.parcelas.length} Parcelas
              </span>
            </div>

            {data.parcelas.map((pd) => (
              <ParcelaCard
                key={pd.parcela.id}
                data={pd}
                selected={selectedParcelaId === pd.parcela.id}
                onSelect={() => setSelectedParcelaId(pd.parcela.id)}
                onToggleValve={() => handleToggleValve(pd.parcela.id)}
              />
            ))}
          </div>

          {/* COLUMNA DERECHA: Terreno 3D + Clima iOS + Cisterna */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Tarjeta de la Vista del Terreno 3D */}
            <div className="bg-[#18181b] rounded-2xl p-5 border border-white/5 flex flex-col shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-white font-semibold text-base">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-emerald-400"
                  >
                    <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
                    <path d="M9 3.2v15.6" />
                    <path d="M15 5.2v15.6" />
                  </svg>
                  <span>Vista del terreno 3D</span>
                </div>
                <span className="text-[11px] text-zinc-500 font-medium">
                  Rotación interactiva activada
                </span>
              </div>

              {/* Contenedor del lienzo 3D */}
              <div className="w-full h-[420px] md:h-[460px] rounded-xl overflow-hidden">
                <TerrainScene3D
                  parcelas={data.parcelas}
                  tanqueNivel={data.tanques[0]?.nivel_actual_porcentaje ?? 79}
                  tanqueCapacidad={data.tanques[0]?.capacidad_litros ?? 50000}
                  onParcelaSelect={setSelectedParcelaId}
                  selectedParcelaId={selectedParcelaId ?? undefined}
                />
              </div>
            </div>

            {/* Fila con Clima iOS y Cisterna */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Clima estilo iOS */}
              <WeatherWidgetIOS clima={climaDisplay} />

              {/* Cisterna Principal */}
              {data.tanques[0] && <TankPanel tanque={data.tanques[0]} />}
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* PANEL DE SIMULACIÓN (PARA PRESENTACIÓN / DEMO HACKATHON)                   */}
        {/* ========================================================================= */}
        <SimulationPanel onUpdateData={handleSimulationUpdate} data={simData} />

        {/* Modal para Crear Nueva Parcela (Aporte de Diego integrado) */}
        <CreateParcelModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateParcel}
        />
      </main>
    </div>
  );
}
