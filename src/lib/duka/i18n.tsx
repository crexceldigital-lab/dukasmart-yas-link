import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "sw" | "en";
const KEY = "dy_lang";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Pick the string for the active language. Pass Swahili first, English second. */
  t: (sw: string, en: string) => string;
};

const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("sw");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "sw" || saved === "en") setLangState(saved);
    } catch {}
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") {
      try { localStorage.setItem(KEY, l); } catch {}
      try { document.documentElement.lang = l; } catch {}
    }
  };

  const t = (sw: string, en: string) => (lang === "en" ? en : sw);

  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export function useI18n(): Ctx {
  const v = useContext(I18nCtx);
  if (!v) {
    // Safe fallback so non-wrapped trees (SSR shells, etc.) still render in Swahili.
    return { lang: "sw", setLang: () => {}, t: (sw) => sw };
  }
  return v;
}

export function LangToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();
  const next: Lang = lang === "sw" ? "en" : "sw";
  const currentLabel = lang === "sw" ? "SW" : "EN";
  const nextLabel = next === "sw" ? "Kiswahili" : "English";
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      aria-label={`Switch language to ${nextLabel}`}
      title={`Switch to ${nextLabel}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: compact ? 28 : 32,
        padding: "0 10px",
        border: "1px solid rgba(255,255,255,0.35)",
        background: "var(--dy-yellow)",
        color: "var(--dy-navy)",
        fontWeight: 800,
        fontSize: 12,
        letterSpacing: "0.04em",
        borderRadius: 999,
        cursor: "pointer",
        transition: "transform 150ms ease, background 150ms ease",
        flexShrink: 0,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
      </svg>
      {currentLabel}
    </button>
  );
}