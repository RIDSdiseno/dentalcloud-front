const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  odontologo: 'Odontólogo',
  radiologo: 'Radiólogo',
  operador: 'Operador',
  super_admin: 'Super administrador',
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
}
