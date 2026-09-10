import { useEffect, useState, type FormEvent } from 'react';
import { fetchEmailSettings, updateEmailSettings, sendTestEmail, type EmailSettings } from '../../api/emailSettings';
import { getErrorMessage } from '../../api/client';

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-700 outline-none focus:border-brand-500 focus:bg-white';

// Presets de proveedores de correo comunes — al elegir uno se completan
// servidor/puerto/TLS automáticamente y el campo de servidor queda
// bloqueado (no tiene sentido escribirlo a mano si ya sabemos el valor
// correcto). "Hosting propio" es el único que deja el servidor editable.
const EMAIL_HOST_PRESETS = [
  { key: 'office365', label: 'Microsoft 365 / Outlook', smtpHost: 'smtp.office365.com', smtpPort: 587, smtpSecure: false },
  { key: 'gmail', label: 'Gmail / Google Workspace', smtpHost: 'smtp.gmail.com', smtpPort: 587, smtpSecure: false },
  { key: 'zoho', label: 'Zoho Mail', smtpHost: 'smtp.zoho.com', smtpPort: 587, smtpSecure: false },
  { key: 'custom', label: 'Hosting propio / otro', smtpHost: '', smtpPort: 587, smtpSecure: true },
] as const;

type HostPresetKey = (typeof EMAIL_HOST_PRESETS)[number]['key'];

function detectPresetKey(host: string): HostPresetKey {
  const match = EMAIL_HOST_PRESETS.find((p) => p.key !== 'custom' && p.smtpHost === host);
  return match?.key ?? 'custom';
}

