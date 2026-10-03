'use client';

import { ParcelaDashboard, SeleccionRiego } from '@/types';
import { metodoRiegoDe, RIEGO_POR_METODO } from '@/lib/api';
import MetodoRiegoSelector from './MetodoRiegoSelector';

interface ParcelaCardProps {
  data: ParcelaDashboard;
  onToggleValve?: () => void;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onChangeMetodo?: (seleccion: SeleccionRiego) => void;
  mostrarPlagas?: boolean; // IA de plagas: solo plan Pro
  modoGlobal?: 'automatico' | 'manual';
}

// Estilos de cada estado de humedad, todos dentro de la paleta.
const HUMEDAD_ESTADOS = {
  critico: { label: 'Crítico', badge: 'bg-goldenbrown text-creme border-goldenbrown', bar: 'bg-goldenbrown', accent: 'bg-goldenbrown' },
  bajo: { label: 'Bajo', badge: 'bg-goldenbrown/25 text-flax border-goldenbrown/70', bar: 'bg-flax', accent: 'bg-flax' },
  optimo: { label: 'Óptimo', badge: 'bg-applegreen/20 text-applegreen border-applegreen/60', bar: 'bg-applegreen', accent: 'bg-applegreen' },
  saturado: { label: 'Saturado', badge: 'bg-darkgreen text-flax border-applegreen/50', bar: 'bg-darkgreen', accent: 'bg-darkgreen' },
} as const;

