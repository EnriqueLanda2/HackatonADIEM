'use client';

import { useState } from 'react';
import { PronosticoClima, TanqueAgua } from '@/types';
import { api } from '@/lib/api';

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
    <header className="bg-[#365004] border-b border-[#8DA432]/40 py-4 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo y Nombre */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#233506] border border-[#8DA432]/50 flex items-center justify-center text-2xl shadow-inner">
            🌱
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-[#FFFCE9] font-bold text-xl tracking-tight">
              Riego Inteligente
            </h1>
            <span className="text-[#EDE383] text-sm font-medium">Morelos · AgroTech</span>
          </div>
        </div>

        {/* Acciones y Botones */}
        <div className="flex items-center gap-3">
          {onOpenCreateParcel && (
            <button
              onClick={onOpenCreateParcel}
              className="bg-[#8DA432] hover:bg-[#233506] text-[#FFFCE9] text-xs font-bold px-4 py-2 rounded-xl border border-[#EDE383]/40 shadow-md shadow-black/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Nueva Parcela</span>
            </button>
          )}

          <span className="text-xs px-3 py-1.5 rounded-xl font-semibold bg-[#925E06]/30 text-[#EDE383] border border-[#925E06]">
            {backendStatus ? '● En línea' : '⚡ Modo Demo'}
          </span>

          <button
            onClick={onRefresh}
            className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl border border-[#8DA432]/60 bg-[#233506]/60 text-[#FFFCE9] hover:bg-[#8DA432] hover:text-[#FFFCE9] transition-all font-medium cursor-pointer shadow-sm"
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
            <span>Actualizar</span>
          </button>
        </div>
      </div>
    </header>
  );
}

// =============================================================================
// Panel de Cisterna Principal
// =============================================================================
export function TankPanel({ tanque }: { tanque: TanqueAgua }) {
  const [refilling, setRefilling] = useState(false);
  const nivel = Number(tanque?.nivel_actual_porcentaje ?? 0);
  const capacidad = Number(tanque?.capacidad_litros ?? 50000);
  const isCritical = nivel < 25;
  const volumenActual = ((capacidad * nivel) / 100 / 1000).toFixed(1);
  const capacidadTotal = (capacidad / 1000).toFixed(0);

  const handleRefillCistern = () => {
    setRefilling(true);
    api.rellenarTanque(100);
    setTimeout(() => setRefilling(false), 2000);
  };

  return (
    <div className="bg-[#273a06] rounded-2xl p-5 border border-[#8DA432]/35 flex flex-col justify-between shadow-lg shadow-black/15">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-[#FFFCE9] font-bold text-base">
          <span className="text-xl">🚰</span>
          <span>Cisterna Principal</span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
          nivel >= 95 
            ? 'bg-[#8DA432]/30 text-[#EDE383] border-[#8DA432]'
            : isCritical
            ? 'bg-[#925E06]/40 text-[#FFFCE9] border-[#925E06]'
            : 'bg-[#365004]/60 text-[#EDE383] border-[#8DA432]/40'
        }`}>
          {nivel >= 95 ? 'Corte Flotador Activo' : isCritical ? 'Reserva Crítica' : 'Nivel Operativo'}
        </span>
      </div>

      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-2.5">
          <span className="text-4xl font-extrabold tracking-tight text-[#FFFCE9]">
            {nivel.toFixed(0)}%
          </span>
          <span className="text-xs text-[#EDE383] font-medium">
            {volumenActual} / {capacidadTotal} m³
          </span>
        </div>
        <button
          onClick={handleRefillCistern}
          disabled={refilling || nivel >= 98}
          className="text-xs px-3.5 py-1.5 rounded-xl font-bold bg-[#8DA432] hover:bg-[#365004] text-[#FFFCE9] border border-[#EDE383]/40 shadow-sm transition-all disabled:opacity-40 cursor-pointer"
        >
          {refilling ? 'Llenando...' : nivel >= 98 ? 'Cisterna Llena' : 'Rellenar Cisterna'}
        </button>
      </div>

      <div className="w-full bg-[#1c2a04] h-2.5 rounded-full overflow-hidden border border-[#8DA432]/30">
        <div
          className={`h-full transition-all duration-1000 ${
            isCritical ? 'bg-[#925E06]' : 'bg-[#8DA432]'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, nivel))}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[#EDE383]/70 mt-1.5">
        <span>0 m³</span>
        <span>Sensor Boya / Ultrasonido OK</span>
        <span>{capacidadTotal} m³</span>
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
    <div className="bg-[#273a06] rounded-2xl p-5 border border-[#8DA432]/35 mt-6 shadow-lg shadow-black/15">
      <h3 className="text-[#FFFCE9] text-sm font-bold mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span>🎮</span> Simulación de Sensores (Tinkercad & Banco de Pruebas)
        </span>
        <span className="text-[10px] text-[#EDE383] font-semibold bg-[#365004] px-2.5 py-1 rounded-lg border border-[#8DA432]/30">
          Telemetría en Vivo
        </span>
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {sliders.map(({ key, label, min, max, step, unit }) => (
          <div key={key} className="bg-[#1c2a04] p-3 rounded-xl border border-[#8DA432]/25">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[#EDE383] text-[11px] font-medium truncate">{label}</span>
              <span className="text-[#FFFCE9] font-mono font-bold text-[11px]">
                {Number(data[key] ?? (key === 'ph_tierra' ? 6.8 : 50)).toFixed(key === 'ph_tierra' || key === 'temperatura' ? 1 : 0)}
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
              className="w-full h-1.5 bg-[#2a3d06] rounded-lg appearance-none cursor-pointer accent-[#8DA432]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
