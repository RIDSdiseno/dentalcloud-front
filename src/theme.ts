// Paletas de marca por tipo de clínica. Se aplican con setProperty en tiempo
// de ejecución (ver AppLayout.tsx) en vez de una regla CSS estática, porque el
// pipeline de Tailwind v4 (@theme) sólo respeta declaraciones --color-* hechas
// dentro de su propio bloque @theme — una regla CSS normal que redeclare esos
// mismos nombres de variable es descartada por el build.
export const DENTAL_BRAND_COLORS: Record<string, string> = {
  '--color-brand-50': '#eefbff',
  '--color-brand-100': '#d7f4ff',
  '--color-brand-200': '#b3ecff',
  '--color-brand-300': '#7ee0ff',
  '--color-brand-400': '#3ccbfa',
  '--color-brand-500': '#00aeef',
  '--color-brand-600': '#0089c7',
  '--color-brand-700': '#00699b',
  '--color-brand-800': '#075577',
  '--color-brand-900': '#0b4763',
  '--color-brand-950': '#072e42',
};

export const ESTETICA_BRAND_COLORS: Record<string, string> = {
  '--color-brand-50': '#fef3f8',
  '--color-brand-100': '#fce7f1',
  '--color-brand-200': '#fbcfe4',
  '--color-brand-300': '#f9a8ce',
  '--color-brand-400': '#f472ae',
  '--color-brand-500': '#ec4d95',
  '--color-brand-600': '#db2f7a',
  '--color-brand-700': '#b91f62',
  '--color-brand-800': '#971a52',
  '--color-brand-900': '#7d1a47',
  '--color-brand-950': '#470a26',
};

export function applyTenantTheme(clinicaTipo: string | null | undefined) {
  const isEstetica = clinicaTipo === 'estetica';
  document.documentElement.dataset.tenant = isEstetica ? 'estetica' : 'dental';
  const colors = isEstetica ? ESTETICA_BRAND_COLORS : DENTAL_BRAND_COLORS;
  for (const [name, value] of Object.entries(colors)) {
    document.documentElement.style.setProperty(name, value);
  }
}

export function resetTenantTheme() {
  delete document.documentElement.dataset.tenant;
  for (const name of Object.keys(DENTAL_BRAND_COLORS)) {
    document.documentElement.style.removeProperty(name);
  }
}
