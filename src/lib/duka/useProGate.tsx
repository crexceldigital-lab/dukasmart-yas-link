import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useDuka } from "./store";
import { ProUpgradeModal } from "@/components/duka/ProUpgradeModal";

type Ctx = {
  isPro: boolean;
  isMjasiriamali: boolean;
  openUpgrade: () => void;
  requirePro: (action: () => void) => void;
};

const ProGateCtx = createContext<Ctx | null>(null);

export function ProGateProvider({ children }: { children: ReactNode }) {
  const { merchant } = useDuka();
  // Mjasiriamali Box is a superset of Pro — all Pro features are available
  const isMjasiriamali = merchant?.plan === "mjasiriamali";
  const isPro = merchant?.plan === "pro" || isMjasiriamali;
  const [open, setOpen] = useState(false);

  const openUpgrade = useCallback(() => setOpen(true), []);
  const requirePro = useCallback((action: () => void) => {
    if (isPro) action();
    else setOpen(true);
  }, [isPro]);

  const value = useMemo(() => ({ isPro, isMjasiriamali, openUpgrade, requirePro }), [isPro, isMjasiriamali, openUpgrade, requirePro]);

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
  return { isPro: false, isMjasiriamali: false, openUpgrade: () => {}, requirePro: () => {} };
}