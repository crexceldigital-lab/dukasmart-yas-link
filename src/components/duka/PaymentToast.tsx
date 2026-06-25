import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

/**
 * A bigger, more celebratory toast than the standard `dy-toast`, reserved
 * for confirmed-payment realtime events on the dashboard. Handles its own
 * exit animation before calling onDone, so the caller doesn't need timers.
 */
export function PaymentToast({ message, onDone }: { message: string; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const showFor = setTimeout(() => setLeaving(true), 2800);
    return () => clearTimeout(showFor);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const remove = setTimeout(onDone, 300);
    return () => clearTimeout(remove);
  }, [leaving, onDone]);

  return (
    <div className={"dy-toast-payment" + (leaving ? " dy-toast-out" : "")}>
      <span className="dy-toast-icon"><Sparkles size={14} strokeWidth={2.5} /></span>
      {message}
    </div>
  );
}
