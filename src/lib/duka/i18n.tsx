import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

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
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const options: { code: Lang; label: string }[] = [
    { code: "sw", label: "Kiswahili" },
    { code: "en", label: "English" },
  ];
  const currentLabel = lang === "sw" ? "Kiswahili" : "English";

  return (
    <div ref={wrapRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Choose language"
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
          letterSpacing: "0.02em",
          borderRadius: 999,
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
        </svg>
        <span>{currentLabel}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms ease" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Language"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 160,
            margin: 0,
            padding: 6,
            listStyle: "none",
            background: "#fff",
            color: "var(--dy-navy)",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
            zIndex: 1000,
          }}
        >
          {options.map(opt => {
            const active = opt.code === lang;
            return (
              <li key={opt.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => { setLang(opt.code); setOpen(false); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: "10px 12px",
                    border: "none",
                    background: active ? "rgba(0,168,107,0.12)" : "transparent",
                    color: "var(--dy-navy)",
                    fontWeight: active ? 800 : 600,
                    fontSize: 14,
                    borderRadius: 8,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span>{opt.label}</span>
                  {active && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--dy-green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}