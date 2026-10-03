'use client';

import { MetodoRiego, SeleccionRiego } from '@/types';
import { RIEGO_POR_METODO, metodosDeSeleccion } from '@/lib/api';

interface MetodoRiegoSelectorProps {
  value: SeleccionRiego;
  onChange: (seleccion: SeleccionRiego) => void;
  disabled?: boolean;
  compact?: boolean;
  // Sistemas con tubería terminada; los demás se muestran deshabilitados.
  instalados?: MetodoRiego[];
}

const OPCIONES: { id: SeleccionRiego; icono: string; label: string }[] = [
  { id: 'goteo', icono: RIEGO_POR_METODO.goteo.icono, label: RIEGO_POR_METODO.goteo.label },
  { id: 'microaspersion', icono: RIEGO_POR_METODO.microaspersion.icono, label: RIEGO_POR_METODO.microaspersion.label },
  { id: 'aspersion_presurizada', icono: RIEGO_POR_METODO.aspersion_presurizada.icono, label: RIEGO_POR_METODO.aspersion_presurizada.label },
];

const DESCRIPCION: Record<SeleccionRiego, string> = {
  goteo: 'Agua directa a la raíz. Gasta menos y no moja el follaje.',
  microaspersion: 'Humedece uniformemente, equilibrio entre goteo y aspersión.',
  aspersion_presurizada: 'Humedece más rápido, pero gasta más agua y moja el follaje.',
  ambos: 'Múltiples sistemas a la vez.',
};

export default function MetodoRiegoSelector({ value, onChange, disabled, compact, instalados }: MetodoRiegoSelectorProps) {
  const disponible = (id: SeleccionRiego) => !instalados || metodosDeSeleccion(id).every((m) => instalados.includes(m));
  const caudal = metodosDeSeleccion(value).reduce((total, m) => total + RIEGO_POR_METODO[m].caudalPorHa, 0);

  return (
    <div className={compact ? '' : 'space-y-2'}>
      <div className="grid grid-cols-3 gap-1 rounded-lg border border-applegreen/20 bg-ink/60 p-1">
        {OPCIONES.map((opcion) => {
          const activo = value === opcion.id;
          const habilitado = disponible(opcion.id);
          return (
            <button
              key={opcion.id}
              type="button"
              disabled={disabled || !habilitado}
              title={habilitado ? undefined : 'Sin tubería instalada para esta opción'}
              onClick={(e) => {
                e.stopPropagation();
                if (!activo) onChange(opcion.id);
              }}
              className={`rounded-md px-1 font-bold transition-all disabled:cursor-not-allowed ${compact ? 'py-1 text-[10px]' : 'py-2 text-xs'} ${
                activo
                  ? 'bg-applegreen text-ink'
                  : habilitado
                  ? 'cursor-pointer text-flax/70 hover:text-creme'
                  : 'text-flax/25 line-through'
              }`}
            >
              {opcion.icono} {opcion.label}
            </button>
          );
        })}
      </div>
      {!compact && (
        <p className="text-[11px] leading-relaxed text-flax/70">
          {DESCRIPCION[value]} Caudal {caudal} L/min por ha.
        </p>
      )}
    </div>
  );
}
