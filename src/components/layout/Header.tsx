import { Bell, HelpCircle, Settings } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useTour } from "../../contexts/TourContext";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeSwitcher from "../ui/ThemeSwitcher";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user, profile } = useAuth();
  const { start: startTour } = useTour();
  const navigate = useNavigate();
  const displayName = profile?.full_name || user?.email || "User";
  const [showThemeSwitcher, setShowThemeSwitcher] = useState(false);

  return (
    <header className="relative z-20 flex items-center justify-between px-4 md:px-8 py-3 md:py-4 bg-white border-b border-slate-200 shrink-0">
      {/* Mobile: Logo + Title */}
      <div className="flex items-center gap-3 min-w-0 md:hidden">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg overflow-hidden shrink-0 ring-1 ring-[#B49A67]/20">
          <img 
            src="/logo.png" 
            alt="CIMA AI Logo" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover' 
            }} 
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-[#5A2633] font-bold text-base">CIMA</span>
            <span className="text-[#B49A67] font-bold text-base">AI</span>
          </div>
          <span className="text-[#5A2633]/50 text-[10px] font-medium uppercase tracking-wide">
            {title}
          </span>
        </div>
      </div>

      {/* Desktop: Title */}
      <div className="hidden md:block min-w-0">
        <h1 className="text-xl font-semibold text-navy-950 leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        <button
          onClick={startTour}
          className="hidden sm:flex p-2 text-slate-400 hover:text-navy-950 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Take the tour"
          title="Take the tour"
        >
          <HelpCircle size={18} />
        </button>
        <button className="p-2 text-slate-400 hover:text-navy-950 hover:bg-slate-100 rounded-lg transition-colors relative">
          <Bell size={18} />
          {/* Notification badge */}
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full md:hidden" />
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
              className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-[#B49A67]/30"
            />
          ) : (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-[#5A2633] to-[#B49A67] text-white text-sm font-semibold shrink-0 ring-2 ring-[#B49A67]/30">
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
