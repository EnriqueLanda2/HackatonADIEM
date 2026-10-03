'use client';

import { useState } from 'react';
import { API_URL } from '@/lib/api';
import { CUENTAS_DEMO, iniciarSesion, ROL_INFO } from '@/lib/auth';
import { Sesion } from '@/types';

interface LoginScreenProps {
  onLogin: (sesion: Sesion) => void;
  aviso?: string | null;
}

export default function LoginScreen({ onLogin, aviso }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  const entrar = async (correo: string, clave: string) => {
    setEntrando(true);
    setError(null);
    try {
      onLogin(await iniciarSesion(API_URL, correo, clave));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setEntrando(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(2.5rem+env(safe-area-inset-top))] text-creme">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="h-16 w-16 overflow-hidden rounded-2xl border border-applegreen/50 bg-creme shadow-lg">
            <img src="/agromai-logo.png" alt="Logo de agromIA" className="h-full w-full object-cover" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">agromIA</h1>
          <p className="mt-1 text-sm text-flax/80">Sistema inteligente de riego · Morelos</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void entrar(email, password);
          }}
          className="space-y-4 rounded-2xl border border-applegreen/30 bg-card p-6 shadow-2xl shadow-black/30"
        >
          <h2 className="text-lg font-bold">Iniciar sesión</h2>
          {aviso && <p className="rounded-lg border border-flax/40 bg-flax/10 px-3 py-2 text-xs text-flax">{aviso}</p>}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-flax">Correo</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-applegreen/30 bg-panel px-3 py-2.5 text-sm text-creme outline-none focus:border-flax"
              placeholder="tu-correo@agromai.mx"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-flax">Contraseña</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-applegreen/30 bg-panel px-3 py-2.5 text-sm text-creme outline-none focus:border-flax"
            />
          </label>

          {error && <p className="rounded-lg border border-goldenbrown bg-goldenbrown/25 px-3 py-2 text-xs text-creme">{error}</p>}

          <button
            type="submit"
            disabled={entrando}
            className="w-full cursor-pointer rounded-xl bg-applegreen py-2.5 text-sm font-bold text-ink transition-colors hover:bg-darkgreen hover:text-creme disabled:cursor-wait disabled:opacity-60"
          >
            {entrando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        {/* Accesos rápidos de la demo */}
        <div className="mt-5 rounded-2xl border border-applegreen/15 bg-card/60 p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-flax/70">Cuentas de demostración</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {CUENTAS_DEMO.map((cuenta) => {
              const info = ROL_INFO[cuenta.usuario.rol];
              return (
                <button
                  key={cuenta.email}
                  type="button"
                  disabled={entrando}
                  onClick={() => void entrar(cuenta.email, cuenta.password)}
                  className="cursor-pointer rounded-xl border border-applegreen/25 bg-panel p-3 text-left transition-colors hover:border-applegreen disabled:cursor-wait"
                >
                  <div className="text-sm font-bold text-creme">
                    {info.icono} {info.label}
                  </div>
                  <div className="mt-1 text-[10px] leading-snug text-flax/70">{info.descripcion}</div>
                  <div className="mt-2 font-mono text-[10px] text-flax/60">
                    {cuenta.email} · {cuenta.password}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
