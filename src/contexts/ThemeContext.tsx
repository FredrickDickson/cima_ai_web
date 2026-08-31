import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'white-burgundy' | 'professional-serenity' | 'modern-trust' | 'bold-authority';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themes: Record<Theme, Record<string, string>> = {
  'white-burgundy': {
    '--navy-50': '#ffffff',
    '--navy-100': '#fff7f8',
    '--navy-200': '#f9e4e7',
    '--navy-300': '#efc2c8',
    '--navy-400': '#df929d',
    '--navy-500': '#c85d6c',
    '--navy-600': '#a93446',
    '--navy-700': '#5A2633',
    '--navy-800': '#4a1f2a',
    '--navy-900': '#591120',
    '--navy-950': '#3d0b15',
    '--gold-50': '#ffffff',
    '--gold-100': '#fff7f8',
    '--gold-200': '#f9e4e7',
    '--gold-300': '#efc2c8',
    '--gold-400': '#df929d',
    '--gold-500': '#c85d6c',
    '--gold-600': '#a93446',
    '--gold-700': '#5A2633',
    '--gold-800': '#4a1f2a',
    '--gold-900': '#591120',
    '--gold-950': '#3d0b15',
    '--accent-500': '#5A2633',
    '--accent-600': '#4a1f2a',
    '--accent-hover': '#591120',
    '--link-color': '#5A2633',
    '--link-hover': '#591120',
  },
  'professional-serenity': {
    '--navy-50': '#f0f9ff',
    '--navy-100': '#e0f2fe',
    '--navy-200': '#bae6fd',
    '--navy-300': '#7dd3fc',
    '--navy-400': '#38bdf8',
    '--navy-500': '#0ea5e9',
    '--navy-600': '#0284c7',
    '--navy-700': '#0369a1',
    '--navy-800': '#075985',
    '--navy-900': '#0c4a6e',
    '--navy-950': '#082f49',
    '--gold-50': '#fffbeb',
    '--gold-100': '#fef3c7',
    '--gold-200': '#fde68a',
    '--gold-300': '#fcd34d',
    '--gold-400': '#fbbf24',
    '--gold-500': '#f59e0b',
    '--gold-600': '#d97706',
    '--gold-700': '#b45309',
    '--gold-800': '#92400e',
    '--gold-900': '#78350f',
    '--gold-950': '#451a03',
    '--accent-500': '#14b8a6',
    '--accent-600': '#0d9488',
    '--accent-hover': '#f59e0b',
    '--link-color': '#14b8a6',
    '--link-hover': '#0d9488',
  },
  'modern-trust': {
    '--navy-50': '#f8fafc',
    '--navy-100': '#e2e8f0',
    '--navy-200': '#cbd5e1',
    '--navy-300': '#94a3b8',
    '--navy-400': '#64748b',
    '--navy-500': '#475569',
    '--navy-600': '#334155',
    '--navy-700': '#1e293b',
    '--navy-800': '#0f172a',
    '--navy-900': '#020617',
    '--navy-950': '#020617',
    '--gold-50': '#fef7f0',
    '--gold-100': '#fde8d5',
    '--gold-200': '#fbd5b0',
    '--gold-300': '#f9b98a',
    '--gold-400': '#d4a574',
    '--gold-500': '#b8865c',
    '--gold-600': '#9a6b4a',
    '--gold-700': '#7c523d',
    '--gold-800': '#5e3e30',
    '--gold-900': '#402a23',
    '--gold-950': '#221512',
    '--accent-500': '#6366f1',
    '--accent-600': '#4f46e5',
    '--accent-hover': '#d4a574',
    '--link-color': '#6366f1',
    '--link-hover': '#818cf8',
  },
  'bold-authority': {
    '--navy-50': '#f8fafc',
    '--navy-100': '#e2e8f0',
    '--navy-200': '#cbd5e1',
    '--navy-300': '#94a3b8',
    '--navy-400': '#64748b',
    '--navy-500': '#475569',
    '--navy-600': '#334155',
    '--navy-700': '#1e293b',
    '--navy-800': '#0f172a',
    '--navy-900': '#020617',
    '--navy-950': '#020617',
    '--gold-50': '#fff7ed',
    '--gold-100': '#ffedd5',
    '--gold-200': '#fed7aa',
    '--gold-300': '#fdba74',
    '--gold-400': '#fb923c',
    '--gold-500': '#ea580c',
    '--gold-600': '#c2410c',
    '--gold-700': '#9a3412',
    '--gold-800': '#7c2d12',
    '--gold-900': '#5c1d0e',
    '--gold-950': '#2a0a06',
    '--accent-500': '#10b981',
    '--accent-600': '#059669',
    '--accent-hover': '#ea580c',
    '--link-color': '#10b981',
    '--link-hover': '#059669',
  },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('cima-theme');
    return (saved as Theme) || 'white-burgundy';
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('cima-theme', newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    const colors = themes[theme];
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
