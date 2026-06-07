import { NavLink, useNavigate } from "react-router-dom";
import {
  Scale,
  LayoutDashboard,
  Search,
  Briefcase,
  FileText,
  Bot,
  LogOut,
  ChevronRight,
  Gavel,
  PenTool,
  ClipboardCheck,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/research", icon: Search, label: "Research" },
  { to: "/cases", icon: Briefcase, label: "Cases" },
  { to: "/documents", icon: FileText, label: "Documents" },
  { to: "/drafting", icon: PenTool, label: "Drafting Studio" },
  { to: "/contracts", icon: ClipboardCheck, label: "Contract Review" },
  { to: "/assistant", icon: Bot, label: "AI Assistant" },
];

export default function Sidebar() {
  const { user, profile, signOut } = useAuth();
  const displayName = profile?.full_name || user?.email || "User";
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-navy-950 border-r border-navy-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-navy-800">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gold-500">
          <Scale className="w-5 h-5 text-navy-950" />
        </div>
        <div>
          <span className="text-white font-bold text-lg tracking-tight">CIMA</span>
          <span className="text-gold-400 font-bold text-lg tracking-tight"> AI</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? "bg-gold-500/10 text-gold-400 border border-gold-500/20"
                  : "text-slate-400 hover:text-white hover:bg-navy-800"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? "text-gold-400" : ""}`} size={18} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} className="text-gold-500/60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* AI Model indicator */}
      <div className="mx-3 mb-3 px-3 py-2.5 rounded-lg bg-navy-800/60 border border-navy-700">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400">DeepSeek Online</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <Gavel size={11} className="text-gold-500/60" />
          <span className="text-xs text-slate-500">Legal Intelligence Active</span>
        </div>
      </div>

      {/* Profile */}
      <div className="border-t border-navy-800 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gold-500/20 text-gold-400 text-sm font-semibold shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {displayName}
            </p>
            <p className="text-xs text-slate-500 capitalize truncate">{profile?.role || "Lawyer"}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 text-slate-500 hover:text-red-400 rounded-md hover:bg-red-500/10 transition-colors"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
