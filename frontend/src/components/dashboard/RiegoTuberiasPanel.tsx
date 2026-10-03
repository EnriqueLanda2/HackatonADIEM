'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { registrarBitacora } from '@/lib/bitacora';

interface Props {
  modoGlobal: 'automatico' | 'manual';
  onRefresh: () => void;
}

// Control del riego por tuberías, disponible en todos los planes (incluido el Básico).
export default function RiegoTuberiasPanel({ modoGlobal, onRefresh }: Props) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const manual = modoGlobal === 'manual';

  const cambiarModo = (modo: 'automatico' | 'manual') => {
    if (modo === modoGlobal) return;
    api.toggleModoGlobalRiego(modo);
    registrarBitacora({ categoria: 'riego', accion: `Modo de riego cambiado a ${modo === 'automatico' ? 'automático' : 'manual'}`, tipo_riego: 'Tuberías (todas las parcelas)' });
    setMensaje(`Riego por tuberías en modo ${modo === 'automatico' ? 'AUTOMÁTICO' : 'MANUAL'}.`);
    onRefresh();
  };

  const regarTodo = () => {
    api.regarTodoManual();
    registrarBitacora({ categoria: 'riego', accion: 'Riego manual: regar todo el sembradío', tipo_riego: 'Tuberías (todas las parcelas)' });
    setMensaje('Válvulas abiertas: regando todo el sembradío.');
    onRefresh();
  };

  const detenerTodo = () => {
    api.detenerRiegoTodo();
    registrarBitacora({ categoria: 'riego', accion: 'Riego manual: detener todo el riego', tipo_riego: 'Tuberías (todas las parcelas)' });
    setMensaje('Válvulas cerradas: riego detenido en todo el sembradío.');
    onRefresh();
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-applegreen/30 bg-card p-5 shadow-lg shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-creme">💧 Riego por tuberías</h3>
          <p className="text-xs text-flax/80">Elige si el sistema riega solo o lo controlas tú.</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-applegreen/25 bg-panel p-1.5">
          <button
            onClick={() => cambiarModo('automatico')}
            className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${modoGlobal === 'automatico' ? 'bg-applegreen text-ink shadow-md' : 'text-flax/70 hover:text-creme'}`}
          >
            ⚡ Automático
          </button>
          <button
            onClick={() => cambiarModo('manual')}
            className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${manual ? 'bg-goldenbrown text-creme shadow-md' : 'text-flax/70 hover:text-creme'}`}
          >
            ✋ Manual
          </button>
        </div>
      </div>
      {mensaje && <div className="rounded-xl border border-applegreen bg-darkgreen px-3.5 py-2 text-xs text-creme">ℹ️ {mensaje}</div>}
      {manual ? (
        <div className="flex flex-wrap gap-2">
          <button onClick={regarTodo} className="rounded-xl border border-applegreen/50 bg-darkgreen px-4 py-2 text-xs font-bold text-creme hover:bg-applegreen/40">Regar todo</button>
          <button onClick={detenerTodo} className="rounded-xl border border-goldenbrown/60 bg-goldenbrown/30 px-4 py-2 text-xs font-bold text-creme hover:bg-goldenbrown/50">Detener riego</button>
        </div>
      ) : (
        <p className="text-xs text-flax/70">El sistema abre y cierra válvulas según la humedad del suelo.</p>
      )}
    </div>
  );
}
