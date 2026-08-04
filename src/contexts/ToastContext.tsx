import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

const TOAST_STYLES: Record<ToastType, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  error: { icon: AlertCircle, className: "bg-red-50 border-red-200 text-red-700" },
  info: { icon: Info, className: "bg-navy-50 border-navy-200 text-navy-700" },
};

const EXIT_DURATION_MS = 200;

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const { icon: Icon, className } = TOAST_STYLES[toast.type];

  function dismiss() {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), EXIT_DURATION_MS);
  }

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const autoDismiss = setTimeout(dismiss, 4000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(autoDismiss);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-lg border shadow-lg max-w-sm transition-all duration-200 ${className} ${
        visible ? "opacity-100 translate-y-0 translate-x-0" : "opacity-0 translate-y-2 translate-x-4"
      }`}
    >
      <Icon size={16} className="shrink-0" />
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button onClick={dismiss} className="shrink-0 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
