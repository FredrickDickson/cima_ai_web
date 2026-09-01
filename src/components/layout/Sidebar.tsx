import { NavLink, useNavigate } from "react-router-dom";
import {
  Scale,
  LayoutDashboard,
  Search,
  Briefcase,
  FileText,
  BookOpen,
  Bot,
  LogOut,
  ChevronRight,
  Gavel,
  PenTool,
  ClipboardCheck,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/research", icon: Search, label: "Research" },
  { to: "/cases", icon: Briefcase, label: "Cases" },
  { to: "/documents", icon: FileText, label: "Documents" },
  { to: "/library", icon: BookOpen, label: "Legal Library" },
  { to: "/drafting", icon: PenTool, label: "Drafting Studio" },
  { to: "/review", icon: ClipboardCheck, label: "Document Review" },
  { to: "/assistant", icon: Bot, label: "AI Assistant" },
];

export default function Sidebar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const displayName = profile?.full_name || user?.email || "User";

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <aside
      className={[
        "hidden md:flex flex-col w-64 bg-gradient-to-b from-[#2a1419] to-[#1a0c0f] border-r border-[#5A2633]/20",
        "md:static md:z-auto md:min-h-screen",
      ].join(" ")}
    >
      {/* Logo row */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-[#5A2633]/20 shrink-0">
        <div className="flex items-center justify-center w-10 h-10 rounded overflow-hidden shrink-0 ring-2 ring-[#B49A67]/20">
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
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-white font-bold text-lg tracking-tight">CIMA</span>
            <span className="text-[#B49A67] font-bold text-lg tracking-tight">AI</span>
          </div>
          <span className="text-[#B49A67]/50 text-xs font-medium tracking-wide">Legal Intelligence</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/dashboard"}
            data-tour={`sidebar-${to}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative overflow-hidden ${
                isActive
                  ? "bg-gradient-to-r from-[#5A2633] to-[#4a1f2a] text-white shadow-lg shadow-[#5A2633]/20"
                  : "text-[#F5F1E8]/60 hover:text-white hover:bg-[#5A2633]/10"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-[#B49A67]/10 to-transparent pointer-events-none" />
                )}
                <Icon
                  className={`shrink-0 relative z-10 ${isActive ? "text-[#B49A67]" : "group-hover:text-[#B49A67] transition-colors"}`}
                  size={20}
                />
                <span className="flex-1 relative z-10">{label}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#B49A67] shrink-0 relative z-10 animate-pulse" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* AI Model indicator */}
      <div className="mx-4 mb-4 px-4 py-3.5 rounded-xl bg-gradient-to-br from-[#5A2633]/20 to-[#B49A67]/5 border border-[#B49A67]/20 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
          <span className="text-xs font-semibold text-[#F5F1E8]">CIMA AI Online</span>
        </div>
        <div className="flex items-center gap-2">
          <Gavel size={12} className="text-[#B49A67]" />
          <span className="text-xs text-[#F5F1E8]/60 font-medium">Legal Intelligence Active</span>
        </div>
      </div>

      {/* Profile */}
      <div className="border-t border-[#5A2633]/20 p-4 shrink-0 bg-[#1a0c0f]/50">
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-3 px-3 py-3 w-full hover:bg-[#5A2633]/20 rounded-xl transition-all duration-200 group"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-[#B49A67]/30 group-hover:ring-[#B49A67]/50 transition-all"
            />
          ) : (
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#5A2633] to-[#B49A67] text-white text-sm font-bold shrink-0 ring-2 ring-[#B49A67]/30 group-hover:ring-[#B49A67]/50 transition-all shadow-lg">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold text-white truncate group-hover:text-[#B49A67] transition-colors">{displayName}</p>
            <p className="text-xs text-[#F5F1E8]/50 capitalize truncate font-medium">
              {profile?.role || "Lawyer"}
            </p>
          </div>
        </button>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-3 py-2.5 w-full text-[#F5F1E8]/50 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-all duration-200 mt-2 font-medium text-sm group"
          title="Sign out"
        >
          <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
