'use client';

import { useState } from 'react';
import { CreateParcelaDTO, Zona3D, ModoOperacion } from '@/types';
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

  if (!isOpen) return null;

  const selectedCultivo = CULTIVOS_MORELOS[cultivoKey];
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
        color_base: tieneCultivo ? '#4CAF50' : '#8D6E63',
        tiene_cultivo: tieneCultivo,
        cultivo_id: tieneCultivo ? (selectedCultivo?.id || 'tomate-rojo') : null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-gray-900 border border-white/15 rounded-2xl shadow-2xl p-6 my-8 text-white max-h-[90vh] overflow-y-auto">
        {/* Header del Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 rounded-xl bg-green-500/20 border border-green-500/30">
              🌱
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">
                Crear Nueva Parcela
              </h2>
              <p className="text-xs text-white/50">
                Configuración del terreno, estado del cultivo y sensores
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-xs">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECCIÓN 1: Datos Generales */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-green-400 flex items-center gap-1.5">
              <span>📋</span> Datos de la Parcela
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/70 mb-1">
                  Nombre de la Parcela *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Parcela Poniente - Invernadero A"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-xs text-white/70 mb-1">
                  Propietario / Ejido
                </label>
                <input
                  type="text"
                  placeholder="Ej. Cooperativa Yautepec"
                  value={propietario}
                  onChange={(e) => setPropietario(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-xs text-white/70 mb-1">
                  Superficie (Hectáreas)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={superficie}
                  onChange={(e) => setSuperficie(parseFloat(e.target.value) || 1)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-xs text-white/70 mb-1">
                  Zona en Terreno 3D
                </label>
                <select
                  value={zona3d}
                  onChange={(e) => setZona3d(e.target.value as Zona3D)}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                >
                  <option value="zona_alta">Zona Alta (Topografía elevada - 1520 msnm)</option>
                  <option value="zona_media">Zona Media (Valle intermedio - 1480 msnm)</option>
                  <option value="zona_baja">Zona Baja (Planicie / Ciénaga - 1420 msnm)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-white/70 mb-1">
                  Modo de Operación
                </label>
                <select
                  value={modoOperacion}
                  onChange={(e) => setModoOperacion(e.target.value as ModoOperacion)}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                >
                  <option value="automatico">Riego Automático (Por sensores)</option>
                  <option value="manual">Manual (Operado por usuario)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: Estado de Cultivo (¿Tiene cultivo o no?) */}
          <div className="space-y-3 pt-3 border-t border-white/10">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-green-400 flex items-center gap-1.5">
              <span>🌾</span> Estado del Cultivo (¿Tiene cultivo la parcela?)
            </h3>

            {/* Selector de Con / Sin Cultivo */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTieneCultivo(true)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  tieneCultivo
                    ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                <span className="text-2xl">🌱</span>
                <div>
                  <div className="text-sm font-semibold">Con Cultivo Activo</div>
                  <div className="text-[10px] text-white/50">
                    Siembra en producción monitoreada
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTieneCultivo(false)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  !tieneCultivo
                    ? 'bg-amber-500/20 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                <span className="text-2xl">🍂</span>
                <div>
                  <div className="text-sm font-semibold">Sin Cultivo</div>
                  <div className="text-[10px] text-white/50">
                    Terreno en descanso o preparación
                  </div>
                </div>
              </button>
            </div>

            {/* Opciones según tenga cultivo o no */}
            {tieneCultivo ? (
              <div className="bg-black/30 rounded-xl p-3 border border-white/10 space-y-3">
                <div>
                  <label className="block text-xs text-white/70 mb-1">
                    Selecciona qué cultivo tiene:
                  </label>
                  <select
                    value={cultivoKey}
                    onChange={(e) => setCultivoKey(e.target.value)}
                    className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
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
                  <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-lg p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div>
                      <div className="text-[10px] text-white/50">Humedad Óptima</div>
                      <div className="font-bold text-emerald-400">
                        {selectedCultivo.humedad_optima}%
                      </div>
                      <div className="text-[9px] text-white/30">
                        ({selectedCultivo.humedad_minima}-{selectedCultivo.humedad_maxima}%)
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-white/50">Temp. Óptima</div>
                      <div className="font-bold text-white">
                        {selectedCultivo.temp_optima}°C
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-white/50">Alerta Hongos</div>
                      <div className="font-bold text-orange-400">
                        {selectedCultivo.hr_alerta_hongos}% HR
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-white/50">Tipo de Riego</div>
                      <div className="font-bold capitalize text-white">
                        {selectedCultivo.tipo_riego}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-black/30 rounded-xl p-3 border border-white/10 space-y-2">
                <label className="block text-xs text-white/70 mb-1">
                  Condición del terreno sin cultivo:
                </label>
                <select
                  value={estadoDescanso}
                  onChange={(e) => setEstadoDescanso(e.target.value)}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
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
                <p className="text-[10px] text-white/40">
                  La parcela se mostrará en color de tierra/barbecho en la vista 3D y mantendrá el monitoreo de los sensores de suelo.
                </p>
              </div>
            )}
          </div>

          {/* SECCIÓN 3: Configuración de Sensores (Los 4 sensores requeridos) */}
          <div className="space-y-3 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-green-400 flex items-center gap-1.5">
                <span>📡</span> Sensores a Instalar y Monitorear
              </h3>
              <span className="text-[10px] text-white/40">
                Habilita los sensores y ajusta lecturas iniciales
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Sensor 1: Humedad de la Tierra / Suelo */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  sensorSueloActivo
                    ? 'bg-white/5 border-green-500/40'
                    : 'bg-black/20 border-white/5 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                    <input
                      type="checkbox"
                      checked={sensorSueloActivo}
                      onChange={(e) => setSensorSueloActivo(e.target.checked)}
                      className="rounded accent-green-500 w-4 h-4 cursor-pointer"
                    />
                    💧 Humedad de la Tierra
                  </label>
                  <span className="text-[10px] text-white/50">Capacitivo</span>
                </div>
                {sensorSueloActivo && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-white/60">
                      <span>Lectura inicial:</span>
                      <span className="font-bold text-white">{sensorSueloValor}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={sensorSueloValor}
                      onChange={(e) => setSensorSueloValor(parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                  </div>
                )}
              </div>

              {/* Sensor 2: Humedad Ambiental */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  sensorAmbienteActivo
                    ? 'bg-white/5 border-green-500/40'
                    : 'bg-black/20 border-white/5 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                    <input
                      type="checkbox"
                      checked={sensorAmbienteActivo}
                      onChange={(e) => setSensorAmbienteActivo(e.target.checked)}
                      className="rounded accent-green-500 w-4 h-4 cursor-pointer"
                    />
                    🌫️ Humedad Ambiental (HR)
                  </label>
                  <span className="text-[10px] text-white/50">SHT31 / DHT</span>
                </div>
                {sensorAmbienteActivo && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-white/60">
                      <span>Lectura inicial:</span>
                      <span className="font-bold text-white">{sensorAmbienteValor}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={sensorAmbienteValor}
                      onChange={(e) => setSensorAmbienteValor(parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                  </div>
                )}
              </div>

              {/* Sensor 3: Temperatura Ambiental */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  sensorTempActivo
                    ? 'bg-white/5 border-green-500/40'
                    : 'bg-black/20 border-white/5 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                    <input
                      type="checkbox"
                      checked={sensorTempActivo}
                      onChange={(e) => setSensorTempActivo(e.target.checked)}
                      className="rounded accent-green-500 w-4 h-4 cursor-pointer"
                    />
                    🌡️ Temperatura Ambiente
                  </label>
                  <span className="text-[10px] text-white/50">DHT / Térmico</span>
                </div>
                {sensorTempActivo && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-white/60">
                      <span>Lectura inicial:</span>
                      <span className="font-bold text-white">{sensorTempValor.toFixed(1)}°C</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={45}
                      step={0.5}
                      value={sensorTempValor}
                      onChange={(e) => setSensorTempValor(parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                  </div>
                )}
              </div>

              {/* Sensor 4: pH de la Tierra */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  sensorPhActivo
                    ? 'bg-white/5 border-green-500/40'
                    : 'bg-black/20 border-white/5 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                    <input
                      type="checkbox"
                      checked={sensorPhActivo}
                      onChange={(e) => setSensorPhActivo(e.target.checked)}
                      className="rounded accent-green-500 w-4 h-4 cursor-pointer"
                    />
                    🧪 pH de la Tierra
                  </label>
                  <span className="text-[10px] text-white/50">Sonda E-201-C</span>
                </div>
                {sensorPhActivo && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-white/60 items-center">
                      <span>Lectura inicial:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white font-mono">{sensorPhValor.toFixed(1)} pH</span>
                        <span className={`text-[8px] px-1.5 py-0.2 rounded border ${phStatus.badgeClass}`}>
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
                      className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs text-white/70 mb-1">
              Notas u Observaciones (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Parcela con pendiente ligera, sistema de riego por goteo recién calibrado..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-green-500 resize-none"
            />
          </div>

          {/* Footer de Acciones */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-green-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
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
