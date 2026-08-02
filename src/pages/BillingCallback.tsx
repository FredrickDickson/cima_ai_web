import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const PROFILE_POLL_ATTEMPTS = 4;
const PROFILE_POLL_DELAY_MS = 1500;

export default function BillingCallback() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference") || searchParams.get("trxref");
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const [status, setStatus] = useState<"checking" | "success" | "failed" | "signin">("checking");
  const [message, setMessage] = useState("Confirming your payment...");
  // Guards against this effect's async body running more than once for the
  // same mount — refreshProfile() below triggers a profile update, and
  // without this guard a re-render could otherwise re-enter the effect.
  const hasRun = useRef(false);

  useEffect(() => {
    // This page is reached via a full-page redirect back from Paystack, not
    // an in-app navigation — the session has to be restored from storage
    // from scratch, which can resolve a beat slower than usual right after
    // an external redirect. Wait for AuthContext to actually finish loading
    // before deciding whether the user is signed in, instead of the old
    // route-level RequireAuth guard that could bounce to /login the instant
    // `loading` flipped, before this page even got a chance to render.
    if (authLoading) return;

    if (!user) {
      setStatus("signin");
      setMessage("Your payment was received — sign in to see your updated plan. (If it was successful, the webhook has already applied it to your account.)");
      return;
    }

    if (hasRun.current) return;
    hasRun.current = true;

    if (!reference) {
      setStatus("failed");
      setMessage("No payment reference found.");
      return;
    }

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ reference }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Verification failed");

        if (data.status === "success") {
          setStatus("success");
          setMessage("Payment confirmed — your plan is now active.");
          // The webhook applies the plan/credits asynchronously and may not
          // have landed yet, so poll a few times instead of a single guess.
          for (let attempt = 0; attempt < PROFILE_POLL_ATTEMPTS; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, PROFILE_POLL_DELAY_MS));
            await refreshProfile();
          }
        } else {
          setStatus("failed");
          setMessage("This payment was not successful. No charge was applied.");
        }
      } catch (err) {
        setStatus("failed");
        setMessage(err instanceof Error ? err.message : "Could not verify payment.");
      }
    })();
  }, [reference, refreshProfile, authLoading, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
        {(status === "checking") && <Loader2 size={36} className="mx-auto mb-4 text-navy-600 animate-spin" />}
        {status === "success" && <CheckCircle2 size={36} className="mx-auto mb-4 text-emerald-500" />}
        {(status === "failed" || status === "signin") && <XCircle size={36} className="mx-auto mb-4 text-red-500" />}
        <h1 className="text-lg font-semibold text-navy-950 mb-2">
          {status === "checking" ? "Confirming payment"
            : status === "success" ? "Payment successful"
            : status === "signin" ? "Please sign in"
            : "Payment issue"}
        </h1>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <button
          onClick={() => navigate(status === "success" ? "/profile" : status === "signin" ? "/login" : "/pricing")}
          className="px-5 py-2.5 bg-navy-950 hover:bg-navy-800 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {status === "success" ? "Go to your account" : status === "signin" ? "Sign in" : "Back to pricing"}
        </button>
      </div>
    </div>
  );
}
