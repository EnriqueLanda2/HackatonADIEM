'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect } from 'react';
import { useDashboard, useBackendStatus } from '@/hooks/useDashboard';
import { api } from '@/lib/api';
import { fetchLiveWeather } from '@/lib/weather-service';
import ParcelaCard from '@/components/dashboard/ParcelaCard';
import WeatherWidgetIOS from '@/components/dashboard/WeatherWidgetIOS';
import DroneControlPanel from '@/components/dashboard/DroneControlPanel';
import CreateParcelModal from '@/components/dashboard/CreateParcelModal';
import AlertsPanel from '@/components/dashboard/AlertsPanel';
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
      <div className="w-full h-full min-h-[440px] rounded-xl bg-[#233506] border border-[#8DA432]/30 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-2 animate-bounce">🌱</div>
          <p className="text-[#EDE383] text-xs">Cargando modelo 3D del terreno...</p>
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

  // Toggle de válvula manual/automática
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

  // Descartar alerta
  const handleDismissAlert = useCallback(
    async (alertaId: string) => {
      try {
        await api.marcarAlertaLeida(alertaId);
        refresh();
      } catch (err) {
        console.error('Error al descartar alerta:', err);
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
      <div className="min-h-screen bg-[#192604] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🌱</div>
          <p className="text-[#EDE383] text-sm font-medium">Iniciando Sistema de Riego Inteligente...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#192604] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-[#EDE383] text-sm mb-4">{error || 'Error al conectar'}</p>
          <button
            onClick={refresh}
            className="text-xs px-5 py-2 rounded-full bg-[#8DA432] hover:bg-[#365004] text-[#FFFCE9] font-medium border border-[#EDE383]/40 transition-colors shadow-md"
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
  const dronData = data.dron || api.getDronState();

  return (
    <div className="min-h-screen bg-[#192604] text-[#FFFCE9] selection:bg-[#8DA432]/30 antialiased font-sans">
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
          <div className="bg-[#233506]/70 border border-[#8DA432]/20 rounded-xl p-3.5">
            <div className="text-[#EDE383] text-sm mb-1.5 font-normal">Parcelas activas</div>
            <div className="text-3xl font-semibold tracking-tight text-[#FFFCE9]">
              {stats.parcelas_activas} / {stats.total_parcelas}
            </div>
          </div>

          <div className="bg-[#233506]/70 border border-[#8DA432]/20 rounded-xl p-3.5">
            <div className="text-[#EDE383] text-sm mb-1.5 font-normal">Válvulas abiertas</div>
            <div className="text-3xl font-semibold tracking-tight text-[#FFFCE9]">
              {stats.valvulas_abiertas}
            </div>
          </div>

          <div
            className={`rounded-xl p-3.5 transition-colors ${
              stats.alertas_sin_leer > 0
                ? 'bg-[#925E06]/35 border border-[#925E06]'
                : 'bg-[#233506]/70 border border-[#8DA432]/20'
            }`}
          >
            <div
              className={`text-sm mb-1.5 font-normal ${
                stats.alertas_sin_leer > 0 ? 'text-[#EDE383] font-semibold' : 'text-[#EDE383]'
              }`}
            >
              Alertas {stats.alertas_sin_leer > 0 ? '⚠️' : ''}
            </div>
            <div
              className={`text-3xl font-semibold tracking-tight ${
                stats.alertas_sin_leer > 0 ? 'text-[#FFFCE9]' : 'text-[#FFFCE9]'
              }`}
            >
              {stats.alertas_sin_leer}
            </div>
          </div>

          <div className="bg-[#233506]/70 border border-[#8DA432]/20 rounded-xl p-3.5">
            <div className="text-[#EDE383] text-sm mb-1.5 font-normal">Litros hoy</div>
            <div className="text-3xl font-semibold tracking-tight text-[#FFFCE9]">
              {Number(stats.litros_hoy ?? 0).toLocaleString('es-MX')}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECCIÓN PRINCIPAL: PARCELAS A LA IZQUIERDA, VISTA 3D Y DRON A LA DERECHA */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-6">
          
          {/* COLUMNA IZQUIERDA: Tarjetas de Información de Sensores por Parcela */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-[#EDE383] uppercase tracking-wider">
                Monitoreo de Sensores
              </h2>
              <span className="text-xs text-[#EDE383]/70 font-medium">
                {data.parcelas.length} Parcelas en Morelos
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

          {/* COLUMNA DERECHA: Terreno 3D + Sistema de Dron + Clima iOS + Cisterna */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Tarjeta de la Vista del Terreno 3D */}
            <div className="bg-[#233506] rounded-2xl p-5 border border-[#8DA432]/30 flex flex-col shadow-lg shadow-black/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-[#FFFCE9] font-semibold text-base">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[#8DA432]"
                  >
                    <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
                    <path d="M9 3.2v15.6" />
                    <path d="M15 5.2v15.6" />
                  </svg>
                  <span>Vista del terreno 3D</span>
                </div>
                <span className="text-[11px] text-[#EDE383]/70 font-medium">
                  Rotación 360° · Dron y Telemetría en vivo
                </span>
              </div>

              {/* Contenedor del lienzo 3D */}
              <div className="w-full h-[440px] md:h-[480px] rounded-xl overflow-hidden">
                <TerrainScene3D
                  parcelas={data.parcelas}
                  tanqueNivel={Number(data.tanques[0]?.nivel_actual_porcentaje ?? 79)}
                  tanqueCapacidad={Number(data.tanques[0]?.capacidad_litros ?? 50000)}
                  dron={dronData}
                  onParcelaSelect={setSelectedParcelaId}
                  selectedParcelaId={selectedParcelaId ?? undefined}
                />
              </div>
            </div>

            {/* Panel de Control de Riego por Dron y Modo Maestro */}
            <DroneControlPanel
              dron={dronData}
              modoGlobal={data.modo_global_riego ?? 'automatico'}
              onRefresh={refresh}
            />

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
        {/* PANEL DE ALERTAS ACTIVAS                                                  */}
        {/* ========================================================================= */}
        {data.alertas_activas.length > 0 && (
          <div className="mb-6">
            <AlertsPanel
              alertas={data.alertas_activas}
              onDismiss={handleDismissAlert}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* PANEL DE SIMULACIÓN (PARA PRESENTACIÓN / DEMO HACKATHON)                   */}
        {/* ========================================================================= */}
        <SimulationPanel onUpdateData={handleSimulationUpdate} data={simData} />

        {/* Modal para Crear Nueva Parcela */}
        <CreateParcelModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateParcel}
        />
      </main>
    </div>
  );
}
