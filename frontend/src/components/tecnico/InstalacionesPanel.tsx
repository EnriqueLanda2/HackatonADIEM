'use client';

import { MetodoRiego, ParcelaDashboard } from '@/types';
import { instalacionesDe, METODOS_RIEGO, RIEGO_POR_METODO, sistemasInstalados } from '@/lib/api';

interface InstalacionesPanelProps {
  parcelas: ParcelaDashboard[];
  onNuevaParcela: () => void;
  onRegistrar: (parcela: ParcelaDashboard, metodo: MetodoRiego) => void;
  onMarcarInstalada: (parcela: ParcelaDashboard, metodo: MetodoRiego) => void;
  onRetirar: (parcela: ParcelaDashboard, metodo: MetodoRiego) => void;
}

const ESTADO_ESTILO = {
  instalada: { label: '✓ Instalada', clase: 'border-applegreen/60 bg-applegreen/20 text-applegreen' },
  pendiente: { label: '⏳ Pendiente', clase: 'border-goldenbrown bg-goldenbrown/40 text-creme' },
  previa: { label: 'Previa (sin registro)', clase: 'border-flax/40 bg-flax/10 text-flax' },
  ninguna: { label: 'No instalada', clase: 'border-applegreen/15 text-flax/50' },
} as const;

// Vista del técnico: alta de parcelas y tuberías de goteo y/o aspersión de cada una.
export default function InstalacionesPanel({ parcelas, onNuevaParcela, onRegistrar, onMarcarInstalada, onRetirar }: InstalacionesPanelProps) {
  const pendientes = parcelas.reduce((total, p) => total + instalacionesDe(p).filter((i) => i.estado === 'pendiente').length, 0);
  const conAmbos = parcelas.filter((p) => sistemasInstalados(p).length === 2).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-applegreen">Vista del técnico</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-creme">Parcelas e instalaciones de tubería</h2>
          <p className="mt-1 text-xs text-flax/65">
            Cada parcela puede tener goteo, aspersión o los dos. Una tubería pendiente no riega hasta marcarla como instalada.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pendientes > 0 && (
            <span className="rounded-full border border-goldenbrown bg-goldenbrown/30 px-3 py-1.5 text-xs font-semibold text-creme">
              {pendientes} pendiente{pendientes > 1 ? 's' : ''}
            </span>
          )}
          {conAmbos > 0 && (
            <span className="rounded-full border border-applegreen/40 px-3 py-1.5 text-xs font-semibold text-applegreen">
              {conAmbos} con goteo + aspersión
            </span>
          )}
          <button
            onClick={onNuevaParcela}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-flax/40 bg-applegreen px-4 py-2 text-xs font-bold text-ink shadow-md transition-all hover:bg-darkgreen hover:text-creme"
          >
            ＋ Nueva parcela
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {parcelas.map((p) => {
          const registradas = p.parcela.instalaciones_riego;
          const instalados = sistemasInstalados(p);

          return (
            <article key={p.parcela.id} className={`flex flex-col gap-3 rounded-2xl border border-applegreen/20 bg-card p-4 ${p.parcela.activa ? '' : 'opacity-60'}`}>
              <div className="min-w-0">
                <h3 className="truncate font-bold text-creme">{p.parcela.nombre}</h3>
                <p className="mt-0.5 text-[11px] text-flax/70">
                  {p.cultivo ? `${p.cultivo.icono} ${p.cultivo.nombre}` : '🍂 En descanso'} · {Number(p.parcela.superficie_hectareas || 0).toFixed(1)} ha
                  {!p.parcela.activa && ' · Inactiva'}
                </p>
              </div>

              {METODOS_RIEGO.map((metodo) => {
                const instalacion = registradas?.find((i) => i.metodo === metodo);
                const estado = instalacion ? instalacion.estado : !registradas && instalados.includes(metodo) ? 'previa' : 'ninguna';
                const estilo = ESTADO_ESTILO[estado];
                const info = RIEGO_POR_METODO[metodo];

                return (
                  <div key={metodo} className="space-y-2 rounded-xl border border-applegreen/15 bg-panel p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-creme">
                        {info.icono} {info.label}
                      </span>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${estilo.clase}`}>{estilo.label}</span>
                    </div>

                    {instalacion && (
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <div className="text-flax/60">Tubería</div>
                          <div className="text-xs font-bold text-creme">{instalacion.metros_tuberia.toLocaleString('es-MX')} m</div>
                        </div>
                        <div className="text-right">
                          <div className="text-flax/60">{metodo === 'goteo' ? 'Goteros' : 'Aspersores'}</div>
                          <div className="text-xs font-bold text-creme">{instalacion.emisores.toLocaleString('es-MX')}</div>
                        </div>
                      </div>
                    )}
                    {instalacion?.fecha && (
                      <p className="text-[10px] text-flax/55">
                        {instalacion.estado === 'instalada' ? 'Instalada' : 'Registrada'} el{' '}
                        {new Date(instalacion.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {instalacion.tecnico ? ` por ${instalacion.tecnico}` : ''}
                        {instalacion.notas ? ` · ${instalacion.notas}` : ''}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => onRegistrar(p, metodo)}
                        className="flex-1 cursor-pointer rounded-lg border border-applegreen/40 bg-darkgreen px-2 py-1.5 text-[11px] font-bold text-creme transition-colors hover:bg-applegreen hover:text-ink"
                      >
                        {instalacion ? 'Editar' : estado === 'previa' ? 'Registrar datos' : 'Instalar'}
                      </button>
                      {estado === 'pendiente' && (
                        <button
                          onClick={() => onMarcarInstalada(p, metodo)}
                          className="flex-1 cursor-pointer rounded-lg border border-flax/40 bg-applegreen px-2 py-1.5 text-[11px] font-bold text-ink transition-colors hover:bg-darkgreen hover:text-creme"
                        >
                          ✓ Marcar instalada
                        </button>
                      )}
                      {instalacion && (
                        <button
                          onClick={() => onRetirar(p, metodo)}
                          title={`Retirar la tubería de ${info.label.toLowerCase()}`}
                          className="cursor-pointer rounded-lg border border-goldenbrown/60 px-2.5 py-1.5 text-[11px] font-bold text-flax transition-colors hover:bg-goldenbrown hover:text-creme"
                        >
                          Retirar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </article>
          );
        })}
      </div>
    </div>
  );
}
