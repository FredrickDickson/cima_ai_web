import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Scale, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const ROLES = [
  { value: "lawyer", label: "Lawyer / Advocate" },
  { value: "arbitrator", label: "Arbitrator" },
  { value: "mediator", label: "Mediator" },
  { value: "in_house", label: "In-house Counsel" },
  { value: "researcher", label: "Legal Researcher" },
  { value: "student", label: "Law Student" },
];

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "lawyer" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const { error } = await signUp(form.email, form.password, form.fullName, form.role);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      navigate("/");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-navy-950">
            <Scale className="w-5 h-5 text-gold-400" />
          </div>
          <div>
            <span className="text-navy-950 font-bold text-xl tracking-tight">CIMA</span>
            <span className="text-gold-600 font-bold text-xl tracking-tight"> AI</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-navy-950 mb-1">Create your account</h2>
          <p className="text-slate-500 text-sm mb-6">Start your legal intelligence workspace</p>

          {error && (
            <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-lg mb-5 text-sm text-red-700">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy-900 mb-1.5">Full name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                required
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-all"
                placeholder="Kwame Mensah"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-900 mb-1.5">Role</label>
              <select
                value={form.role}
                onChange={(e) => update("role", e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-navy-950 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-all bg-white"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-900 mb-1.5">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                required
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-all"
                placeholder="you@lawfirm.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-900 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-lg text-sm text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent transition-all"
                  placeholder="Min. 6 characters"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-navy-950 hover:bg-navy-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Already have an account?{" "}
            <Link to="/login" className="text-navy-700 font-medium hover:text-gold-600 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
