import * as React from "react";
import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    quote: "CIMA AI has transformed how we approach international arbitration. The research capabilities are unmatched, and the time savings are remarkable.",
    author: "Sarah Chen",
    role: "Senior Partner",
    organization: "Global Law Partners",
    location: "London",
    rating: 5,
    avatar: "SC",
    color: "linear-gradient(135deg, #5A2633, #B49A67)",
    image: "https://i.pravatar.cc/150?img=5",
  },
  {
    quote: "The AI-powered document review caught critical clauses we might have missed. It's like having a senior associate working 24/7.",
    author: "Dr. Michael Osei",
    role: "Lead Arbitrator",
    organization: "CIMA",
    location: "Accra",
    rating: 5,
    avatar: "MO",
    color: "linear-gradient(135deg, #10B981, #059669)",
    image: "https://i.pravatar.cc/150?img=12",
  },
  {
    quote: "Outstanding platform for cross-border disputes. The international arbitration focus and legal library are exactly what we needed.",
    author: "Fatima Al-Rashid",
    role: "Head of Legal",
    organization: "Emirates Corporations",
    location: "Dubai",
    rating: 5,
    avatar: "FA",
    color: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
    image: "https://i.pravatar.cc/150?img=32",
  },
  {
    quote: "CIMA AI doesn't replace lawyers—it makes us better. The insights help us craft stronger arguments and win more cases.",
    author: "James Morrison",
    role: "Litigation Director",
    organization: "Morrison & Associates",
    location: "New York",
    rating: 5,
    avatar: "JM",
    color: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
    image: "https://i.pravatar.cc/150?img=33",
  },
  {
    quote: "The settlement support tools have helped us achieve better outcomes for clients. Data-driven recommendations backed by AI analysis.",
    author: "Maria Rodriguez",
    role: "Mediator & Arbitrator",
    organization: "Independent Practice",
    location: "Madrid",
    rating: 5,
    avatar: "MR",
    color: "linear-gradient(135deg, #F59E0B, #D97706)",
    image: "https://i.pravatar.cc/150?img=47",
  },
  {
    quote: "As a judge, I appreciate the thorough case analysis and precedent research. CIMA AI elevates the quality of legal work.",
    author: "Hon. David Thompson",
    role: "Retired Judge",
    organization: "International Court",
    location: "Geneva",
    rating: 5,
    avatar: "DT",
    color: "linear-gradient(135deg, #EC4899, #BE185D)",
    image: "https://i.pravatar.cc/150?img=60",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" style={{
      padding: "5rem 0",
      background: "linear-gradient(180deg, #F5F1E8 0%, #ffffff 50%, #F5F1E8 100%)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Ambient Background */}
      <div style={{
        position: "absolute",
        top: "20%",
        left: "-10%",
        width: "600px",
        height: "600px",
        background: "radial-gradient(circle, rgba(90, 38, 51, 0.04) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(60px)",
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
            background: "linear-gradient(135deg, rgba(180, 154, 103, 0.15), rgba(90, 38, 51, 0.1))",
            border: "1px solid rgba(180, 154, 103, 0.3)",
          }}>
            <Star style={{ width: "1rem", height: "1rem", color: "#B49A67", fill: "#B49A67" }} />
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#5A2633" }}>Testimonials</span>
          </div>
          <h2 style={{
            fontFamily: "Playfair Display, Georgia, serif",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            fontWeight: 700,
            color: "#252525",
            marginBottom: "1rem",
            lineHeight: 1.2,
          }}>
            Trusted by Legal Professionals
            <br />
            <span className="gradient-text">Worldwide</span>
          </h2>
          <p style={{ fontSize: "1.125rem", color: "#5f5f5f", maxWidth: "42rem", margin: "0 auto" }}>
            See how CIMA AI is transforming legal practice for arbitrators, lawyers, and judges globally
          </p>
        </motion.div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "2rem",
        }}>
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <div style={{
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(253, 251, 247, 0.9) 100%)",
                backdropFilter: "blur(20px)",
                borderRadius: "1.5rem",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                boxShadow: "0 8px 32px rgba(90, 38, 51, 0.08)",
                padding: "2rem",
                height: "100%",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
              }}>
                {/* Quote Icon Background */}
                <div style={{
                  position: "absolute",
                  top: "1.5rem",
                  right: "1.5rem",
                  opacity: 0.08,
                  pointerEvents: "none",
                }}>
                  <Quote style={{ width: "4rem", height: "4rem", color: "#5A2633" }} />
                </div>

                {/* Top Accent Bar */}
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background: "linear-gradient(90deg, #5A2633, #B49A67)",
                  opacity: 0,
                  transition: "opacity 0.4s",
                }} />

                {/* Rating Stars */}
                <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.5rem", position: "relative", zIndex: 1 }}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} style={{ width: "1.125rem", height: "1.125rem", color: "#B49A67", fill: "#B49A67" }} />
                  ))}
                </div>

                {/* Quote */}
                <blockquote style={{
                  fontSize: "1rem",
                  color: "#252525",
                  lineHeight: 1.7,
                  marginBottom: "1.5rem",
                  position: "relative",
                  zIndex: 1,
                  flex: 1,
                  fontStyle: "italic",
                }}>
                  "{testimonial.quote}"
                </blockquote>

                {/* Author Section */}
                <div style={{
                  paddingTop: "1.5rem",
                  borderTop: "1px solid rgba(229, 231, 235, 0.5)",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  position: "relative",
                  zIndex: 1,
                }}>
                  {/* Avatar with actual image */}
                  <div style={{
                    width: "3.5rem",
                    height: "3.5rem",
                    borderRadius: "50%",
                    flexShrink: 0,
                    overflow: "hidden",
                    boxShadow: "0 4px 12px rgba(90, 38, 51, 0.2)",
                    border: "2px solid rgba(255, 255, 255, 0.3)",
                    position: "relative",
                  }}>
                    <img 
                      src={testimonial.image}
                      alt={testimonial.author}
                      loading="lazy"
                      style={{ 
                        width: "100%", 
                        height: "100%", 
                        objectFit: "cover" 
                      }}
                    />
                  </div>

                  {/* Author Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 700,
                      color: "#252525",
                      fontSize: "1rem",
                      marginBottom: "0.25rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {testimonial.author}
                    </div>
                    <div style={{
                      fontSize: "0.875rem",
                      color: "#5f5f5f",
                      marginBottom: "0.125rem",
                    }}>
                      {testimonial.role}
                    </div>
                    <div style={{
                      fontSize: "0.875rem",
                      color: "#5A2633",
                      fontWeight: 600,
                      marginBottom: "0.25rem",
                    }}>
                      {testimonial.organization}
                    </div>
                    <div style={{
                      fontSize: "0.75rem",
                      color: "#888888",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}>
                      <span style={{
                        display: "inline-block",
                        width: "0.25rem",
                        height: "0.25rem",
                        borderRadius: "50%",
                        background: "#B49A67",
                      }}></span>
                      {testimonial.location}
                    </div>
                  </div>
                </div>

                {/* Ambient Glow on Hover */}
                <div style={{
                  position: "absolute",
                  bottom: "-50%",
                  left: "-50%",
                  width: "200px",
                  height: "200px",
                  background: "radial-gradient(circle, rgba(180, 154, 103, 0.15) 0%, transparent 70%)",
                  borderRadius: "50%",
                  opacity: 0,
                  transition: "opacity 0.4s",
                  pointerEvents: "none",
                }} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{
            textAlign: "center",
            marginTop: "4rem",
          }}
        >
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "1rem 2rem",
            borderRadius: "9999px",
            background: "linear-gradient(135deg, rgba(90, 38, 51, 0.05), rgba(180, 154, 103, 0.05))",
            border: "1px solid rgba(90, 38, 51, 0.15)",
          }}>
            <div style={{
              display: "flex",
              marginLeft: "-0.5rem",
            }}>
              {testimonials.slice(0, 4).map((t, i) => (
                <div key={i} style={{
                  width: "2rem",
                  height: "2rem",
                  borderRadius: "50%",
                  border: "2px solid white",
                  marginLeft: i > 0 ? "-0.5rem" : 0,
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                  overflow: "hidden",
                  position: "relative",
                }}>
                  <img 
                    src={t.image}
                    alt={t.author}
                    loading="lazy"
                    style={{ 
                      width: "100%", 
                      height: "100%", 
                      objectFit: "cover" 
                    }}
                  />
                </div>
              ))}
            </div>
            <span style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#252525" }}>
              Join 500+ legal professionals using CIMA AI
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
