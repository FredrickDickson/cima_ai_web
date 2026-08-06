import * as React from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin, ArrowUpRight, Phone } from "lucide-react";

// Custom LinkedIn Icon Component
const LinkedinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
    <rect x="2" y="9" width="4" height="12"></rect>
    <circle cx="4" cy="4" r="2"></circle>
  </svg>
);

// Custom Facebook Icon Component
const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

const footerLinks = {
  company: [
    { name: "About CIMA", href: "#about" },
    { name: "Our Mission", href: "#mission" },
    { name: "Leadership", href: "#leadership" },
    { name: "Careers", href: "#careers" },
    { name: "Press", href: "#press" },
  ],
  solutions: [
    { name: "For Law Firms", href: "#law-firms" },
    { name: "For Arbitrators", href: "#arbitrators" },
    { name: "For Corporations", href: "#corporations" },
    { name: "For Universities", href: "#universities" },
    { name: "Enterprise", href: "#enterprise" },
  ],
  resources: [
    { name: "Documentation", href: "#docs" },
    { name: "Case Studies", href: "#case-studies" },
    { name: "Blog", href: "#blog" },
    { name: "Webinars", href: "#webinars" },
  ],
  legal: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
    { name: "Compliance", href: "#compliance" },
    { name: "Cookie Policy", href: "#cookies" },
  ],
};

const offices = [
  { 
    city: "London", 
    address: "123 Legal District, London EC4A 1AA, UK",
    phone: "+44 20 1234 5678",
    email: "london@cima-ai.org"
  },
  { 
    city: "Accra", 
    address: "456 Independence Avenue, Accra, Ghana",
    phone: "+233 30 123 4567",
    email: "accra@cima-ai.org"
  },
  { 
    city: "Dubai", 
    address: "789 Business Bay, Dubai, UAE",
    phone: "+971 4 123 4567",
    email: "dubai@cima-ai.org"
  },
];

