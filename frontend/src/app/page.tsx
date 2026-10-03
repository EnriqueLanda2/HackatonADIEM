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
      <div className="w-full h-full min-h-[440px] rounded-xl bg-[#1a1a1a] border border-[#8DA432]/30 flex items-center justify-center">
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
  const [viewMode, setViewMode] = useState<'tarjetas' | 'terreno'>('terreno');
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
      <div className="min-h-screen bg-[#0f110c] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🌱</div>
          <p className="text-[#EDE383] text-sm font-medium">Iniciando agromAI...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0f110c] flex items-center justify-center">
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
    <div className="min-h-screen bg-[#0f110c] text-[#FFFCE9] selection:bg-[#8DA432]/30 antialiased font-sans">
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
          <div className="bg-[#1a1a1a]/70 border border-[#8DA432]/20 rounded-xl p-3.5">
            <div className="text-[#EDE383] text-sm mb-1.5 font-normal">Parcelas activas</div>
            <div className="text-3xl font-semibold tracking-tight text-[#FFFCE9]">
              {stats.parcelas_activas} / {stats.total_parcelas}
            </div>
          </div>

          <div className="bg-[#1a1a1a]/70 border border-[#8DA432]/20 rounded-xl p-3.5">
            <div className="text-[#EDE383] text-sm mb-1.5 font-normal">Válvulas abiertas</div>
            <div className="text-3xl font-semibold tracking-tight text-[#FFFCE9]">
              {stats.valvulas_abiertas}
            </div>
          </div>

          <div
            className={`rounded-xl p-3.5 transition-colors ${
              stats.alertas_sin_leer > 0
                ? 'bg-[#925E06]/35 border border-[#925E06]'
                : 'bg-[#1a1a1a]/70 border border-[#8DA432]/20'
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

          <div className="bg-[#1a1a1a]/70 border border-[#8DA432]/20 rounded-xl p-3.5">
            <div className="text-[#EDE383] text-sm mb-1.5 font-normal">Litros hoy</div>
            <div className="text-3xl font-semibold tracking-tight text-[#FFFCE9]">
              {Number(stats.litros_hoy ?? 0).toLocaleString('es-MX')}
            </div>
          </div>
        </div>
{/* ========================================================================= */}
        {/* SELECTOR DE VISTAS CON ANIMACIÓN                                          */}
        {/* ========================================================================= */}
        <div className="flex justify-center mb-8">
          <div className="bg-[#1a1a1a]/80 p-1.5 rounded-2xl border border-[#8DA432]/30 flex gap-2 shadow-lg relative">
            <div 
              className="absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] bg-[#365004] border border-[#8DA432]/50 rounded-xl shadow-md transition-all duration-300 ease-out z-0"
              style={{ transform: viewMode === 'tarjetas' ? 'translateX(0)' : 'translateX(100%)' }}
            />
            <button
              onClick={() => setViewMode('tarjetas')}
              className={`relative z-10 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                viewMode === 'tarjetas' ? 'text-[#FFFCE9]' : 'text-[#EDE383]/50 hover:text-[#EDE383]'
              }`}
            >
              Parcelas Solitas
            </button>
            <button
              onClick={() => setViewMode('terreno')}
              className={`relative z-10 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                viewMode === 'terreno' ? 'text-[#FFFCE9]' : 'text-[#EDE383]/50 hover:text-[#EDE383]'
              }`}
            >
              Métricas y Modelado
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CONTENIDO PRINCIPAL CON TRANSICIÓN                                        */}
        {/* ========================================================================= */}
        <div className="mb-6 fade-in-container">
          {/* VISTA 1: PARCELAS SOLITAS */}
          {viewMode === 'tarjetas' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between px-1 mb-4">
                <h2 className="text-sm font-semibold text-[#EDE383] uppercase tracking-wider">
                  Monitoreo de Sensores por Parcela
                </h2>
                <span className="text-xs text-[#EDE383]/70 font-medium">
                  {data.parcelas.length} Parcelas activas
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            </div>
          )}

          {/* VISTA 2: MÉTRICAS, CONTROL Y MODELADO 3D */}
          {viewMode === 'terreno' && (
            <div className="animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* COLUMNA IZQUIERDA: Clima y Cisterna Principal */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  <WeatherWidgetIOS clima={climaDisplay} />
                  {data.tanques[0] && <TankPanel tanque={data.tanques[0]} />}
                </div>

                {/* COLUMNA DERECHA: Modelado 3D y Sistema de Dron */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                  <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-[#8DA432]/30 flex flex-col shadow-lg shadow-black/20 min-h-[500px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-[#FFFCE9] font-semibold text-base">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8DA432]">
                          <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
                          <path d="M9 3.2v15.6" /><path d="M15 5.2v15.6" />
                        </svg>
                        <span>Modelado 3D de las Parcelas</span>
                      </div>
                      <span className="text-[11px] text-[#EDE383]/70 font-medium hidden sm:inline">
                        Interactivo · Telemetría en vivo
                      </span>
                    </div>
                    
                    <div className="w-full h-full min-h-[450px] rounded-xl overflow-hidden relative border border-[#8DA432]/10 bg-black/40">
                      <div className="absolute inset-0">
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
                  </div>

                  <DroneControlPanel
                    dron={dronData}
                    modoGlobal={data.modo_global_riego ?? 'automatico'}
                    onRefresh={refresh}
                  />
                </div>
                
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* PANEL DE ALERTAS ACTIVAS                                                  */}
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
