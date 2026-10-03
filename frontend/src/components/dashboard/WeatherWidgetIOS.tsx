'use client';

import { PronosticoClima } from '@/types';

interface WeatherWidgetIOSProps {
  clima: PronosticoClima;
}

export default function WeatherWidgetIOS({ clima }: WeatherWidgetIOSProps) {
  const temperatura = Number(clima?.temperatura_exterior ?? 26.5);
  const tempMax = Number(clima?.temperatura_max ?? 32);
  const tempMin = Number(clima?.temperatura_min ?? 19);
  const lluvia = Number(clima?.probabilidad_lluvia ?? 10);
  const humedad = Number(clima?.humedad_relativa_exterior ?? 60);
  const viento = Number(clima?.velocidad_viento ?? 12);
  const hoy = new Date().toISOString().slice(0, 10);
  const dias = clima?.pronostico_dias ?? [];
  const historico = dias.filter((dia) => dia.periodo === 'historico' || (!dia.periodo && (dia.fecha ?? '') < hoy));
  const siguientes = dias.filter((dia) => dia.periodo === 'pronostico' || (!dia.periodo && (dia.fecha ?? '') >= hoy));

  return (
    <div className="bg-card rounded-2xl p-5 border border-applegreen/35 shadow-lg shadow-black/15">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-flax text-xs font-semibold">📍 Cuernavaca, Morelos</div>
          <h3 className="text-4xl font-extrabold text-creme tracking-tight mt-1">{temperatura.toFixed(1)}°</h3>
          <p className="text-xs text-flax font-medium">{clima?.condicion_texto ?? 'Mayormente soleado'}</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-panel border border-applegreen/40 text-flax font-semibold">
            {clima?.fuente_api?.includes('Google') ? 'Google Weather' : 'Satélite en vivo'}
          </span>
          <div className="text-xs text-flax mt-2 font-semibold">Máx. {tempMax}° · Mín. {tempMin}°</div>
        </div>
      </div>

      {clima?.pronostico_por_hora && clima.pronostico_por_hora.length > 0 && (
        <div className="border-t border-b border-applegreen/25 py-3 mb-4">
          <div className="text-[10px] text-flax uppercase tracking-wider mb-2 font-bold">Pronóstico próximas horas</div>
          <div className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1">
            {clima.pronostico_por_hora.map((item, index) => (
              <div key={`${item.hora}-${index}`} className="flex flex-col items-center min-w-[50px] py-2 px-1.5 rounded-xl bg-panel border border-applegreen/20">
                <span className="text-[10px] text-flax">{item.hora}</span>
                <span className="text-lg my-1">{item.icono}</span>
                <span className="text-[10px] font-bold text-creme">{Number(item.probabilidad_lluvia)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-panel p-3 rounded-xl border border-applegreen/25">
          <div className="text-[10px] text-flax font-semibold">🌧️ Lluvia</div>
          <div className="text-lg font-black text-creme">{Math.round(lluvia)}%</div>
          <div className="text-[9px] text-flax/70">{clima?.pronostico_lluvia_12h ? 'Lluvia en 12h' : 'Sin precipitación'}</div>
        </div>
        <div className="bg-panel p-3 rounded-xl border border-applegreen/25">
          <div className="text-[10px] text-flax font-semibold">💨 Viento</div>
          <div className="text-lg font-black text-creme">{viento.toFixed(1)} <span className="text-[10px] font-normal">km/h</span></div>
          <div className="text-[9px] text-flax/70">Ráfagas {clima?.direccion_viento ?? 'SO'}</div>
        </div>
        <div className="bg-panel p-3 rounded-xl border border-applegreen/25">
          <div className="text-[10px] text-flax font-semibold">🌫️ Humedad</div>
          <div className="text-lg font-black text-creme">{Math.round(humedad)}%</div>
          <div className="text-[9px] text-flax/70">Ambiental</div>
        </div>
      </div>

      <div className="mt-4 border-t border-applegreen/25 pt-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] text-flax uppercase tracking-wider font-bold">Historial · últimos 5 días</span>
          <span className="text-[10px] text-flax/70">{historico.filter((d) => d.probabilidad_lluvia >= 35).length} días con lluvia</span>
        </div>
        <div className="no-scrollbar -mx-1 flex snap-x gap-1.5 overflow-x-auto px-1">
          {historico.map((dia) => (
            <div key={dia.fecha ?? dia.dia} className="min-w-[48px] rounded-lg bg-panel border border-applegreen/20 p-1.5 text-center">
              <div className="text-[9px] text-flax/70">{dia.dia}</div>
              <div className="text-sm">{dia.icono}</div>
              <div className="text-[9px] text-creme">{dia.probabilidad_lluvia}%</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 mt-3 mb-2">
          <span className="text-[10px] text-flax uppercase tracking-wider font-bold">Hoy y próximos días</span>
          <span className={`text-[10px] font-bold ${clima.requiere_riego_emergencia ? 'text-creme' : 'text-applegreen'}`}>
            {clima.requiere_riego_emergencia ? 'Riego de emergencia recomendado' : 'Riego pospuesto'}
          </span>
        </div>
        <div className="no-scrollbar -mx-1 flex snap-x gap-1.5 overflow-x-auto px-1">
          {siguientes.map((dia) => (
            <div key={dia.fecha ?? dia.dia} className="min-w-[48px] rounded-lg bg-panel border border-applegreen/20 p-1.5 text-center">
              <div className="text-[9px] text-flax/70">{dia.dia}</div>
              <div className="text-sm">{dia.icono}</div>
              <div className="text-[9px] text-creme">{dia.probabilidad_lluvia}%</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-flax/80 mt-2">
          Próximo riego: <strong className="text-creme">{clima.proximo_riego ?? 'Calculando...'}</strong>
        </p>
        <p className="text-[10px] text-flax/60">{clima.razon_riego_emergencia}</p>
      </div>
    </div>
  );
}