export function Footer() {
  return (
    <footer id="footer" style={{
      background: "linear-gradient(180deg, #2D2D2D 0%, #1a1a1a 100%)",
      color: "rgba(255, 255, 255, 0.8)",
      borderTop: "1px solid rgba(255, 255, 255, 0.1)",
      position: "relative",
    }}>
      {/* Main Footer Content */}
      <div className="container-custom" style={{ paddingTop: "5rem", paddingBottom: "3rem" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "3rem",
          marginBottom: "4rem",
        }}>
          {/* Brand Column */}
          <div style={{ gridColumn: "1 / -1", maxWidth: "500px" }}>
            <Link to="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none", marginBottom: "1.5rem" }}>
              <div style={{
                position: "relative",
                width: "3rem",
                height: "3rem",
                borderRadius: "0.75rem",
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
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "white",
                }}>
                  CIMA AI
                </span>
                <span style={{
                  fontSize: "0.8125rem",
                  color: "rgba(255, 255, 255, 0.5)",
                  marginTop: "-0.25rem",
                }}>
                  Legal Intelligence Platform
                </span>
              </div>
            </Link>
            <p style={{
              color: "rgba(255, 255, 255, 0.6)",
              lineHeight: 1.7,
              marginBottom: "1.5rem",
              fontSize: "0.9375rem",
            }}>
              AI-powered legal intelligence for international arbitration. Trusted by legal professionals worldwide.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <a
                href="https://linkedin.com/company/cima"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  borderRadius: "0.5rem",
                  background: "rgba(255, 255, 255, 0.05)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.3s",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(139, 14, 30, 0.2)";
                  e.currentTarget.style.borderColor = "rgba(139, 14, 30, 0.4)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                aria-label="LinkedIn"
              >
                <LinkedinIcon />
              </a>
              <a
                href="https://facebook.com/cima"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  borderRadius: "0.5rem",
                  background: "rgba(255, 255, 255, 0.05)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.3s",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(139, 14, 30, 0.2)";
                  e.currentTarget.style.borderColor = "rgba(139, 14, 30, 0.4)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                aria-label="Facebook"
              >
                <FacebookIcon />
              </a>
              <a
                href="mailto:info@cima-ai.org"
                style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  borderRadius: "0.5rem",
                  background: "rgba(255, 255, 255, 0.05)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.3s",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(139, 14, 30, 0.2)";
                  e.currentTarget.style.borderColor = "rgba(139, 14, 30, 0.4)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                aria-label="Email"
              >
                <Mail style={{ width: "1.125rem", height: "1.125rem", color: "rgba(255, 255, 255, 0.7)" }} />
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h3 style={{
              fontWeight: 700,
              color: "white",
              marginBottom: "1.25rem",
              fontSize: "0.9375rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>
              Company
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    style={{
                      color: "rgba(255, 255, 255, 0.6)",
                      textDecoration: "none",
                      fontSize: "0.9375rem",
                      transition: "all 0.3s",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#C9A961";
                      e.currentTarget.style.transform = "translateX(4px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)";
                      e.currentTarget.style.transform = "translateX(0)";
                    }}
                  >
                    {link.name}
                    <ArrowUpRight style={{ width: "0.875rem", height: "0.875rem", opacity: 0 }} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 style={{
              fontWeight: 700,
              color: "white",
              marginBottom: "1.25rem",
              fontSize: "0.9375rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>
              Solutions
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {footerLinks.solutions.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    style={{
                      color: "rgba(255, 255, 255, 0.6)",
                      textDecoration: "none",
                      fontSize: "0.9375rem",
                      transition: "all 0.3s",
                      display: "inline-block",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#C9A961";
                      e.currentTarget.style.transform = "translateX(4px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)";
                      e.currentTarget.style.transform = "translateX(0)";
                    }}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 style={{
              fontWeight: 700,
              color: "white",
              marginBottom: "1.25rem",
              fontSize: "0.9375rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>
              Resources
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    style={{
                      color: "rgba(255, 255, 255, 0.6)",
                      textDecoration: "none",
                      fontSize: "0.9375rem",
                      transition: "all 0.3s",
                      display: "inline-block",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#C9A961";
                      e.currentTarget.style.transform = "translateX(4px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "rgba(255, 255, 255, 0.6)";
                      e.currentTarget.style.transform = "translateX(0)";
                    }}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Offices Section */}
        <div style={{
          paddingTop: "3rem",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          marginBottom: "3rem",
        }}>
          <h3 style={{
            fontWeight: 700,
            color: "white",
            marginBottom: "2rem",
            fontSize: "1.125rem",
            fontFamily: "Playfair Display, Georgia, serif",
          }}>
            Our Global Offices
          </h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "2rem",
          }}>
            {offices.map((office) => (
              <div key={office.city} style={{
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(20px)",
                borderRadius: "1rem",
                padding: "1.5rem",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                transition: "all 0.3s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.borderColor = "rgba(201, 169, 97, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "0.5rem",
                    background: "linear-gradient(135deg, #8B0E1E, #C9A961)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <MapPin style={{ width: "1.25rem", height: "1.25rem", color: "white" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: 700,
                      color: "white",
                      marginBottom: "0.5rem",
                      fontSize: "1.0625rem",
                    }}>
                      {office.city}
                    </div>
                    <div style={{
                      fontSize: "0.875rem",
                      color: "rgba(255, 255, 255, 0.6)",
                      marginBottom: "0.75rem",
                      lineHeight: 1.6,
                    }}>
                      {office.address}
                    </div>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}>
                      <Phone style={{ width: "0.875rem", height: "0.875rem", color: "#C9A961" }} />
                      <a href={`tel:${office.phone}`} style={{
                        fontSize: "0.8125rem",
                        color: "rgba(255, 255, 255, 0.5)",
                        textDecoration: "none",
                      }}>
                        {office.phone}
                      </a>
                    </div>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}>
                      <Mail style={{ width: "0.875rem", height: "0.875rem", color: "#C9A961" }} />
                      <a href={`mailto:${office.email}`} style={{
                        fontSize: "0.8125rem",
                        color: "rgba(255, 255, 255, 0.5)",
                        textDecoration: "none",
                      }}>
                        {office.email}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          paddingTop: "2rem",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.5rem",
        }}
        className="md:flex-row">
          <div style={{
            fontSize: "0.875rem",
            color: "rgba(255, 255, 255, 0.5)",
            textAlign: "center",
          }}>
            © {new Date().getFullYear()} Center for International Mediators and Arbitrators. All rights reserved.
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "2rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}>
            {footerLinks.legal.slice(0, 3).map((link) => (
              <Link
                key={link.name}
                to={link.href}
                style={{
                  fontSize: "0.875rem",
                  color: "rgba(255, 255, 255, 0.5)",
                  textDecoration: "none",
                  transition: "color 0.3s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#C9A961";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)";
                }}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
