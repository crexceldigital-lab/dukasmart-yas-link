import { useEffect, useState, createContext, useContext, type ReactNode } from "react";

const ToastCtx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2200);
    return () => clearTimeout(t);
  }, [msg]);
  return (
    <ToastCtx.Provider value={setMsg}>
      {children}
      {msg ? <div className="dy-toast">{msg}</div> : null}
    </ToastCtx.Provider>
  );
}

export function useToast() { return useContext(ToastCtx); }