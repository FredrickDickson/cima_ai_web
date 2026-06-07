import { Component, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/Dashboard";
import Research from "./pages/Research";
import Cases from "./pages/Cases";
import Documents from "./pages/Documents";
import AIAssistant from "./pages/AIAssistant";
import DraftingStudio from "./pages/DraftingStudio";
import ContractReview from "./pages/ContractReview";

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
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "#c9a227", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Loading CIMA AI...</p>
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
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
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
            path="/assistant"
            element={<RequireAuth><AIAssistant /></RequireAuth>}
          />
          <Route
            path="/drafting"
            element={<RequireAuth><DraftingStudio /></RequireAuth>}
          />
          <Route
            path="/contracts"
            element={<RequireAuth><ContractReview /></RequireAuth>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
