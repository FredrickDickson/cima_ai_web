import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "What is CIMA AI?",
    answer: "CIMA AI is an advanced legal intelligence platform developed by the Center for International Mediators and Arbitrators. It combines artificial intelligence with legal expertise to provide research, analysis, drafting, and case management tools specifically designed for international arbitration and dispute resolution professionals.",
  },
  {
    question: "Who can use CIMA AI?",
    answer: "CIMA AI is designed for lawyers, arbitrators, judges, mediators, law firms, corporate legal departments, government agencies, universities, and ADR professionals. The platform serves both individual practitioners and large legal organizations across the globe.",
  },
  {
    question: "Is my data secure and confidential?",
    answer: "Absolutely. CIMA AI employs bank-grade encryption, SOC 2 compliance, and strict data privacy protocols. All documents and case information are encrypted both in transit and at rest. We never train our AI models on your confidential data, and you maintain complete ownership of all materials uploaded to the platform.",
  },
  {
    question: "How does CIMA AI differ from general AI tools?",
    answer: "CIMA AI is specifically trained on international arbitration law, procedure, and practice. Unlike general AI tools, our platform understands the nuances of cross-border disputes, institutional arbitration rules, and international legal frameworks. It's built by legal professionals for legal professionals.",
  },
  {
    question: "Does CIMA AI replace lawyers or arbitrators?",
    answer: "No. CIMA AI is designed to augment and enhance legal work, not replace it. The platform handles time-consuming research and analysis tasks, allowing legal professionals to focus on strategy, advocacy, and judgment—the aspects of legal work that require human expertise and ethical consideration.",
  },
  {
    question: "Which jurisdictions and legal systems does CIMA AI cover?",
    answer: "CIMA AI covers over 50 jurisdictions and multiple legal systems, with particular strength in international arbitration, common law, and civil law traditions. The platform includes major arbitration centers in London, Paris, Singapore, Hong Kong, Dubai, New York, and many others.",
  },
  {
    question: "Can CIMA AI integrate with our existing systems?",
    answer: "Yes. CIMA AI offers API access and integration capabilities with popular legal practice management systems, document management platforms, and enterprise software. Our team works with you to ensure seamless integration with your existing workflows.",
  },
  {
    question: "What kind of support and training is provided?",
    answer: "We provide comprehensive onboarding, training sessions, dedicated account management, 24/7 technical support, and regular webinars. For enterprise clients, we offer customized training programs and ongoing consultation to maximize platform utilization.",
  },
  {
    question: "How is pricing structured?",
    answer: "CIMA AI offers flexible pricing based on your needs—individual practitioner licenses, team subscriptions, and enterprise solutions. Contact our sales team for a customized quote that fits your organization's size and requirements.",
  },
  {
    question: "Can I try CIMA AI before committing?",
    answer: "Yes! We offer a free demo and trial period for qualified legal professionals and organizations. Request a demo to see the platform in action and experience how CIMA AI can transform your legal practice.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" style={{
      padding: "5rem 0",
      background: "linear-gradient(180deg, #ffffff 0%, #FDFBF7 100%)",
      position: "relative",
    }}>
      <div className="container-narrow">
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
            <HelpCircle style={{ width: "1rem", height: "1rem", color: "#8B0E1E" }} />
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#8B0E1E" }}>FAQ</span>
          </div>
          <h2 style={{
            fontFamily: "Playfair Display, Georgia, serif",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            fontWeight: 700,
            color: "#2D2D2D",
            marginBottom: "1rem",
            lineHeight: 1.2,
          }}>
            Frequently Asked Questions
          </h2>
          <p style={{ fontSize: "1.125rem", color: "#6d6d6d" }}>
            Everything you need to know about CIMA AI
          </p>
        </motion.div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <div style={{
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(253, 251, 247, 0.9) 100%)",
                backdropFilter: "blur(20px)",
                border: `1px solid ${openIndex === index ? 'rgba(139, 14, 30, 0.3)' : 'rgba(229, 231, 235, 0.5)'}`,
                borderRadius: "1rem",
                overflow: "hidden",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: openIndex === index 
                  ? "0 8px 32px rgba(139, 14, 30, 0.12)" 
                  : "0 2px 8px rgba(139, 14, 30, 0.04)",
              }}>
                <button
                  onClick={() => toggleFAQ(index)}
                  style={{
                    width: "100%",
                    padding: "1.5rem 2rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.3s",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    if (openIndex !== index) {
                      e.currentTarget.style.background = "rgba(139, 14, 30, 0.02)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div style={{
                    position: "absolute",
                    left: "1.5rem",
                    top: "0.75rem",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: openIndex === index ? "#8B0E1E" : "#C9A961",
                    opacity: 0.6,
                  }}>
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  <span style={{
                    fontWeight: 700,
                    color: openIndex === index ? "#8B0E1E" : "#2D2D2D",
                    fontSize: "1.0625rem",
                    paddingRight: "2rem",
                    paddingTop: "0.75rem",
                    transition: "color 0.3s",
                    lineHeight: 1.4,
                  }}>
                    {faq.question}
                  </span>
                  
                  <div style={{
                    flexShrink: 0,
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "50%",
                    background: openIndex === index 
                      ? "linear-gradient(135deg, #8B0E1E, #751222)" 
                      : "rgba(139, 14, 30, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    transform: openIndex === index ? "rotate(180deg)" : "rotate(0deg)",
                  }}>
                    {openIndex === index ? (
                      <Minus style={{ width: "1.25rem", height: "1.25rem", color: "white" }} />
                    ) : (
                      <Plus style={{ width: "1.25rem", height: "1.25rem", color: "#8B0E1E" }} />
                    )}
                  </div>
                </button>
                
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <div style={{
                        padding: "0 2rem 2rem 2rem",
                        color: "#6d6d6d",
                        lineHeight: 1.7,
                        fontSize: "0.9375rem",
                        borderTop: "1px solid rgba(229, 231, 235, 0.5)",
                        paddingTop: "1.5rem",
                        marginTop: "-0.5rem",
                      }}>
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{
            textAlign: "center",
            marginTop: "4rem",
            padding: "2.5rem",
            background: "linear-gradient(135deg, rgba(139, 14, 30, 0.03), rgba(201, 169, 97, 0.03))",
            borderRadius: "1.5rem",
            border: "1px solid rgba(139, 14, 30, 0.1)",
          }}
        >
          <h3 style={{
            fontFamily: "Playfair Display, Georgia, serif",
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#2D2D2D",
            marginBottom: "0.75rem",
          }}>
            Still have questions?
          </h3>
          <p style={{
            fontSize: "1rem",
            color: "#6d6d6d",
            marginBottom: "1.5rem",
          }}>
            Our team is here to help. Get in touch with us for personalized assistance.
          </p>
          <button style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            height: "3rem",
            padding: "0 2rem",
            fontSize: "1rem",
            fontWeight: 600,
            color: "white",
            background: "linear-gradient(135deg, #8B0E1E 0%, #751222 100%)",
            border: "none",
            borderRadius: "0.5rem",
            boxShadow: "0 4px 16px rgba(139, 14, 30, 0.2)",
            cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(139, 14, 30, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(139, 14, 30, 0.2)";
          }}>
            Contact Support
          </button>
        </motion.div>
      </div>
    </section>
  );
}
