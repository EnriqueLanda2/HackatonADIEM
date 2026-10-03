'use client';

import { PronosticoClima, TanqueAgua } from '@/types';

// =============================================================================
// Header / Barra Superior con paleta de marca
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
    <header className="bg-[#131d08]/95 border-b border-[#8DA432]/25 py-4 backdrop-blur-md sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo y Nombre */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#365004]/80 border border-[#8DA432]/40 flex items-center justify-center text-xl shadow-inner shadow-[#8DA432]/20">
            🌱
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-[#FFFCE9] font-bold text-xl tracking-tight">
              Riego Inteligente
            </h1>
            <span className="text-[#EDE383]/70 text-sm font-medium">Morelos</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-3">
          {onOpenCreateParcel && (
            <button
              onClick={onOpenCreateParcel}
              className="bg-[#8DA432] hover:bg-[#8DA432]/90 text-[#0f1706] text-xs font-bold px-3.5 py-1.5 rounded-full shadow-md shadow-[#365004]/40 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Nueva Parcela</span>
            </button>
          )}

          <span className="text-xs px-3 py-1 rounded-full font-semibold bg-[#365004]/50 text-[#EDE383] border border-[#8DA432]/40">
            {backendStatus ? 'En línea' : 'Modo demo'}
          </span>

          <button
            onClick={onRefresh}
            className="flex items-center gap-2 text-xs px-4 py-1.5 rounded-full border border-[#8DA432]/30 text-[#FFFCE9] hover:bg-[#365004]/30 hover:border-[#8DA432]/50 transition-all font-medium active:scale-95"
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
              className="text-[#8DA432]"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span>Actualizar</span>
          </button>
        </div>
      </div>
    </header>
  );
}

// =============================================================================
// Panel de Cisterna Principal con paleta de marca
// =============================================================================
export function TankPanel({
  tanque,
  onToggleRecarga,
}: {
  tanque: TanqueAgua;
  onToggleRecarga?: () => void;
}) {
  const nivel = tanque.nivel_actual_porcentaje;
  const isCritical = nivel < 25;
  const isFull = nivel >= 100;
  const volumenActual = ((tanque.capacidad_litros * nivel) / 100 / 1000).toFixed(1);
  const capacidadTotal = (tanque.capacidad_litros / 1000).toFixed(0);
  const isOpen = tanque.llave_recarga_abierta;

  return (
    <div className="bg-[#131d08]/85 rounded-2xl p-5 border border-[#8DA432]/20 flex flex-col justify-between shadow-md">
      <div className="flex items-center justify-between mb-3">
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
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
          <span>Cisterna Principal</span>
        </div>

        {onToggleRecarga && (
          <button
            onClick={onToggleRecarga}
            className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all flex items-center gap-1.5 active:scale-95 ${
              isOpen
                ? 'bg-[#365004] text-[#EDE383] border-[#8DA432] shadow-md animate-pulse'
                : isFull
                ? 'bg-[#365004]/40 border-[#8DA432]/40 text-[#EDE383] cursor-default'
                : 'bg-[#8DA432]/20 border-[#8DA432]/40 text-[#FFFCE9] hover:bg-[#8DA432]/30'
            }`}
          >
            {isOpen ? (
              <>🚰 Llenando cisterna...</>
            ) : isFull ? (
              <>✅ Cisterna Llena (100%)</>
            ) : (
              <>🚰 Abrir Llave de Pozo</>
            )}
          </button>
        )}
      </div>

      <div className="flex items-baseline gap-2.5 mb-3">
        <span className="text-4xl font-bold tracking-tight text-[#FFFCE9]">
          {nivel.toFixed(0)}%
        </span>
        <span className="text-sm text-[#EDE383]/70 font-normal">
          {volumenActual} / {capacidadTotal} m³
        </span>
        {isFull && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#365004]/60 text-[#EDE383] border border-[#8DA432]/40">
            Sensor de boya: Corte activo
          </span>
        )}
      </div>

      <div className="w-full bg-[#0a1004] h-2 rounded-full overflow-hidden border border-[#8DA432]/10">
        <div
          className={`h-full transition-all duration-700 ${
            isCritical
              ? 'bg-[#925E06]'
              : isFull
              ? 'bg-[#8DA432]'
              : 'bg-gradient-to-r from-[#365004] to-[#8DA432]'
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
    <div className="bg-[#131d08]/85 rounded-2xl p-5 border border-[#8DA432]/20 mt-6 shadow-md">
      <h3 className="text-[#FFFCE9] text-sm font-semibold mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span>🎮</span>
          <span>Simulador de Sensores IoT</span>
        </span>
        <span className="text-[10px] text-[#EDE383]/70 font-medium">Ajuste manual para demo</span>
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {sliders.map(({ key, label, min, max, step, unit }) => (
          <div key={key} className="bg-[#0a1004]/60 p-2.5 rounded-xl border border-[#8DA432]/10">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[#EDE383]/80 text-[11px] truncate font-medium">{label}</span>
              <span className="text-[#FFFCE9] font-mono font-bold text-[11px]">
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
              className="w-full h-1.5 bg-[#1a270a] rounded-lg appearance-none cursor-pointer accent-[#8DA432]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
