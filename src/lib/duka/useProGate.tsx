import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useDuka } from "./store";
import { ProUpgradeModal } from "@/components/duka/ProUpgradeModal";

type Ctx = {
  isPro: boolean;
  openUpgrade: () => void;
  requirePro: (action: () => void) => void;
};

const ProGateCtx = createContext<Ctx | null>(null);

export function ProGateProvider({ children }: { children: ReactNode }) {
  const { merchant } = useDuka();
  const isPro = merchant?.plan === "pro";
  const [open, setOpen] = useState(false);

  const openUpgrade = useCallback(() => setOpen(true), []);
  const requirePro = useCallback((action: () => void) => {
    if (isPro) action();
    else setOpen(true);
  }, [isPro]);

  const value = useMemo(() => ({ isPro, openUpgrade, requirePro }), [isPro, openUpgrade, requirePro]);

  return (
    <ProGateCtx.Provider value={value}>
      {children}
      <ProUpgradeModal open={open} onClose={() => setOpen(false)} />
    </ProGateCtx.Provider>
  );
}

export function useProGate(): Ctx {
  const v = useContext(ProGateCtx);
  if (v) return v;
  // Safe fallback (no provider) — treat as free, no-op upgrade.
  return { isPro: false, openUpgrade: () => {}, requirePro: () => {} };
}