import { useState, type FormEvent, type SVGProps } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth, type MfaChallenge } from '../context/AuthContext';
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
  const { login, verifyCode, resendCode } = useAuth();
  // Doble verificación: si el servidor pide código, se muestra el segundo paso.
  const [challenge, setChallenge] = useState<MfaChallenge | null>(null);
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
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
      const result = await login(loginEmail, loginPassword);
      if ('mfaRequired' in result) {
        setChallenge(result);
        setCode('');
        setNotice(null);
        return;
      }
      const destination = result.role === 'super_admin' ? '/admin/clinicas' : from;
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

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const loggedInUser = await verifyCode(challenge.challengeId, code.trim(), remember);
      const destination = loggedInUser.role === 'super_admin' ? '/admin/clinicas' : from;
      navigate(destination, { replace: true });
    } catch (err) {
      const msg = axios.isAxiosError(err) && err.response?.data?.error ? err.response.data.error : 'No se pudo verificar el código.';
      setError(msg);
      if (/expiró|intentos/i.test(msg)) setChallenge(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!challenge) return;
    setError(null);
    try {
      await resendCode(challenge.challengeId);
      setNotice('Te enviamos un código nuevo.');
    } catch (err) {
      setError(axios.isAxiosError(err) && err.response?.data?.error ? err.response.data.error : 'No se pudo reenviar el código.');
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-6">
      <img
        src="/login.png"
        alt="fordentcloud"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/10 dark:bg-black/60" />

      <div className="relative w-full max-w-sm">
        {challenge ? (
          <form
            className="flex w-full flex-col gap-1.5 rounded-2xl bg-white/95 p-8 shadow-2xl shadow-slate-900/25 ring-1 ring-black/5 backdrop-blur-sm sm:p-10 dark:bg-slate-900/95 dark:ring-white/10"
            onSubmit={handleVerify}
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-600/30">
              <MailIcon className="h-7 w-7" />
            </div>
            <h1 className="text-center text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Revisa tu correo</h1>
            <p className="mb-5 text-center text-sm text-slate-500 dark:text-slate-400">
              Te enviamos un código de 6 números a <span className="font-medium text-slate-700 dark:text-slate-200">{challenge.emailHint}</span>.
            </p>
            <label htmlFor="code" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Código
            </label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
              placeholder="000000"
              className="w-full rounded-lg border border-slate-300 py-2.5 text-center text-lg tracking-[0.4em] outline-none transition-colors placeholder:text-slate-300 focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-brand-600" />
              Recordar este computador por 30 días
            </label>
            {notice && (
              <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">{notice}</p>
            )}
            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</p>
            )}
            <button
              type="submit"
              disabled={isSubmitting || code.length !== 6}
              className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting && <SpinnerIcon className="h-4 w-4" />}
              {isSubmitting ? 'Verificando...' : 'Verificar'}
            </button>
            <div className="mt-3 flex justify-between text-xs">
              <button type="button" onClick={handleResend} className="text-brand-600 hover:underline dark:text-brand-400">
                Reenviar código
              </button>
              <button type="button" onClick={() => { setChallenge(null); setError(null); }} className="text-slate-500 hover:underline dark:text-slate-400">
                Volver
              </button>
            </div>
          </form>
        ) : (
        <form
          className="flex w-full flex-col gap-1.5 rounded-2xl bg-white/95 p-8 shadow-2xl shadow-slate-900/25 ring-1 ring-black/5 backdrop-blur-sm sm:p-10 dark:bg-slate-900/95 dark:ring-white/10"
          onSubmit={handleSubmit}
        >
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-600/30">
            <ToothCloudIcon className="h-8 w-8" />
          </div>

          <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            fordent<span className="text-brand-500">cloud</span>
          </h1>
          <p className="mb-5 text-center text-sm text-slate-500 dark:text-slate-400">
            Inicia sesión para continuar
          </p>

          <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Correo electrónico
          </label>
          <div className="relative mb-3">
            <MailIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              placeholder="tu@correo.com"
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Contraseña
          </label>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-10 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
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
        )}
        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          <a href="/privacidad" target="_blank" rel="noreferrer" className="hover:underline">
            Política de Privacidad
          </a>
        </p>
      </div>
    </div>
  );
}
