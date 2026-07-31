import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, Scale } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

type PlanId = "free" | "pro" | "max";
type Interval = "monthly" | "annually";

interface Plan {
  id: PlanId;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  popular?: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "Try CIMA AI and browse the Legal Library at no cost.",
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      "Unlimited Legal Library browsing",
      "20 AI actions / month",
      "1 active case, 250MB storage",
      "Research, Drafting Studio, Document Review",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For solo practitioners and small-firm lawyers in active practice.",
    monthlyPrice: 29,
    annualPrice: 290,
    popular: true,
    features: [
      "Everything in Free, plus:",
      "Case Brief, Smart Citator, Ask CIMA AI",
      "500 AI actions / month + pay-as-you-go top-ups",
      "Unlimited cases, 5GB storage",
      "Authority tagging & document export",
      "Priority support",
    ],
  },
  {
    id: "max",
    name: "Max",
    description: "For power users who want the most out of CIMA AI.",
    monthlyPrice: 79,
    annualPrice: 790,
    features: [
      "Everything in Pro, plus:",
      "2,000 AI actions / month",
      "20GB storage",
      "Priority processing",
      "First access to new features",
    ],
  },
];

const revealVariants = {
  visible: (i: number) => ({
    y: 0, opacity: 1, filter: "blur(0px)",
    transition: { delay: i * 0.12, duration: 0.5 },
  }),
  hidden: { filter: "blur(6px)", y: 16, opacity: 0 },
};

function PricingSwitch({ interval, onChange }: { interval: Interval; onChange: (i: Interval) => void }) {
  return (
    <div className="flex justify-center">
      <div className="relative z-10 mx-auto flex w-fit rounded-full bg-neutral-900 border border-neutral-700 p-1">
        {(["monthly", "annually"] as Interval[]).map((val) => (
          <button
            key={val}
            onClick={() => onChange(val)}
            className={`relative z-10 w-fit h-10 rounded-full sm:px-6 px-4 py-2 text-sm font-medium transition-colors ${
              interval === val ? "text-white" : "text-neutral-400"
            }`}
          >
            {interval === val && (
              <motion.span
                layoutId="pricing-switch"
                className="absolute inset-0 -z-10 rounded-full border-4 shadow-sm shadow-blue-600 border-blue-600 bg-gradient-to-t from-blue-500 to-blue-600"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <span className="relative">{val === "monthly" ? "Monthly" : "Yearly"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Pricing() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [interval, setInterval] = useState<Interval>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState("");

  async function handleSelect(plan: Plan) {
    if (plan.id === "free") return;
    if (!user) {
      navigate("/register");
      return;
    }
    if (profile?.plan === plan.id) return;

    setError("");
    setLoadingPlan(plan.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-initialize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ plan: plan.id, interval }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start checkout");
      window.location.href = data.authorization_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
      setLoadingPlan(null);
    }
  }

  return (
    <div className="min-h-screen mx-auto relative bg-black overflow-x-hidden">
      {/* Ambient glow background */}
      <div
        className="absolute top-0 left-[10%] right-[10%] w-[80%] h-[600px] z-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at center, #206ce8 0%, transparent 70%)",
          opacity: 0.5,
          mixBlendMode: "multiply",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-6 max-w-5xl mx-auto">
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gold-500">
            <Scale className="w-4 h-4 text-navy-950" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">CIMA <span className="text-gold-400">AI</span></span>
        </button>
        <button
          onClick={() => navigate(user ? "/" : "/login")}
          className="text-sm text-neutral-300 hover:text-white transition-colors"
        >
          {user ? "Back to app" : "Sign in"}
        </button>
      </header>

      <article className="text-center mb-10 pt-10 pb-4 max-w-2xl mx-auto space-y-3 relative z-10 px-6">
        <h2 className="text-4xl font-semibold text-white">Plans built for legal practice</h2>
        <p className="text-neutral-400">
          Legal research, drafting, and document review — priced for solo practitioners and small firms, not enterprise legal budgets.
        </p>
        <div className="pt-2">
          <PricingSwitch interval={interval} onChange={setInterval} />
        </div>
      </article>

      {error && (
        <p className="relative z-10 text-center text-sm text-red-400 mb-4 px-6">{error}</p>
      )}

      <div className="relative z-10 grid md:grid-cols-3 max-w-5xl gap-4 py-6 mx-auto px-6 pb-20">
        {PLANS.map((plan, index) => {
          const isCurrent = profile?.plan === plan.id;
          const price = interval === "monthly" ? plan.monthlyPrice : plan.annualPrice;
          return (
            <motion.div
              key={plan.id}
              custom={index}
              initial="hidden"
              animate="visible"
              variants={revealVariants}
            >
              <div
                className={`relative text-white border rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 h-full flex flex-col ${
                  plan.popular
                    ? "border-blue-600 shadow-[0px_-13px_300px_0px_#0900ff] z-20"
                    : "border-neutral-800 z-10"
                }`}
              >
                <div className="p-6 pb-0 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-semibold">{plan.name}</h3>
                    {plan.popular && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide bg-blue-600 text-white px-2 py-1 rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-3xl font-semibold">${price}</span>
                    {price > 0 && <span className="text-neutral-400 ml-1 text-sm">/{interval === "monthly" ? "month" : "year"}</span>}
                  </div>
                  <p className="text-sm text-neutral-400 mt-2 mb-4">{plan.description}</p>
                </div>
                <div className="px-6 pb-6 pt-0 flex-1 flex flex-col">
                  <button
                    onClick={() => handleSelect(plan)}
                    disabled={loadingPlan === plan.id || isCurrent}
                    className={`w-full mb-6 py-3 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${
                      isCurrent
                        ? "bg-neutral-800 text-neutral-400 cursor-default"
                        : plan.popular
                          ? "bg-gradient-to-t from-blue-500 to-blue-600 shadow-lg shadow-blue-800/50 border border-blue-500 text-white hover:brightness-110"
                          : "bg-gradient-to-t from-neutral-950 to-neutral-700 shadow-lg shadow-neutral-900 border border-neutral-800 text-white hover:brightness-110"
                    } disabled:cursor-not-allowed`}
                  >
                    {loadingPlan === plan.id && <Loader2 size={14} className="animate-spin" />}
                    {isCurrent ? "Current plan" : plan.id === "free" ? (user ? "Included" : "Get started") : "Upgrade"}
                  </button>
                  <div className="space-y-3 pt-4 border-t border-neutral-700">
                    <ul className="space-y-2.5">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          {i === 0 && (plan.id === "pro" || plan.id === "max") ? (
                            <span className="text-xs text-neutral-500 font-medium">{feature}</span>
                          ) : (
                            <>
                              <Check size={14} className="text-blue-500 shrink-0 mt-0.5" />
                              <span className="text-sm text-neutral-300">{feature}</span>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="relative z-10 text-center text-xs text-neutral-500 pb-16 px-6">
        Prices shown in USD; charged in Ghanaian Cedis (GHS) at checkout via Paystack.
      </p>
    </div>
  );
}
