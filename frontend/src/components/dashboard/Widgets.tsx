'use client';

import { PronosticoClima, Estadisticas, TanqueAgua } from '@/types';

// =============================================================================
// Componente: Panel de Clima
// =============================================================================

interface WeatherPanelProps {
  clima: PronosticoClima;
}

export function WeatherPanel({ clima }: WeatherPanelProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
      <h3 className="text-white/70 text-xs font-medium mb-3 flex items-center gap-1">
        ☁️ Pronóstico Meteorológico
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <div className="text-3xl mb-1">
            {clima.pronostico_lluvia_12h ? '🌧️' : '☀️'}
          </div>
          <div className="text-[10px] text-white/50">
            {clima.pronostico_lluvia_12h ? 'Lluvia esperada' : 'Sin lluvia'}
          </div>
          <div className="text-xs text-white/70 font-medium">
            {clima.probabilidad_lluvia}% prob.
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/50">🌡️ Exterior</span>
            <span className="text-xs text-white font-medium">
              {clima.temperatura_exterior.toFixed(1)}°C
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/50">💨 Viento</span>
            <span className="text-xs text-white font-medium">
              {clima.velocidad_viento.toFixed(1)} km/h
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/50">💧 HR Ext</span>
            <span className="text-xs text-white font-medium">
              {clima.humedad_relativa_exterior.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {clima.pronostico_lluvia_12h && (
        <div className="mt-3 bg-blue-500/20 border border-blue-500/30 rounded-lg p-2 text-center">
          <p className="text-[10px] text-blue-300">
            🌧️ Se pronostica lluvia en las próximas 12h. Riegos automáticos
            suspendidos.
          </p>
        </div>
      )}

      <div className="text-[8px] text-white/20 mt-2 text-right">
        Actualizado: {new Date(clima.consultado_at).toLocaleTimeString('es-MX')}
      </div>
    </div>
  );
}

// =============================================================================
// Componente: Panel de Tanque de Agua
// =============================================================================

interface TankPanelProps {
  tanque: TanqueAgua;
}

