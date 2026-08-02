import { FlaskConical } from "lucide-react";

/** Persistent site-wide notice while the product is in beta — shown above every route. */
export default function BetaBanner() {
  return (
    <div className="shrink-0 bg-gold-500 text-navy-950 px-4 py-2 text-center text-xs sm:text-sm font-medium flex items-center justify-center gap-2">
      <FlaskConical size={14} className="shrink-0" />
      <span>CIMA AI is currently in beta testing — paid subscriptions will launch in the future.</span>
    </div>
  );
}
