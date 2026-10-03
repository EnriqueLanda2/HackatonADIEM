'use client';

import { useEffect, useState } from 'react';
import { InstalacionRiego, MetodoRiego, ParcelaDashboard } from '@/types';
import { instalacionesDe, RIEGO_POR_METODO, sugerirInstalacion } from '@/lib/api';
import { MODAL_FONDO, MODAL_HOJA, useBloquearScroll } from '@/components/ui/modal';

// Tubería de UN sistema (goteo o aspersión) de la parcela; la parcela puede tener los dos.
export interface ObjetivoInstalacion {
  parcela: ParcelaDashboard;
  metodo: MetodoRiego;
}

interface InstalacionModalProps {
  objetivo: ObjetivoInstalacion | null;
  tecnico: string;
  onClose: () => void;
  onSubmit: (instalacion: InstalacionRiego) => Promise<void>;
}

export default function InstalacionModal({ objetivo, tecnico, onClose, onSubmit }: InstalacionModalProps) {
  const parcela = objetivo?.parcela ?? null;
  const metodo: MetodoRiego = objetivo?.metodo ?? 'goteo';
  const [metros, setMetros] = useState(0);
  const [emisores, setEmisores] = useState(0);
  const [terminada, setTerminada] = useState(true);
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hectareas = Number(parcela?.parcela.superficie_hectareas || 1);
  useBloquearScroll(Boolean(parcela));

  useEffect(() => {
    if (!objetivo) return;
    const actual = instalacionesDe(objetivo.parcela).find((i) => i.metodo === objetivo.metodo);
    const sugerido = sugerirInstalacion(objetivo.metodo, Number(objetivo.parcela.parcela.superficie_hectareas || 1));
    setMetros(actual?.metros_tuberia ?? sugerido.metros_tuberia);
    setEmisores(actual?.emisores ?? sugerido.emisores);
    setTerminada(actual ? actual.estado === 'instalada' : true);
    setNotas(actual?.notas ?? '');
    setError(null);
  }, [objetivo]);

  if (!parcela) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(metros > 0) || !(emisores > 0)) {
      setError('Indica los metros de tubería y el número de emisores instalados.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await onSubmit({
        estado: terminada ? 'instalada' : 'pendiente',
        metodo,
        metros_tuberia: Math.round(metros),
        emisores: Math.round(emisores),
        fecha: new Date().toISOString(),
        tecnico,
        notas: notas.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la instalación.');
    } finally {
      setGuardando(false);
    }
  };

  const emisorLabel = metodo === 'goteo' ? 'Goteros' : metodo === 'microaspersion' ? 'Microaspersores' : 'Aspersores';

  return (
    <div className={MODAL_FONDO}>
      <form onSubmit={handleSubmit} className={`${MODAL_HOJA} max-w-lg bg-card`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-applegreen">
              🛠️ Tubería de {RIEGO_POR_METODO[metodo].label.toLowerCase()}
            </p>
            <h2 className="mt-1 text-xl font-bold text-creme">{parcela.parcela.nombre}</h2>
            <p className="mt-1 text-xs text-flax/70">
              {hectareas.toFixed(1)} ha · {parcela.cultivo?.nombre ?? 'Sin cultivo'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-xl text-flax/70 hover:text-creme" aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className="space-y-4">
          <p className="rounded-xl border border-applegreen/20 bg-panel px-3 py-2 text-[11px] text-flax/80">
            {metodo === 'goteo'
              ? '💧 Goteo: agua directa a la raíz, menor consumo y follaje seco.'
              : metodo === 'microaspersion' ? '🚿 Microaspersión: cobertura media, eficiente.' : '🌦️ Aspersión: humedece más rápido, gasta más agua y moja el follaje.'}{' '}
            La parcela puede tener múltiples sistemas de riego al mismo tiempo; el productor elige con cuál regar.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-flax">Tubería (m)</span>
              <input
                type="number"
                min={1}
                value={metros}
                onChange={(e) => setMetros(Number(e.target.value))}
                className="w-full rounded-xl border border-applegreen/30 bg-panel px-3 py-2 text-sm text-creme outline-none focus:border-flax"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-flax">{emisorLabel}</span>
              <input
                type="number"
                min={1}
                value={emisores}
                onChange={(e) => setEmisores(Number(e.target.value))}
                className="w-full rounded-xl border border-applegreen/30 bg-panel px-3 py-2 text-sm text-creme outline-none focus:border-flax"
              />
            </label>
          </div>
          <p className="text-[11px] text-flax/60">
            Sugerido para {hectareas.toFixed(1)} ha:{' '}
            {metodo === 'goteo' ? 'cintas cada 2.5 m con goteros cada 30 cm' : metodo === 'microaspersion' ? 'microaspersores en marco de 4 x 4 m' : 'aspersores en marco de 12 × 12 m'}. Caudal de diseño{' '}
            {Math.round(RIEGO_POR_METODO[metodo].caudalPorHa * hectareas).toLocaleString('es-MX')} L/min.
          </p>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-applegreen/20 bg-panel px-3 py-2.5">
            <input type="checkbox" checked={terminada} onChange={(e) => setTerminada(e.target.checked)} className="h-4 w-4 accent-[#8DA432]" />
            <span className="text-sm text-creme">
              Instalación terminada y probada
              <span className="block text-[11px] text-flax/60">
                Mientras esté pendiente, la parcela no puede regar por válvula.
              </span>
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-flax">Notas de instalación</span>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Ej. filtro de malla 120 en cabezal, prueba de presión a 1.5 bar…"
              className="w-full resize-none rounded-xl border border-applegreen/30 bg-panel px-3 py-2 text-sm text-creme outline-none focus:border-flax"
            />
          </label>
        </div>

        {error && <p className="mt-4 rounded-lg border border-goldenbrown bg-goldenbrown/20 px-3 py-2 text-xs text-creme">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-applegreen/30 px-4 py-2 text-sm text-flax">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="rounded-xl bg-applegreen px-5 py-2 text-sm font-bold text-ink hover:bg-darkgreen hover:text-creme disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Guardar instalación'}
          </button>
        </div>
      </form>
    </div>
  );
}
