const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_LABELS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];
const FULL_MONTH_LABELS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, amount: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatDayTab(date: Date) {
  return `${DAY_LABELS[date.getDay()]} ${date.getDate()} ${MONTH_LABELS[date.getMonth()]}`;
}

export function formatLongDate(date: Date) {
  const text = date.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function generateTimeSlots(startHour: number, endHour: number, stepMinutes: number) {
  const slots: string[] = [];
  for (let mins = startHour * 60; mins < endHour * 60; mins += stepMinutes) {
    const h = Math.floor(mins / 60)
      .toString()
      .padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
  }
  return slots;
}

export function minutesSinceMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function withTime(date: Date, hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

export function toDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDayHeader(date: Date) {
  return { weekday: DAY_LABELS[date.getDay()], day: date.getDate() };
}

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const start = `${weekStart.getDate()} de ${FULL_MONTH_LABELS[weekStart.getMonth()]}`;
  const end = `${weekEnd.getDate()} de ${FULL_MONTH_LABELS[weekEnd.getMonth()]}`;
  return `${start} - ${end} de ${weekEnd.getFullYear()}`;
}
