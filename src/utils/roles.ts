const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  odontologo: 'Odontólogo',
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
}
