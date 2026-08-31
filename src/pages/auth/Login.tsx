import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
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
      navigate("/dashboard");
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "linear-gradient(135deg, #F5F1E8 0%, #ffffff 50%, #F5F1E8 100%)",
      position: "relative",
      overflow: "hidden",
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
          background: "radial-gradient(circle, rgba(90, 38, 51, 0.15) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(80px)",
        }}></div>
        <div style={{
          position: "absolute",
          bottom: "-10%",
          left: "-10%",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(180, 154, 103, 0.15) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(80px)",
        }}></div>
      </div>

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:flex-1" style={{
        flexDirection: "column",
        justifyContent: "center",
        padding: "4rem",
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
                src="/logo.png"
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
                color: "#252525",
              }}>
                CIMA AI
              </div>
              <div style={{
                fontSize: "0.875rem",
                color: "#5f5f5f",
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
            color: "#252525",
            marginBottom: "1.5rem",
            lineHeight: 1.2,
          }}>
            Welcome Back to
            <br />
            <span style={{
              background: "linear-gradient(135deg, #5A2633, #B49A67)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>Legal Excellence</span>
          </h1>
          <p style={{
            fontSize: "1.125rem",
            color: "#5f5f5f",
            lineHeight: 1.7,
            maxWidth: "28rem",
          }}>
            Access your AI-powered legal intelligence platform. Continue working on cases, research, and collaboration with your team.
          </p>
        </div>

        <div style={{ marginTop: "3rem" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "1.5rem",
            maxWidth: "28rem",
          }}>
            {[
              { value: "500+", label: "Legal Professionals" },
              { value: "10K+", label: "Cases Analyzed" },
              { value: "50+", label: "Countries" },
              { value: "98%", label: "Satisfaction" },
            ].map((stat) => (
              <div key={stat.label} style={{
                padding: "1rem",
                borderRadius: "0.75rem",
                background: "rgba(255, 255, 255, 0.5)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(90, 38, 51, 0.1)",
              }}>
                <div style={{
                  fontSize: "1.5rem",
                  fontFamily: "Playfair Display, Georgia, serif",
                  fontWeight: 700,
                  color: "#5A2633",
                  marginBottom: "0.25rem",
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontSize: "0.8125rem",
                  color: "#5f5f5f",
                  fontWeight: 500,
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Sign In Form */}
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
            color: "#5A2633",
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
            boxShadow: "0 20px 60px rgba(90, 38, 51, 0.12)",
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
                      src="/logo.png"
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
                      color: "#252525",
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
              color: "#252525",
              marginBottom: "0.5rem",
            }}>
              Sign In
            </h2>
            <p style={{
              fontSize: "0.9375rem",
              color: "#5f5f5f",
              marginBottom: "2rem",
            }}>
              Enter your credentials to access your account
            </p>

            {resetSuccess && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                padding: "0.875rem 1rem",
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "0.75rem",
                marginBottom: "1.5rem",
                fontSize: "0.875rem",
                color: "#059669",
              }}>
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                Password updated — sign in with your new password.
              </div>
            )}

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
              {/* Email Field */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#252525",
                  marginBottom: "0.5rem",
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@lawfirm.com"
                  style={{
                    width: "100%",
                    height: "3.5rem",
                    padding: "0 1rem",
                    fontSize: "0.9375rem",
                    color: "#252525",
                    background: "white",
                    border: "2px solid #e5e7eb",
                    borderRadius: "0.75rem",
                    outline: "none",
                    transition: "all 0.3s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#5A2633";
                    e.target.style.boxShadow = "0 0 0 3px rgba(90, 38, 51, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e5e7eb";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Password Field */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <label style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "#252525",
                  }}>
                    Password
                  </label>
                  <Link to="/forgot-password" style={{
                    fontSize: "0.875rem",
                    color: "#5A2633",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}>
                    Forgot Password?
                  </Link>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    style={{
                      width: "100%",
                      height: "3.5rem",
                      padding: "0 3rem 0 1rem",
                      fontSize: "0.9375rem",
                      color: "#252525",
                      background: "white",
                      border: "2px solid #e5e7eb",
                      borderRadius: "0.75rem",
                      outline: "none",
                      transition: "all 0.3s",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#5A2633";
                      e.target.style.boxShadow = "0 0 0 3px rgba(90, 38, 51, 0.1)";
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
                      color: "#5f5f5f",
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
                gap: "0.5rem",
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
                    accentColor: "#5A2633",
                  }}
                />
                <label htmlFor="acceptTerms" style={{
                  fontSize: "0.875rem",
                  color: "#5f5f5f",
                  lineHeight: 1.5,
                }}>
                  I agree to the{" "}
                  <Link to="/terms" style={{ color: "#5A2633", textDecoration: "none", fontWeight: 600 }}>
                    Terms of Service
                  </Link>
                  {" "}and{" "}
                  <Link to="/privacy" style={{ color: "#5A2633", textDecoration: "none", fontWeight: 600 }}>
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
                  background: loading ? "#9d9d9d" : "linear-gradient(135deg, #5A2633 0%, #4a1f2a 100%)",
                  border: "none",
                  borderRadius: "0.75rem",
                  boxShadow: "0 4px 16px rgba(90, 38, 51, 0.25)",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.3s",
                  marginBottom: "1.5rem",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>

              {/* Sign Up Link */}
              <div style={{
                textAlign: "center",
                fontSize: "0.9375rem",
                color: "#5f5f5f",
              }}>
                Don't have an account?{" "}
                <Link to="/register" style={{
                  color: "#5A2633",
                  textDecoration: "none",
                  fontWeight: 600,
                }}>
                  Sign Up
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
