import * as React from "react";
import { motion } from "framer-motion";
import { Upload, Cpu, Lightbulb, UserCheck, TrendingUp, ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Upload Documents",
    description: "Securely upload case documents, contracts, evidence, and legal materials to the platform.",
    color: "#3B82F6",
  },
  {
    number: "02",
    icon: Cpu,
    title: "AI Analysis",
    description: "Our advanced AI processes and analyzes your documents, identifying key issues and relevant precedents.",
    color: "#8B5CF6",
  },
  {
    number: "03",
    icon: Lightbulb,
    title: "Generate Insights",
    description: "Receive comprehensive legal insights, research summaries, and strategic recommendations.",
    color: "#F59E0B",
  },
  {
    number: "04",
    icon: UserCheck,
    title: "Human Review",
    description: "Legal professionals review, refine, and validate AI-generated outputs with expert judgment.",
    color: "#10B981",
  },
  {
    number: "05",
    icon: TrendingUp,
    title: "Better Decisions",
    description: "Make informed legal decisions faster with AI-augmented research and analysis.",
    color: "#5A2633",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" style={{
      padding: "5rem 0",
      background: "#ffffff",
      position: "relative",
    }}>
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: "5rem" }}
        >
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
            padding: "0.5rem 1rem",
            borderRadius: "9999px",
            background: "linear-gradient(135deg, rgba(90, 38, 51, 0.1), rgba(180, 154, 103, 0.1))",
            border: "1px solid rgba(90, 38, 51, 0.2)",
          }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#5A2633" }}>Simple Process</span>
          </div>
          <h2 style={{
            fontFamily: "Playfair Display, Georgia, serif",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            fontWeight: 700,
            color: "#252525",
            marginBottom: "1rem",
            lineHeight: 1.2,
          }}>
            How CIMA AI Works
          </h2>
          <p style={{ fontSize: "1.125rem", color: "#5f5f5f", maxWidth: "42rem", margin: "0 auto" }}>
            A streamlined workflow that combines AI efficiency with human expertise
          </p>
        </motion.div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "2rem",
          maxWidth: "80rem",
          margin: "0 auto",
          position: "relative",
        }}>
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                style={{ position: "relative" }}
              >
                {index < steps.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                    style={{
                      position: "absolute",
                      top: "3.5rem",
                      right: "-1rem",
                      display: "none",
                      zIndex: 1,
                    }}
                    className="lg:block"
                  >
                    <ArrowRight style={{ width: "1.5rem", height: "1.5rem", color: "#B49A67" }} />
                  </motion.div>
                )}

                <div style={{
                  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(253, 251, 247, 0.9) 100%)",
                  backdropFilter: "blur(20px)",
                  borderRadius: "1.5rem",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  boxShadow: "0 8px 32px rgba(90, 38, 51, 0.08)",
                  padding: "2rem",
                  textAlign: "center",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  position: "relative",
                  overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute",
                    top: "1rem",
                    right: "1rem",
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #B49A67, #a98543)",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(180, 154, 103, 0.3)",
                  }}>
                    {index + 1}
                  </div>

                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "4rem",
                    height: "4rem",
                    borderRadius: "1.25rem",
                    background: "linear-gradient(135deg, #5A2633 0%, #4a1f2a 100%)",
                    color: "white",
                    marginBottom: "1.5rem",
                    boxShadow: "0 8px 24px rgba(90, 38, 51, 0.25)",
                    position: "relative",
                  }}>
                    <Icon style={{ width: "2rem", height: "2rem" }} />
                  </div>

                  <h3 style={{
                    fontFamily: "Playfair Display, Georgia, serif",
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "#252525",
                    marginBottom: "0.75rem",
                  }}>
                    {step.title}
                  </h3>
                  <p style={{
                    color: "#5f5f5f",
                    lineHeight: 1.7,
                    fontSize: "0.875rem",
                  }}>
                    {step.description}
                  </p>

                  <div style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "4px",
                    background: `linear-gradient(90deg, ${step.color}, ${step.color}80)`,
                    opacity: 0.7,
                    borderBottomLeftRadius: "1.5rem",
                    borderBottomRightRadius: "1.5rem",
                  }} />
                </div>
              </motion.div>
            );
          })}
        </div>

        <div style={{
          display: "block",
          textAlign: "center",
          marginTop: "2rem",
        }} className="lg:hidden">
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "9999px",
            background: "rgba(90, 38, 51, 0.05)",
            color: "#5A2633",
            fontSize: "0.875rem",
            fontWeight: 600,
          }}>
            Seamless workflow from start to finish
          </div>
        </div>
      </div>
    </section>
  );
}
