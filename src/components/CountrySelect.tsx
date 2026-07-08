import { useEffect, useRef, useState } from 'react';
import { COUNTRIES, flagUrl } from '../data/countries';
import { ChevronDownIcon } from './icons';

type CountrySelectProps = {
  value: string;
  onChange: (dialCode: string) => void;
};

export function CountrySelect({ value, onChange }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = COUNTRIES.find((c) => c.dialCode === value) ?? COUNTRIES[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex shrink-0 items-center gap-1.5 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition-colors hover:bg-slate-100 focus:border-brand-500"
      >
        <img src={flagUrl(selected.code)} alt="" className="h-3.5 w-5 rounded-sm object-cover" />
        <span className="text-slate-600">{selected.dialCode}</span>
        <ChevronDownIcon className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 max-h-56 w-56 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {COUNTRIES.map((country) => (
            <button
              type="button"
              key={country.code}
              onClick={() => {
                onChange(country.dialCode);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                country.dialCode === selected.dialCode ? 'bg-brand-50 text-brand-700' : 'text-slate-700'
              }`}
            >
              <img src={flagUrl(country.code)} alt="" className="h-3.5 w-5 shrink-0 rounded-sm object-cover" />
              <span className="flex-1 truncate">{country.name}</span>
              <span className="text-slate-400">{country.dialCode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
