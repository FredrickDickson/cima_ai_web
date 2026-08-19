import { X } from 'lucide-react';
import { useTheme, Theme } from '../../contexts/ThemeContext';

interface ThemeSwitcherProps {
  onClose: () => void;
}

const themes: { id: Theme; name: string; description: string; colors: string[] }[] = [
  {
    id: 'white-burgundy',
    name: 'White & Burgundy',
    description: 'Clean white surfaces with a refined burgundy accent',
    colors: ['#ffffff', '#f9e4e7', '#8b0e1e', '#3d0b15'],
  },
  {
    id: 'professional-serenity',
    name: 'Professional Serenity',
    description: 'Calming oceanic hues for focus and productivity',
    colors: ['#0c4a6e', '#0ea5e9', '#14b8a6', '#f59e0b'],
  },
  {
    id: 'modern-trust',
    name: 'Modern Trust',
    description: 'Contemporary palette with AI-tech sophistication',
    colors: ['#0f172a', '#6366f1', '#d4a574', '#475569'],
  },
  {
    id: 'bold-authority',
    name: 'Bold Authority',
    description: 'High-contrast palette for strong brand presence',
    colors: ['#0f172a', '#10b981', '#ea580c', '#334155'],
  },
];

export default function ThemeSwitcher({ onClose }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-navy-950">Choose Theme</h2>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-navy-950 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTheme(t.id);
                onClose();
              }}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                theme === t.id 
                  ? 'border-navy-500 bg-navy-50' 
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex gap-1.5 shrink-0">
                  {t.colors.map((color, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-navy-950">{t.name}</h3>
                    {theme === t.id && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-navy-500 text-white rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{t.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
          <p className="text-xs text-slate-500 text-center">
            Your theme preference is saved automatically
          </p>
        </div>
      </div>
    </div>
  );
}
