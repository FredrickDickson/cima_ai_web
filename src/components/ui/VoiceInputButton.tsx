import { Mic, MicOff } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useSpeechToText } from "../../hooks/useSpeechToText";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  title?: string;
}

export function VoiceInputButton({
  onTranscript,
  className,
  title = "Dictate",
}: VoiceInputButtonProps) {
  const { isSupported, isListening, start, stop, error } = useSpeechToText({
    onResult: onTranscript,
  });

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={() => (isListening ? stop() : start())}
      title={error ? `Voice input error: ${error}` : isListening ? "Stop dictation" : title}
      aria-label={isListening ? "Stop dictation" : "Start dictation"}
      className={cn(
        "p-1.5 rounded-lg transition-colors shrink-0",
        isListening
          ? "text-red-500 bg-red-500/10 animate-pulse"
          : "text-slate-400 hover:text-slate-600 hover:bg-slate-100",
        className
      )}
    >
      {isListening ? <MicOff size={15} /> : <Mic size={15} />}
    </button>
  );
}
