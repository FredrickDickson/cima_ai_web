import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Shield, Scale } from "lucide-react";
import { Link } from "react-router-dom";

export function Hero() {
  return (
    <section style={{
      position: "relative",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      background: "linear-gradient(135deg, #FDFBF7 0%, #ffffff 50%, #F8F6F0 100%)",
      paddingTop: "6rem",
    }}>
      {/* Background Pattern */}
      <div style={{
        position: "absolute",
        inset: 0,
        opacity: 0.3,
      }}>
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(139, 14, 30, 0.2) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(80px)",
        }}></div>
        <div style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(201, 169, 97, 0.2) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(80px)",
        }}></div>
      </div>
      
      {/* Floating Elements */}
      <div style={{ position: "absolute", top: "120px", left: "40px", opacity: 0.3 }} className="floating-scale-left">
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Scale style={{ width: "4rem", height: "4rem", color: "#8B0E1E" }} className="scale-icon" />
        </motion.div>
      </div>
      
      {/* Right side floating Scale - visible on all screens */}
      <div style={{ position: "absolute", top: "120px", right: "40px", opacity: 0.3 }} className="floating-scale-right">
        <motion.div
          animate={{
            y: [0, -25, 0],
            rotate: [0, -5, 0],
          }}
          transition={{
            duration: 6.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        >
          <Scale style={{ width: "4rem", height: "4rem", color: "#8B0E1E" }} className="scale-icon" />
        </motion.div>
      </div>
      
      <div style={{ position: "absolute", bottom: "120px", right: "80px", opacity: 0.2, display: "none" }} className="lg:block">
        <motion.div
          animate={{
            y: [0, 20, 0],
            rotate: [0, -5, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Shield style={{ width: "5rem", height: "5rem", color: "#C9A961" }} />
        </motion.div>
      </div>

      <div className="container-custom" style={{ position: "relative", zIndex: 1, paddingTop: "2rem", paddingBottom: "5rem" }}>
        <div style={{ maxWidth: "80rem", margin: "0 auto", textAlign: "center" }}>
          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              fontFamily: "Playfair Display, Georgia, serif",
              fontSize: "clamp(2.5rem, 8vw, 5rem)",
              fontWeight: 700,
              color: "#2D2D2D",
              marginBottom: "1.5rem",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            Legal Intelligence
            <br />
            <span className="gradient-text">
              Built for Modern Arbitration
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              fontSize: "clamp(1rem, 2vw, 1.25rem)",
              color: "#6d6d6d",
              marginBottom: "3rem",
              maxWidth: "48rem",
              margin: "0 auto 3rem",
              lineHeight: 1.6,
            }}
          >
            AI-powered research, analysis, and drafting for lawyers, arbitrators, and legal professionals worldwide. 
            Trusted by international law firms and ADR organizations.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "1rem",
              marginBottom: "4rem",
              width: "100%",
              maxWidth: "28rem",
              margin: "0 auto 4rem",
              padding: "0 1rem",
            }}
            className="sm:flex-row sm:max-w-none"
          >
            <Link to="/register" style={{ textDecoration: "none", width: "100%" }} className="sm:w-auto">
              <button style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                width: "100%",
                height: "3.5rem",
                padding: "0 2rem",
                fontSize: "1rem",
                fontWeight: 600,
                color: "white",
                background: "linear-gradient(135deg, #8B0E1E 0%, #751222 100%)",
                border: "none",
                borderRadius: "0.75rem",
                boxShadow: "0 8px 24px rgba(139, 14, 30, 0.25)",
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 12px 32px rgba(139, 14, 30, 0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(139, 14, 30, 0.25)";
              }}
              className="sm:w-auto">
                Get Started
                <ArrowRight style={{ width: "1.125rem", height: "1.125rem" }} />
              </button>
            </Link>
            <a href="#features" style={{ textDecoration: "none", width: "100%" }} className="sm:w-auto">
              <button style={{
                width: "100%",
                height: "3.5rem",
                padding: "0 2rem",
                fontSize: "1rem",
                fontWeight: 600,
                color: "#8B0E1E",
                background: "transparent",
                border: "2px solid #8B0E1E",
                borderRadius: "0.75rem",
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(139, 14, 30, 0.05)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.transform = "translateY(0)";
              }}
              className="sm:w-auto">
                Book a Demo
              </button>
            </a>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            style={{ position: "relative" }}
          >
            {/* Floating Cards */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              style={{
                position: "absolute",
                left: "-1rem",
                top: "25%",
                display: "none",
                zIndex: 10,
              }}
              className="lg:block"
            >
              <div style={{
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(20px)",
                borderRadius: "1rem",
                boxShadow: "0 12px 40px rgba(139, 14, 30, 0.15)",
                padding: "1rem",
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "0.5rem",
                    background: "linear-gradient(135deg, #10B981, #059669)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "1.25rem",
                    fontWeight: "bold",
                  }}>
                    ✓
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#6d6d6d", fontWeight: 500 }}>Research Complete</div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#2D2D2D" }}>127 cases analyzed</div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              style={{
                position: "absolute",
                right: "-1rem",
                top: "33%",
                display: "none",
                zIndex: 10,
              }}
              className="lg:block"
            >
              <div style={{
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(20px)",
                borderRadius: "1rem",
                boxShadow: "0 12px 40px rgba(139, 14, 30, 0.15)",
                padding: "1rem",
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "0.5rem",
                    background: "linear-gradient(135deg, #8B0E1E, #641120)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Sparkles style={{ width: "1.25rem", height: "1.25rem", color: "white" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#6d6d6d", fontWeight: 500 }}>AI Assistant</div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#2D2D2D" }}>Ready to help</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Main Dashboard - Replace SVG with styled div */}
            <div style={{
              position: "relative",
              borderRadius: "1.5rem",
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(139, 14, 30, 0.15)",
              border: "1px solid rgba(229, 231, 235, 0.5)",
              background: "white",
            }}>
              {/* Dashboard Content - Placeholder */}
              <div style={{
                aspectRatio: "16/10",
                background: "linear-gradient(135deg, #FDFBF7 0%, #f9fafb 100%)",
                padding: "2rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: "1rem",
              }}>
                <div style={{
                  fontFamily: "Playfair Display, Georgia, serif",
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: "#2D2D2D",
                  textAlign: "center",
                }}>
                  CIMA AI Dashboard
                </div>
                <div style={{
                  fontSize: "1.125rem",
                  color: "#6d6d6d",
                  textAlign: "center",
                  maxWidth: "32rem",
                }}>
                  Powerful AI tools for legal research, document review, and case analysis
                </div>
              </div>
            </div>

            {/* Glow Effect */}
            <div style={{
              position: "absolute",
              inset: "-2rem",
              background: "linear-gradient(135deg, rgba(139, 14, 30, 0.15), rgba(201, 169, 97, 0.15))",
              filter: "blur(60px)",
              zIndex: -1,
              opacity: 0.5,
              pointerEvents: "none",
            }}></div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
