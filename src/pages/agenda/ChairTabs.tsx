import type { Chair } from '../../api/chairs';
import { ChairIcon } from '../../components/icons';

type ChairTabsProps = {
  chairs: Chair[];
  selectedChairId: string | null;
  onSelect: (chairId: string) => void;
};

export function ChairTabs({ chairs, selectedChairId, onSelect }: ChairTabsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto">
      {chairs.map((chair) => {
        const active = chair.id === selectedChairId;
        return (
          <button
            key={chair.id}
            type="button"
            onClick={() => onSelect(chair.id)}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              active
                ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ChairIcon className="h-4 w-4" />
            {chair.name || `Sillón ${chair.number}`}
          </button>
        );
      })}
    </div>
  );
}
