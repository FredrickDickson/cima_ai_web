import * as React from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const navItems = [
  { name: "About", href: "#why-cima" },
  { name: "Solutions", href: "#how-it-works" },
  { name: "Features", href: "#features" },
  { name: "Pricing", href: "#pricing" },
  { name: "Resources", href: "#faq" },
  { name: "Contact", href: "#footer" },
];

export function Navigation() {
  const [isOpen, setIsOpen] = React.useState(false);
  const { scrollY } = useScroll();
  
  const backgroundColor = useTransform(
    scrollY,
    [0, 100],
    ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.98)"]
  );
  
  const boxShadow = useTransform(
    scrollY,
    [0, 100],
    ["0 0 0 rgba(0, 0, 0, 0)", "0 8px 32px rgba(90, 38, 51, 0.08)"]
  );

  // Close menu when clicking outside
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <motion.header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        paddingTop: "0.75rem",
        paddingBottom: "0.75rem",
      }}
    >
      <div style={{
        width: "100%",
        maxWidth: "90rem",
        marginLeft: "auto",
        marginRight: "auto",
        paddingLeft: "1rem",
        paddingRight: "1rem",
      }}>
        <motion.nav
          style={{ 
            backgroundColor,
            boxShadow,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            position: "relative",
            overflow: "visible",
            borderRadius: "9999px",
          }}
        >
          {/* Animated Border Shimmer */}
          <div style={{
            position: "absolute",
            inset: 0,
            borderRadius: "9999px",
            padding: "2px",
            background: "linear-gradient(90deg, transparent, rgba(90, 38, 51, 0.3), rgba(180, 154, 103, 0.4), rgba(90, 38, 51, 0.3), transparent)",
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
            border: "2px solid rgba(90, 38, 51, 0.3)",
            pointerEvents: "none",
          }} />
          
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1rem",
            minHeight: "3.5rem",
          }}>
            {/* Logo */}
            <Link to="/" style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              textDecoration: "none",
              zIndex: 60,
            }}>
              <div style={{
                position: "relative",
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "0",
                overflow: "hidden",
                flexShrink: 0,
              }}>
                <img
                  src="/logo.png"
                  alt="CIMA AI Logo"
                  style={{ 
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                <span style={{
                  fontSize: "0.9375rem",
                  fontWeight: 700,
                  color: "#252525",
                  letterSpacing: "-0.01em",
                }}>
                  Center for International
                </span>
                <span style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "#5f5f5f",
                  letterSpacing: "-0.01em",
                }}>
                  Mediators & Arbitrators
                </span>
              </div>
            </Link>

            {/* Desktop Navigation - Hidden on mobile */}
            <div style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
            }}
            className="desktop-nav">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  style={{
                    padding: "0.625rem 1.125rem",
                    fontSize: "0.9375rem",
                    fontWeight: 500,
                    color: "#4a4a4a",
                    borderRadius: "9999px",
                    textDecoration: "none",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#5A2633";
                    e.currentTarget.style.background = "rgba(90, 38, 51, 0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#4a4a4a";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {item.name}
                </a>
              ))}
            </div>

            {/* Desktop CTA Buttons - Hidden on mobile */}
            <div style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "center",
            }}
            className="desktop-cta">
              <Link to="/login" style={{ textDecoration: "none" }}>
                <button style={{
                  height: "2.75rem",
                  padding: "0 1.5rem",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  color: "#5A2633",
                  background: "transparent",
                  border: "none",
                  borderRadius: "9999px",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(90, 38, 51, 0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}>
                  Sign In
                </button>
              </Link>
              <Link to="/register" style={{ textDecoration: "none" }}>
                <button style={{
                  height: "2.75rem",
                  padding: "0 1.75rem",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  color: "white",
                  background: "linear-gradient(135deg, #5A2633 0%, #4a1f2a 100%)",
                  border: "none",
                  borderRadius: "9999px",
                  boxShadow: "0 4px 12px rgba(90, 38, 51, 0.2)",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(90, 38, 51, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(90, 38, 51, 0.2)";
                }}>
                  Get Started
                </button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "2.5rem",
                height: "2.5rem",
                padding: 0,
                color: isOpen ? "white" : "#5A2633",
                borderRadius: "0.625rem",
                border: "none",
                background: isOpen ? "linear-gradient(135deg, #5A2633 0%, #4a1f2a 100%)" : "rgba(90, 38, 51, 0.08)",
                cursor: "pointer",
                transition: "all 0.3s",
                zIndex: 60,
              }}
              className="mobile-menu-btn"
              aria-label="Toggle menu"
            >
              {isOpen ? <X style={{ width: "1.25rem", height: "1.25rem" }} /> : <Menu style={{ width: "1.25rem", height: "1.25rem" }} />}
            </button>
          </div>
        </motion.nav>
      </div>

      {/* Mobile Full-Screen Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.5)",
                backdropFilter: "blur(4px)",
                zIndex: 40,
              }}
              className="lg:hidden"
            />
            
            {/* Menu Content */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              style={{
                position: "fixed",
                top: "4.5rem",
                left: "1rem",
                right: "1rem",
                background: "rgba(255, 255, 255, 0.98)",
                backdropFilter: "blur(20px)",
                borderRadius: "1.5rem",
                boxShadow: "0 20px 60px rgba(90, 38, 51, 0.2)",
                border: "1px solid rgba(90, 38, 51, 0.1)",
                padding: "1.5rem",
                maxHeight: "calc(100vh - 6rem)",
                overflowY: "auto",
                zIndex: 45,
              }}
              className="lg:hidden"
            >
              {/* Navigation Links */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginBottom: "1.5rem",
              }}>
                {navItems.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <a
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      style={{
                        display: "block",
                        padding: "1rem 1.25rem",
                        fontSize: "1.0625rem",
                        fontWeight: 600,
                        color: "#252525",
                        borderRadius: "0.75rem",
                        textDecoration: "none",
                        transition: "all 0.3s",
                        background: "transparent",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(90, 38, 51, 0.05)";
                        e.currentTarget.style.color = "#5A2633";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#252525";
                      }}
                    >
                      {item.name}
                    </a>
                  </motion.div>
                ))}
              </div>

              {/* Divider */}
              <div style={{
                height: "1px",
                background: "linear-gradient(90deg, transparent, rgba(90, 38, 51, 0.2), transparent)",
                marginBottom: "1.5rem",
              }} />

              {/* CTA Buttons */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  <Link to="/login" onClick={() => setIsOpen(false)} style={{ textDecoration: "none" }}>
                    <button style={{
                      width: "100%",
                      height: "3.25rem",
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: "#5A2633",
                      background: "rgba(90, 38, 51, 0.05)",
                      border: "2px solid rgba(90, 38, 51, 0.2)",
                      borderRadius: "0.75rem",
                      cursor: "pointer",
                      transition: "all 0.3s",
                    }}>
                      Sign In
                    </button>
                  </Link>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.35 }}
                >
                  <Link to="/register" onClick={() => setIsOpen(false)} style={{ textDecoration: "none" }}>
                    <button style={{
                      width: "100%",
                      height: "3.25rem",
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: "white",
                      background: "linear-gradient(135deg, #5A2633 0%, #4a1f2a 100%)",
                      border: "none",
                      borderRadius: "0.75rem",
                      boxShadow: "0 4px 16px rgba(90, 38, 51, 0.25)",
                      cursor: "pointer",
                      transition: "all 0.3s",
                    }}>
                      Get Started
                    </button>
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
