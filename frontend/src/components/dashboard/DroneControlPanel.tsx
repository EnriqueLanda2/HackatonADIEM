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
    showMsg(presente ? 'Sensor ultrasónico detectó al Dron en la plataforma.' : 'Sensor: Plataforma de recarga libre (sin objeto).');
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
    showMsg(`Sistema configurado en Modo ${nuevo.toUpperCase()}.`);
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
    <div className="bg-[#131d08]/85 rounded-2xl p-5 border border-[#8DA432]/20 shadow-md flex flex-col gap-4">
      {/* ========================================================================= */}
      {/* CABECERA: SISTEMA DE RIEGO POR DRON & MODO MAESTRO                       */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#8DA432]/15 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#365004]/70 border border-[#8DA432]/40 flex items-center justify-center text-xl shadow-inner shadow-[#8DA432]/20">
            🚁
          </div>
          <div>
            <h3 className="text-[#FFFCE9] font-bold text-base tracking-tight flex items-center gap-2">
              <span>Riego por Dron de Emergencia</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-[#925E06]/35 text-[#EDE383] border border-[#925E06]/60">
                Alerta Sequía: 3 días sin lluvia
              </span>
            </h3>
            <p className="text-[#EDE383]/70 text-xs">
              {dron.nombre} · Cobertura aérea de 15.5 ha en Morelos
            </p>
          </div>
        </div>

        {/* Interruptor Modo Automático vs Manual con paleta de marca */}
        <div className="flex items-center gap-1.5 bg-[#0a1004] p-1 rounded-full border border-[#8DA432]/25">
          <button
            onClick={() => {
              if (modoGlobal !== 'automatico') handleToggleModoGlobal();
            }}
            className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all ${
              modoGlobal === 'automatico'
                ? 'bg-[#8DA432] text-[#0f1706] shadow-sm'
                : 'text-[#EDE383]/70 hover:text-[#FFFCE9]'
            }`}
          >
            ⚡ Automático (IA)
          </button>
          <button
            onClick={() => {
              if (modoGlobal !== 'manual') handleToggleModoGlobal();
            }}
            className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all ${
              modoGlobal === 'manual'
                ? 'bg-[#925E06] text-[#FFFCE9] shadow-sm'
                : 'text-[#EDE383]/70 hover:text-[#FFFCE9]'
            }`}
          >
            ✋ Manual
          </button>
        </div>
      </div>

      {/* Banner de feedback interactivo */}
      {feedbackMsg && (
        <div className="bg-[#365004]/80 border border-[#8DA432]/50 text-[#FFFCE9] text-xs px-3.5 py-2 rounded-xl animate-fade-in flex items-center justify-between shadow-sm">
          <span>ℹ️ {feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-[#EDE383] font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CUERPO PRINCIPAL: ESTADO DEL DRON Y ESTACIÓN DE RECARGA CON SENSOR       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Tanque de Agua del Dron */}
        <div className="bg-[#0a1004]/70 p-3.5 rounded-xl border border-[#8DA432]/15 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center text-xs text-[#EDE383]/80 mb-1 font-medium">
              <span>💧 Tanque de Agua del Dron</span>
              <span className="text-[10px] text-[#EDE383]/60">{((dron.capacidad_litros * dron.nivel_agua_porcentaje) / 100).toFixed(0)} / {dron.capacidad_litros} L</span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-[#FFFCE9] tracking-tight">
                {dron.nivel_agua_porcentaje}%
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                sinAgua 
                  ? 'bg-[#925E06]/35 text-[#EDE383] border border-[#925E06]/60' 
                  : 'bg-[#365004]/60 text-[#EDE383] border border-[#8DA432]/40'
              }`}>
                {sinAgua ? 'Vacío / Requiere agua' : 'Listo para aspersión'}
              </span>
            </div>

            <div className="w-full bg-[#1a270a] h-2 rounded-full overflow-hidden border border-[#8DA432]/10">
              <div
                className={`h-full transition-all duration-700 ${
                  sinAgua ? 'bg-[#925E06]' : 'bg-gradient-to-r from-[#365004] to-[#8DA432]'
                }`}
                style={{ width: `${dron.nivel_agua_porcentaje}%` }}
              />
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[#8DA432]/10 flex justify-between items-center text-[11px]">
            <span className="text-[#EDE383]/60">Batería de vuelo:</span>
            <span className="text-[#FFFCE9] font-mono font-medium">🔋 {dron.bateria_porcentaje}%</span>
          </div>
        </div>

        {/* 2. Sensor de Presencia en Base y Llave de Paso */}
        <div className="bg-[#0a1004]/70 p-3.5 rounded-xl border border-[#8DA432]/15 flex flex-col justify-between">
          <div>
            <div className="text-xs text-[#EDE383]/80 mb-2 flex items-center justify-between font-medium">
              <span>📡 Sensor de Presencia (Base)</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                dron.en_posicion_recarga
                  ? 'bg-[#365004]/70 text-[#EDE383] border border-[#8DA432]/40'
                  : 'bg-[#925E06]/20 text-[#EDE383]/60 border border-[#925E06]/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dron.en_posicion_recarga ? 'bg-[#8DA432] animate-pulse' : 'bg-[#925E06]'}`} />
                {dron.en_posicion_recarga ? 'Objeto Detectado' : 'Sin Objeto'}
              </span>
            </div>

            <p className="text-[11px] text-[#EDE383]/70 leading-relaxed mb-3">
              {dron.en_posicion_recarga
                ? 'Dron acoplado en la plataforma de recarga. Válvula de suministro habilitada.'
                : '⚠️ No se detecta ningún objeto en la plataforma. Llave de paso bloqueada por seguridad.'}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleTogglePresencia}
              className="flex-1 text-[11px] py-1.5 px-2 rounded-lg border border-[#8DA432]/30 bg-[#365004]/30 hover:bg-[#365004]/50 text-[#FFFCE9] transition-all font-semibold active:scale-95"
            >
              {dron.en_posicion_recarga ? 'Retirar Dron' : 'Colocar Dron'}
            </button>
            <button
              onClick={handleToggleLlave}
              disabled={!dron.en_posicion_recarga || (dron.nivel_agua_porcentaje >= 100 && !dron.llave_paso_recarga_abierta)}
              className={`flex-1 text-[11px] py-1.5 px-2 rounded-lg border font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                !dron.en_posicion_recarga
                  ? 'bg-[#1a270a]/50 border-[#8DA432]/10 text-zinc-600 cursor-not-allowed'
                  : dron.llave_paso_recarga_abierta
                  ? 'bg-[#365004] text-[#EDE383] border-[#8DA432] shadow-md animate-pulse'
                  : dron.nivel_agua_porcentaje >= 100
                  ? 'bg-[#365004]/40 border-[#8DA432]/40 text-[#EDE383] cursor-default'
                  : 'bg-[#8DA432] text-[#0f1706] border-[#8DA432] hover:bg-[#8DA432]/90 shadow-sm'
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
        <div className="bg-[#0a1004]/70 p-3.5 rounded-xl border border-[#8DA432]/15 flex flex-col justify-between">
          <div>
            <div className="text-xs text-[#EDE383]/80 mb-1.5 font-medium">
              <span>🚨 Protocolo de Emergencia</span>
            </div>
            <p className="text-[11px] text-[#EDE383]/70 leading-relaxed mb-2">
              Aspersión aérea para regar todo el sembradío ante sequía prolongada (&gt;= 3 días).
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleDespacharDron}
              disabled={enMision}
              className={`w-full py-2 px-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 ${
                enMision
                  ? 'bg-[#365004] text-[#EDE383] border border-[#8DA432] animate-pulse'
                  : sinAgua
                  ? 'bg-[#925E06]/30 border border-[#925E06] text-[#EDE383] hover:bg-[#925E06]/40'
                  : 'bg-gradient-to-r from-[#365004] to-[#8DA432] hover:from-[#365004]/90 hover:to-[#8DA432]/90 text-[#FFFCE9] border border-[#8DA432]/40 shadow-lg shadow-[#365004]/40'
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
                className="flex-1 text-[10px] py-1 px-2 rounded-lg border border-[#8DA432]/25 text-[#EDE383] hover:text-[#FFFCE9] hover:bg-[#365004]/30 font-medium"
              >
                Llenado manual
              </button>
              {modoGlobal === 'manual' && (
                <>
                  <button
                    onClick={handleRiegoManualTodo}
                    className="flex-1 text-[10px] py-1 px-2 rounded-lg bg-[#8DA432]/25 text-[#FFFCE9] border border-[#8DA432]/40 hover:bg-[#8DA432]/35 font-semibold"
                  >
                    Regar todo
                  </button>
                  <button
                    onClick={handleDetenerTodo}
                    className="flex-1 text-[10px] py-1 px-2 rounded-lg bg-[#925E06]/25 text-[#EDE383] border border-[#925E06]/50 hover:bg-[#925E06]/35 font-semibold"
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
