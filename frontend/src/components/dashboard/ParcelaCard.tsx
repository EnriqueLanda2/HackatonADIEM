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

  // Semáforo con la paleta de la marca:
  // Óptimo: Apple Green (#8DA432)
  // Bajo: Flax (#EDE383)
  // Crítico: Golden Brown (#925E06)
  // Saturado: Dark Green (#365004) / Apple Green
  let statusText = 'Óptimo';
  let dotColor = 'bg-[#8DA432]';
  let badgeClasses = 'bg-[#365004]/50 border-[#8DA432]/50 text-[#EDE383]';
  let barColor = 'from-[#365004] via-[#8DA432] to-[#EDE383]';

  if (humedad_suelo < 35) {
    statusText = 'Crítico';
    dotColor = 'bg-[#925E06]';
    badgeClasses = 'bg-[#925E06]/30 border-[#925E06]/70 text-[#FFFCE9]';
    barColor = 'from-[#925E06] to-[#EDE383]';
  } else if (humedad_suelo < 50) {
    statusText = 'Bajo';
    dotColor = 'bg-[#EDE383]';
    badgeClasses = 'bg-[#925E06]/20 border-[#EDE383]/50 text-[#EDE383]';
    barColor = 'from-[#925E06] to-[#8DA432]';
  } else if (humedad_suelo >= 85) {
    statusText = 'Saturado (Lleno)';
    dotColor = 'bg-[#8DA432]';
    badgeClasses = 'bg-[#365004]/80 border-[#8DA432]/60 text-[#FFFCE9]';
    barColor = 'from-[#8DA432] to-[#FFFCE9]';
  }

  const cropTitle = hasCrop && cultivo ? cultivo.nombre : (parcela.nombre || 'Parcela');
  const cropIcon = hasCrop && cultivo ? cultivo.icono : '🍂';
  const phVal = data.ph_suelo ?? (cultivo?.id === 'arroz' ? 6.5 : cultivo?.id === 'tomate_rojo' ? 6.2 : 6.8);

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl px-4 py-3 border transition-all cursor-pointer bg-[#131d08]/85 backdrop-blur-sm shadow-sm flex flex-col gap-2.5 ${
        selected
          ? 'border-[#EDE383] ring-1 ring-[#EDE383]/40 bg-[#1a270a]'
          : 'border-[#8DA432]/20 hover:border-[#8DA432]/45'
      }`}
    >
      {/* Fila 1: Título discreto, icono y badge semáforo */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base select-none shrink-0">{cropIcon}</span>
          <div className="min-w-0">
            <h3 className="font-semibold text-[#FFFCE9] text-sm tracking-tight truncate">
              {cropTitle}
            </h3>
            <span className="text-[10px] text-[#EDE383]/70 font-medium">
              {parcela.nombre || `Zona ${parcela.zona_3d}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isOpen && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#EDE383] bg-[#365004]/80 px-2 py-0.5 rounded-full border border-[#8DA432]/40 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8DA432]" />
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
      <div className="w-full bg-[#0a1004] h-1.5 rounded-full overflow-hidden border border-[#8DA432]/10">
        <div
          className={`h-full transition-all duration-700 bg-gradient-to-r ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(0, humedad_suelo))}%` }}
        />
      </div>

      {/* Fila 3: Fila horizontal de sensores discretos + Botón de Riego */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#8DA432]/10">
        {/* Lecturas en formato minimalista */}
        <div className="flex items-center gap-2.5 text-[11px] text-[#EDE383]/80 font-mono">
          <span title="Temperatura del suelo" className="text-[#FFFCE9]">
            🌡️ {temperatura.toFixed(1)}°C
          </span>
          <span className="text-[#8DA432]/50">·</span>
          <span title="pH del suelo" className="text-[#EDE383] font-medium">
            🧪 {phVal.toFixed(1)}
          </span>
          <span className="text-[#8DA432]/50">·</span>
          <span title="Humedad relativa del aire" className="text-[#FFFCE9]/90">
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
              ? 'bg-[#925E06]/30 border-[#925E06] text-[#EDE383] hover:bg-[#925E06]/40'
              : 'bg-[#8DA432]/25 border-[#8DA432]/50 text-[#FFFCE9] hover:bg-[#8DA432]/35 shadow-sm shadow-[#365004]/30'
          }`}
        >
          {isOpen ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#EDE383] animate-pulse" />
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
