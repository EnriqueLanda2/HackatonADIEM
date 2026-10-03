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
    showMsg(presente ? 'Sensor detectó al Dron en la plataforma de recarga.' : 'Sensor: Plataforma de recarga libre (sin objeto).');
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
    api.regarTodoManual();
    showMsg('Válvulas abiertas: Regando todo el sembradío simultáneamente.');
    onRefresh();
  };

  const handleDetenerTodo = () => {
    api.detenerRiegoTodo();
    showMsg('Válvulas cerradas: Riego detenido en todo el sembradío.');
    onRefresh();
  };

  const dronNivel = Number(dron?.nivel_agua_porcentaje ?? 0);
  const dronCapacidad = Number(dron?.capacidad_litros ?? 40);
  const sinAgua = dronNivel <= 15;
  const enMision = dron?.mision_activa || dron?.estado === 'regando';

  return (
    <div className="bg-[#273a06] rounded-2xl p-5 border border-[#8DA432]/35 shadow-lg shadow-black/15 flex flex-col gap-4">
      {/* ========================================================================= */}
      {/* CABECERA: SISTEMA DE RIEGO POR DRON & MODO MAESTRO                       */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#8DA432]/25 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#365004] border border-[#8DA432]/50 flex items-center justify-center text-2xl shadow-inner">
            🚁
          </div>
          <div>
            <h3 className="text-[#FFFCE9] font-bold text-base tracking-tight flex items-center gap-2">
              <span>Riego por Dron de Emergencia</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-[#925E06]/40 text-[#FFFCE9] border border-[#925E06]">
                Alerta de Sequía: 3 días sin lluvia
              </span>
            </h3>
            <p className="text-[#EDE383] text-xs font-medium">
              {dron.nombre} · Cobertura aérea de 15.5 ha en Morelos
            </p>
          </div>
        </div>

        {/* Interruptor Modo Automático vs Manual */}
        <div className="flex items-center gap-1.5 bg-[#1c2a04] p-1.5 rounded-xl border border-[#8DA432]/30">
          <button
            onClick={() => {
              if (modoGlobal !== 'automatico') handleToggleModoGlobal();
            }}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              modoGlobal === 'automatico'
                ? 'bg-[#8DA432] text-[#FFFCE9] shadow-md shadow-black/20'
                : 'text-[#EDE383]/70 hover:text-[#FFFCE9]'
            }`}
          >
            ⚡ Automático (IA + Sensores)
          </button>
          <button
            onClick={() => {
              if (modoGlobal !== 'manual') handleToggleModoGlobal();
            }}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              modoGlobal === 'manual'
                ? 'bg-[#925E06] text-[#FFFCE9] shadow-md shadow-black/20'
                : 'text-[#EDE383]/70 hover:text-[#FFFCE9]'
            }`}
          >
            ✋ Manual
          </button>
        </div>
      </div>

      {/* Banner de feedback interactivo */}
      {feedbackMsg && (
        <div className="bg-[#365004] border border-[#8DA432] text-[#FFFCE9] text-xs px-3.5 py-2.5 rounded-xl animate-fade-in flex items-center justify-between shadow-md">
          <span className="font-medium">ℹ️ {feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-[#EDE383] font-bold ml-2 hover:text-[#FFFCE9]">
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CUERPO PRINCIPAL: ESTADO DEL DRON Y ESTACIÓN DE RECARGA CON SENSOR       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Tanque de Agua del Dron */}
        <div className="bg-[#1c2a04] p-3.5 rounded-xl border border-[#8DA432]/25 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center text-xs text-[#EDE383] mb-1">
              <span className="font-semibold">💧 Tanque de Agua del Dron</span>
              <span className="text-[10px] text-[#EDE383]/70 font-mono">{((dronCapacidad * dronNivel) / 100).toFixed(0)} / {dronCapacidad} L</span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-extrabold text-[#FFFCE9] tracking-tight">
                {dronNivel.toFixed(0)}%
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                sinAgua 
                  ? 'bg-[#925E06]/50 text-[#FFFCE9] border-[#925E06]' 
                  : 'bg-[#8DA432]/30 text-[#FFFCE9] border-[#8DA432]'
              }`}>
                {sinAgua ? 'Vacío / Requiere Carga' : 'Listo para Aspersión'}
              </span>
            </div>

            <div className="w-full bg-[#2a3d06] h-2.5 rounded-full overflow-hidden border border-[#8DA432]/30">
              <div
                className={`h-full transition-all duration-700 ${
                  sinAgua ? 'bg-[#925E06]' : 'bg-[#8DA432]'
                }`}
                style={{ width: `${dron.nivel_agua_porcentaje}%` }}
              />
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[#8DA432]/20 flex justify-between items-center text-[11px]">
            <span className="text-[#EDE383]/70">Batería de vuelo:</span>
            <span className="text-[#FFFCE9] font-bold font-mono">🔋 {dron.bateria_porcentaje}%</span>
          </div>
        </div>

        {/* 2. Sensor de Presencia en Base y Llave de Paso */}
        <div className="bg-[#1c2a04] p-3.5 rounded-xl border border-[#8DA432]/25 flex flex-col justify-between">
          <div>
            <div className="text-xs text-[#EDE383] mb-2 flex items-center justify-between font-semibold">
              <span>📡 Sensor de Presencia (Base)</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                dron.en_posicion_recarga
                  ? 'bg-[#8DA432]/30 text-[#FFFCE9] border-[#8DA432]'
                  : 'bg-[#925E06]/40 text-[#EDE383] border-[#925E06]'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dron.en_posicion_recarga ? 'bg-[#8DA432] animate-pulse' : 'bg-[#925E06]'}`} />
                {dron.en_posicion_recarga ? 'Objeto Detectado' : 'Sin Objeto'}
              </span>
            </div>

            <p className="text-[11px] text-[#EDE383]/80 leading-relaxed mb-3">
              {dron.en_posicion_recarga
                ? 'El dron se encuentra acoplado en la plataforma de recarga. Válvula de suministro habilitada.'
                : '⚠️ No se detecta ningún objeto en la plataforma. Llave de paso bloqueada por seguridad.'}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleTogglePresencia}
              className="flex-1 text-[11px] py-1.5 px-2 rounded-xl border border-[#8DA432]/40 bg-[#365004]/70 hover:bg-[#8DA432] text-[#FFFCE9] transition-all font-bold cursor-pointer"
            >
              {dron.en_posicion_recarga ? 'Retirar Dron' : 'Colocar Dron'}
            </button>
            <button
              onClick={handleToggleLlave}
              disabled={!dron.en_posicion_recarga}
              className={`flex-1 text-[11px] py-1.5 px-2 rounded-xl border font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                !dron.en_posicion_recarga
                  ? 'bg-[#192604] border-[#8DA432]/20 text-[#EDE383]/40 cursor-not-allowed'
                  : dron.llave_paso_recarga_abierta
                  ? 'bg-[#8DA432] text-[#FFFCE9] border-[#FFFCE9]/50 shadow-md animate-pulse'
                  : 'bg-[#365004] text-[#FFFCE9] border-[#8DA432] hover:bg-[#8DA432]'
              }`}
            >
              {!dron.en_posicion_recarga ? (
                <>🔒 Bloqueada</>
              ) : dron.llave_paso_recarga_abierta ? (
                <>🚰 Llenando...</>
              ) : (
                <>Abrir Llave</>
              )}
            </button>
          </div>
        </div>

        {/* 3. Acciones de Riego de Emergencia */}
        <div className="bg-[#1c2a04] p-3.5 rounded-xl border border-[#8DA432]/25 flex flex-col justify-between">
          <div>
            <div className="text-xs text-[#EDE383] mb-1.5 font-bold">
              <span>🚨 Protocolo de Emergencia</span>
            </div>
            <p className="text-[11px] text-[#EDE383]/80 leading-relaxed mb-2">
              Activación para regar todo el sembradío ante periodos prolongados de sequía (&gt;= 3 días sin lluvia).
            </p>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleDespacharDron}
              disabled={enMision}
              className={`w-full py-2.5 px-3 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                enMision
                  ? 'bg-[#365004] text-[#FFFCE9] border border-[#EDE383] animate-pulse'
                  : sinAgua
                  ? 'bg-[#925E06] text-[#FFFCE9] border border-[#FFFCE9]/30 hover:bg-[#925E06]/80'
                  : 'bg-[#8DA432] hover:bg-[#365004] text-[#FFFCE9] border border-[#EDE383]/40'
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
                className="flex-1 text-[10px] py-1.5 px-2 rounded-xl border border-[#8DA432]/30 bg-[#365004]/60 text-[#EDE383] hover:text-[#FFFCE9] hover:bg-[#8DA432] transition-colors font-medium cursor-pointer"
              >
                Llenado manual
              </button>
              {modoGlobal === 'manual' && (
                <button
                  onClick={handleRiegoManualTodo}
                  className="flex-1 text-[10px] py-1.5 px-2 rounded-xl bg-[#365004] text-[#FFFCE9] border border-[#8DA432] hover:bg-[#8DA432] font-bold transition-colors cursor-pointer"
                >
                  Regar todo manual
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
