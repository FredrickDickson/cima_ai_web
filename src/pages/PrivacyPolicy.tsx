import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicy() {
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
            <Shield style={{ width: "2rem", height: "2rem", color: "white" }} />
          </div>
          <h1 style={{
            fontFamily: "Playfair Display, Georgia, serif",
            fontSize: "2.75rem",
            fontWeight: 700,
            color: "#2D2D2D",
            marginBottom: "0.75rem",
            lineHeight: 1.2,
          }}>
            Privacy Policy
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
              1. Introduction
            </h2>
            <p style={{
              color: "#4f4f4f",
              lineHeight: 1.8,
              fontSize: "1rem",
            }}>
              CIMA AI ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy 
              explains how we collect, use, disclose, and safeguard your information when you use our 
              AI-powered legal intelligence platform.
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
              2. Information We Collect
            </h2>
            <h3 style={{
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "#2D2D2D",
              marginBottom: "0.75rem",
              marginTop: "1rem",
            }}>
              Personal Information
            </h3>
            <ul style={{
              listStyle: "none",
              padding: 0,
              margin: "0 0 1.5rem 0",
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
                Name and contact information (email, phone)
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
                Professional information (role, organization)
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
                Account credentials (encrypted passwords)
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
                Payment information (processed securely via third-party providers)
              </li>
            </ul>
            <h3 style={{
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "#2D2D2D",
              marginBottom: "0.75rem",
            }}>
              Usage Information
            </h3>
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
                Documents you upload for analysis and review
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
                Search queries and research activities
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
                Drafts and documents you create using our tools
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
                AI interactions and generated content
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
                Device information and IP address
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
              3. How We Use Your Information
            </h2>
            <p style={{
              color: "#4f4f4f",
              lineHeight: 1.8,
              fontSize: "1rem",
              marginBottom: "1rem",
            }}>
              We use your information to:
            </p>
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
                Provide and improve our AI-powered legal services
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
                Process and analyze legal documents you submit
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
                Generate insights, summaries, and recommendations
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
                Authenticate users and secure accounts
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
                Send important updates and service communications
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
                Comply with legal obligations
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
                Prevent fraud and ensure platform security
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
              4. Data Security
            </h2>
            <p style={{
              color: "#4f4f4f",
              lineHeight: 1.8,
              fontSize: "1rem",
              marginBottom: "1rem",
            }}>
              We implement industry-standard security measures to protect your information, including:
            </p>
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
                End-to-end encryption for data in transit
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
                Secure storage with access controls
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
                Regular security audits and penetration testing
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
                Compliance with Ghana Data Protection Act 2012
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
              5. AI and Machine Learning
            </h2>
            <p style={{
              color: "#4f4f4f",
              lineHeight: 1.8,
              fontSize: "1rem",
            }}>
              Our AI models may be trained on anonymized and aggregated data to improve service quality. 
              Your specific documents and conversations are not used to train public AI models. We maintain 
              strict separation between user data and model training processes.
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
              6. Data Retention
            </h2>
            <p style={{
              color: "#4f4f4f",
              lineHeight: 1.8,
              fontSize: "1rem",
            }}>
              We retain your information for as long as necessary to provide our services and comply with 
              legal obligations. You may request deletion of your account and associated data at any time, 
              subject to legal and regulatory requirements.
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
              7. Third-Party Services
            </h2>
            <p style={{
              color: "#4f4f4f",
              lineHeight: 1.8,
              fontSize: "1rem",
            }}>
              We may use third-party services for payment processing, analytics, and infrastructure. 
              These services have their own privacy policies, and we are not responsible for their practices. 
              We only share information necessary for these services to function.
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
              8. Your Rights
            </h2>
            <p style={{
              color: "#4f4f4f",
              lineHeight: 1.8,
              fontSize: "1rem",
              marginBottom: "1rem",
            }}>
              Under Ghana's Data Protection Act, you have the right to:
            </p>
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
                Access your personal data
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
                Request correction of inaccurate data
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
                Request deletion of your data
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
                Object to processing of your data
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
                Withdraw consent at any time
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
              9. Legal Documents and Confidentiality
            </h2>
            <p style={{
              color: "#4f4f4f",
              lineHeight: 1.8,
              fontSize: "1rem",
            }}>
              Legal documents you upload are treated with strict confidentiality. We do not share your 
              documents with third parties except as required by law or with your explicit consent. 
              Attorney-client privileged documents remain protected.
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
              10. Children's Privacy
            </h2>
            <p style={{
              color: "#4f4f4f",
              lineHeight: 1.8,
              fontSize: "1rem",
            }}>
              Our Service is not intended for children under 18. We do not knowingly collect personal 
              information from minors. If we become aware of such collection, we will take immediate steps 
              to delete it.
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
              11. International Data Transfers
            </h2>
            <p style={{
              color: "#4f4f4f",
              lineHeight: 1.8,
              fontSize: "1rem",
            }}>
              Your data may be transferred to and processed in countries other than Ghana. We ensure 
              appropriate safeguards are in place to protect your data in accordance with applicable 
              data protection laws.
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
              12. Changes to This Policy
            </h2>
            <p style={{
              color: "#4f4f4f",
              lineHeight: 1.8,
              fontSize: "1rem",
            }}>
              We may update this Privacy Policy from time to time. We will notify you of significant 
              changes by email or through our platform. Your continued use of the Service after such 
              changes constitutes acceptance of the updated policy.
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
              13. Contact Information
            </h2>
            <p style={{
              color: "#4f4f4f",
              lineHeight: 1.8,
              fontSize: "1rem",
              marginBottom: "1rem",
            }}>
              For questions about this Privacy Policy or to exercise your data rights, please contact us at:
            </p>
            <div style={{
              background: "rgba(139, 14, 30, 0.03)",
              padding: "1.25rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(139, 14, 30, 0.1)",
            }}>
              <p style={{
                color: "#4f4f4f",
                lineHeight: 1.8,
                fontSize: "1rem",
                margin: 0,
              }}>
                <strong style={{ color: "#2D2D2D" }}>Email:</strong> privacy@cimaafrica.com<br />
                <strong style={{ color: "#2D2D2D" }}>Address:</strong> Accra, Ghana
              </p>
            </div>
          </section>
        </div>

        {/* Bottom Navigation */}
        <div style={{ 
          marginTop: "3rem", 
          textAlign: "center",
          paddingTop: "2rem",
          borderTop: "2px solid rgba(139, 14, 30, 0.1)",
        }}>
          <Link to="/terms" style={{
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
            View Terms of Service →
          </Link>
        </div>
      </main>
    </div>
  );
}
