'use client';

import { useState } from 'react';
import { DronRiego, ParcelaDashboard, TipoMisionDron } from '@/types';
import { registrarBitacora } from '@/lib/bitacora';
import { api } from '@/lib/api';

interface DroneControlPanelProps {
  parcelas?: ParcelaDashboard[];
  dron: DronRiego;
  modoGlobal: 'automatico' | 'manual';
  onRefresh: () => void;
}

const MISION_INFO: Record<TipoMisionDron, { icon: string; label: string; verbo: string; descripcion: string }> = {
  riego: {
    icon: '💧',
    label: 'Riego',
    verbo: 'Regar',
    descripcion: 'Agua de la cisterna hasta llevar el suelo a su humedad óptima.',
  },
  fumigacion: {
    icon: '🧪',
    label: 'Fumigación',
    verbo: 'Fumigar',
    descripcion: 'Biopreparado orgánico (5%) diluido en agua: 10 L de caldo por hectárea.',
  },
  escaneo: {
    icon: '🔍',
    label: 'Escaneo',
    verbo: 'Escanear',
    descripcion: 'La cámara del dron recorre el cultivo y la IA reporta si hay plaga (sí/no) con su confianza. No gasta agua.',
  },
};

export default function DroneControlPanel({
  parcelas = [],
  dron,
  modoGlobal,
  onRefresh,
}: DroneControlPanelProps) {
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [targetParcela, setTargetParcela] = useState<string>('');
  const [tipoMision, setTipoMision] = useState<TipoMisionDron>('riego');

  const showMsg = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const manual = modoGlobal === 'manual';
  const enMision = dron.mision_activa;
  const dronNivel = Number(dron.nivel_agua_porcentaje ?? 0);
  const dronCapacidad = Number(dron.capacidad_litros ?? 40);
  const dronLitros = (dronCapacidad * dronNivel) / 100;
  const bioNivel = Number(dron.nivel_biopreparado_porcentaje ?? 0);
  const bioCapacidad = Number(dron.capacidad_biopreparado_litros ?? 5);
  const sinAgua = dronNivel <= 15;

  // Solo parcelas activas con cultivo: el dron no aplica sobre terreno en descanso.
  const parcelasOperables = parcelas.filter((p) => p.parcela.activa && p.tiene_cultivo && p.cultivo);
  const seleccionada = parcelasOperables.find((p) => p.parcela.id === targetParcela);
  const esEscaneo = tipoMision === 'escaneo';
  const dosisEstimada = seleccionada && !esEscaneo ? api.calcularDosisDron(seleccionada, tipoMision) : 0;
  const misionEsEscaneo = dron.tipo_mision === 'escaneo';
  const avance = Number(dron.avance_porcentaje ?? 0);

  const objetivoMision = parcelas.find((p) => p.parcela.id === dron.objetivo_parcela_id);
  const misionActual = dron.tipo_mision ? MISION_INFO[dron.tipo_mision] : null;
  const aplicados = Number(dron.litros_aplicados ?? 0);
  const objetivoLitros = Number(dron.litros_objetivo ?? 0);
  const progreso = objetivoLitros > 0 ? Math.min(100, (aplicados / objetivoLitros) * 100) : 0;
  const ultima = dron.ultima_mision;

  const handleToggleModoGlobal = () => {
    const nuevo = api.toggleModoGlobalRiego();
    registrarBitacora({ categoria: 'riego', accion: `Modo de riego cambiado a ${nuevo === 'automatico' ? 'automático' : 'manual'}`, tipo_riego: 'Tuberías (todas las parcelas)' });
    showMsg(`Sistema configurado en modo ${nuevo === 'automatico' ? 'AUTOMÁTICO' : 'MANUAL'}.`);
    onRefresh();
  };

  const handleTogglePresencia = () => {
    const presente = api.toggleDronPresencia();
    showMsg(presente ? 'Sensor detectó al dron en la plataforma de recarga.' : 'Plataforma de recarga libre.');
    onRefresh();
  };

  const handleToggleLlave = () => {
    showMsg(api.toggleDronLlavePaso().message);
    onRefresh();
  };

  const handleMision = () => {
    const res = enMision ? api.detenerDronEmergencia() : api.despacharDron(seleccionada, tipoMision);
    registrarBitacora({
      categoria: 'dron',
      accion: enMision ? 'Misión del dron detenida' : `Misión del dron: ${MISION_INFO[tipoMision].label}`,
      detalle: res.message,
      tipo_riego: tipoMision === 'riego' ? 'Dron (riego de emergencia)' : null,
      parcela: seleccionada?.parcela.nombre ?? null,
    });
    showMsg(res.message);
    onRefresh();
  };

  const handleLlenarManual = () => {
    showMsg(api.llenarDronManual().message);
    onRefresh();
  };

  const handleRecargarBio = () => {
    showMsg(api.recargarBiopreparado().message);
    onRefresh();
  };

  const handleRiegoManualTodo = () => {
    api.regarTodoManual();
    registrarBitacora({ categoria: 'riego', accion: 'Riego manual: regar todo el sembradío', tipo_riego: 'Tuberías (todas las parcelas)' });
    showMsg('Válvulas abiertas: regando todo el sembradío.');
    onRefresh();
  };

  const handleDetenerTodo = () => {
    api.detenerRiegoTodo();
    registrarBitacora({ categoria: 'riego', accion: 'Riego manual: detener todo el riego', tipo_riego: 'Tuberías (todas las parcelas)' });
    showMsg('Válvulas cerradas: riego detenido en todo el sembradío.');
    onRefresh();
  };

  const puedeDespachar =
    manual && !enMision && Boolean(seleccionada) && (esEscaneo || (!sinAgua && !(tipoMision === 'fumigacion' && bioNivel <= 10)));

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-applegreen/30 bg-card p-5 shadow-lg shadow-black/20">
      {/* Cabecera y modo maestro */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-applegreen/20 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-applegreen/40 bg-darkgreen text-2xl">🚁</div>
          <div>
            <h3 className="flex flex-wrap items-center gap-2 text-base font-bold tracking-tight text-creme">
              Dron de riego, fumigación y escaneo
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                  dron.requiere_riego_emergencia ? 'border-goldenbrown bg-goldenbrown/40 text-creme' : 'border-applegreen/50 bg-applegreen/15 text-applegreen'
                }`}
              >
                {dron.requiere_riego_emergencia ? `Sequía: ${dron.dias_sin_lluvia} días sin lluvia` : 'Clima estable'}
              </span>
            </h3>
            <p className="text-xs text-flax/80">{dron.nombre} · Batería 🔋 {dron.bateria_porcentaje}%</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-applegreen/25 bg-panel p-1.5">
          <button
            onClick={() => modoGlobal !== 'automatico' && handleToggleModoGlobal()}
            className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              modoGlobal === 'automatico' ? 'bg-applegreen text-ink shadow-md' : 'text-flax/70 hover:text-creme'
            }`}
          >
            ⚡ Automático
          </button>
          <button
            onClick={() => modoGlobal !== 'manual' && handleToggleModoGlobal()}
            className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              manual ? 'bg-goldenbrown text-creme shadow-md' : 'text-flax/70 hover:text-creme'
            }`}
          >
            ✋ Manual
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="flex animate-fade-in items-center justify-between rounded-xl border border-applegreen bg-darkgreen px-3.5 py-2.5 text-xs text-creme shadow-md">
          <span className="font-medium">ℹ️ {feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="ml-2 font-bold text-flax hover:text-creme">✕</button>
        </div>
      )}

      {/* Misión en curso */}
      {enMision && misionActual && (
        <div className="rounded-xl border border-flax/40 bg-darkgreen/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-creme">
              <span className="h-2 w-2 animate-pulse rounded-full bg-flax" />
              {misionActual.icon} {misionActual.label} en curso · {objetivoMision?.parcela.nombre ?? 'Parcela objetivo'}
            </div>
            <span className="font-mono text-xs text-flax">
              {misionEsEscaneo ? `${avance.toFixed(0)}% recorrido` : `${aplicados.toFixed(1)} / ${objetivoLitros.toFixed(1)} L`}
            </span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-field">
            <div
              className={`h-full rounded-full transition-all duration-700 ${misionEsEscaneo ? 'bg-applegreen' : 'bg-flax'}`}
              style={{ width: `${misionEsEscaneo ? avance : progreso}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-flax/75">
            {misionEsEscaneo
              ? 'La cámara captura el follaje; al terminar, la IA reporta si hay plaga y el resultado se notifica.'
              : objetivoLitros > dronLitros + aplicados
              ? `El tanque no alcanza para toda la dosis: se aplicará ~${(dronLitros + aplicados).toFixed(1)} L.`
              : `Restan ${(objetivoLitros - aplicados).toFixed(1)} L. El dron vuelve a la base al terminar.`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Tanques del dron */}
        <div className="flex flex-col gap-3 rounded-xl border border-applegreen/20 bg-panel p-3.5">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-flax">
              <span className="font-semibold">💧 Tanque de agua</span>
              <span className="font-mono text-[10px] text-flax/70">{dronLitros.toFixed(1)} / {dronCapacidad} L</span>
            </div>
            <div className="mb-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-creme">{dronNivel.toFixed(0)}%</span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                  sinAgua ? 'border-goldenbrown bg-goldenbrown/50 text-creme' : 'border-applegreen/60 bg-applegreen/15 text-applegreen'
                }`}
              >
                {sinAgua ? 'Requiere carga' : 'Listo'}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-field">
              <div className={`h-full transition-all duration-700 ${sinAgua ? 'bg-goldenbrown' : 'bg-applegreen'}`} style={{ width: `${dronNivel}%` }} />
            </div>
          </div>

          <div className="border-t border-applegreen/15 pt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-flax">
              <span className="font-semibold">🧪 Biopreparado</span>
              <span className="font-mono text-[10px] text-flax/70">
                {((bioCapacidad * bioNivel) / 100).toFixed(2)} / {bioCapacidad} L
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-field">
              <div className={`h-full transition-all duration-700 ${bioNivel <= 20 ? 'bg-goldenbrown' : 'bg-flax'}`} style={{ width: `${bioNivel}%` }} />
            </div>
          </div>

          <div className="mt-auto flex gap-2">
            <button
              onClick={handleLlenarManual}
              disabled={!manual || !dron.en_posicion_recarga || enMision}
              className="flex-1 cursor-pointer rounded-lg border border-applegreen/30 bg-darkgreen/60 px-2 py-1.5 text-[10px] font-semibold text-flax transition-colors hover:bg-applegreen hover:text-ink disabled:cursor-not-allowed disabled:bg-ink disabled:text-flax/30 disabled:hover:bg-ink"
            >
              Llenar agua
            </button>
            <button
              onClick={handleRecargarBio}
              disabled={!manual || !dron.en_posicion_recarga || enMision}
              className="flex-1 cursor-pointer rounded-lg border border-applegreen/30 bg-darkgreen/60 px-2 py-1.5 text-[10px] font-semibold text-flax transition-colors hover:bg-applegreen hover:text-ink disabled:cursor-not-allowed disabled:bg-ink disabled:text-flax/30 disabled:hover:bg-ink"
            >
              Recargar bio
            </button>
          </div>
        </div>

        {/* Estación de recarga */}
        <div className="flex flex-col justify-between rounded-xl border border-applegreen/20 bg-panel p-3.5">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-flax">
              <span>📡 Estación de recarga</span>
              <span
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                  dron.en_posicion_recarga ? 'border-applegreen bg-applegreen/20 text-creme' : 'border-goldenbrown bg-goldenbrown/40 text-flax'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${dron.en_posicion_recarga ? 'animate-pulse bg-applegreen' : 'bg-goldenbrown'}`} />
                {dron.en_posicion_recarga ? 'Dron acoplado' : 'Sin dron'}
              </span>
            </div>
            <p className="mb-3 text-[11px] leading-relaxed text-flax/80">
              {dron.en_posicion_recarga
                ? dron.llave_paso_recarga_abierta
                  ? 'Llave abierta: el agua pasa de la cisterna al dron.'
                  : 'El sensor detecta al dron. La llave de suministro está habilitada.'
                : 'El dron no está en la plataforma. La llave de paso queda bloqueada por seguridad.'}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleTogglePresencia}
              disabled={!manual || enMision}
              className="flex-1 cursor-pointer rounded-lg border border-applegreen/40 bg-darkgreen/70 px-2 py-1.5 text-[11px] font-bold text-creme transition-all hover:bg-applegreen hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-darkgreen/70 disabled:hover:text-creme"
            >
              {dron.en_posicion_recarga ? 'Retirar dron' : 'Colocar dron'}
            </button>
            <button
              onClick={handleToggleLlave}
              disabled={!dron.en_posicion_recarga || !manual}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-all ${
                !dron.en_posicion_recarga
                  ? 'cursor-not-allowed border-applegreen/15 bg-ink text-flax/40'
                  : dron.llave_paso_recarga_abierta
                  ? 'animate-pulse border-creme/50 bg-applegreen text-ink'
                  : 'cursor-pointer border-applegreen bg-darkgreen text-creme hover:bg-applegreen hover:text-ink disabled:cursor-not-allowed disabled:opacity-50'
              }`}
            >
              {!dron.en_posicion_recarga ? '🔒 Bloqueada' : dron.llave_paso_recarga_abierta ? '🚰 Llenando…' : 'Abrir llave'}
            </button>
          </div>
        </div>

        {/* Planificador de misión */}
        <div className="flex flex-col gap-2.5 rounded-xl border border-applegreen/20 bg-panel p-3.5">
          <div className="text-xs font-bold text-flax">🎯 Misión</div>

          <div className="grid grid-cols-3 gap-1 rounded-lg border border-applegreen/20 bg-ink/60 p-1">
            {(Object.keys(MISION_INFO) as TipoMisionDron[]).map((tipo) => (
              <button
                key={tipo}
                onClick={() => setTipoMision(tipo)}
                disabled={!manual || enMision}
                className={`rounded-md px-1 py-1.5 text-[10px] font-bold transition-all disabled:cursor-not-allowed ${
                  tipoMision === tipo ? 'bg-applegreen text-ink' : 'cursor-pointer text-flax/70 hover:text-creme'
                }`}
              >
                {MISION_INFO[tipo].icon} {MISION_INFO[tipo].label}
              </button>
            ))}
          </div>

          <select
            value={targetParcela}
            onChange={(e) => setTargetParcela(e.target.value)}
            disabled={enMision || !manual}
            className="w-full rounded-lg border border-applegreen/30 bg-card px-2 py-2 text-[11px] text-creme outline-none focus:border-applegreen disabled:opacity-50"
          >
            <option value="">📍 Selecciona una parcela</option>
            {parcelasOperables.map((p) => (
              <option key={p.parcela.id} value={p.parcela.id}>
                {p.parcela.nombre} · {Number(p.humedad_suelo).toFixed(0)}%
              </option>
            ))}
          </select>

          <p className="text-[10px] leading-relaxed text-flax/70">
            {!manual
              ? 'En automático el dron riega parcelas bajo su humedad mínima, escanea las de mayor riesgo de plaga según la IA y fumiga solo las plagas confirmadas.'
              : seleccionada && esEscaneo
              ? `Duración estimada: ~${Math.max(20, Math.round(20 * Number(seleccionada.parcela.superficie_hectareas || 1)))} s. Riesgo IA actual: ${Math.round((seleccionada.riesgo_plaga?.probabilidad ?? 0) * 100)}%. ${MISION_INFO.escaneo.descripcion}`
              : seleccionada
              ? `Dosis estimada: ${dosisEstimada.toFixed(1)} L${dosisEstimada > dronLitros ? ` (el tanque tiene ${dronLitros.toFixed(1)} L)` : ''}. ${MISION_INFO[tipoMision].descripcion}`
              : MISION_INFO[tipoMision].descripcion}
          </p>

          <button
            onClick={handleMision}
            disabled={!manual || (!enMision && !puedeDespachar)}
            className={`mt-auto flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-extrabold shadow-md transition-all ${
              !manual
                ? 'cursor-not-allowed border border-applegreen/15 bg-ink text-flax/50'
                : enMision
                ? 'cursor-pointer border border-creme/30 bg-goldenbrown text-creme hover:bg-goldenbrown/80'
                : puedeDespachar
                ? 'cursor-pointer border border-flax/40 bg-applegreen text-ink hover:bg-darkgreen hover:text-creme'
                : 'cursor-not-allowed border border-applegreen/15 bg-field text-flax/50'
            }`}
          >
            {!manual
              ? '⚙️ Control automático activo'
              : enMision
              ? '🛑 Detener y regresar a base'
              : sinAgua && !esEscaneo
              ? '⚠️ Recarga el tanque'
              : tipoMision === 'fumigacion' && bioNivel <= 10
              ? '⚠️ Recarga el biopreparado'
              : `🚀 ${MISION_INFO[tipoMision].verbo} parcela`}
          </button>
        </div>
      </div>

      {/* Válvulas del sembradío (riego por tubería, independiente del dron) */}
      {manual && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-applegreen/15 bg-panel px-3.5 py-2.5">
          <span className="text-[11px] font-semibold text-flax">🚿 Electroválvulas del sembradío</span>
          <div className="flex gap-2">
            <button
              onClick={handleRiegoManualTodo}
              className="cursor-pointer rounded-lg border border-applegreen bg-darkgreen px-3 py-1.5 text-[10px] font-bold text-creme transition-colors hover:bg-applegreen hover:text-ink"
            >
              Regar todo manual
            </button>
            <button
              onClick={handleDetenerTodo}
              className="cursor-pointer rounded-lg border border-goldenbrown bg-goldenbrown/40 px-3 py-1.5 text-[10px] font-bold text-creme transition-colors hover:bg-goldenbrown"
            >
              Cerrar todas
            </button>
          </div>
        </div>
      )}

      {/* Resultado de la última misión */}
      {ultima && !enMision && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-applegreen/15 bg-ink/40 px-3.5 py-2.5 text-[11px]">
          <span className="text-flax/80">
            Última misión: <b className="text-creme">{MISION_INFO[ultima.tipo].icon} {MISION_INFO[ultima.tipo].label}</b> en{' '}
            <b className="text-creme">{ultima.parcela_nombre}</b> · {ultima.motivo_fin}
          </span>
          {ultima.escaneo ? (
            <span
              className={`rounded-full border px-2.5 py-0.5 font-bold ${
                ultima.escaneo.plaga_detectada ? 'border-goldenbrown bg-goldenbrown text-creme' : 'border-applegreen/60 bg-applegreen/20 text-applegreen'
              }`}
            >
              plaga_detectada: {String(ultima.escaneo.plaga_detectada)} · {Math.round(ultima.escaneo.confianza * 100)}%
            </span>
          ) : ultima.tipo === 'escaneo' ? (
            <span className="font-mono font-bold text-flax">Escaneo interrumpido</span>
          ) : (
            <span className={`font-mono font-bold ${ultima.completada ? 'text-applegreen' : 'text-flax'}`}>
              {ultima.litros_aplicados.toFixed(1)} / {ultima.litros_objetivo.toFixed(1)} L {ultima.completada ? '✓' : '(parcial)'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
