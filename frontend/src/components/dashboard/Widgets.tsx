'use client';

import { PronosticoClima, TanqueAgua } from '@/types';

// =============================================================================
// Header / Barra Superior
// =============================================================================
interface HeaderProps {
  backendStatus: boolean;
  checking: boolean;
  onRefresh?: () => void;
}

export function Header({ backendStatus, onRefresh }: HeaderProps) {
  return (
    <header className="bg-[#111111] border-b border-white/5 py-4">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo y Nombre */}
        <div className="flex items-center gap-3">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-emerald-500"
          >
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
          </svg>
          <div className="flex items-baseline gap-2">
            <h1 className="text-white font-bold text-xl tracking-tight">
              Riego Inteligente
            </h1>
            <span className="text-zinc-500 text-base font-normal">Morelos</span>
          </div>
        </div>

        {/* Indicadores de estado y acción */}
        <div className="flex items-center gap-3">
          <span className="text-xs px-3 py-1 rounded-full font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
            {backendStatus ? 'En línea' : 'Modo demo'}
          </span>
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 text-xs px-4 py-1.5 rounded-full border border-white/10 text-zinc-300 hover:bg-white/5 hover:border-white/20 transition-all font-medium"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Actualizar
          </button>
        </div>
      </div>
    </header>
  );
}

// =============================================================================
// Panel de Cisterna
// =============================================================================
export function TankPanel({ tanque }: { tanque: TanqueAgua }) {
  const nivel = tanque.nivel_actual_porcentaje;
  const isCritical = nivel < 25;
  const volumenActual = ((tanque.capacidad_litros * nivel) / 100 / 1000).toFixed(1);
  const capacidadTotal = (tanque.capacidad_litros / 1000).toFixed(0);

  return (
    <div className="bg-[#18181b] rounded-2xl p-5 border border-white/5 flex flex-col justify-between">
      <div className="flex items-center gap-2 text-white font-semibold text-base mb-3">
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
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
        <span>Cisterna</span>
      </div>

      <div className="flex items-baseline gap-2.5 mb-3">
        <span className="text-4xl font-bold tracking-tight text-white">
          {nivel.toFixed(0)}%
        </span>
        <span className="text-sm text-zinc-400 font-normal">
          {volumenActual} / {capacidadTotal} m³
        </span>
      </div>

      {/* Barra de progreso de la cisterna */}
      <div className="w-full bg-zinc-800/80 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            isCritical ? 'bg-rose-500' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, nivel))}%` }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Panel de Clima
// =============================================================================
export function WeatherPanel({ clima }: { clima: PronosticoClima }) {
  return (
    <div className="bg-[#18181b] rounded-2xl p-5 border border-white/5 flex flex-col justify-between">
      <div className="flex items-center gap-2 text-white font-semibold text-base mb-3">
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
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
        <span>Clima</span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-zinc-400">Exterior</span>
          <span className="text-white font-medium">
            {clima.temperatura_exterior.toFixed(1)} °C
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-zinc-400">Viento</span>
          <span className="text-white font-medium">
            {clima.velocidad_viento.toFixed(1)} km/h
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-zinc-400">Lluvia</span>
          <span className="text-white font-medium">{clima.probabilidad_lluvia} %</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Panel de Simulación (Ajuste rápido de sensores)
// =============================================================================
export function SimulationPanel({
  onUpdateData,
  data,
}: {
  onUpdateData: (key: string, value: number) => void;
  data: any;
}) {
  const sliders = [
    { key: 'humedad_cana', label: 'Humedad Caña', min: 0, max: 100 },
    { key: 'humedad_tomate', label: 'Humedad Tomate', min: 0, max: 100 },
    { key: 'humedad_arroz', label: 'Humedad Arroz', min: 0, max: 100 },
    { key: 'nivel_tanque', label: 'Nivel Cisterna', min: 0, max: 100 },
  ];

  return (
    <div className="bg-[#18181b] rounded-2xl p-5 border border-white/5 mt-6">
      <h3 className="text-white text-sm font-semibold mb-3 flex items-center justify-between">
        <span>🎮 Simulación de Sensores (Tinkercad)</span>
        <span className="text-[10px] text-zinc-500 font-normal">Ajuste en vivo</span>
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {sliders.map(({ key, label, min, max }) => (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-400">{label}</span>
              <span className="text-white font-mono font-medium">
                {(data[key] ?? 50).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              value={data[key] ?? 50}
              onChange={(e) => onUpdateData(key, parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
