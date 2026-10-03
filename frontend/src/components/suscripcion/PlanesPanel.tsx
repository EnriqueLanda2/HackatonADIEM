'use client';

import { PLANES, PlanId } from '@/lib/suscripcion';

interface Props {
  planActual: PlanId;
  onElegir: (plan: PlanId) => void;
}

export default function PlanesPanel({ planActual, onElegir }: Props) {
  return (
    <div>
      <div className="mb-5 px-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-applegreen">Suscripción</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-creme">Elige tu plan</h2>
        <p className="mt-1 text-xs text-flax/65">Plan actual: <strong className="text-creme">{PLANES[planActual].nombre}</strong></p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Object.values(PLANES).map((plan) => {
          const activo = plan.id === planActual;
          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl border bg-card p-5 shadow-lg ${activo ? 'border-applegreen' : 'border-applegreen/20'}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-creme">{plan.nombre}</h3>
                {plan.incluyeDron && <span className="rounded-full bg-applegreen/20 px-2 py-0.5 text-[10px] font-bold text-applegreen">🚁 Incluye dron</span>}
              </div>
              <p className="mt-1 text-xs text-flax/70">{plan.descripcion}</p>
              <div className="mt-3 text-3xl font-semibold text-creme">
                {plan.precioMensual === null ? (
                  <>Incluido<span className="block text-xs font-normal text-flax/60">Sin costo: va con la instalación de las tuberías de riego</span></>
                ) : (
                  <>${plan.precioMensual}<span className="text-sm font-normal text-flax/60"> MXN/mes</span></>
                )}
              </div>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                {plan.beneficios.map((b) => <li key={b} className="text-creme">✅ {b}</li>)}
                {plan.excluye.map((b) => <li key={b} className="text-flax/50 line-through">❌ {b}</li>)}
              </ul>
              <button
                disabled={activo}
                onClick={() => onElegir(plan.id)}
                className={`mt-5 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                  activo ? 'cursor-default border border-applegreen/40 text-flax' : 'bg-darkgreen text-creme hover:bg-applegreen/40 border border-applegreen/50'
                }`}
              >
                {activo ? 'Plan actual' : plan.id === 'pro' ? 'Mejorar a Pro' : 'Cambiar a Básico'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
