import * as React from "react";
import { motion } from "framer-motion";
import {
  Search,
  FileText,
  PenTool,
  Bot,
  FolderKanban,
  ScanEye,
  Library,
  FileCheck,
  Handshake,
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: "AI Legal Research",
    description: "Access comprehensive case law, statutes, and legal precedents with intelligent AI-powered search and analysis.",
    gradient: "from-blue-500 to-indigo-600",
    image: "https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=400&h=250&fit=crop&q=80",
  },
  {
    icon: FileText,
    title: "Document Review",
    description: "Automated document analysis and review with precision highlighting of key clauses, risks, and obligations.",
    gradient: "from-purple-500 to-pink-600",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=250&fit=crop&q=80",
  },
  {
    icon: PenTool,
    title: "Drafting Studio",
    description: "Generate legal documents, pleadings, and memoranda with AI assistance while maintaining your professional voice.",
    gradient: "from-amber-500 to-orange-600",
    image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&h=250&fit=crop&q=80",
  },
  {
    icon: Bot,
    title: "AI Assistant",
    description: "24/7 intelligent legal assistant trained on international arbitration law and best practices.",
    gradient: "from-green-500 to-emerald-600",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=250&fit=crop&q=80",
  },
  {
    icon: FolderKanban,
    title: "Case Management",
    description: "Organize cases, track deadlines, manage evidence, and collaborate seamlessly with your team.",
    gradient: "from-cyan-500 to-blue-600",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=250&fit=crop&q=80",
  },
  {
    icon: ScanEye,
    title: "Evidence Analysis",
    description: "AI-powered analysis of evidence relevance, credibility assessment, and timeline reconstruction.",
    gradient: "from-rose-500 to-red-600",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop&q=80",
  },
  {
    icon: Library,
    title: "Legal Library",
    description: "Curated repository of international arbitration resources, treaties, and institutional rules.",
    gradient: "from-violet-500 to-purple-600",
    image: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=400&h=250&fit=crop&q=80",
  },
  {
    icon: FileCheck,
    title: "Contract Review",
    description: "Intelligent contract analysis identifying risks, obligations, and non-standard clauses automatically.",
    gradient: "from-teal-500 to-cyan-600",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=250&fit=crop&q=80",
  },
  {
    icon: Handshake,
    title: "Settlement Support",
    description: "Data-driven settlement recommendations and mediation support tools for optimal outcomes.",
    gradient: "from-fuchsia-500 to-pink-600",
    image: "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=400&h=250&fit=crop&q=80",
  },
];

export function Features() {
  return (
    <section id="features" style={{
      padding: "5rem 0",
      background: "linear-gradient(180deg, #FDFBF7 0%, #ffffff 50%, #F8F6F0 100%)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Ambient Background */}
      <div style={{
        position: "absolute",
        top: "-50%",
        right: "-20%",
        width: "800px",
        height: "800px",
        background: "radial-gradient(circle, rgba(139, 14, 30, 0.03) 0%, transparent 70%)",
        borderRadius: "50%",
        pointerEvents: "none",
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
            background: "linear-gradient(135deg, rgba(201, 169, 97, 0.15), rgba(139, 14, 30, 0.1))",
            border: "1px solid rgba(201, 169, 97, 0.3)",
          }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#8B0E1E" }}>Comprehensive Platform</span>
          </div>
          <h2 style={{
            fontFamily: "Playfair Display, Georgia, serif",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            fontWeight: 700,
            color: "#2D2D2D",
            marginBottom: "1rem",
            lineHeight: 1.2,
          }}>
            Everything You Need for
            <br />
            <span className="gradient-text">Modern Legal Practice</span>
          </h2>
          <p style={{ fontSize: "1.125rem", color: "#6d6d6d", maxWidth: "42rem", margin: "0 auto" }}>
            A complete suite of AI-powered tools designed specifically for international arbitration and dispute resolution.
          </p>
        </motion.div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "2rem",
        }}>
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                whileHover={{ y: -12, scale: 1.02 }}
              >
                <div style={{
                  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(253, 251, 247, 0.9) 100%)",
                  backdropFilter: "blur(20px)",
                  borderRadius: "1.5rem",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  boxShadow: "0 8px 32px rgba(139, 14, 30, 0.08)",
                  height: "100%",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  position: "relative",
                  overflow: "hidden",
                  cursor: "pointer",
                }}>
                  {/* Gradient Bar on Hover */}
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "4px",
                    background: "linear-gradient(90deg, #8B0E1E, #C9A961)",
                    opacity: 0,
                    transition: "opacity 0.4s",
                  }} />

                  {/* Image */}
                  <div style={{
                    position: "relative",
                    width: "100%",
                    height: "180px",
                    overflow: "hidden",
                  }}>
                    <img
                      src={feature.image}
                      alt={feature.title}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    {/* Gradient Overlay */}
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 100%)",
                    }} />
                    {/* Icon Badge */}
                    <div style={{
                      position: "absolute",
                      bottom: "1rem",
                      left: "1rem",
                      width: "3rem",
                      height: "3rem",
                      borderRadius: "0.75rem",
                      background: "rgba(255, 255, 255, 0.95)",
                      backdropFilter: "blur(10px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
                    }}>
                      <Icon style={{ width: "1.5rem", height: "1.5rem", color: "#8B0E1E" }} />
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding: "1.5rem" }}>
                    <h3 style={{
                      fontFamily: "Playfair Display, Georgia, serif",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "#2D2D2D",
                      marginBottom: "0.75rem",
                      transition: "color 0.3s",
                    }}>
                      {feature.title}
                    </h3>
                    <p style={{
                      color: "#6d6d6d",
                      lineHeight: 1.7,
                      fontSize: "0.9375rem",
                    }}>
                      {feature.description}
                    </p>
                  </div>

                  {/* Ambient Glow */}
                  <div style={{
                    position: "absolute",
                    bottom: "-50%",
                    right: "-50%",
                    width: "200px",
                    height: "200px",
                    background: "radial-gradient(circle, rgba(201, 169, 97, 0.1) 0%, transparent 70%)",
                    borderRadius: "50%",
                    opacity: 0,
                    transition: "opacity 0.4s",
                    pointerEvents: "none",
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
