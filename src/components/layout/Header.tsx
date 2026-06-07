import { Bell, Settings } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user, profile } = useAuth();
  const displayName = profile?.full_name || user?.email || "User";

  return (
    <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200">
      <div>
        <h1 className="text-xl font-semibold text-navy-950">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 text-slate-400 hover:text-navy-950 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell size={18} />
        </button>
        <button className="p-2 text-slate-400 hover:text-navy-950 hover:bg-slate-100 rounded-lg transition-colors">
          <Settings size={18} />
        </button>
        <div className="flex items-center gap-2 ml-2 pl-3 border-l border-slate-200">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-navy-100 text-navy-700 text-sm font-semibold">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-navy-900 leading-none">
              {displayName}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 capitalize">{profile?.role || "Lawyer"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
