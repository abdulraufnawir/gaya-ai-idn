// Background selector — pill picker shown in the main try-on form so users
// can pre-select an editorial background and chain it in a single click.
import { Badge } from '@/components/ui/badge';
import { ImageOff, Check } from 'lucide-react';

export const BACKGROUND_PRESETS = [
  { key: 'studio_white', label: 'Studio Putih' },
  { key: 'studio_grey', label: 'Studio Abu' },
  { key: 'bali_outdoor', label: 'Outdoor Bali' },
  { key: 'jakarta_street', label: 'Jakarta' },
  { key: 'cafe_lifestyle', label: 'Cafe' },
  { key: 'beach', label: 'Pantai' },
  { key: 'rooftop_night', label: 'Rooftop Malam' },
] as const;

export type BackgroundPresetKey = typeof BACKGROUND_PRESETS[number]['key'];

interface BackgroundSelectorProps {
  value: BackgroundPresetKey | null;
  onChange: (val: BackgroundPresetKey | null) => void;
  disabled?: boolean;
}

const BackgroundSelector = ({ value, onChange, disabled }: BackgroundSelectorProps) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground">
          Background hasil
        </span>
        <Badge variant="outline" className="text-[10px]">
          opsional · +1 kredit jika diganti
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1.5 justify-center">
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          className={`px-2.5 py-1 rounded-full text-xs border transition-colors flex items-center gap-1 disabled:opacity-50 ${
            value === null
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background border-border hover:border-primary/40'
          }`}
        >
          {value === null && <Check className="h-3 w-3" />}
          <ImageOff className="h-3 w-3" />
          Pakai background asli
        </button>
        {BACKGROUND_PRESETS.map((bg) => {
          const picked = value === bg.key;
          return (
            <button
              key={bg.key}
              type="button"
              onClick={() => onChange(bg.key)}
              disabled={disabled}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors flex items-center gap-1 disabled:opacity-50 ${
                picked
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:border-primary/40'
              }`}
            >
              {picked && <Check className="h-3 w-3" />}
              {bg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BackgroundSelector;
