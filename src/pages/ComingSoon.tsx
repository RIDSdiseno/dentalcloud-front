export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white p-16 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Esta sección está en construcción.
        </p>
        <p className="text-sm text-slate-400 dark:text-slate-500">Muy pronto vas a poder gestionar {title.toLowerCase()} desde aquí.</p>
      </div>
    </div>
  );
}
