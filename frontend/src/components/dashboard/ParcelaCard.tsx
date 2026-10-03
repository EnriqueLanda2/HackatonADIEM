'use client';

import { ParcelaDashboard } from '@/types';

interface ParcelaCardProps {
  data: ParcelaDashboard;
  onToggleValve?: () => void;
  selected?: boolean;
  onSelect?: () => void;
}

export default function ParcelaCard({
  data,
  onToggleValve,
  selected,
  onSelect,
}: ParcelaCardProps) {
  const { parcela, cultivo, humedad_suelo, temperatura, humedad_ambiental, valvula_estado } = data;
  const hasCrop = Boolean(parcela.tiene_cultivo && cultivo);
  const isOpen = valvula_estado === 'abierta';

  // Semáforo discreto de Humedad
  let statusText = 'Óptimo';
  let dotColor = 'bg-emerald-400';
  let badgeClasses = 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300';
  let barColor = 'from-emerald-500 to-teal-400';

  if (humedad_suelo < 35) {
    statusText = 'Crítico';
    dotColor = 'bg-rose-400';
    badgeClasses = 'bg-rose-950/40 border-rose-500/30 text-rose-300';
    barColor = 'from-rose-500 to-red-400';
  } else if (humedad_suelo < 50) {
    statusText = 'Bajo';
    dotColor = 'bg-amber-400';
    badgeClasses = 'bg-amber-950/40 border-amber-500/30 text-amber-300';
    barColor = 'from-amber-500 to-yellow-400';
  } else if (humedad_suelo >= 85) {
    statusText = 'Saturado (Lleno)';
    dotColor = 'bg-sky-400';
    badgeClasses = 'bg-sky-950/40 border-sky-500/30 text-sky-300';
    barColor = 'from-blue-500 to-sky-400';
  }

  const cropTitle = hasCrop && cultivo ? cultivo.nombre : (parcela.nombre || 'Parcela');
  const cropIcon = hasCrop && cultivo ? cultivo.icono : '🍂';
  const phVal = data.ph_suelo ?? (cultivo?.id === 'arroz' ? 6.5 : cultivo?.id === 'tomate_rojo' ? 6.2 : 6.8);

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl px-4 py-3 border transition-all cursor-pointer bg-[#18181b]/80 backdrop-blur-sm shadow-sm flex flex-col gap-2.5 ${
        selected
          ? 'border-emerald-500/60 ring-1 ring-emerald-500/30 bg-[#1c1c20]'
          : 'border-white/[0.08] hover:border-white/20'
      }`}
    >
      {/* Fila 1: Título discreto, icono y badge semáforo */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base select-none shrink-0">{cropIcon}</span>
          <div className="min-w-0">
            <h3 className="font-semibold text-zinc-100 text-sm tracking-tight truncate">
              {cropTitle}
            </h3>
            <span className="text-[10px] text-zinc-500 font-medium">
              {parcela.nombre || `Zona ${parcela.zona_3d}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isOpen && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Regando
            </span>
          )}
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium flex items-center gap-1.5 ${badgeClasses}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
            <span>{humedad_suelo.toFixed(0)}% · {statusText}</span>
          </span>
        </div>
      </div>

      {/* Fila 2: Micro barra de progreso de humedad */}
      <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-700 bg-gradient-to-r ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(0, humedad_suelo))}%` }}
        />
      </div>

      {/* Fila 3: Fila horizontal de sensores discretos + Botón de Riego */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.04]">
        {/* Lecturas en formato minimalista */}
        <div className="flex items-center gap-2.5 text-[11px] text-zinc-400 font-mono">
          <span title="Temperatura del suelo" className="text-zinc-300">
            🌡️ {temperatura.toFixed(1)}°C
          </span>
          <span className="text-zinc-600">·</span>
          <span title="pH del suelo" className="text-emerald-400 font-medium">
            🧪 {phVal.toFixed(1)}
          </span>
          <span className="text-zinc-600">·</span>
          <span title="Humedad relativa del aire" className="text-sky-300">
            🌫️ {humedad_ambiental.toFixed(0)}%
          </span>
        </div>

        {/* Botón funcional de acción de riego */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleValve?.();
          }}
          className={`text-[11px] px-3 py-1 rounded-lg border font-semibold transition-all shrink-0 flex items-center gap-1.5 active:scale-95 ${
            isOpen
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
          }`}
        >
          {isOpen ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              Detener
            </>
          ) : (
            <>
              <span>💧</span>
              Regar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
