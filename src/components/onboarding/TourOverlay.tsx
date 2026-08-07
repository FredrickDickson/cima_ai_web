import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTour } from "../../contexts/TourContext";
import { useSidebar } from "../../contexts/SidebarContext";

const PADDING = 8;
const CARD_WIDTH = 320;

export default function TourOverlay() {
  const { active, stepIndex, steps, next, back, finish } = useTour();
  const { isOpen, open, close } = useSidebar();
  const [rect, setRect] = useState<DOMRect | null>(null);

  const step = steps[stepIndex];

  // Force the mobile sidebar drawer open for the tour's duration so the nav
  // items being spotlighted are actually visible/measurable, then restore
  // whatever state it was in before.
  useEffect(() => {
    if (!active) return;
    const wasOpen = isOpen;
    open();
    return () => {
      if (!wasOpen) close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (!active || !step?.target) {
      setRect(null);
      return;
    }
    function measure() {
      const el = document.querySelector(`[data-tour="${step!.target}"]`);
      if (el) setRect(el.getBoundingClientRect());
    }
    // Small delay so a just-opened mobile drawer's transition settles first.
    const t = setTimeout(measure, 50);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, stepIndex, step?.target]);

  if (!active || !step) return null;

  const isCentered = !step.target || !rect;
  const isLastStep = stepIndex + 1 === steps.length;

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Product tour">
      <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left - PADDING}
                y={rect.top - PADDING}
                width={rect.width + PADDING * 2}
                height={rect.height + PADDING * 2}
                rx={10}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(4, 12, 28, 0.72)" mask="url(#tour-spotlight-mask)" />
      </svg>

      <div className="absolute inset-0" onClick={finish} />

      <div
        className={`absolute bg-white rounded-2xl shadow-2xl p-5 ${isCentered ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" : ""}`}
        style={{
          width: CARD_WIDTH,
          ...(!isCentered && rect
            ? {
                top: Math.min(Math.max(rect.top, 16), window.innerHeight - 220),
                left: Math.min(rect.right + PADDING * 2 + 8, window.innerWidth - CARD_WIDTH - 16),
              }
            : {}),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={finish}
          className="absolute top-3 right-3 text-slate-400 hover:text-navy-950 p-1 rounded-md hover:bg-slate-100 transition-colors"
          aria-label="Skip tour"
        >
          <X size={16} />
        </button>
        <p className="text-xs font-semibold text-gold-600 uppercase tracking-wide mb-1">
          {stepIndex + 1} of {steps.length}
        </p>
        <h3 className="text-lg font-bold text-navy-950 mb-2 pr-6">{step.title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-5">{step.description}</p>
        <div className="flex items-center justify-between">
          <button onClick={finish} className="text-xs text-slate-400 hover:text-slate-600 font-medium">
            Skip
          </button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                onClick={back}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-navy-950 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}
            <button
              onClick={next}
              className="flex items-center gap-1 px-4 py-1.5 text-sm font-semibold text-navy-950 bg-gold-500 hover:bg-gold-400 rounded-lg transition-colors"
            >
              {isLastStep ? "Finish" : "Next"}
              {!isLastStep && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
