import { useRef } from 'react';
import { DownloadIcon, UploadIcon } from './icons';

type ExcelImportExportBarProps = {
  isExporting: boolean;
  isImporting: boolean;
  onExport: () => void;
  onImportFile: (file: File) => void;
};

export function ExcelImportExportBar({ isExporting, isImporting, onExport, onImportFile }: ExcelImportExportBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onImportFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <UploadIcon className="h-4 w-4" />
        {isImporting ? 'Leyendo archivo...' : 'Agregar mediante Excel'}
      </button>
      <button
        type="button"
        onClick={onExport}
        disabled={isExporting}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <DownloadIcon className="h-4 w-4" />
        {isExporting ? 'Generando...' : 'Descargar Excel'}
      </button>
    </div>
  );
}
