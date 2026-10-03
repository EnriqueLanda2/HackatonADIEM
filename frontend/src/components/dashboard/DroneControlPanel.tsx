'use client';

import { useState } from 'react';
import { DronRiego } from '@/types';
import { api } from '@/lib/api';

interface DroneControlPanelProps {
  dron: DronRiego;
  modoGlobal: 'automatico' | 'manual';
  onRefresh: () => void;
}

export default function DroneControlPanel({
  dron,
  modoGlobal,
  onRefresh,
}: DroneControlPanelProps) {
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const showMsg = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Toggle de presencia en base
  const handleTogglePresencia = () => {
    const presente = api.toggleDronPresencia();
    showMsg(presente ? 'Sensor detectó al Dron en la plataforma.' : 'Sensor: Plataforma de recarga libre (sin objeto).');
    onRefresh();
  };

  // Toggle llave de paso de agua
  const handleToggleLlave = () => {
    const res = api.toggleDronLlavePaso();
    showMsg(res.message);
    onRefresh();
  };

  // Despachar misión de emergencia
  const handleDespacharDron = () => {
    const res = api.despacharDronEmergencia();
    showMsg(res.message);
    onRefresh();
  };

  // Llenar manualmente
  const handleLlenarManual = () => {
    api.llenarDronManual();
    showMsg('Tanque del dron llenado manualmente al 100% (40 L).');
    onRefresh();
  };

  // Toggle modo automático / manual
  const handleToggleModoGlobal = () => {
    const nuevo = api.toggleModoGlobalRiego();
    showMsg(`Sistema de riego configurado en Modo ${nuevo.toUpperCase()}.`);
    onRefresh();
  };

  // Riego manual inmediato de todas las parcelas
  const handleRiegoManualTodo = () => {
    api.activarRiegoManualTodo();
    showMsg('Válvulas abiertas: Riego manual inmediato activado en todas las parcelas.');
    onRefresh();
  };

  const handleDetenerTodo = () => {
    api.detenerRiegoTodo();
    showMsg('Válvulas cerradas: Riego detenido en todo el sembradío.');
    onRefresh();
  };

  const sinAgua = dron.nivel_agua_porcentaje <= 15;
  const enMision = dron.mision_activa || dron.estado === 'regando';

  return (
    <div className="bg-[#18181b] rounded-2xl p-5 border border-white/5 shadow-md flex flex-col gap-4">
      {/* ========================================================================= */}
      {/* CABECERA: SISTEMA DE RIEGO POR DRON & MODO MAESTRO                       */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-950/60 border border-sky-500/30 flex items-center justify-center text-xl">
            🚁
          </div>
          <div>
            <h3 className="text-white font-bold text-base tracking-tight flex items-center gap-2">
              <span>Riego por Dron de Emergencia</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Alerta de Sequía: 3 días sin lluvia
              </span>
            </h3>
            <p className="text-zinc-400 text-xs">
              {dron.nombre} · Cobertura aérea de 15.5 ha en Morelos
            </p>
          </div>
        </div>

        {/* Interruptor Modo Automático vs Manual */}
        <div className="flex items-center gap-2 bg-black/40 p-1 rounded-full border border-white/10">
          <button
            onClick={() => {
              if (modoGlobal !== 'automatico') handleToggleModoGlobal();
            }}
            className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all ${
              modoGlobal === 'automatico'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            ⚡ Automático (IA + Sensores)
          </button>
          <button
            onClick={() => {
              if (modoGlobal !== 'manual') handleToggleModoGlobal();
            }}
            className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all ${
              modoGlobal === 'manual'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            ✋ Manual
          </button>
        </div>
      </div>

      {/* Banner de feedback interactivo */}
      {feedbackMsg && (
        <div className="bg-sky-950/80 border border-sky-500/40 text-sky-200 text-xs px-3.5 py-2 rounded-xl animate-fade-in flex items-center justify-between">
          <span>ℹ️ {feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-sky-400 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CUERPO PRINCIPAL: ESTADO DEL DRON Y ESTACIÓN DE RECARGA CON SENSOR       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Tanque de Agua del Dron */}
        <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center text-xs text-zinc-400 mb-1">
              <span>💧 Tanque de Agua del Dron</span>
              <span className="text-[10px] text-zinc-500">{((dron.capacidad_litros * dron.nivel_agua_porcentaje) / 100).toFixed(0)} / {dron.capacidad_litros} L</span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-white tracking-tight">
                {dron.nivel_agua_porcentaje}%
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                sinAgua ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-sky-500/20 text-sky-300'
              }`}>
                {sinAgua ? 'Vacío / Recarga necesaria' : 'Listo para aspersión'}
              </span>
            </div>

            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ${
                  sinAgua ? 'bg-rose-500' : 'bg-sky-400'
                }`}
                style={{ width: `${dron.nivel_agua_porcentaje}%` }}
              />
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-white/5 flex justify-between items-center text-[11px]">
            <span className="text-zinc-500">Batería de vuelo:</span>
            <span className="text-zinc-300 font-medium">🔋 {dron.bateria_porcentaje}%</span>
          </div>
        </div>

        {/* 2. Sensor de Presencia en Base y Llave de Paso */}
        <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 flex flex-col justify-between">
          <div>
            <div className="text-xs text-zinc-400 mb-2 flex items-center justify-between">
              <span>📡 Sensor de Presencia (Base)</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                dron.en_posicion_recarga
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dron.en_posicion_recarga ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                {dron.en_posicion_recarga ? 'Objeto Detectado' : 'Sin Objeto'}
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
              {dron.en_posicion_recarga
                ? 'El dron se encuentra acoplado en la plataforma de recarga. Válvula de suministro habilitada.'
                : '⚠️ No se detecta ningún objeto en la plataforma. Llave de paso bloqueada por seguridad.'}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleTogglePresencia}
              className="flex-1 text-[11px] py-1.5 px-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 transition-all font-medium"
            >
              {dron.en_posicion_recarga ? 'Retirar Dron' : 'Colocar Dron'}
            </button>
            <button
              onClick={handleToggleLlave}
              disabled={!dron.en_posicion_recarga || (dron.nivel_agua_porcentaje >= 100 && !dron.llave_paso_recarga_abierta)}
              className={`flex-1 text-[11px] py-1.5 px-2 rounded-lg border font-semibold transition-all flex items-center justify-center gap-1.5 ${
                !dron.en_posicion_recarga
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
                  : dron.llave_paso_recarga_abierta
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md animate-pulse'
                  : dron.nivel_agua_porcentaje >= 100
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 cursor-default'
                  : 'bg-emerald-600/30 text-emerald-200 border-emerald-500/40 hover:bg-emerald-600/40'
              }`}
            >
              {!dron.en_posicion_recarga ? (
                <>🔒 Bloqueada</>
              ) : dron.llave_paso_recarga_abierta ? (
                <>🚰 Llenando...</>
              ) : dron.nivel_agua_porcentaje >= 100 ? (
                <>✅ Tanque Lleno</>
              ) : (
                <>Abrir Llave</>
              )}
            </button>
          </div>
        </div>

        {/* 3. Acciones de Riego de Emergencia */}
        <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 flex flex-col justify-between">
          <div>
            <div className="text-xs text-zinc-400 mb-1.5">
              <span>🚨 Protocolo de Emergencia</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed mb-2">
              Activación para regar todo el sembradío ante periodos prolongados de sequía (&gt;= 3 días).
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleDespacharDron}
              disabled={enMision}
              className={`w-full py-2 px-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                enMision
                  ? 'bg-sky-600 text-white animate-pulse'
                  : sinAgua
                  ? 'bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-900/60'
                  : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-sky-900/40'
              }`}
            >
              {enMision ? (
                <>🚁 Regando Parcelas en Vuelo...</>
              ) : sinAgua ? (
                <>⚠️ Dron Vacío (Llenar para Activar)</>
              ) : (
                <>🚀 Activar Riego por Dron</>
              )}
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleLlenarManual}
                className="flex-1 text-[10px] py-1 px-2 rounded-lg border border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              >
                Llenado manual
              </button>
              {modoGlobal === 'manual' && (
                <>
                  <button
                    onClick={handleRiegoManualTodo}
                    className="flex-1 text-[10px] py-1 px-2 rounded-lg bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/40 font-semibold"
                  >
                    Regar todo
                  </button>
                  <button
                    onClick={handleDetenerTodo}
                    className="flex-1 text-[10px] py-1 px-2 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30 font-semibold"
                  >
                    Detener todo
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
