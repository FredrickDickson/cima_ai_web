import { Link } from "react-router-dom";
import { ArrowLeft, Scale } from "lucide-react";

export default function TermsOfService() {
  return (
    <div style={{ minHeight: "100vh", background: "#FEFEFE" }}>
      {/* Navigation Bar */}
      <header style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        paddingTop: "0.75rem",
        paddingBottom: "0.75rem",
      }}>
        <style>
          {`
            @keyframes shimmer-border {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
          `}
        </style>
        <div style={{
          width: "100%",
          maxWidth: "90rem",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "1rem",
          paddingRight: "1rem",
        }}>
          <nav style={{
            position: "relative",
            overflow: "visible",
            borderRadius: "9999px",
            background: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(139, 14, 30, 0.08)",
          }}>
            {/* Animated Border Shimmer */}
            <div style={{
              position: "absolute",
              inset: 0,
              borderRadius: "9999px",
              padding: "2px",
              background: "linear-gradient(90deg, transparent, rgba(139, 14, 30, 0.3), rgba(201, 169, 97, 0.4), rgba(139, 14, 30, 0.3), transparent)",
              backgroundSize: "200% 100%",
              animation: "shimmer-border 3s linear infinite",
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              pointerEvents: "none",
            }} />
            
            {/* Solid Border Base */}
            <div style={{
              position: "absolute",
              inset: 0,
              borderRadius: "9999px",
              border: "2px solid rgba(139, 14, 30, 0.3)",
              pointerEvents: "none",
            }} />

            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.75rem 1.5rem",
              minHeight: "3.5rem",
            }}>
              <Link to="/" style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                textDecoration: "none",
                zIndex: 1,
              }}>
                <div style={{
                  position: "relative",
                  width: "2.25rem",
                  height: "2.25rem",
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
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{
                    fontFamily: "Playfair Display, Georgia, serif",
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "#2D2D2D",
                    lineHeight: 1,
                  }}>
                    CIMA AI
                  </span>
                  <span style={{
                    fontSize: "0.625rem",
                    color: "#6d6d6d",
                    marginTop: "0.125rem",
                    letterSpacing: "0.02em",
                  }}>
                    Legal Intelligence
                  </span>
                </div>
              </Link>

              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", zIndex: 1 }}>
                <Link to="/" style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.625rem 1.125rem",
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  color: "#8B0E1E",
                  textDecoration: "none",
                  borderRadius: "9999px",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(139, 14, 30, 0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}>
                  <ArrowLeft style={{ width: "1rem", height: "1rem" }} />
                  <span>Back to Home</span>
                </Link>
              </div>
            </div>
          </nav>
        </div>
      </header>

      <main style={{ 
        maxWidth: "56rem", 
        marginLeft: "auto", 
        marginRight: "auto", 
        padding: "7rem 1.5rem 6rem",
      }}>
        {/* Header Section */}
        <div style={{ 
          textAlign: "center", 
          marginBottom: "4rem",
          paddingBottom: "2rem",
          borderBottom: "2px solid rgba(139, 14, 30, 0.1)",
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "4rem",
            height: "4rem",
            borderRadius: "1rem",
            background: "linear-gradient(135deg, #8B0E1E, #C9A961)",
            marginBottom: "1.5rem",
            boxShadow: "0 8px 24px rgba(139, 14, 30, 0.2)",
          }}>
            <Scale style={{ width: "2rem", height: "2rem", color: "white" }} />
          </div>
          <h1 style={{
            fontFamily: "Playfair Display, Georgia, serif",
            fontSize: "2.75rem",
            fontWeight: 700,
            color: "#2D2D2D",
            marginBottom: "0.75rem",
            lineHeight: 1.2,
          }}>
            Terms of Service
          </h1>
          <p style={{
            fontSize: "1rem",
            color: "#6d6d6d",
            fontWeight: 500,
          }}>
            Last updated: June 13, 2026
          </p>
        </div>

        {/* Content */}
        <div style={{
          background: "white",
          borderRadius: "1.5rem",
          border: "1px solid rgba(139, 14, 30, 0.08)",
          padding: "3rem",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.04)",
        }}>
          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{
              fontFamily: "Playfair Display, Georgia, serif",
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#2D2D2D",
              marginBottom: "1rem",
              paddingBottom: "0.75rem",
              borderBottom: "2px solid rgba(201, 169, 97, 0.3)",
            }}>
              1. Acceptance of Terms
            </h2>
            <p style={{
              color: "#4f4f4f",
              lineHeight: 1.8,
              fontSize: "1rem",
            }}>
              By accessing and using CIMA AI ("the Service"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{
              fontFamily: "Playfair Display, Georgia, serif",
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#2D2D2D",
              marginBottom: "1rem",
              paddingBottom: "0.75rem",
              borderBottom: "2px solid rgba(201, 169, 97, 0.3)",
            }}>
              2. Description of Service
            </h2>
            <p style={{
              color: "#4f4f4f",
              lineHeight: 1.8,
              fontSize: "1rem",
            }}>
              CIMA AI provides AI-powered legal intelligence services including legal research, contract review, 
              document drafting, and case management tools specifically designed for arbitration practitioners, 
              lawyers, and legal professionals in Ghana and beyond.
            </p>
          </section>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{
              fontFamily: "Playfair Display, Georgia, serif",
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#2D2D2D",
              marginBottom: "1rem",
              paddingBottom: "0.75rem",
              borderBottom: "2px solid rgba(201, 169, 97, 0.3)",
            }}>
              3. User Responsibilities
            </h2>
            <ul style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              color: "#4f4f4f",
              lineHeight: 1.8,
              fontSize: "1rem",
            }}>
              <li style={{ 
                marginBottom: "0.75rem",
                paddingLeft: "1.5rem",
                position: "relative",
              }}>
                <span style={{
                  position: "absolute",
                  left: "0",
                  color: "#C9A961",
                  fontWeight: "bold",
                }}>•</span>
                You must be at least 18 years old to use this Service
              </li>
              <li style={{ 
                marginBottom: "0.75rem",
                paddingLeft: "1.5rem",
                position: "relative",
              }}>
                <span style={{
                  position: "absolute",
                  left: "0",
                  color: "#C9A961",
                  fontWeight: "bold",
                }}>•</span>
                You are responsible for maintaining the confidentiality of your account credentials
              </li>
              <li style={{ 
                marginBottom: "0.75rem",
                paddingLeft: "1.5rem",
                position: "relative",
              }}>
                <span style={{
                  position: "absolute",
                  left: "0",
                  color: "#C9A961",
                  fontWeight: "bold",
                }}>•</span>
                You agree to use the Service only for lawful purposes and in accordance with these Terms
              </li>
              <li style={{ 
                marginBottom: "0.75rem",
                paddingLeft: "1.5rem",
                position: "relative",
              }}>
                <span style={{
                  position: "absolute",
                  left: "0",
                  color: "#C9A961",
                  fontWeight: "bold",
                }}>•</span>
                You must not use the Service to provide legal advice unless you are a licensed legal professional
              </li>
              <li style={{ 
                paddingLeft: "1.5rem",
                position: "relative",
              }}>
                <span style={{
                  position: "absolute",
                  left: "0",
                  color: "#C9A961",
                  fontWeight: "bold",
                }}>•</span>
                You are responsible for all activities that occur under your account
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{
              fontFamily: "Playfair Display, Georgia, serif",
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#2D2D2D",
              marginBottom: "1rem",
              paddingBottom: "0.75rem",
              borderBottom: "2px solid rgba(201, 169, 97, 0.3)",
            }}>
              4. Intellectual Property
            </h2>
            <p style={{
              color: "#4f4f4f",
              lineHeight: 1.8,
              fontSize: "1rem",
            }}>
              All content, features, and functionality of CIMA AI are owned by CIMA AI and are protected by 
              international copyright, trademark, and other intellectual property laws. You may not reproduce, 
              modify, or distribute any part of the Service without explicit written permission.
            </p>
          </section>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{
              fontFamily: "Playfair Display, Georgia, serif",
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#2D2D2D",
              marginBottom: "1rem",
              paddingBottom: "0.75rem",
              borderBottom: "2px solid rgba(201, 169, 97, 0.3)",
            }}>
              5. AI-Generated Content Disclaimer
            </h2>
            <p style={{
              color: "#4f4f4f",
              lineHeight: 1.8,
              fontSize: "1rem",
            }}>
              CIMA AI uses artificial intelligence to assist with legal research and document analysis. 
              While we strive for accuracy, AI-generated content should be reviewed and verified by qualified 
              legal professionals before use in legal proceedings. CIMA AI is not responsible for decisions 
              made based on AI-generated content.
            </p>
          </section>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{
              fontFamily: "Playfair Display, Georgia, serif",
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#2D2D2D",
              marginBottom: "1rem",
              paddingBottom: "0.75rem",
              borderBottom: "2px solid rgba(201, 169, 97, 0.3)",
            }}>
              6. Privacy and Data Protection
            </h2>
            <p style={{
              color: "#4f4f4f",
              lineHeight: 1.8,
              fontSize: "1rem",
            }}>
              Your privacy is important to us. Please review our <Link to="/privacy" style={{ 
                color: "#8B0E1E", 
                textDecoration: "underline",
                fontWeight: 600,
              }}>Privacy Policy</Link> 
              to understand how we collect, use, and protect your personal information.
            </p>
          </section>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{
              fontFamily: "Playfair Display, Georgia, serif",
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#2D2D2D",
              marginBottom: "1rem",
              paddingBottom: "0.75rem",
              borderBottom: "2px solid rgba(201, 169, 97, 0.3)",
            }}>
              7. Limitation of Liability
            </h2>
            <p style={{
              color: "#4f4f4f",
              lineHeight: 1.8,
              fontSize: "1rem",
            }}>
              CIMA AI shall not be liable for any indirect, incidental, special, consequential, or punitive 
              damages resulting from your use or inability to use the Service. The Service is provided "as is" 
              without warranties of any kind.
            </p>
          </section>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{
              fontFamily: "Playfair Display, Georgia, serif",
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#2D2D2D",
              marginBottom: "1rem",
              paddingBottom: "0.75rem",
              borderBottom: "2px solid rgba(201, 169, 97, 0.3)",
            }}>
              8. Termination
            </h2>
            <p style={{
              color: "#4f4f4f",
              lineHeight: 1.8,
              fontSize: "1rem",
            }}>
              We reserve the right to suspend or terminate your account at any time for violation of these 
              Terms or for any other reason at our sole discretion.
            </p>
          </section>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{
              fontFamily: "Playfair Display, Georgia, serif",
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#2D2D2D",
              marginBottom: "1rem",
              paddingBottom: "0.75rem",
              borderBottom: "2px solid rgba(201, 169, 97, 0.3)",
            }}>
              9. Governing Law
            </h2>
            <p style={{
              color: "#4f4f4f",
              lineHeight: 1.8,
              fontSize: "1rem",
            }}>
              These Terms shall be governed by and construed in accordance with the laws of the Republic of Ghana. 
              Any disputes arising under these Terms shall be resolved in the courts of Ghana.
            </p>
          </section>

          <section>
            <h2 style={{
              fontFamily: "Playfair Display, Georgia, serif",
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#2D2D2D",
              marginBottom: "1rem",
              paddingBottom: "0.75rem",
              borderBottom: "2px solid rgba(201, 169, 97, 0.3)",
            }}>
              10. Contact Information
            </h2>
            <p style={{
              color: "#4f4f4f",
              lineHeight: 1.8,
              fontSize: "1rem",
            }}>
              For questions about these Terms of Service, please contact us at legal@cimaafrica.com
            </p>
          </section>
        </div>

        {/* Bottom Navigation */}
        <div style={{ 
          marginTop: "3rem", 
          textAlign: "center",
          paddingTop: "2rem",
          borderTop: "2px solid rgba(139, 14, 30, 0.1)",
        }}>
          <Link to="/privacy" style={{
            display: "inline-block",
            padding: "0.875rem 2rem",
            fontSize: "1rem",
            fontWeight: 600,
            color: "#8B0E1E",
            textDecoration: "none",
            borderRadius: "9999px",
            background: "rgba(139, 14, 30, 0.06)",
            transition: "all 0.3s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(139, 14, 30, 0.1)";
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(139, 14, 30, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(139, 14, 30, 0.06)";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}>
            View Privacy Policy →
          </Link>
        </div>
      </main>
    </div>
  );
}
