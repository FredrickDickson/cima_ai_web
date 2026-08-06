import { Component, lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ClassicLoader from "./components/ui/loader";
import {
  isChunkLoadError,
  attemptChunkReload,
  clearChunkReloadGuard,
  wasChunkReloadJustAttempted,
} from "./lib/chunkReload";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TourProvider } from "./contexts/TourContext";
import { ToastProvider } from "./contexts/ToastContext";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";

const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Research = lazy(() => import("./pages/Research"));
const Cases = lazy(() => import("./pages/Cases"));
const Documents = lazy(() => import("./pages/Documents"));
const Library = lazy(() => import("./pages/Library"));
const LibraryDocument = lazy(() => import("./pages/LibraryDocument"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const DraftingStudio = lazy(() => import("./pages/DraftingStudio"));
const ContractReview = lazy(() => import("./pages/ContractReview"));
const Profile = lazy(() => import("./pages/Profile"));
const Admin = lazy(() => import("./pages/Admin"));

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }

  componentDidMount() {
    // A successful mount means the current build loaded fine — clear any
    // stale guard so the next stale-chunk error gets a fresh retry.
    clearChunkReloadGuard();
  }

  componentDidCatch(error: Error) {
    if (isChunkLoadError(error)) {
      attemptChunkReload(); // no-op if already attempted this session
    }
  }

  render() {
    if (this.state.error) {
      if (isChunkLoadError(this.state.error) && wasChunkReloadJustAttempted()) {
        // Reload is in flight — avoid flashing the error screen for the
        // split second before navigation actually happens.
        return null;
      }
      return (
        <div style={{ padding: 40, fontFamily: "monospace", background: "#1e1e2e", color: "#f38ba8", minHeight: "100vh" }}>
          <h1 style={{ color: "#cdd6f4", marginBottom: 16 }}>Something went wrong</h1>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#a6adc8", marginTop: 12 }}>{this.state.error.stack}</pre>
          <button onClick={() => { this.setState({ error: null }); window.location.href = "/login"; }}
            style={{ marginTop: 24, padding: "8px 20px", background: "#89b4fa", color: "#1e1e2e", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            Go to Login
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ 
      background: "linear-gradient(135deg, #FDFBF7 0%, #ffffff 50%, #F8F6F0 100%)",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Background Pattern */}
      <div style={{
        position: "absolute",
        inset: 0,
        opacity: 0.3,
      }}>
        <div style={{
          position: "absolute",
          top: "-10%",
          right: "-10%",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(139, 14, 30, 0.15) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(80px)",
        }}></div>
        <div style={{
          position: "absolute",
          bottom: "-10%",
          left: "-10%",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(201, 169, 97, 0.15) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(80px)",
        }}></div>
      </div>
      
      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
        {/* Logo mark */}
        <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg">
          <img 
            src="/images/logo.jpeg" 
            alt="CIMA AI Logo" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover' 
            }} 
          />
        </div>
        {/* Spinner */}
        <ClassicLoader size={36} />
        {/* Label */}
        <p style={{ color: "#6d6d6d", fontSize: "0.875rem", fontWeight: 500, letterSpacing: "0.025em" }}>Loading CIMA AI...</p>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RedirectIfAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <ToastProvider>
      <ThemeProvider>
        <AuthProvider>
          <TourProvider>
          <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route
              path="/"
              element={<Landing />}
            />
            <Route
              path="/login"
              element={<RedirectIfAuth><Login /></RedirectIfAuth>}
            />
            <Route
              path="/register"
              element={<RedirectIfAuth><Register /></RedirectIfAuth>}
            />
            <Route
              path="/forgot-password"
              element={<RedirectIfAuth><ForgotPassword /></RedirectIfAuth>}
            />
            <Route
              path="/reset-password"
              element={<ResetPassword />}
            />
            <Route
              path="/terms"
              element={<TermsOfService />}
            />
            <Route
              path="/privacy"
              element={<PrivacyPolicy />}
            />
            <Route
              path="/dashboard"
              element={<RequireAuth><Dashboard /></RequireAuth>}
            />
            <Route
              path="/research"
              element={<RequireAuth><Research /></RequireAuth>}
            />
            <Route
              path="/cases"
              element={<RequireAuth><Cases /></RequireAuth>}
            />
            <Route
              path="/documents"
              element={<RequireAuth><Documents /></RequireAuth>}
            />
            <Route
              path="/library"
              element={<RequireAuth><Library /></RequireAuth>}
            />
            <Route
              path="/library/:docId"
              element={<RequireAuth><LibraryDocument /></RequireAuth>}
            />
            {/* Convex-hosted docs carry an explicit source segment (see the
                Legal Library / Convex migration) — the single-param route
                above stays for existing links that predate it (citations,
                DraftingStudio, Research), which only ever point at Supabase. */}
            <Route
              path="/library/:source/:docId"
              element={<RequireAuth><LibraryDocument /></RequireAuth>}
            />
            <Route
              path="/assistant"
              element={<RequireAuth><AIAssistant /></RequireAuth>}
            />
            <Route
              path="/drafting"
              element={<RequireAuth><DraftingStudio /></RequireAuth>}
            />
            <Route
              path="/review"
              element={<RequireAuth><ContractReview /></RequireAuth>}
            />
            <Route
              path="/profile"
              element={<RequireAuth><Profile /></RequireAuth>}
            />
            <Route
              path="/admin"
              element={<RequireAuth><Admin /></RequireAuth>}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
          </TourProvider>
        </AuthProvider>
      </ThemeProvider>
      </ToastProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
