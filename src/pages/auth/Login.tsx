import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Scale, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const resetSuccess = Boolean((location.state as { resetSuccess?: boolean } | null)?.resetSuccess);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!acceptTerms) {
      setError("You must accept the Terms of Service and Privacy Policy to continue.");
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      navigate("/");
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 border-r border-navy-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold-500">
            <Scale className="w-5 h-5 text-navy-950" />
          </div>
          <div>
            <span className="text-white font-bold text-xl tracking-tight">CIMA</span>
            <span className="text-gold-400 font-bold text-xl tracking-tight"> AI</span>
          </div>
        </div>

        <div>
          <blockquote className="text-2xl font-light text-white leading-relaxed mb-6">
            "AI-native legal intelligence for the modern arbitration practitioner."
          </blockquote>
          <div className="space-y-4">
            {[
              "Legal research in seconds, not hours",
              "AI-powered contract review and risk analysis",
              "Integrated arbitration case management",
              "CIMA AI with legal domain expertise",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-gold-400 shrink-0" />
                <span className="text-slate-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-sm">
          Supporting Ghana ADR Act 2010 · ICC · UNCITRAL · LCIA · New York Convention
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-navy-950">
              <Scale className="w-5 h-5 text-gold-400" />
            </div>
            <span className="text-navy-950 font-bold text-xl">CIMA AI</span>
          </div>

          <h2 className="text-2xl font-bold text-navy-950 mb-1">Welcome back</h2>
          <p className="text-slate-500 mb-8">Sign in to your legal workspace</p>

          {resetSuccess && (
            <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg mb-6 text-sm text-emerald-700">
              <CheckCircle2 size={16} className="shrink-0" />
              Password updated — sign in with your new password.
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-lg mb-6 text-sm text-red-700">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy-900 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-all bg-white"
                placeholder="you@lawfirm.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-navy-900">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-navy-700 hover:text-gold-600 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-lg text-sm text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-all bg-white"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="acceptTerms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-navy-600 focus:ring-navy-500"
              />
              <label htmlFor="acceptTerms" className="text-sm text-slate-600">
                I agree to the{" "}
                <Link to="/terms" className="text-navy-700 hover:text-gold-600 underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-navy-700 hover:text-gold-600 underline">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-navy-950 hover:bg-navy-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            New to CIMA AI?{" "}
            <Link to="/register" className="text-navy-700 font-medium hover:text-gold-600 transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
