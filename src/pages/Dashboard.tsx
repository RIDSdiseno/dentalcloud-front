import { useAuth } from '../context/AuthContext';
import { CalendarIcon, NewsIcon, StarIcon } from '../components/icons';

function formatToday() {
  const text = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: typeof StarIcon;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">
          Bienvenido{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-sm text-slate-500">{formatToday()}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-2">
            <StarIcon className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-semibold text-slate-800">Favoritos</h2>
          </div>
          <EmptyState icon={StarIcon} message="Sin favoritos configurados." />
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-brand-500" />
            <h2 className="text-base font-semibold text-slate-800">
              Próximas citas de hoy
            </h2>
          </div>
          <EmptyState icon={CalendarIcon} message="Sin próximas citas para hoy." />
        </section>
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-2">
          <NewsIcon className="h-5 w-5 text-brand-500" />
          <h2 className="text-base font-semibold text-slate-800">Últimas novedades</h2>
        </div>
        <EmptyState icon={NewsIcon} message="Sin novedades por el momento." />
      </section>
    </div>
  );
}
