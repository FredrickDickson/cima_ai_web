import * as React from "react";
import { motion } from "framer-motion";
import { MapPin, Building2, Scale, Users } from "lucide-react";

const locations = [
  { city: "London", country: "United Kingdom", icon: MapPin },
  { city: "Accra", country: "Ghana", icon: MapPin },
  { city: "Dubai", country: "United Arab Emirates", icon: MapPin },
];

const trustedBy = [
  { 
    name: "International Law Firms", 
    icon: Building2, 
    count: "50+",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop&q=80"
  },
  { 
    name: "Arbitration Professionals", 
    icon: Scale, 
    count: "500+",
    image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=400&h=300&fit=crop&q=80"
  },
  { 
    name: "Corporate Legal Teams", 
    icon: Users, 
    count: "100+",
    image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&h=300&fit=crop&q=80"
  },
];

export function TrustedBy() {
  return (
    <section id="trusted-by" style={{
      padding: "5rem 0",
      background: "linear-gradient(180deg, #ffffff 0%, #FDFBF7 100%)",
      borderTop: "1px solid rgba(229, 231, 235, 0.5)",
      borderBottom: "1px solid rgba(229, 231, 235, 0.5)",
    }}>
      <div className="container-custom">
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
            background: "linear-gradient(135deg, rgba(139, 14, 30, 0.1), rgba(201, 169, 97, 0.1))",
            border: "1px solid rgba(139, 14, 30, 0.2)",
          }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#8B0E1E" }}>Global Presence</span>
          </div>
          <h2 style={{
            fontFamily: "Playfair Display, Georgia, serif",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            fontWeight: 700,
            color: "#2D2D2D",
            marginBottom: "1rem",
            lineHeight: 1.2,
          }}>
            Trusted Across Three Continents
          </h2>
          <p style={{ fontSize: "1.125rem", color: "#6d6d6d", maxWidth: "42rem", margin: "0 auto" }}>
            Serving legal professionals in leading international arbitration centers
          </p>
        </motion.div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.5rem",
          marginBottom: "5rem",
        }}>
          {locations.map((location, index) => (
            <motion.div
              key={location.city}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              style={{ position: "relative" }}
            >
              <div style={{
                background: "linear-gradient(135deg, #ffffff 0%, #fefdfb 100%)",
                borderRadius: "1.5rem",
                border: "1px solid rgba(229, 231, 235, 0.5)",
                boxShadow: "0 4px 24px rgba(139, 14, 30, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.8) inset",
                padding: "2rem",
                textAlign: "center",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                cursor: "pointer",
                overflow: "hidden",
                position: "relative",
              }}>
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "3px",
                  background: "linear-gradient(90deg, transparent, #C9A961, transparent)",
                  opacity: 0,
                  transition: "opacity 0.4s",
                }} />
                
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "4rem",
                  height: "4rem",
                  borderRadius: "1rem",
                  background: "linear-gradient(135deg, #8B0E1E 0%, #751222 100%)",
                  color: "white",
                  marginBottom: "1.5rem",
                  boxShadow: "0 8px 24px rgba(139, 14, 30, 0.2)",
                }}>
                  <MapPin style={{ width: "2rem", height: "2rem" }} />
                </div>
                <h3 style={{
                  fontFamily: "Playfair Display, Georgia, serif",
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#2D2D2D",
                  marginBottom: "0.5rem",
                }}>
                  {location.city}
                </h3>
                <p style={{ color: "#6d6d6d", fontWeight: 500, fontSize: "0.9375rem" }}>
                  {location.country}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "2rem",
        }}>
          {trustedBy.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                <div style={{
                  borderRadius: "1.5rem",
                  background: "linear-gradient(135deg, #ffffff 0%, #fefdfb 100%)",
                  border: "1px solid rgba(229, 231, 235, 0.5)",
                  overflow: "hidden",
                  boxShadow: "0 4px 24px rgba(139, 14, 30, 0.06)",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                }}>
                  <div style={{
                    position: "relative",
                    width: "100%",
                    height: "200px",
                    overflow: "hidden",
                  }}>
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)",
                    }} />
                    <div style={{
                      position: "absolute",
                      top: "1rem",
                      left: "1rem",
                      width: "3rem",
                      height: "3rem",
                      borderRadius: "0.75rem",
                      background: "rgba(255, 255, 255, 0.95)",
                      backdropFilter: "blur(10px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
                    }}>
                      <Icon style={{ width: "1.5rem", height: "1.5rem", color: "#8B0E1E" }} />
                    </div>
                  </div>
                  
                  <div style={{ padding: "1.5rem" }}>
                    <div style={{
                      fontSize: "2.5rem",
                      fontFamily: "Playfair Display, Georgia, serif",
                      fontWeight: 700,
                      color: "#8B0E1E",
                      marginBottom: "0.5rem",
                      lineHeight: 1,
                    }}>
                      {item.count}
                    </div>
                    <div style={{ 
                      fontSize: "1rem", 
                      fontWeight: 600, 
                      color: "#2D2D2D",
                      lineHeight: 1.4,
                    }}>
                      {item.name}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
