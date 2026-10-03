'use client';

import { useState } from 'react';
import { CreateParcelaDTO, Zona3D, ModoOperacion, MetodoRiego, InstalacionRiego } from '@/types';
import { METODOS_RIEGO, RIEGO_POR_METODO, sugerirInstalacion } from '@/lib/api';
import { MODAL_FONDO, MODAL_HOJA, useBloquearScroll } from '@/components/ui/modal';
import { CULTIVOS_MORELOS, getEstadoPH } from '@/lib/crop-profiles';

interface CreateParcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateParcelaDTO) => Promise<void>;
}

export default function CreateParcelModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateParcelModalProps) {
  // Estado básico
  const [nombre, setNombre] = useState('');
  const [propietario, setPropietario] = useState('Cooperativa Morelos');
  const [superficie, setSuperficie] = useState<number>(3.5);
  const [zona3d, setZona3d] = useState<Zona3D>('zona_media');
  const [modoOperacion, setModoOperacion] = useState<ModoOperacion>('automatico');
  const [notas, setNotas] = useState('');

  // Estado de cultivo
  const [tieneCultivo, setTieneCultivo] = useState(true);
  const [cultivoKey, setCultivoKey] = useState<string>('tomate_rojo');
  // Tuberías a instalar (goteo, aspersión o las dos). null = usar el sistema recomendado por el cultivo;
  // metros/emisores en null = usar los materiales sugeridos para la superficie.
  const [sistemasElegidos, setSistemasElegidos] = useState<MetodoRiego[] | null>(null);
  const [instaladas, setInstaladas] = useState<Record<MetodoRiego, boolean>>({ goteo: false, microaspersion: false, aspersion_presurizada: false });
  const [materiales, setMateriales] = useState<Record<MetodoRiego, { metros: number | null; emisores: number | null }>>({
    goteo: { metros: null, emisores: null },
    microaspersion: { metros: null, emisores: null },
    aspersion_presurizada: { metros: null, emisores: null },
  });
  const [estadoDescanso, setEstadoDescanso] = useState('Terreno en descanso y rotación');

  // Configuración de Sensores
  const [sensorSueloActivo, setSensorSueloActivo] = useState(true);
  const [sensorSueloValor, setSensorSueloValor] = useState<number>(55);

  const [sensorAmbienteActivo, setSensorAmbienteActivo] = useState(true);
  const [sensorAmbienteValor, setSensorAmbienteValor] = useState<number>(65);

  const [sensorTempActivo, setSensorTempActivo] = useState(true);
  const [sensorTempValor, setSensorTempValor] = useState<number>(26.5);

  const [sensorPhActivo, setSensorPhActivo] = useState(true);
  const [sensorPhValor, setSensorPhValor] = useState<number>(6.8);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useBloquearScroll(isOpen);
  if (!isOpen) return null;

  const selectedCultivo = CULTIVOS_MORELOS[cultivoKey];
  const metodoRecomendado: MetodoRiego = selectedCultivo?.tipo_riego === 'goteo' ? 'goteo' : 'aspersion_presurizada';
  const sistemas = sistemasElegidos ?? [metodoRecomendado];
  const materialesDe = (m: MetodoRiego) => {
    const sugerido = sugerirInstalacion(m, Number(superficie) || 1);
    return { metros: materiales[m]?.metros ?? sugerido.metros_tuberia, emisores: materiales[m]?.emisores ?? sugerido.emisores };
  };
  const alternarSistema = (m: MetodoRiego) => {
    const siguiente = sistemas.includes(m) ? sistemas.filter((x) => x !== m) : [...sistemas, m];
    if (siguiente.length) setSistemasElegidos(METODOS_RIEGO.filter((x) => siguiente.includes(x)));
  };
  const phStatus = getEstadoPH(sensorPhValor);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMsg('Por favor ingresa un nombre para la parcela.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const dto: CreateParcelaDTO = {
        nombre: nombre.trim(),
        propietario: propietario.trim() || 'Propietario General',
        superficie_hectareas: Number(superficie) || 1.0,
        zona_3d: zona3d,
        modo_operacion: modoOperacion,
        color_base: tieneCultivo ? '#8DA432' : '#925E06',
        tiene_cultivo: tieneCultivo,
        cultivo_id: tieneCultivo ? (selectedCultivo?.id || 'tomate-rojo') : null,
        metodo_riego: tieneCultivo ? (sistemas.length === 2 ? 'ambos' : sistemas[0]) : null,
        instalaciones_riego: tieneCultivo
          ? sistemas.map(
              (m): InstalacionRiego => ({
                estado: instaladas[m] ? 'instalada' : 'pendiente',
                metodo: m,
                metros_tuberia: Math.round(materialesDe(m).metros),
                emisores: Math.round(materialesDe(m).emisores),
                fecha: new Date().toISOString(),
              })
            )
          : null,
        estado_descanso: tieneCultivo ? undefined : estadoDescanso,
        notas: notas.trim() || undefined,
        sensores_config: {
          humedad_suelo: sensorSueloActivo,
          humedad_suelo_valor: Number(sensorSueloValor),
          humedad_ambiental: sensorAmbienteActivo,
          humedad_ambiental_valor: Number(sensorAmbienteValor),
          temperatura: sensorTempActivo,
          temperatura_valor: Number(sensorTempValor),
          ph_suelo: sensorPhActivo,
          ph_suelo_valor: Number(sensorPhValor),
        },
      };

      await onSubmit(dto);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al guardar la parcela.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={MODAL_FONDO}>
      <div className={`${MODAL_HOJA} relative max-w-2xl bg-ink text-creme`}>
        {/* Header del Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-applegreen/25 mb-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 rounded-2xl bg-darkgreen border border-applegreen/50 text-flax shadow-inner">
              🌱
            </span>
            <div>
              <h2 className="text-lg font-bold text-creme">
                Crear Nueva Parcela
              </h2>
              <p className="text-xs text-flax/80">
                Configuración del terreno, estado del cultivo y sensores
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-flax hover:text-creme p-1.5 rounded-xl hover:bg-applegreen/20 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-goldenbrown/40 border border-goldenbrown rounded-xl text-creme text-xs font-semibold">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECCIÓN 1: Datos Generales */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-flax flex items-center gap-1.5">
              <span>📋</span> Datos de la Parcela
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-flax mb-1 font-medium">
                  Nombre de la Parcela *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Parcela Poniente - Invernadero A"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-card border border-applegreen/35 rounded-xl px-3 py-2 text-sm text-creme placeholder-flax/40 focus:outline-none focus:border-applegreen"
                />
              </div>

              <div>
                <label className="block text-xs text-flax mb-1 font-medium">
                  Propietario / Ejido
                </label>
                <input
                  type="text"
                  placeholder="Ej. Cooperativa Yautepec"
                  value={propietario}
                  onChange={(e) => setPropietario(e.target.value)}
                  className="w-full bg-card border border-applegreen/35 rounded-xl px-3 py-2 text-sm text-creme placeholder-flax/40 focus:outline-none focus:border-applegreen"
                />
              </div>

              <div>
                <label className="block text-xs text-flax mb-1 font-medium">
                  Superficie (Hectáreas)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={superficie}
                  onChange={(e) => setSuperficie(parseFloat(e.target.value) || 1)}
                  className="w-full bg-card border border-applegreen/35 rounded-xl px-3 py-2 text-sm text-creme focus:outline-none focus:border-applegreen"
                />
              </div>

              <div>
                <label className="block text-xs text-flax mb-1 font-medium">
                  Zona en Terreno 3D
                </label>
                <select
                  value={zona3d}
                  onChange={(e) => setZona3d(e.target.value as Zona3D)}
                  className="w-full bg-card border border-applegreen/35 rounded-xl px-3 py-2 text-sm text-creme focus:outline-none focus:border-applegreen"
                >
                  <option value="zona_alta">Zona Alta (Topografía elevada - 1520 msnm)</option>
                  <option value="zona_media">Zona Media (Valle intermedio - 1480 msnm)</option>
                  <option value="zona_baja">Zona Baja (Planicie / Ciénaga - 1420 msnm)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs text-flax mb-1 font-medium">
                  Modo de Operación
                </label>
                <select
                  value={modoOperacion}
                  onChange={(e) => setModoOperacion(e.target.value as ModoOperacion)}
                  className="w-full bg-card border border-applegreen/35 rounded-xl px-3 py-2 text-sm text-creme focus:outline-none focus:border-applegreen"
                >
                  <option value="automatico">Riego Automático (Por sensores y pronóstico)</option>
                  <option value="manual">Manual (Operado por usuario)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: Estado de Cultivo (¿Tiene cultivo o no?) */}
          <div className="space-y-3 pt-3 border-t border-applegreen/25">
            <h3 className="text-xs font-bold uppercase tracking-wider text-flax flex items-center gap-1.5">
              <span>🌾</span> Estado del Cultivo
            </h3>

            {/* Selector de Con / Sin Cultivo */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTieneCultivo(true)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  tieneCultivo
                    ? 'bg-applegreen border-flax text-ink shadow-lg shadow-black/20 font-bold'
                    : 'bg-card border-applegreen/25 text-flax/70 hover:bg-applegreen/20'
                }`}
              >
                <span className="text-2xl">🌱</span>
                <div>
                  <div className="text-sm font-bold">Con Cultivo Activo</div>
                  <div className="text-[10px] text-creme/80 font-normal">
                    Siembra en producción monitoreada
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTieneCultivo(false)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  !tieneCultivo
                    ? 'bg-goldenbrown border-flax text-creme shadow-lg shadow-black/20 font-bold'
                    : 'bg-card border-applegreen/25 text-flax/70 hover:bg-applegreen/20'
                }`}
              >
                <span className="text-2xl">🍂</span>
                <div>
                  <div className="text-sm font-bold">Sin Cultivo</div>
                  <div className="text-[10px] text-creme/80 font-normal">
                    Terreno en descanso o rotación
                  </div>
                </div>
              </button>
            </div>

            {/* Opciones según tenga cultivo o no */}
            {tieneCultivo ? (
              <div className="bg-card rounded-2xl p-4 border border-applegreen/30 space-y-3">
                <div>
                  <label className="block text-xs text-flax mb-1 font-semibold">
                    Selecciona qué cultivo tiene:
                  </label>
                  <select
                    value={cultivoKey}
                    onChange={(e) => setCultivoKey(e.target.value)}
                    className="w-full bg-panel border border-applegreen/35 rounded-xl px-3 py-2 text-sm text-creme focus:outline-none focus:border-applegreen"
                  >
                    {Object.entries(CULTIVOS_MORELOS).map(([key, c]) => (
                      <option key={key} value={key}>
                        {c.icono} {c.nombre} ({c.nombre_cientifico}) · Riego por {c.tipo_riego}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Resumen del cultivo seleccionado */}
                {selectedCultivo && (
                  <div className="bg-panel border border-applegreen/30 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div>
                      <div className="text-[10px] text-flax/70">Humedad Óptima</div>
                      <div className="font-extrabold text-applegreen text-sm">
                        {selectedCultivo.humedad_optima}%
                      </div>
                      <div className="text-[9px] text-flax/50">
                        ({selectedCultivo.humedad_minima}-{selectedCultivo.humedad_maxima}%)
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-flax/70">Temp. Óptima</div>
                      <div className="font-extrabold text-creme text-sm">
                        {selectedCultivo.temp_optima}°C
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-flax/70">Alerta Hongos</div>
                      <div className="font-extrabold text-goldenbrown text-sm">
                        {selectedCultivo.hr_alerta_hongos}% HR
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-flax/70">Riego recomendado</div>
                      <div className="font-extrabold capitalize text-flax text-sm">
                        {selectedCultivo.tipo_riego}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tuberías: una parcela puede tener goteo, aspersión o las dos */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-flax">🛠️ Tuberías a instalar (una o las dos):</label>
                  {METODOS_RIEGO.map((m) => {
                    const incluido = sistemas.includes(m);
                    const mat = materialesDe(m);
                    return (
                      <div key={m} className={`rounded-xl border p-3 ${incluido ? 'border-applegreen/50 bg-panel' : 'border-applegreen/15 bg-card'}`}>
                        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-creme">
                          <input type="checkbox" checked={incluido} onChange={() => alternarSistema(m)} className="h-4 w-4 accent-[#8DA432]" />
                          {RIEGO_POR_METODO[m].icono} {RIEGO_POR_METODO[m].label}
                          {m === metodoRecomendado && <span className="text-[10px] font-normal text-flax/60">(recomendado)</span>}
                        </label>
                        {incluido && (
                          <div className="mt-2 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <label className="block">
                                <span className="mb-1 block text-[10px] text-flax/70">Tubería (m)</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={mat.metros}
                                  onChange={(e) => setMateriales((prev) => ({ ...prev, [m]: { ...prev[m], metros: Number(e.target.value) } }))}
                                  className="w-full rounded-lg border border-applegreen/30 bg-card px-2 py-1.5 text-sm text-creme outline-none focus:border-flax"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-[10px] text-flax/70">{m === 'goteo' ? 'Goteros' : 'Aspersores'}</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={mat.emisores}
                                  onChange={(e) => setMateriales((prev) => ({ ...prev, [m]: { ...prev[m], emisores: Number(e.target.value) } }))}
                                  className="w-full rounded-lg border border-applegreen/30 bg-card px-2 py-1.5 text-sm text-creme outline-none focus:border-flax"
                                />
                              </label>
                            </div>
                            <label className="flex cursor-pointer items-center gap-2 text-xs text-creme">
                              <input
                                type="checkbox"
                                checked={instaladas[m]}
                                onChange={(e) => setInstaladas((prev) => ({ ...prev, [m]: e.target.checked }))}
                                className="h-4 w-4 accent-[#8DA432]"
                              />
                              Ya está instalada y probada
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <p className="text-[10px] text-flax/60">
                    {sistemas.length === 2 ? 'La parcela regará con goteo y aspersión; el productor podrá elegir uno o los dos. ' : ''}
                    Las tuberías sin marcar como instaladas quedan pendientes y no riegan hasta terminarlas en “Instalaciones”.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-2xl p-4 border border-applegreen/30 space-y-2">
                <label className="block text-xs text-flax mb-1 font-semibold">
                  Condición del terreno sin cultivo:
                </label>
                <select
                  value={estadoDescanso}
                  onChange={(e) => setEstadoDescanso(e.target.value)}
                  className="w-full bg-panel border border-applegreen/35 rounded-xl px-3 py-2 text-sm text-creme focus:outline-none focus:border-applegreen"
                >
                  <option value="Terreno en descanso y rotación">
                    🍂 Terreno en descanso / Barbecho biológico
                  </option>
                  <option value="Tierra arada y enriquecida con abono">
                    🌱 Suelo arado y preparado para próxima siembra
                  </option>
                  <option value="Suelo en recuperación de nutrientes">
                    🧪 Terreno en recuperación de nutrientes y pH
                  </option>
                </select>
                <p className="text-[11px] text-flax/70">
                  La parcela se mostrará en color de tierra/barbecho en la vista 3D y mantendrá el monitoreo de los sensores de suelo.
                </p>
              </div>
            )}
          </div>

          {/* SECCIÓN 3: Configuración de Sensores (Los 4 sensores requeridos) */}
          <div className="space-y-3 pt-3 border-t border-applegreen/25">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-flax flex items-center gap-1.5">
                <span>📡</span> Sensores a Instalar y Monitorear
              </h3>
              <span className="text-[10px] text-flax/70">
                Ajusta lecturas iniciales
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Sensor 1: Humedad de la Tierra / Suelo */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  sensorSueloActivo
                    ? 'bg-card border-applegreen/50'
                    : 'bg-panel border-applegreen/10 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-creme">
                    <input
                      type="checkbox"
                      checked={sensorSueloActivo}
                      onChange={(e) => setSensorSueloActivo(e.target.checked)}
                      className="rounded accent-applegreen w-4 h-4 cursor-pointer"
                    />
                    💧 Humedad de la Tierra
                  </label>
                  <span className="text-[10px] text-flax/80 font-mono">Capacitivo</span>
                </div>
                {sensorSueloActivo && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-flax">
                      <span>Lectura inicial:</span>
                      <span className="font-extrabold text-creme">{sensorSueloValor}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={sensorSueloValor}
                      onChange={(e) => setSensorSueloValor(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-panel rounded-lg appearance-none cursor-pointer accent-applegreen"
                    />
                  </div>
                )}
              </div>

              {/* Sensor 2: Humedad Ambiental */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  sensorAmbienteActivo
                    ? 'bg-card border-applegreen/50'
                    : 'bg-panel border-applegreen/10 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-creme">
                    <input
                      type="checkbox"
                      checked={sensorAmbienteActivo}
                      onChange={(e) => setSensorAmbienteActivo(e.target.checked)}
                      className="rounded accent-applegreen w-4 h-4 cursor-pointer"
                    />
                    🌫️ Humedad Ambiental (HR)
                  </label>
                  <span className="text-[10px] text-flax/80 font-mono">SHT31 / DHT</span>
                </div>
                {sensorAmbienteActivo && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-flax">
                      <span>Lectura inicial:</span>
                      <span className="font-extrabold text-creme">{sensorAmbienteValor}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={sensorAmbienteValor}
                      onChange={(e) => setSensorAmbienteValor(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-panel rounded-lg appearance-none cursor-pointer accent-applegreen"
                    />
                  </div>
                )}
              </div>

              {/* Sensor 3: Temperatura Ambiental */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  sensorTempActivo
                    ? 'bg-card border-applegreen/50'
                    : 'bg-panel border-applegreen/10 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-creme">
                    <input
                      type="checkbox"
                      checked={sensorTempActivo}
                      onChange={(e) => setSensorTempActivo(e.target.checked)}
                      className="rounded accent-applegreen w-4 h-4 cursor-pointer"
                    />
                    🌡️ Temperatura Ambiente
                  </label>
                  <span className="text-[10px] text-flax/80 font-mono">DHT / Térmico</span>
                </div>
                {sensorTempActivo && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-flax">
                      <span>Lectura inicial:</span>
                      <span className="font-extrabold text-creme">{sensorTempValor.toFixed(1)}°C</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={45}
                      step={0.5}
                      value={sensorTempValor}
                      onChange={(e) => setSensorTempValor(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-panel rounded-lg appearance-none cursor-pointer accent-applegreen"
                    />
                  </div>
                )}
              </div>

              {/* Sensor 4: pH de la Tierra */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  sensorPhActivo
                    ? 'bg-card border-applegreen/50'
                    : 'bg-panel border-applegreen/10 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-creme">
                    <input
                      type="checkbox"
                      checked={sensorPhActivo}
                      onChange={(e) => setSensorPhActivo(e.target.checked)}
                      className="rounded accent-applegreen w-4 h-4 cursor-pointer"
                    />
                    🧪 pH de la Tierra
                  </label>
                  <span className="text-[10px] text-flax/80 font-mono">Sonda E-201-C</span>
                </div>
                {sensorPhActivo && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-flax items-center">
                      <span>Lectura inicial:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-creme font-mono">{sensorPhValor.toFixed(1)} pH</span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full border bg-applegreen/30 text-creme border-applegreen font-bold">
                          {phStatus.label}
                        </span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={4.0}
                      max={9.5}
                      step={0.1}
                      value={sensorPhValor}
                      onChange={(e) => setSensorPhValor(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-panel rounded-lg appearance-none cursor-pointer accent-applegreen"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs text-flax mb-1 font-semibold">
              Notas u Observaciones (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Parcela con pendiente ligera, sistema de riego por goteo recién calibrado..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full bg-card border border-applegreen/35 rounded-xl px-3 py-2 text-xs text-creme placeholder-flax/40 focus:outline-none focus:border-applegreen resize-none"
            />
          </div>

          {/* Footer de Acciones */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-applegreen/25">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-flax hover:text-creme rounded-xl hover:bg-applegreen/20 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-applegreen hover:bg-darkgreen text-ink hover:text-creme font-extrabold text-xs rounded-xl border border-flax/40 shadow-lg shadow-black/20 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin text-sm">⏳</span> Guardando...
                </>
              ) : (
                <>
                  <span>✓</span> Guardar Parcela
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
