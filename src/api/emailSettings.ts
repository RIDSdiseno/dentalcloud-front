import { api } from './client';

// La contraseña SMTP nunca viaja de vuelta del backend — sólo `hasPassword`
// indica si ya hay una guardada. Ver emailSettingsController.ts.
export type EmailSettings = {
  id: string;
  provider: string;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUsername: string | null;
  fromEmail: string | null;
  fromName: string | null;
  enabled: boolean;
  hasPassword: boolean;
  updatedAt: string;
};

export type EmailSettingsInput = {
  provider?: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUsername: string;
  // Vacío/omitido = mantener la contraseña ya guardada.
  smtpPassword?: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
};

export async function fetchEmailSettings() {
  const { data } = await api.get<{ emailSettings: EmailSettings | null }>('/clinica/email-settings');
  return data.emailSettings;
}

export async function updateEmailSettings(input: EmailSettingsInput) {
  const { data } = await api.put<{ emailSettings: EmailSettings }>('/clinica/email-settings', input);
  return data.emailSettings;
}

export async function sendTestEmail(email: string) {
  await api.post('/clinica/email-settings/test', { email });
}
