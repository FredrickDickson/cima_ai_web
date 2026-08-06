import { type ReactNode } from "react";
import Sidebar from "./Sidebar";
import { SidebarProvider, useSidebar } from "../../contexts/SidebarContext";
import TourOverlay from "../onboarding/TourOverlay";

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayoutInner({ children }: AppLayoutProps) {
  const { isOpen, close } = useSidebar();

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-0">
        {children}
      </main>

      <TourOverlay />
    </div>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </SidebarProvider>
  );
}
