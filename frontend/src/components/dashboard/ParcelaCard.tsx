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

  // Semáforo de Humedad alineado a la paleta
  let statusLabel = 'Óptimo';
  let badgeClasses = 'bg-[#8DA432]/30 border-[#8DA432] text-[#FFFCE9]';
  let barColor = 'bg-[#8DA432]';
  let statusIcon = '🟢';

  if (humedad_suelo < 35) {
    statusLabel = 'Crítico';
    badgeClasses = 'bg-[#925E06]/70 border-[#925E06] text-[#FFFCE9]';
    barColor = 'bg-[#925E06]';
    statusIcon = '🔴';
  } else if (humedad_suelo < 50) {
    statusLabel = 'Bajo';
    badgeClasses = 'bg-[#925E06]/40 border-[#925E06] text-[#EDE383]';
    barColor = 'bg-[#925E06]';
    statusIcon = '🟡';
  } else if (humedad_suelo > 75) {
    statusLabel = 'Saturado';
    badgeClasses = 'bg-[#365004]/60 border-[#8DA432] text-[#EDE383]';
    barColor = 'bg-[#8DA432]';
    statusIcon = '💧';
  }

  // Nombre amigable de la zona
  const zoneName = parcela.zona_3d === 'zona_alta' 
    ? 'Norte' 
    : parcela.zona_3d === 'zona_baja' 
    ? 'Sur' 
    : 'Centro';

  const cropTitle = hasCrop && cultivo ? cultivo.nombre.split(' ')[0] : 'En descanso';
  const cropIcon = hasCrop && cultivo ? cultivo.icono : '🍂';
  const isOpen = valvula_estado === 'abierta';

  // pH según cultivo (óptimo 6.0 a 7.2)
  const phVal = data.ph_suelo ?? (cultivo?.id === 'arroz' ? 6.5 : cultivo?.id === 'tomate_rojo' ? 6.2 : 6.8);
  const phStatus = phVal >= 6.0 && phVal <= 7.2 ? 'Neutro' : phVal < 6.0 ? 'Ácido' : 'Alcalino';

  return (
    <div
      onClick={onSelect}
      className={`bg-[#273a06] rounded-2xl p-5 border shadow-lg shadow-black/15 flex flex-col justify-between transition-all cursor-pointer ${
        selected
          ? 'border-[#EDE383] ring-2 ring-[#EDE383]/40'
          : 'border-[#8DA432]/35 hover:border-[#8DA432]'
      }`}
    >
      <div>
        {/* Cabecera con Nombre del Cultivo y Semáforo */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl p-1.5 rounded-xl bg-[#1c2a04] border border-[#8DA432]/30">{cropIcon}</span>
            <div>
              <h3 className="font-bold text-[#FFFCE9] text-base tracking-tight leading-tight">
                {parcela.nombre || `${zoneName} · ${cropTitle}`}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-[#8DA432] animate-pulse" />
                <span className="text-[10px] text-[#EDE383] font-medium">
                  {hasCrop ? 'Sensor IoT activo' : 'Parcela en descanso / barbecho'}
                </span>
              </div>
            </div>
          </div>

          <span className={`text-xs px-2.5 py-1 rounded-full border font-bold flex items-center gap-1 ${badgeClasses}`}>
            <span>{statusIcon}</span>
            <span>{statusLabel}</span>
          </span>
        </div>

        {/* Módulo Principal: Humedad del Suelo */}
        <div className="bg-[#1c2a04] rounded-xl p-3 mb-3 border border-[#8DA432]/25">
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-xs font-bold text-[#EDE383] flex items-center gap-1">
              <span>💧 Humedad del Suelo</span>
            </span>
            <span className="text-2xl font-black tracking-tight text-[#FFFCE9]">
              {humedad_suelo.toFixed(0)}<span className="text-sm font-normal text-[#EDE383]/70">%</span>
            </span>
          </div>

          <div className="w-full bg-[#2a3d06] h-2.5 rounded-full overflow-hidden border border-[#8DA432]/30">
            <div
              className={`h-full transition-all duration-500 ${barColor}`}
              style={{ width: `${Math.min(100, Math.max(0, humedad_suelo))}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[#EDE383]/70 mt-1 font-medium">
            <span>0%</span>
            <span>{hasCrop && cultivo ? `Óptimo: ${cultivo.humedad_optima}%` : 'Límite hídrico'}</span>
            <span>100%</span>
          </div>
        </div>

        {/* Matriz de Sensores Críticos */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-[#1c2a04] p-2.5 rounded-xl border border-[#8DA432]/25 text-center">
            <div className="text-[10px] text-[#EDE383] font-semibold mb-0.5">🌡️ Temp</div>
            <div className="text-sm font-extrabold text-[#FFFCE9]">
              {temperatura.toFixed(1)}°C
            </div>
            <div className="text-[9px] text-[#EDE383]/60 font-medium">Suelo</div>
          </div>

          <div className="bg-[#1c2a04] p-2.5 rounded-xl border border-[#8DA432]/25 text-center">
            <div className="text-[10px] text-[#EDE383] font-semibold mb-0.5">🧪 pH Suelo</div>
            <div className="text-sm font-extrabold text-[#8DA432]">
              {phVal.toFixed(1)}
            </div>
            <div className="text-[9px] text-[#EDE383]/60 font-medium truncate">{phStatus}</div>
          </div>

          <div className="bg-[#1c2a04] p-2.5 rounded-xl border border-[#8DA432]/25 text-center">
            <div className="text-[10px] text-[#EDE383] font-semibold mb-0.5">🌫️ HR Aire</div>
            <div className="text-sm font-extrabold text-[#FFFCE9]">
              {humedad_ambiental.toFixed(0)}%
            </div>
            <div className="text-[9px] text-[#EDE383]/60 font-medium">Ambiente</div>
          </div>
        </div>
      </div>

      {/* Control de Actuador / Electroválvula */}
      <div className="flex items-center justify-between pt-3 border-t border-[#8DA432]/25">
        <div className="flex items-center gap-2">
          {isOpen ? (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8DA432] animate-pulse" />
              <span className="text-xs font-bold text-[#8DA432]">Electroválvula Abierta</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-[#EDE383]/60"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="text-xs text-[#EDE383]/70 font-medium">Válvula Cerrada</span>
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleValve?.();
          }}
          className={`text-xs px-4 py-2 rounded-xl border transition-all font-bold cursor-pointer shadow-md ${
            isOpen
              ? 'bg-[#925E06] border-[#FFFCE9]/30 text-[#FFFCE9] hover:bg-[#925E06]/80'
              : 'bg-[#8DA432] hover:bg-[#365004] border-[#EDE383]/40 text-[#FFFCE9]'
          }`}
        >
          {isOpen ? 'Detener Riego' : 'Regar Parcela'}
        </button>
      </div>
    </div>
  );
}
