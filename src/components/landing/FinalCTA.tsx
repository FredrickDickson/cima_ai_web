import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap, Shield, TrendingUp } from "lucide-react";

export function FinalCTA() {
  return (
    <section style={{
      padding: "6rem 0",
      background: "linear-gradient(180deg, #F5F1E8 0%, #ffffff 50%, #F5F1E8 100%)",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute",
        top: "10%",
        left: "5%",
        width: "600px",
        height: "600px",
        background: "radial-gradient(circle, rgba(180, 154, 103, 0.1) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(80px)",
        animation: "pulse-slow 6s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute",
        bottom: "10%",
        right: "5%",
        width: "700px",
        height: "700px",
        background: "radial-gradient(circle, rgba(90, 38, 51, 0.08) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(100px)",
        animation: "pulse-slow 8s ease-in-out infinite",
      }} />

      <motion.div
        animate={{
          y: [0, -20, 0],
          rotate: [0, 10, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          top: "15%",
          right: "10%",
          opacity: 0.1,
        }}
      >
        <Zap style={{ width: "6rem", height: "6rem" }} />
      </motion.div>

      <motion.div
        animate={{
          y: [0, 20, 0],
          rotate: [0, -10, 0],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          bottom: "15%",
          left: "8%",
          opacity: 0.1,
        }}
      >
        <Shield style={{ width: "5rem", height: "5rem" }} />
      </motion.div>

      <div className="container-custom" style={{ position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ maxWidth: "56rem", margin: "0 auto", textAlign: "center" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "2rem",
              padding: "0.75rem 1.5rem",
              borderRadius: "9999px",
              background: "linear-gradient(135deg, rgba(180, 154, 103, 0.15), rgba(90, 38, 51, 0.1))",
              border: "1px solid rgba(180, 154, 103, 0.3)",
            }}
          >
            <Zap style={{ width: "1.25rem", height: "1.25rem", color: "#5A2633", fill: "#5A2633" }} />
            <span style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#5A2633" }}>
              Ready to Transform Your Legal Practice?
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              fontFamily: "Playfair Display, Georgia, serif",
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              fontWeight: 700,
              color: "#252525",
              marginBottom: "1.5rem",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            Experience AI Designed for
            <br />
            <span className="gradient-text">
              Legal Professionals
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{
              fontSize: "clamp(1.125rem, 2vw, 1.375rem)",
              color: "#5f5f5f",
              marginBottom: "3rem",
              lineHeight: 1.6,
            }}
          >
            Join leading law firms, arbitrators, and legal teams using CIMA AI to work faster, smarter, and more effectively.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "1rem",
              marginBottom: "4rem",
            }}
            className="sm:flex-row"
          >
            <a href="#demo" style={{ textDecoration: "none" }}>
              <button style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                height: "4rem",
                padding: "0 2.5rem",
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "white",
                background: "linear-gradient(135deg, #5A2633, #4a1f2a)",
                border: "none",
                borderRadius: "0.75rem",
                boxShadow: "0 8px 32px rgba(180, 154, 103, 0.4)",
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px) scale(1.02)";
                e.currentTarget.style.boxShadow = "0 16px 48px rgba(180, 154, 103, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(180, 154, 103, 0.4)";
              }}>
                Start Now
                <ArrowRight style={{ width: "1.25rem", height: "1.25rem" }} />
              </button>
            </a>
            <a href="#contact" style={{ textDecoration: "none" }}>
              <button style={{
                height: "4rem",
                padding: "0 2.5rem",
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "#5A2633",
                background: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(20px)",
                border: "2px solid #5A2633",
                borderRadius: "0.75rem",
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(90, 38, 51, 0.05)";
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
                e.currentTarget.style.transform = "translateY(0)";
              }}>
                Book Demo
              </button>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{
              paddingTop: "3rem",
              borderTop: "1px solid rgba(229, 231, 235, 0.5)",
            }}
          >
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "2rem",
            }}>
              {[
                { label: "Legal Professionals", value: "500+", icon: TrendingUp },
                { label: "Cases Analyzed", value: "10K+", icon: Sparkles },
                { label: "Countries", value: "50+", icon: Shield },
                { label: "Satisfaction Rate", value: "98%", icon: Zap },
              ].map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                    style={{
                      background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(253, 251, 247, 0.9) 100%)",
                      backdropFilter: "blur(20px)",
                      borderRadius: "1rem",
                      padding: "1.5rem 1rem",
                      border: "1px solid rgba(229, 231, 235, 0.5)",
                      boxShadow: "0 4px 24px rgba(90, 38, 51, 0.08)",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      cursor: "pointer",
                    }}
                    whileHover={{
                      y: -4,
                      boxShadow: "0 8px 32px rgba(90, 38, 51, 0.12)",
                    }}
                  >
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "0.75rem",
                    }}>
                      <div style={{
                        width: "2.5rem",
                        height: "2.5rem",
                        borderRadius: "0.5rem",
                        background: "linear-gradient(135deg, #5A2633, #4a1f2a)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        <Icon style={{ width: "1.25rem", height: "1.25rem", color: "white" }} />
                      </div>
                    </div>
                    <div style={{
                      fontSize: "clamp(2rem, 4vw, 2.5rem)",
                      fontFamily: "Playfair Display, Georgia, serif",
                      fontWeight: 700,
                      color: "#5A2633",
                      marginBottom: "0.5rem",
                      lineHeight: 1,
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
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