export function TankPanel({ tanque }: TankPanelProps) {
  const nivel = tanque.nivel_actual_porcentaje;
  const isCritical = nivel < tanque.nivel_critico_porcentaje;
  const isWarning = nivel < tanque.nivel_alerta_porcentaje;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
      <h3 className="text-white/70 text-xs font-medium mb-3 flex items-center gap-1">
        🏗️ {tanque.nombre}
      </h3>

      {/* Visual del tanque */}
      <div className="flex items-end justify-center gap-2 mb-3">
        <div className="relative w-16 h-24 border-2 border-white/30 rounded-b-lg overflow-hidden">
          <div
            className={`absolute bottom-0 w-full transition-all duration-1000 ${
              isCritical
                ? 'bg-red-500/60 animate-pulse'
                : isWarning
                ? 'bg-orange-400/60'
                : 'bg-blue-500/60'
            }`}
            style={{ height: `${nivel}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white font-bold text-lg drop-shadow-lg">
              {nivel.toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="text-[10px] text-white/40 space-y-1">
          <div>Cap: {(tanque.capacidad_litros / 1000).toFixed(0)}m³</div>
          <div>
            Vol: {((tanque.capacidad_litros * nivel) / 100 / 1000).toFixed(1)}m³
          </div>
        </div>
      </div>

      {isCritical && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-2 text-center animate-pulse">
          <p className="text-[10px] text-red-300 font-bold">
            🚨 NIVEL CRÍTICO - Riegos no críticos bloqueados
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Componente: Panel de Estadísticas
// =============================================================================

interface StatsPanelProps {
  stats: Estadisticas;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
      <h3 className="text-white/70 text-xs font-medium mb-3 flex items-center gap-1">
        📊 Estadísticas del Día
      </h3>
      <div className="grid grid-cols-3 gap-2">
        <StatItem
          icon="🌱"
          label="Parcelas"
          value={`${stats.parcelas_activas}/${stats.total_parcelas}`}
        />
        <StatItem
          icon="💧"
          label="Válvulas"
          value={`${stats.valvulas_abiertas} abiertas`}
          highlight={stats.valvulas_abiertas > 0}
        />
        <StatItem
          icon="🔔"
          label="Alertas"
          value={`${stats.alertas_sin_leer}`}
          highlight={stats.alertas_sin_leer > 0}
          highlightColor="red"
        />
        <StatItem icon="💦" label="Litros hoy" value={`${stats.litros_hoy}L`} />
        <StatItem icon="🚿" label="Riegos hoy" value={`${stats.riegos_hoy}`} />
        <StatItem icon="📏" label="Superficie" value="15.5 ha" />
      </div>
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
  highlight,
  highlightColor = 'green',
}: {
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
  highlightColor?: 'green' | 'red';
}) {
  return (
    <div className="bg-black/20 rounded-lg p-2 text-center">
      <div className="text-lg">{icon}</div>
      <div
        className={`text-sm font-bold ${
          highlight
            ? highlightColor === 'red'
              ? 'text-red-400'
              : 'text-green-400'
            : 'text-white'
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] text-white/40">{label}</div>
    </div>
  );
}

// =============================================================================
// Componente: Simulación Manual (para presentación)
// =============================================================================

interface SimulationPanelProps {
  onUpdateData: (key: string, value: number) => void;
  data: Record<string, number>;
}

export function SimulationPanel({ onUpdateData, data }: SimulationPanelProps) {
  const sliders = [
    { key: 'humedad_cana', label: '🌾 Humedad Caña', min: 0, max: 100 },
    { key: 'humedad_tomate', label: '🍅 Humedad Tomate', min: 0, max: 100 },
    { key: 'humedad_arroz', label: '🍚 Humedad Arroz', min: 0, max: 100 },
    { key: 'nivel_tanque', label: '🏗️ Nivel Tanque', min: 0, max: 100 },
    { key: 'temperatura', label: '🌡️ Temperatura', min: 15, max: 40 },
    { key: 'humedad_ambiental', label: '🌫️ HR Ambiental', min: 20, max: 100 },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
      <h3 className="text-white/70 text-xs font-medium mb-3 flex items-center gap-2">
        🎮 Panel de Simulación
        <span className="bg-purple-500/30 text-purple-300 text-[10px] px-2 py-0.5 rounded-full">
          DEMO
        </span>
      </h3>
      <p className="text-[10px] text-white/40 mb-3">
        Ajusta los valores manualmente para simular datos de Tinkercad
      </p>
      <div className="space-y-3">
        {sliders.map(({ key, label, min, max }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-white/60">{label}</label>
              <span className="text-xs text-white font-mono">
                {(data[key] ?? 50).toFixed(key === 'temperatura' ? 1 : 0)}
                {key === 'temperatura' ? '°C' : '%'}
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={key === 'temperatura' ? 0.5 : 1}
              value={data[key] ?? 50}
              onChange={(e) => onUpdateData(key, parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-white
                [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Componente: Header / Navbar
// =============================================================================

interface HeaderProps {
  backendStatus: boolean;
  checking: boolean;
}

export function Header({ backendStatus, checking }: HeaderProps) {
  return (
    <header className="bg-black/30 border-b border-white/10 backdrop-blur-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🌱</div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">
              Riego Inteligente
            </h1>
            <p className="text-white/40 text-[10px]">
              Estado de Morelos · Sistema de Automatización
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Estado de conexión */}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${
                checking
                  ? 'bg-yellow-500 animate-pulse'
                  : backendStatus
                  ? 'bg-green-500'
                  : 'bg-orange-500'
              }`}
            />
            <span className="text-[10px] text-white/50">
              {checking
                ? 'Conectando...'
                : backendStatus
                ? 'API Conectada'
                : 'Modo Demo'}
            </span>
          </div>

          {/* Hora */}
          <div className="text-white/40 text-xs font-mono hidden sm:block">
            {new Date().toLocaleTimeString('es-MX')}
          </div>
        </div>
      </div>
    </header>
  );
}
