'use client';

import { useEffect } from 'react';

// En teléfono los modales son hojas que suben desde abajo; desde `sm` vuelven a ser una ventana centrada.
export const MODAL_FONDO =
  'fixed inset-0 z-50 flex items-end justify-center bg-ink/80 backdrop-blur-sm sm:items-center sm:p-4';
export const MODAL_HOJA =
  'w-full max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl border border-applegreen/40 shadow-2xl ' +
  'p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] animate-fade-in sm:max-h-[90dvh] sm:rounded-2xl sm:p-6';

// Evita que la página de fondo se desplace mientras el modal está abierto.
export function useBloquearScroll(abierto: boolean) {
  useEffect(() => {
    if (!abierto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [abierto]);
}