export function EmailSettingsPanel() {
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [hostPreset, setHostPreset] = useState<HostPresetKey>('custom');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [enabled, setEnabled] = useState(false);

  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchEmailSettings()
      .then((data) => {
        setSettings(data);
        if (data) {
          setFromName(data.fromName ?? '');
          setFromEmail(data.fromEmail ?? '');
          const preset = detectPresetKey(data.smtpHost ?? '');
          setHostPreset(preset);
          // Si el servidor coincide con un proveedor conocido, el puerto y el
          // TLS SIEMPRE deben ser los del preset — nunca el valor guardado,
          // por si quedó guardado un valor inconsistente de antes de que
          // existiera este selector (ej. TLS marcado con el 587 de Office365,
          // que rompe la conexión).
          const known = EMAIL_HOST_PRESETS.find((p) => p.key === preset);
          setSmtpHost(data.smtpHost ?? '');
          setSmtpPort(preset !== 'custom' && known ? String(known.smtpPort) : data.smtpPort ? String(data.smtpPort) : '587');
          setSmtpSecure(preset !== 'custom' && known ? known.smtpSecure : data.smtpSecure);
          setSmtpUsername(data.smtpUsername ?? '');
          setEnabled(data.enabled);
        }
      })
      .catch((err) => setError(getErrorMessage(err, 'No se pudo cargar la configuración de correo')))
      .finally(() => setLoading(false));
  }, []);

  function handlePresetChange(key: HostPresetKey) {
    setHostPreset(key);
    const preset = EMAIL_HOST_PRESETS.find((p) => p.key === key)!;
    if (key !== 'custom') {
      setSmtpHost(preset.smtpHost);
      setSmtpPort(String(preset.smtpPort));
      setSmtpSecure(preset.smtpSecure);
    } else {
      setSmtpHost('');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setIsSaving(true);
    try {
      const updated = await updateEmailSettings({
        fromName,
        fromEmail,
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpSecure,
        smtpUsername,
        smtpPassword: smtpPassword.trim() || undefined,
        enabled,
      });
      setSettings(updated);
      setSmtpPassword('');
      setNotice('Configuración guardada correctamente.');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo guardar la configuración'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTest(e: FormEvent) {
    e.preventDefault();
    setTestResult(null);
    setIsTesting(true);
    try {
      await sendTestEmail(testEmail);
      setTestResult('¡Correo de prueba enviado! Revisa la bandeja de entrada.');
    } catch (err) {
      setTestResult(getErrorMessage(err, 'No se pudo enviar el correo de prueba'));
    } finally {
      setIsTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">Correo saliente</h2>
        <p className="mb-4 text-xs text-slate-500">
          Configura el correo desde el que se envían las confirmaciones de citas a tus pacientes. Si no configuras
          nada, los correos se siguen enviando desde el remitente por defecto de fordentcloud.
        </p>

        {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
        {notice && <p className="mb-3 text-xs text-emerald-600">{notice}</p>}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="es-from-name" className="text-xs font-semibold text-slate-600">
              Nombre del remitente
            </label>
            <input
              id="es-from-name"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Clínica Dental Providencia"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="es-from-email" className="text-xs font-semibold text-slate-600">
              Correo remitente
            </label>
            <input
              id="es-from-email"
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="agenda@clinicadental.cl"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="es-provider" className="text-xs font-semibold text-slate-600">
              Proveedor
            </label>
            <select id="es-provider" value="smtp" disabled className={inputClass}>
              <option value="smtp">SMTP</option>
            </select>
          </div>
          <div className="flex items-end pb-2.5">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Habilitar correo propio de esta clínica
            </label>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="es-host-preset" className="text-xs font-semibold text-slate-600">
              Servidor SMTP
            </label>
            <select
              id="es-host-preset"
              value={hostPreset}
              onChange={(e) => handlePresetChange(e.target.value as HostPresetKey)}
              className={inputClass}
            >
              {EMAIL_HOST_PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                  {p.key !== 'custom' ? ` (${p.smtpHost})` : ''}
                </option>
              ))}
            </select>
            {hostPreset === 'custom' && (
              <input
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.tudominio.cl"
                required
                className={`${inputClass} mt-2`}
              />
            )}
          </div>
          <div>
            <label htmlFor="es-smtp-port" className="text-xs font-semibold text-slate-600">
              Puerto
            </label>
            <input
              id="es-smtp-port"
              type="number"
              min={1}
              max={65535}
              value={smtpPort}
              onChange={(e) => setSmtpPort(e.target.value)}
              disabled={hostPreset !== 'custom'}
              required
              className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
            />
          </div>

          <div>
            <label htmlFor="es-smtp-username" className="text-xs font-semibold text-slate-600">
              Usuario SMTP
            </label>
            <input
              id="es-smtp-username"
              value={smtpUsername}
              onChange={(e) => setSmtpUsername(e.target.value)}
              placeholder="agenda@clinicadental.cl"
              required
              className={inputClass}
            />
          </div>
          <div className="flex items-end pb-2.5">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={smtpSecure}
                onChange={(e) => setSmtpSecure(e.target.checked)}
                disabled={hostPreset !== 'custom'}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
              Conexión segura (TLS)
              {hostPreset !== 'custom' && (
                <span className="text-xs font-normal text-slate-400">(según el proveedor elegido)</span>
              )}
            </label>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="es-smtp-password" className="text-xs font-semibold text-slate-600">
              Contraseña SMTP
            </label>
            <input
              id="es-smtp-password"
              type="password"
              value={smtpPassword}
              onChange={(e) => setSmtpPassword(e.target.value)}
              placeholder={settings?.hasPassword ? '••••••••••••' : ''}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-400">
              {settings?.hasPassword
                ? 'Deja vacío para mantener la contraseña actual.'
                : 'Requerida la primera vez que configuras esta clínica.'}
            </p>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">Enviar correo de prueba</h2>
        <p className="mb-4 text-xs text-slate-500">
          Guarda la configuración primero — la prueba usa lo que ya quedó guardado, no lo que hay sin guardar en el
          formulario de arriba.
        </p>
        <form onSubmit={handleTest} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label htmlFor="es-test-email" className="text-xs font-semibold text-slate-600">
              Correo de destino
            </label>
            <input
              id="es-test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="tu@correo.cl"
              required
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={isTesting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isTesting ? 'Enviando...' : 'Enviar prueba'}
          </button>
        </form>
        {testResult && <p className="mt-3 text-xs text-slate-600">{testResult}</p>}
      </div>
    </div>
  );
}
