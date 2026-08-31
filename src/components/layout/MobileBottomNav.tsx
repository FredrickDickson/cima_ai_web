import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  Briefcase,
  FileText,
  Menu,
} from "lucide-react";

interface MobileBottomNavProps {
  onMenuClick: () => void;
}

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { to: "/research", icon: Search, label: "Research" },
  { to: "/cases", icon: Briefcase, label: "Cases" },
  { to: "/documents", icon: FileText, label: "Documents" },
];

export default function MobileBottomNav({ onMenuClick }: MobileBottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 safe-bottom">
      <div className="grid grid-cols-5 h-16">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/dashboard"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive
                  ? "text-[#5A2633]"
                  : "text-slate-400 active:text-slate-600"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-xs font-medium ${isActive ? "font-semibold" : ""}`}>
                  {label}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-[#5A2633] rounded-t-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
        
        {/* Menu Button */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center gap-1 text-slate-400 active:text-slate-600 transition-colors"
        >
          <Menu size={20} strokeWidth={2} />
          <span className="text-xs font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
}
