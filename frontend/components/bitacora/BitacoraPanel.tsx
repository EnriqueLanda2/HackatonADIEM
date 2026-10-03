'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CategoriaBitacora, EntradaBitacora, EVENTO_BITACORA, leerBitacoraLocal, leerBitacoraServidor } from '@/lib/bitacora';

const CATEGORIAS: { id: CategoriaBitacora | 'todas'; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'riego', label: '💧 Riego' },
  { id: 'dron', label: '🚁 Dron' },
  { id: 'instalacion', label: '🛠️ Instalación' },
  { id: 'parcela', label: '🌱 Parcela' },
  { id: 'suscripcion', label: '💳 Plan' },
  { id: 'sesion', label: '🔐 Sesión' },
];

const ICONO_DISPOSITIVO: Record<string, string> = { Teléfono: '📱', Tableta: '📱', Computadora: '💻' };

export default function BitacoraPanel() {
  const [entradas, setEntradas] = useState<EntradaBitacora[]>([]);
  const [filtro, setFiltro] = useState<CategoriaBitacora | 'todas'>('todas');
  const [origen, setOrigen] = useState<'servidor' | 'dispositivo'>('dispositivo');

  const cargar = useCallback(async () => {
    const servidor = await leerBitacoraServidor();
    if (servidor) {
      setEntradas(servidor);
      setOrigen('servidor');
    } else {
      setEntradas(leerBitacoraLocal());
      setOrigen('dispositivo');
    }
  }, []);

  useEffect(() => {
    void cargar();
    const alRegistrar = () => void cargar();
    window.addEventListener(EVENTO_BITACORA, alRegistrar);
    return () => window.removeEventListener(EVENTO_BITACORA, alRegistrar);
  }, [cargar]);

  const visibles = useMemo(() => entradas.filter((e) => filtro === 'todas' || e.categoria === filtro), [entradas, filtro]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-applegreen">Trazabilidad</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-creme">Bitácora de procesos</h2>
          <p className="mt-1 text-xs text-flax/65">
            Qué se hizo, con qué tipo de riego y desde qué navegador. Fuente: {origen === 'servidor' ? 'servidor (todos los dispositivos)' : 'este dispositivo'}.
          </p>
        </div>
        <button onClick={() => void cargar()} className="w-fit rounded-xl border border-applegreen/40 bg-card px-3 py-1.5 text-xs font-semibold text-flax hover:text-creme">
          ↻ Actualizar
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {CATEGORIAS.map((c) => (
          <button
            key={c.id}
            onClick={() => setFiltro(c.id)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              filtro === c.id ? 'border-applegreen bg-darkgreen text-creme' : 'border-applegreen/20 bg-card text-flax/70 hover:text-creme'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-applegreen/30 bg-card p-8 text-center text-sm text-flax/70">
          Aún no hay procesos registrados. Riega, cambia el modo o el tipo de riego y aparecerán aquí.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-applegreen/25 bg-card">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="border-b border-applegreen/20 text-[10px] uppercase tracking-wider text-flax/60">
              <tr>
                <th className="px-3 py-2.5">Fecha</th>
                <th className="px-3 py-2.5">Proceso</th>
                <th className="px-3 py-2.5">Tipo de riego</th>
                <th className="px-3 py-2.5">Parcela</th>
                <th className="px-3 py-2.5">Usuario</th>
                <th className="px-3 py-2.5">Navegador / dispositivo</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((e) => (
                <tr key={e.id} className="border-b border-applegreen/10 align-top last:border-0">
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-flax/80">
                    {new Date(e.fecha).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'medium' })}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-semibold text-creme">{e.accion}</div>
                    {e.detalle && <div className="mt-0.5 text-flax/65">{e.detalle}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-creme">{e.tipo_riego ?? '—'}</td>
                  <td className="px-3 py-2.5 text-creme">{e.parcela ?? '—'}</td>
                  <td className="px-3 py-2.5 text-flax/80">
                    {e.usuario_nombre ?? '—'}
                    {e.rol && <div className="text-[10px] text-flax/50">{e.rol}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-flax/80">
                    {ICONO_DISPOSITIVO[e.dispositivo] ?? '🖥️'} {e.navegador} · {e.sistema}
                    <div className="text-[10px] text-flax/50">
                      {e.dispositivo}
                      {e.ip ? ` · IP ${e.ip}` : ''}
                      {e.zona_horaria ? ` · ${e.zona_horaria}` : ''}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
