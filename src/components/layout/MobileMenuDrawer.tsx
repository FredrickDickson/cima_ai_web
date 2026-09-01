import { X, BookOpen, PenTool, ClipboardCheck, Bot, LogOut, Gavel, User } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { to: "/library", icon: BookOpen, label: "Legal Library" },
  { to: "/drafting", icon: PenTool, label: "Drafting Studio" },
  { to: "/review", icon: ClipboardCheck, label: "Document Review" },
  { to: "/assistant", icon: Bot, label: "AI Assistant" },
];

export default function MobileMenuDrawer({ isOpen, onClose }: MobileMenuDrawerProps) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const displayName = profile?.full_name || user?.email || "User";

  async function handleSignOut() {
    await signOut();
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-50 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`md:hidden fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] bg-white shadow-2xl transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-[#5A2633] to-[#4a1f2a]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg overflow-hidden ring-2 ring-white/20">
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
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-white font-bold text-base">CIMA</span>
                <span className="text-[#B49A67] font-bold text-base">AI</span>
              </div>
              <span className="text-[#B49A67]/70 text-xs font-medium">Legal Intelligence</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Profile Section */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => {
              navigate("/profile");
              onClose();
            }}
            className="flex items-center gap-3 w-full hover:bg-white rounded-xl p-3 transition-colors"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-[#B49A67]/30"
              />
            ) : (
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#5A2633] to-[#B49A67] text-white text-base font-bold shrink-0 ring-2 ring-[#B49A67]/30">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
              <p className="text-xs text-slate-500 capitalize truncate flex items-center gap-1.5">
                <User size={12} />
                {profile?.role || "Lawyer"}
              </p>
            </div>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="px-4 py-4 space-y-1 flex-1 overflow-y-auto">
          <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Additional Tools
          </div>
          {menuItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-[#5A2633] to-[#4a1f2a] text-white"
                    : "text-slate-600 hover:bg-slate-100 active:bg-slate-200"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={isActive ? "text-[#B49A67]" : ""}
                    size={20}
                  />
                  <span className="flex-1">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* AI Status */}
        <div className="mx-4 mb-4 px-4 py-3 rounded-xl bg-gradient-to-br from-[#5A2633]/10 to-[#B49A67]/5 border border-[#B49A67]/20">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-900">CIMA AI Online</span>
          </div>
          <div className="flex items-center gap-2">
            <Gavel size={12} className="text-[#B49A67]" />
            <span className="text-xs text-slate-600 font-medium">Legal Intelligence Active</span>
          </div>
        </div>

        {/* Sign Out */}
        <div className="px-4 pb-4 border-t border-slate-200">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 active:bg-red-100 rounded-xl transition-colors mt-2 font-semibold text-sm"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
