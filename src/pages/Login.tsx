import { useState, type FormEvent, type SVGProps } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { MailIcon, ToothCloudIcon } from '../components/icons';

function LockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <rect x="4" y="10" width="16" height="10" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <path
        d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7-10.5-7-10.5-7Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <path
        d="M3 3l18 18M10.6 10.7a3 3 0 0 0 4.2 4.2M6.6 6.9C3.9 8.6 1.5 12 1.5 12s3.5 7 10.5 7c1.9 0 3.5-.5 4.9-1.2M9.9 5.2A10.8 10.8 0 0 1 12 5c7 0 10.5 7 10.5 7-.5.9-1.2 2-2.2 3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpinnerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="animate-spin" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={3} opacity={0.25} />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  async function doLogin(loginEmail: string, loginPassword: string) {
    setError(null);
    setIsSubmitting(true);

    try {
      const loggedInUser = await login(loginEmail, loginPassword);
      const destination = loggedInUser.role === 'super_admin' ? '/admin/clinicas' : from;
      navigate(destination, { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('No se pudo iniciar sesión. Intenta nuevamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    doLogin(email, password);
  }

  function handleQuickLogin(quickEmail: string, quickPassword: string) {
    setEmail(quickEmail);
    setPassword(quickPassword);
    doLogin(quickEmail, quickPassword);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-6">
      <img
        src="/login.png"
        alt="fordentcloud"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/10" />

      <div className="relative w-full max-w-sm">
        <form
          className="flex w-full flex-col gap-1.5 rounded-2xl bg-white/95 p-8 shadow-2xl shadow-slate-900/25 ring-1 ring-black/5 backdrop-blur-sm sm:p-10"
          onSubmit={handleSubmit}
        >
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-600/30">
            <ToothCloudIcon className="h-8 w-8" />
          </div>

          <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900">
            fordent<span className="text-brand-500">cloud</span>
          </h1>
          <p className="mb-5 text-center text-sm text-slate-500">
            Inicia sesión para continuar
          </p>

          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Correo electrónico
          </label>
          <div className="relative mb-3">
            <MailIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              placeholder="tu@correo.com"
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
          </div>

          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Contraseña
          </label>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-10 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
            >
              {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting && <SpinnerIcon className="h-4 w-4" />}
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        {/* TODO: quitar este acceso rápido antes de salir a producción */}
        <div className="mt-4 rounded-2xl bg-white/95 p-4 text-xs shadow-xl shadow-slate-900/25 ring-1 ring-black/5 backdrop-blur-sm">
          <p className="mb-2 font-semibold text-slate-500">Acceso rápido (dev)</p>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickLogin('superadmin@rids.cl', 'SuperAdmin123!')}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-left font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Super Admin RIDS
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickLogin('admin@dentalcloud.local', 'Admin123!')}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-left font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Administrador RIDS
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickLogin('admin@clinicademo.local', 'Admin123!')}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-left font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Administrador Clínica Demo
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleQuickLogin('admin@esteticademo.local', 'Admin123!')}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-left font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Administrador Clínica Estética Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
