import { Bell, Menu, Settings } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSidebar } from "../../contexts/SidebarContext";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeSwitcher from "../ui/ThemeSwitcher";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user, profile } = useAuth();
  const { toggle } = useSidebar();
  const navigate = useNavigate();
  const displayName = profile?.full_name || user?.email || "User";
  const [showThemeSwitcher, setShowThemeSwitcher] = useState(false);

  return (
    <header className="relative z-20 flex items-center justify-between px-4 md:px-8 py-3 md:py-4 bg-white border-b border-slate-200 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={toggle}
          className="md:hidden p-2 text-slate-500 hover:text-navy-950 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-base md:text-xl font-semibold text-navy-950 leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs md:text-sm text-slate-500 mt-0.5 truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        <button className="p-2 text-slate-400 hover:text-navy-950 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell size={18} />
        </button>
        <button 
          onClick={() => setShowThemeSwitcher(true)}
          className="hidden sm:flex p-2 text-slate-400 hover:text-navy-950 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Theme settings"
        >
          <Settings size={18} />
        </button>
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 ml-1 md:ml-2 pl-2 md:pl-3 border-l border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-navy-100 text-navy-700 text-sm font-semibold shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-navy-900 leading-none">{displayName}</p>
            <p className="text-xs text-slate-500 mt-0.5 capitalize">
              {profile?.role || "Lawyer"}
            </p>
          </div>
        </button>
      </div>

      {showThemeSwitcher && (
        <ThemeSwitcher onClose={() => setShowThemeSwitcher(false)} />
      )}
    </header>
  );
}
