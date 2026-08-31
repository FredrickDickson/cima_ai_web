import * as React from "react";
import { motion } from "framer-motion";
import {
  Clock,
  TrendingDown,
  Zap,
  ShieldCheck,
  Globe,
  Brain,
  Users,
  Award,
} from "lucide-react";

const benefits = [
  {
    icon: Clock,
    title: "Save Time",
    description: "Reduce research time by up to 70% with AI-powered legal intelligence and smart automation.",
    stat: "70%",
    label: "Time Saved",
  },
  {
    icon: TrendingDown,
    title: "Reduce Costs",
    description: "Lower operational costs through automation, efficient workflows, and reduced manual work.",
    stat: "45%",
    label: "Cost Reduction",
  },
  {
    icon: Zap,
    title: "Boost Productivity",
    description: "Handle more cases with intelligent automation, AI assistance, and streamlined processes.",
    stat: "3x",
    label: "Faster Drafting",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Security",
    description: "Bank-grade encryption, SOC 2 compliance, and comprehensive data privacy protection.",
    stat: "100%",
    label: "Secure",
  },
];

export function WhyCima() {
  return (
    <section id="why-cima" style={{
      padding: "5rem 0",
      background: "linear-gradient(180deg, #F5F1E8 0%, #ffffff 50%, #F5F1E8 100%)",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute",
        top: "10%",
        left: "10%",
        width: "500px",
        height: "500px",
        background: "radial-gradient(circle, rgba(180, 154, 103, 0.08) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(60px)",
        animation: "pulse-slow 4s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute",
        bottom: "10%",
        right: "10%",
        width: "600px",
        height: "600px",
        background: "radial-gradient(circle, rgba(90, 38, 51, 0.08) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(80px)",
        animation: "pulse-slow 5s ease-in-out infinite",
      }} />

      <div className="container-custom" style={{ position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: "4rem" }}
        >
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
            padding: "0.5rem 1rem",
            borderRadius: "9999px",
            background: "linear-gradient(135deg, rgba(180, 154, 103, 0.15), rgba(90, 38, 51, 0.1))",
            border: "1px solid rgba(180, 154, 103, 0.3)",
          }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#5A2633" }}>Why Choose CIMA AI</span>
          </div>
          <h2 style={{
            fontFamily: "Playfair Display, Georgia, serif",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            fontWeight: 700,
            color: "#252525",
            marginBottom: "1rem",
            lineHeight: 1.2,
          }}>
            Built for Legal Excellence
          </h2>
          <p style={{ fontSize: "1.125rem", color: "#5f5f5f", maxWidth: "42rem", margin: "0 auto" }}>
            Trusted by international law firms, arbitrators, and legal professionals worldwide
          </p>
        </motion.div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "2rem",
          maxWidth: "72rem",
          margin: "0 auto",
        }}>
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                whileHover={{ y: -8, scale: 1.03 }}
              >
                <div style={{
                  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(253, 251, 247, 0.85) 100%)",
                  backdropFilter: "blur(20px)",
                  borderRadius: "1.5rem",
                  border: "1px solid rgba(229, 231, 235, 0.5)",
                  boxShadow: "0 4px 24px rgba(90, 38, 51, 0.08)",
                  padding: "2rem",
                  height: "100%",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  position: "relative",
                  overflow: "hidden",
                  cursor: "pointer",
                }}>
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(135deg, rgba(180, 154, 103, 0.1), rgba(90, 38, 51, 0.1))",
                    opacity: 0,
                    transition: "opacity 0.4s",
                    pointerEvents: "none",
                  }} />

                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "3.5rem",
                      height: "3.5rem",
                      borderRadius: "1rem",
                      background: "linear-gradient(135deg, #5A2633, #4a1f2a)",
                      color: "white",
                      marginBottom: "1rem",
                      boxShadow: "0 8px 24px rgba(180, 154, 103, 0.3)",
                      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}>
                      <Icon style={{ width: "1.75rem", height: "1.75rem" }} />
                    </div>

                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{
                        fontSize: "2.5rem",
                        fontFamily: "Playfair Display, Georgia, serif",
                        fontWeight: 700,
                        color: "#5A2633",
                        marginBottom: "0.25rem",
                        lineHeight: 1,
                      }}>
                        {benefit.stat}
                      </div>
                      <div style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#5f5f5f",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}>
                        {benefit.label}
                      </div>
                    </div>

                    <h3 style={{
                      fontFamily: "Playfair Display, Georgia, serif",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "#252525",
                      marginBottom: "0.75rem",
                      transition: "color 0.3s",
                    }}>
                      {benefit.title}
                    </h3>
                    <p style={{
                      color: "#5f5f5f",
                      lineHeight: 1.7,
                      fontSize: "0.875rem",
                    }}>
                      {benefit.description}
                    </p>
                  </div>

                  <div style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: "linear-gradient(90deg, #B49A67, #5A2633)",
                    opacity: 0,
                    transition: "opacity 0.4s",
                  }} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
