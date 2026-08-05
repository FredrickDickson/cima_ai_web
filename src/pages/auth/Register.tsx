import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
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
  const [acceptTerms, setAcceptTerms] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!acceptTerms) {
      setError("You must accept the Terms of Service and Privacy Policy to continue.");
      return;
    }
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
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "linear-gradient(135deg, #FDFBF7 0%, #ffffff 50%, #F8F6F0 100%)",
      position: "relative",
      overflow: "hidden",
      padding: "2rem 0",
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

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:flex-1" style={{
        flexDirection: "column",
        justifyContent: "start",
        padding: "4rem",
        paddingTop: "6rem",
        position: "relative",
        zIndex: 1,
      }}>
        <Link to="/" style={{ textDecoration: "none", marginBottom: "4rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              position: "relative",
              width: "3rem",
              height: "3rem",
              borderRadius: "0.75rem",
              overflow: "hidden",
              flexShrink: 0,
            }}>
              <img
                src="/images/logo.jpeg"
                alt="CIMA AI Logo"
                style={{ 
                  width: "100%",
                  height: "100%",
                  objectFit: "cover"
                }}
              />
            </div>
            <div>
              <div style={{
                fontFamily: "Playfair Display, Georgia, serif",
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "#2D2D2D",
              }}>
                CIMA AI
              </div>
              <div style={{
                fontSize: "0.875rem",
                color: "#6d6d6d",
                marginTop: "-0.125rem",
              }}>
                Legal Intelligence Platform
              </div>
            </div>
          </div>
        </Link>

        <div>
          <h1 style={{
            fontFamily: "Playfair Display, Georgia, serif",
            fontSize: "clamp(2rem, 4vw, 3rem)",
            fontWeight: 700,
            color: "#2D2D2D",
            marginBottom: "1.5rem",
            lineHeight: 1.2,
          }}>
            Join the Future of
            <br />
            <span style={{
              background: "linear-gradient(135deg, #8B0E1E, #C9A961)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>Legal Intelligence</span>
          </h1>
          <p style={{
            fontSize: "1.125rem",
            color: "#6d6d6d",
            lineHeight: 1.7,
            maxWidth: "28rem",
            marginBottom: "2rem",
          }}>
            Create your account and start leveraging AI-powered legal research, analysis, and collaboration tools trusted by professionals worldwide.
          </p>

          {/* Benefits List */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            maxWidth: "28rem",
          }}>
            {[
              "Access 1M+ legal precedents and cases",
              "AI-powered document review and analysis",
              "Collaborate with your legal team in real-time",
              "Enterprise-grade security and compliance",
            ].map((benefit, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div style={{
                  width: "1.5rem",
                  height: "1.5rem",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #8B0E1E, #C9A961)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <svg style={{ width: "0.875rem", height: "0.875rem" }} fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span style={{
                  fontSize: "0.9375rem",
                  color: "#2D2D2D",
                  fontWeight: 500,
                }}>
                  {benefit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Sign Up Form */}
      <div className="flex-1" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        position: "relative",
        zIndex: 1,
      }}>
        <div style={{
          width: "100%",
          maxWidth: "28rem",
        }}>
          {/* Back to Home - Mobile */}
          <Link to="/" className="lg:hidden" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "#8B0E1E",
            textDecoration: "none",
            fontSize: "0.9375rem",
            fontWeight: 600,
            marginBottom: "2rem",
          }}>
            <ArrowLeft style={{ width: "1.125rem", height: "1.125rem" }} />
            Back to Home
          </Link>

          {/* Form Card */}
          <div style={{
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: "1.5rem",
            boxShadow: "0 20px 60px rgba(139, 14, 30, 0.12)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            padding: "3rem 2.5rem",
          }}>
            {/* Mobile Logo */}
            <div className="lg:hidden" style={{ display: "flex", marginBottom: "2rem" }}>
              <Link to="/" style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{
                    position: "relative",
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "0.625rem",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}>
                    <img
                      src="/images/logo.jpeg"
                      alt="CIMA AI Logo"
                      style={{ 
                        width: "100%",
                        height: "100%",
                        objectFit: "cover"
                      }}
                    />
                  </div>
                  <div>
                    <div style={{
                      fontFamily: "Playfair Display, Georgia, serif",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "#2D2D2D",
                    }}>
                      CIMA AI
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            <h2 style={{
              fontFamily: "Playfair Display, Georgia, serif",
              fontSize: "1.875rem",
              fontWeight: 700,
              color: "#2D2D2D",
              marginBottom: "0.5rem",
            }}>
              Create Account
            </h2>
            <p style={{
              fontSize: "0.9375rem",
              color: "#6d6d6d",
              marginBottom: "2rem",
            }}>
              Get started with CIMA AI in minutes
            </p>

            {error && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                padding: "0.875rem 1rem",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "0.75rem",
                marginBottom: "1.5rem",
                fontSize: "0.875rem",
                color: "#dc2626",
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Full Name */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#2D2D2D",
                  marginBottom: "0.5rem",
                }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                  required
                  placeholder="John Doe"
                  style={{
                    width: "100%",
                    height: "3rem",
                    padding: "0 1rem",
                    fontSize: "0.9375rem",
                    color: "#2D2D2D",
                    background: "white",
                    border: "2px solid #e5e7eb",
                    borderRadius: "0.75rem",
                    outline: "none",
                    transition: "all 0.3s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#8B0E1E";
                    e.target.style.boxShadow = "0 0 0 3px rgba(139, 14, 30, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e5e7eb";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Role */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#2D2D2D",
                  marginBottom: "0.5rem",
                }}>
                  Role *
                </label>
                <select
                  value={form.role}
                  onChange={(e) => update("role", e.target.value)}
                  style={{
                    width: "100%",
                    height: "3rem",
                    padding: "0 1rem",
                    fontSize: "0.9375rem",
                    color: "#2D2D2D",
                    background: "white",
                    border: "2px solid #e5e7eb",
                    borderRadius: "0.75rem",
                    outline: "none",
                    transition: "all 0.3s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#8B0E1E";
                    e.target.style.boxShadow = "0 0 0 3px rgba(139, 14, 30, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e5e7eb";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Email */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#2D2D2D",
                  marginBottom: "0.5rem",
                }}>
                  Work Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  required
                  placeholder="you@lawfirm.com"
                  style={{
                    width: "100%",
                    height: "3rem",
                    padding: "0 1rem",
                    fontSize: "0.9375rem",
                    color: "#2D2D2D",
                    background: "white",
                    border: "2px solid #e5e7eb",
                    borderRadius: "0.75rem",
                    outline: "none",
                    transition: "all 0.3s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#8B0E1E";
                    e.target.style.boxShadow = "0 0 0 3px rgba(139, 14, 30, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e5e7eb";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#2D2D2D",
                  marginBottom: "0.5rem",
                }}>
                  Password *
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    required
                    placeholder="Min. 6 characters"
                    style={{
                      width: "100%",
                      height: "3rem",
                      padding: "0 3rem 0 1rem",
                      fontSize: "0.9375rem",
                      color: "#2D2D2D",
                      background: "white",
                      border: "2px solid #e5e7eb",
                      borderRadius: "0.75rem",
                      outline: "none",
                      transition: "all 0.3s",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#8B0E1E";
                      e.target.style.boxShadow = "0 0 0 3px rgba(139, 14, 30, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e5e7eb";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "1rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "0.25rem",
                      color: "#6d6d6d",
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div style={{
                display: "flex",
                alignItems: "start",
                gap: "0.75rem",
                marginBottom: "2rem",
              }}>
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  style={{
                    width: "1.125rem",
                    height: "1.125rem",
                    marginTop: "0.125rem",
                    cursor: "pointer",
                    accentColor: "#8B0E1E",
                    flexShrink: 0,
                  }}
                />
                <label htmlFor="acceptTerms" style={{
                  fontSize: "0.875rem",
                  color: "#6d6d6d",
                  lineHeight: 1.6,
                }}>
                  I agree to the{" "}
                  <Link to="/terms" style={{ color: "#8B0E1E", textDecoration: "none", fontWeight: 600 }}>
                    Terms of Service
                  </Link>
                  {" "}and{" "}
                  <Link to="/privacy" style={{ color: "#8B0E1E", textDecoration: "none", fontWeight: 600 }}>
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  height: "3.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "white",
                  background: loading ? "#9d9d9d" : "linear-gradient(135deg, #8B0E1E 0%, #751222 100%)",
                  border: "none",
                  borderRadius: "0.75rem",
                  boxShadow: "0 4px 16px rgba(139, 14, 30, 0.25)",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.3s",
                  marginBottom: "1.5rem",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>

              {/* Sign In Link */}
              <div style={{
                textAlign: "center",
                fontSize: "0.9375rem",
                color: "#6d6d6d",
              }}>
                Already have an account?{" "}
                <Link to="/login" style={{
                  color: "#8B0E1E",
                  textDecoration: "none",
                  fontWeight: 600,
                }}>
                  Sign In
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
