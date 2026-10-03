'use client';

import { ParcelaDashboard } from '@/types';

interface ParcelaCardProps {
  data: ParcelaDashboard;
  onToggleValve?: () => void;
}

export default function ParcelaCard({ data, onToggleValve }: ParcelaCardProps) {
  const { parcela, cultivo, humedad_suelo, temperatura, valvula_estado } = data;

  // Semáforo según humedad
  let statusLabel = 'Óptimo';
  let badgeClasses = 'bg-emerald-950/70 border-emerald-500/30 text-emerald-400';
  let barColor = 'bg-emerald-500';

  if (humedad_suelo < 35) {
    statusLabel = 'Crítico';
    badgeClasses = 'bg-rose-950/70 border-rose-500/30 text-rose-400';
    barColor = 'bg-rose-500';
  } else if (humedad_suelo < 50) {
    statusLabel = 'Bajo';
    badgeClasses = 'bg-amber-950/70 border-amber-500/30 text-amber-400';
    barColor = 'bg-amber-500';
  } else if (humedad_suelo > 75) {
    statusLabel = 'Saturado';
    badgeClasses = 'bg-blue-950/70 border-blue-500/30 text-blue-400';
    barColor = 'bg-blue-500';
  }

  // Nombre de zona amigable (Norte, Centro, Sur)
  const zoneName = parcela.zona_3d === 'zona_alta' 
    ? 'Norte' 
    : parcela.zona_3d === 'zona_baja' 
    ? 'Sur' 
    : 'Centro';

  const cropName = cultivo.nombre.split(' ')[0];
  const isOpen = valvula_estado === 'abierta';

  return (
    <div className="bg-[#18181b] rounded-2xl p-5 border border-white/5 shadow-md flex flex-col justify-between hover:border-white/10 transition-colors">
      <div>
        {/* Cabecera de la tarjeta con nombre y semáforo */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white text-base tracking-tight">
            {zoneName} · {cropName}
          </h3>
          <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${badgeClasses}`}>
            {statusLabel}
          </span>
        </div>

        {/* Métrica principal (Humedad y Temperatura) */}
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-4xl font-bold tracking-tight text-white">
            {humedad_suelo.toFixed(0)}%
          </span>
          <span className="text-base text-zinc-400 font-normal">
            {temperatura.toFixed(1)} °C
          </span>
        </div>

        {/* Barra de progreso semafórica */}
        <div className="w-full bg-zinc-800/80 h-2 rounded-full overflow-hidden mb-5">
          <div
            className={`h-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(100, Math.max(0, humedad_suelo))}%` }}
          />
        </div>
      </div>

      {/* Control inferior de Válvula */}
      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          {isOpen ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-zinc-500"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          )}
          <span className={`text-sm ${isOpen ? 'text-zinc-200' : 'text-zinc-500'}`}>
            Válvula {isOpen ? 'abierta' : 'cerrada'}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleValve?.();
          }}
          className={`text-xs px-4 py-1.5 rounded-full border transition-all font-medium ${
            isOpen
              ? 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
              : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
          }`}
        >
          {isOpen ? 'Cerrar' : 'Abrir'}
        </button>
      </div>
    </div>
  );
}
