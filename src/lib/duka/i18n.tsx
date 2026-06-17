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
  const btn = (val: Lang, label: string) => (
    <button
      key={val}
      type="button"
      onClick={() => setLang(val)}
      aria-pressed={lang === val}
      aria-label={val === "sw" ? "Swahili" : "English"}
      style={{
        minWidth: compact ? 28 : 32,
        height: compact ? 24 : 28,
        padding: "0 8px",
        border: "none",
        background: lang === val ? "var(--dy-yellow)" : "transparent",
        color: lang === val ? "var(--dy-navy)" : "currentColor",
        fontWeight: 800,
        fontSize: 11,
        letterSpacing: "0.04em",
        borderRadius: 999,
        cursor: "pointer",
        transition: "background 150ms ease",
      }}
    >
      {label}
    </button>
  );
  return (
    <div
      role="group"
      aria-label="Language"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: 3,
        borderRadius: 999,
        background: "rgba(255,255,255,0.14)",
        border: "1px solid rgba(255,255,255,0.18)",
      }}
    >
      {btn("sw", "SW")}
      {btn("en", "EN")}
    </div>
  );
}