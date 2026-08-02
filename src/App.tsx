import { Component, lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MorphLoading from "./components/ui/morph-loading";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TourProvider } from "./contexts/TourContext";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";

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
const Pricing = lazy(() => import("./pages/Pricing"));
const BillingCallback = lazy(() => import("./pages/BillingCallback"));

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
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
    <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ backgroundColor: 'var(--navy-950)' }}>
      {/* Logo mark */}
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: 'var(--accent-500)' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      {/* Spinner */}
      <MorphLoading variant="morph" size="md" />
      {/* Label */}
      <p className="text-slate-400 text-sm tracking-wide">Loading CIMA AI...</p>
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
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <TourProvider>
          <Suspense fallback={<LoadingScreen />}>
          <Routes>
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
              path="/pricing"
              element={<Pricing />}
            />
            <Route
              path="/billing/callback"
              element={<BillingCallback />}
            />
            <Route
              path="/"
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
    </BrowserRouter>
    </ErrorBoundary>
  );
}
