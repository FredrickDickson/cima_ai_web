import { type ReactNode } from "react";
import Sidebar from "./Sidebar";
import { SidebarProvider, useSidebar } from "../../contexts/SidebarContext";

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayoutInner({ children }: AppLayoutProps) {
  const { isOpen, close } = useSidebar();

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
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