export default function ParcelaCard({
  data,
  onToggleValve,
  selected,
  onSelect,
  onEdit,
  onChangeMetodo,
  mostrarPlagas = true,
  modoGlobal = 'automatico',
}: ParcelaCardProps) {
  const { parcela, cultivo, valvula_estado } = data;
  const humedad_suelo = Number(data.humedad_suelo ?? 0);
  const temperatura = Number(data.temperatura ?? 24);
  const humedad_ambiental = Number(data.humedad_ambiental ?? 60);

  const hasCrop = Boolean(parcela.tiene_cultivo && cultivo);

  // Umbrales del cultivo; una parcela en descanso usa rangos genéricos.
  const minima = hasCrop && cultivo ? Number(cultivo.humedad_minima) : 35;
  const optima = hasCrop && cultivo ? Number(cultivo.humedad_optima) : 50;
  const maxima = hasCrop && cultivo ? Number(cultivo.humedad_maxima) : 75;

  const estadoHumedad =
    humedad_suelo < minima ? 'critico' : humedad_suelo < optima ? 'bajo' : humedad_suelo <= maxima ? 'optimo' : 'saturado';
  const estilo = HUMEDAD_ESTADOS[estadoHumedad];

  const cropIcon = hasCrop && cultivo ? cultivo.icono : '🍂';
  const isOpen = valvula_estado === 'abierta';
  const tuberiaPendiente = Boolean(data.tuberia_pendiente);
  const bloqueado = modoGlobal === 'automatico' || tuberiaPendiente;
  const metodo = data.metodo_riego ?? metodoRiegoDe(data);
  const instalados = data.sistemas_instalados ?? [];
  const caudal = Number(data.caudal_lpm ?? 0);
  const eficiencia = Number(data.eficiencia_riego ?? 0);
  const riesgo = data.riesgo_plaga;
  const escaneo = data.ultimo_escaneo;
  const riesgoPct = Math.round((riesgo?.probabilidad ?? 0) * 100);
  const riesgoColor = riesgo?.nivel === 'alto' ? 'bg-goldenbrown' : riesgo?.nivel === 'moderado' ? 'bg-flax' : 'bg-applegreen';
  const haceCuanto = (fecha: string) => {
    const min = Math.round((Date.now() - new Date(fecha).getTime()) / 60000);
    return min < 1 ? 'ahora' : min < 60 ? `hace ${min} min` : `hace ${Math.round(min / 60)} h`;
  };

  // pH según cultivo (óptimo 6.0 a 7.2)
  const phRaw = Number(data.ph_suelo ?? (cultivo?.id?.includes('arroz') ? 6.5 : cultivo?.id?.includes('tomate') ? 6.2 : 6.8));
  const phVal = isNaN(phRaw) ? 6.8 : phRaw;
  const phStatus = phVal >= 6.0 && phVal <= 7.2 ? 'Neutro' : phVal < 6.0 ? 'Ácido' : 'Alcalino';
  const frecuenciaRiego = cultivo?.frecuencia_riego_horas;
  const proximoRiego = frecuenciaRiego
    ? new Date(Date.now() + frecuenciaRiego * 60 * 60 * 1000).toLocaleString('es-MX', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'No programado';

  const sensores = [
    { icon: '🌡️', label: 'Temperatura', value: `${temperatura.toFixed(1)}°C`, hint: 'Suelo' },
    { icon: '🧪', label: 'pH', value: phVal.toFixed(1), hint: phStatus },
    { icon: '🌫️', label: 'HR aire', value: `${humedad_ambiental.toFixed(0)}%`, hint: 'Ambiente' },
  ];

  return (
    <article
      onClick={onSelect}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card shadow-lg shadow-black/20 transition-all ${
        selected ? 'border-flax ring-2 ring-flax/30' : 'border-applegreen/20 hover:border-applegreen/60'
      } ${parcela.activa ? '' : 'opacity-70'}`}
    >
      {/* Franja superior con el color del estado hídrico */}
      <div className={`h-1 w-full ${estilo.accent}`} />

      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* Cabecera: identidad de la parcela */}
        <header className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-applegreen/30 bg-darkgreen text-2xl">
            {cropIcon}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold leading-tight tracking-tight text-creme">{parcela.nombre}</h3>
            <p className="mt-1 truncate text-xs text-flax/75">
              {hasCrop && cultivo ? cultivo.nombre : 'En descanso / barbecho'}
              {parcela.superficie_hectareas ? ` · ${Number(parcela.superficie_hectareas).toFixed(1)} ha` : ''}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${estilo.badge}`}>{estilo.label}</span>
              <span
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                  parcela.activa ? 'border-applegreen/30 text-applegreen' : 'border-goldenbrown/50 text-flax/70'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${parcela.activa ? 'bg-applegreen' : 'bg-goldenbrown'}`} />
                {parcela.activa ? 'Activa' : 'Inactiva'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            title="Editar parcela"
            aria-label="Editar parcela"
            className="shrink-0 rounded-lg border border-applegreen/30 p-2 text-flax transition-colors hover:border-applegreen hover:bg-darkgreen hover:text-creme"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        </header>

        {/* Humedad del suelo con los umbrales del cultivo */}
        <section className="rounded-xl border border-applegreen/15 bg-panel p-4">
          <div className="flex items-end justify-between">
            <span className="text-xs font-semibold text-flax">💧 Humedad del suelo</span>
            <span className="text-3xl font-black leading-none tracking-tight text-creme">
              {humedad_suelo.toFixed(0)}
              <span className="ml-0.5 text-sm font-medium text-flax/70">%</span>
            </span>
          </div>

          <div className="relative mt-3 h-2.5 w-full rounded-full bg-field">
            {/* Banda objetivo entre óptimo y máximo */}
            <div
              className="absolute inset-y-0 rounded-full bg-applegreen/20"
              style={{ left: `${optima}%`, width: `${Math.max(0, maxima - optima)}%` }}
            />
            <div
              className={`relative h-full rounded-full transition-all duration-500 ${estilo.bar}`}
              style={{ width: `${Math.min(100, Math.max(0, humedad_suelo))}%` }}
            />
            {[minima, optima].map((marca) => (
              <span
                key={marca}
                className="absolute -top-1 h-[18px] w-0.5 rounded-full bg-creme/70"
                style={{ left: `${marca}%` }}
              />
            ))}
          </div>

          <div className="mt-2 flex justify-between text-[10px] font-medium text-flax/65">
            <span>Mín {minima.toFixed(0)}%</span>
            <span>Óptimo {optima.toFixed(0)}%</span>
            <span>Máx {maxima.toFixed(0)}%</span>
          </div>
        </section>

        {/* Sensores */}
        <section className="grid grid-cols-3 gap-2">
          {sensores.map((sensor) => (
            <div key={sensor.label} className="rounded-xl border border-applegreen/15 bg-panel px-2 py-2.5 text-center">
              <div className="text-[10px] font-semibold text-flax/80">
                {sensor.icon} {sensor.label}
              </div>
              <div className="mt-0.5 text-sm font-extrabold text-creme">{sensor.value}</div>
              <div className="truncate text-[9px] text-flax/55">{sensor.hint}</div>
            </div>
          ))}
        </section>

        {/* IA de plagas: riesgo estimado y último escaneo del dron */}
        {mostrarPlagas && hasCrop && riesgo && (
          <section className="space-y-2 rounded-xl border border-applegreen/15 bg-panel px-3 py-3">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-semibold text-flax/80">🤖 IA de plagas</span>
              <span className="text-flax/60">
                Riesgo <b className="text-creme">{riesgoPct}%</b> · {riesgo.nivel}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-field">
              <div className={`h-full rounded-full transition-all duration-700 ${riesgoColor}`} style={{ width: `${riesgoPct}%` }} />
            </div>
            <p className="truncate text-[10px] text-flax/65" title={riesgo.factores.join(' · ')}>
              {riesgo.factores.length ? riesgo.factores.slice(0, 2).join(' · ') : 'Condiciones poco favorables para plagas'}
            </p>
            {escaneo ? (
              <div
                className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-[10px] ${
                  escaneo.plaga_detectada ? 'border-goldenbrown bg-goldenbrown/30 text-creme' : 'border-applegreen/40 bg-applegreen/10 text-applegreen'
                }`}
                title={escaneo.recomendacion}
              >
                <span className="truncate font-bold">
                  {escaneo.plaga_detectada ? `🐛 Plaga: ${escaneo.plaga}` : '✅ Sin plaga'}
                </span>
                <span className="shrink-0 opacity-80">
                  {Math.round(escaneo.confianza * 100)}% · {haceCuanto(escaneo.fecha)}
                </span>
              </div>
            ) : (
              <div className="rounded-lg border border-applegreen/15 px-2.5 py-1.5 text-[10px] text-flax/60">
                Sin escanear · probable {riesgo.plaga_probable.split(' (')[0].toLowerCase()}
              </div>
            )}
          </section>
        )}

        {/* Sistema de riego de la parcela */}
        {hasCrop && (
          <section className="space-y-2.5 rounded-xl border border-applegreen/15 bg-panel px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold text-flax/80">🚿 Riego por tubería</span>
              <span className="text-[10px] text-flax/60">
                Instalado: <b className="text-creme">{instalados.length ? instalados.map((m) => RIEGO_POR_METODO[m].label).join(' + ') : 'nada aún'}</b>
              </span>
            </div>
            <MetodoRiegoSelector compact value={metodo} onChange={(m) => onChangeMetodo?.(m)} disabled={!onChangeMetodo} instalados={instalados} />
            {tuberiaPendiente && (
              <div className="rounded-lg border border-goldenbrown bg-goldenbrown/30 px-2.5 py-1.5 text-[10px] font-semibold text-creme">
                🛠️ El sistema elegido no tiene tubería terminada. Elige uno instalado o espera a que el técnico termine la instalación.
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div>
                <div className="text-flax/60">Caudal</div>
                <div className={`mt-0.5 text-xs font-bold ${isOpen ? 'text-applegreen' : 'text-creme'}`}>
                  {isOpen ? `${caudal.toLocaleString('es-MX')} L/min` : 'Sin flujo'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-flax/60">Eficiencia</div>
                <div className="mt-0.5 text-xs font-bold text-creme">{eficiencia ? `${Math.round(eficiencia * 100)}%` : '—'}</div>
              </div>
              <div className="text-right">
                <div className="text-flax/60">Usado hoy</div>
                <div className="mt-0.5 text-xs font-bold text-creme">{Number(data.litros_hoy ?? 0).toLocaleString('es-MX')} L</div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-applegreen/10 pt-2 text-[10px]">
              <span className="text-flax/60">
                🗓️ Próximo: <b className="text-creme">{proximoRiego}</b>
              </span>
              <span className="text-flax/60">
                Cada <b className="text-creme">{frecuenciaRiego ? (frecuenciaRiego >= 24 ? `${frecuenciaRiego / 24} d` : `${frecuenciaRiego} h`) : '—'}</b>
              </span>
            </div>
          </section>
        )}
      </div>

      {/* Electroválvula */}
      <footer className="flex items-center justify-between gap-3 border-t border-applegreen/15 bg-ink/40 px-5 py-3">
        <div className="flex items-center gap-2 text-xs">
          <span className={`h-2.5 w-2.5 rounded-full ${isOpen ? 'animate-pulse bg-applegreen' : 'bg-field ring-1 ring-flax/40'}`} />
          <span className={isOpen ? 'font-bold text-applegreen' : 'font-medium text-flax/70'}>
            {isOpen ? (metodo === 'goteo' ? 'Goteando' : metodo === 'microaspersion' ? 'Microaspersores encendidos' : metodo === 'aspersion_presurizada' ? 'Aspersores encendidos' : 'Múltiples sistemas activos') : 'Válvula cerrada'}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleValve?.();
          }}
          disabled={bloqueado}
          title={tuberiaPendiente ? 'La tubería aún no está instalada' : bloqueado ? 'Cambia a modo manual para modificar el riego' : undefined}
          className={`rounded-xl border px-4 py-2 text-xs font-bold shadow-md transition-all ${
            bloqueado
              ? 'cursor-not-allowed border-applegreen/15 bg-field text-flax/50'
              : isOpen
              ? 'cursor-pointer border-creme/30 bg-goldenbrown text-creme hover:bg-goldenbrown/80'
              : 'cursor-pointer border-flax/40 bg-applegreen text-ink hover:bg-darkgreen hover:text-creme'
          }`}
        >
          {tuberiaPendiente ? '🛠️ Sin tubería' : bloqueado ? '🔒 Automático' : isOpen ? 'Detener riego' : 'Regar parcela'}
        </button>
      </footer>
    </article>
  );
}
