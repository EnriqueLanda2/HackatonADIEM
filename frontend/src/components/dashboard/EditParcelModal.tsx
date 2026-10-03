'use client';

import { useEffect, useState } from 'react';
import { Cultivo, ParcelaDashboard, SeleccionRiego, UpdateParcelaDTO } from '@/types';
import { metodoRiegoDe, sistemasInstalados } from '@/lib/api';
import MetodoRiegoSelector from './MetodoRiegoSelector';
import { MODAL_FONDO, MODAL_HOJA, useBloquearScroll } from '@/components/ui/modal';

interface EditParcelModalProps {
  isOpen: boolean;
  data: ParcelaDashboard | null;
  cultivos: Cultivo[];
  onClose: () => void;
  onSubmit: (data: UpdateParcelaDTO) => Promise<void>;
}

export default function EditParcelModal({
  isOpen,
  data,
  cultivos,
  onClose,
  onSubmit,
}: EditParcelModalProps) {
  const [nombre, setNombre] = useState('');
  const [activa, setActiva] = useState(true);
  const [tieneCultivo, setTieneCultivo] = useState(true);
  const [cultivoId, setCultivoId] = useState('');
  const [notas, setNotas] = useState('');
  const [metodo, setMetodo] = useState<SeleccionRiego>('goteo');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useBloquearScroll(isOpen && Boolean(data));

  useEffect(() => {
    if (!data) return;
    setNombre(data.parcela.nombre);
    setActiva(data.parcela.activa);
    setTieneCultivo(data.parcela.tiene_cultivo);
    setCultivoId(data.parcela.cultivo_id ?? data.cultivo?.id ?? '');
    setNotas(data.parcela.notas ?? '');
    setMetodo(metodoRiegoDe(data));
    setError(null);
    if (data.cultivo && cultivos.length > 0 && !cultivos.some((crop) => crop.id === (data.parcela.cultivo_id ?? data.cultivo?.id))) {
      const matchingCrop = cultivos.find((crop) => crop.nombre === data.cultivo?.nombre);
      if (matchingCrop) setCultivoId(matchingCrop.id);
    }
  }, [data, cultivos]);

  if (!isOpen || !data) return null;

  const selectedCultivoId =
    cultivos.find((crop) => crop.id === cultivoId)?.id ??
    cultivos.find((crop) => crop.nombre === data.cultivo?.nombre)?.id ??
    '';


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre de la parcela es obligatorio.');
      return;
    }
    if (tieneCultivo && !selectedCultivoId) {
      setError('Selecciona un cultivo o marca la parcela como en descanso.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSubmit({
        nombre: nombre.trim(),
        activa,
        tiene_cultivo: tieneCultivo,
        cultivo_id: tieneCultivo ? selectedCultivoId : null,
        ...(tieneCultivo ? { metodo_riego: metodo } : {}),
        notas: notas.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la parcela.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={MODAL_FONDO}>
      <form onSubmit={handleSubmit} className={`${MODAL_HOJA} max-w-lg bg-card`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-applegreen">Administrar parcela y sembradío</p>
            <h2 className="mt-1 text-xl font-bold text-creme">Editar {data.parcela.nombre}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-xl text-flax/70 hover:text-creme" aria-label="Cerrar">×</button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-flax">Nombre</span>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full rounded-xl border border-applegreen/30 bg-panel px-3 py-2 text-sm text-creme outline-none focus:border-flax" />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-flax">Estado operativo</span>
              <select value={activa ? 'activa' : 'inactiva'} onChange={(e) => setActiva(e.target.value === 'activa')} className="w-full rounded-xl border border-applegreen/30 bg-panel px-3 py-2 text-sm text-creme">
                <option value="activa">Activa</option>
                <option value="inactiva">Inactiva</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-flax">Tipo de cultivo</span>
              <select value={tieneCultivo ? selectedCultivoId : ''} onChange={(e) => { setTieneCultivo(Boolean(e.target.value)); setCultivoId(e.target.value); }} className="w-full rounded-xl border border-applegreen/30 bg-panel px-3 py-2 text-sm text-creme">
                <option value="">En descanso / sin cultivo</option>
                {cultivos.map((cultivo) => <option key={cultivo.id} value={cultivo.id}>{cultivo.icono} {cultivo.nombre}</option>)}
              </select>
            </label>
          </div>

          {tieneCultivo && (
            <div>
              <span className="mb-1 block text-xs font-semibold text-flax">Regar con</span>
              <MetodoRiegoSelector value={metodo} onChange={setMetodo} instalados={sistemasInstalados(data)} />
              <p className="mt-1 text-[11px] text-flax/60">Solo se pueden elegir los sistemas con tubería instalada por el técnico.</p>
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-flax">Notas</span>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} className="w-full resize-none rounded-xl border border-applegreen/30 bg-panel px-3 py-2 text-sm text-creme outline-none focus:border-flax" />
          </label>
        </div>

        {error && <p className="mt-4 rounded-lg border border-goldenbrown bg-goldenbrown/20 px-3 py-2 text-xs text-creme">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-applegreen/30 px-4 py-2 text-sm text-flax">Cancelar</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-applegreen px-5 py-2 text-sm font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar cambios'}</button>
        </div>
      </form>
    </div>
  );
}
