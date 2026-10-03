'use client';

import { PronosticoClima, TanqueAgua } from '@/types';

// =============================================================================
// Header / Barra Superior
// =============================================================================
interface HeaderProps {
  backendStatus: boolean;
  checking: boolean;
  onRefresh?: () => void;
  onOpenCreateParcel?: () => void;
}

export function Header({
  backendStatus,
  onRefresh,
  onOpenCreateParcel,
}: HeaderProps) {
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

        {/* Acciones */}
        <div className="flex items-center gap-3">
          {onOpenCreateParcel && (
            <button
              onClick={onOpenCreateParcel}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-md shadow-emerald-900/30 transition-all flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Nueva Parcela</span>
            </button>
          )}

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
    <div className="bg-[#18181b] rounded-2xl p-5 border border-white/5 flex flex-col justify-between shadow-md">
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
        <span>Cisterna Principal</span>
      </div>

      <div className="flex items-baseline gap-2.5 mb-3">
        <span className="text-4xl font-bold tracking-tight text-white">
          {nivel.toFixed(0)}%
        </span>
        <span className="text-sm text-zinc-400 font-normal">
          {volumenActual} / {capacidadTotal} m³
        </span>
      </div>

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
    { key: 'humedad_cana', label: 'Humedad Caña', min: 0, max: 100, step: 1, unit: '%' },
    { key: 'humedad_tomate', label: 'Humedad Tomate', min: 0, max: 100, step: 1, unit: '%' },
    { key: 'humedad_arroz', label: 'Humedad Arroz', min: 0, max: 100, step: 1, unit: '%' },
    { key: 'nivel_tanque', label: 'Nivel Cisterna', min: 0, max: 100, step: 1, unit: '%' },
    { key: 'ph_tierra', label: 'pH del Suelo', min: 4, max: 9, step: 0.1, unit: ' pH' },
    { key: 'temperatura', label: 'Temp. Suelo', min: 15, max: 40, step: 0.5, unit: '°C' },
  ];

  return (
    <div className="bg-[#18181b] rounded-2xl p-5 border border-white/5 mt-6">
      <h3 className="text-white text-sm font-semibold mb-3 flex items-center justify-between">
        <span>🎮 Simulación de Sensores (Tinkercad)</span>
        <span className="text-[10px] text-zinc-500 font-normal">Ajuste en vivo</span>
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {sliders.map(({ key, label, min, max, step, unit }) => (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-400 text-[11px] truncate">{label}</span>
              <span className="text-white font-mono font-medium text-[11px]">
                {(data[key] ?? (key === 'ph_tierra' ? 6.8 : 50)).toFixed(key === 'ph_tierra' || key === 'temperatura' ? 1 : 0)}
                {unit}
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={data[key] ?? (key === 'ph_tierra' ? 6.8 : 50)}
              onChange={(e) => onUpdateData(key, parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
