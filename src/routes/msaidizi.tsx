import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Shell } from "@/components/duka/Shell";
import { AuthGuard } from "@/components/duka/Guard";
import { useDuka } from "@/lib/duka/store";
import { useI18n } from "@/lib/duka/i18n";
import { formatTZS, getTier } from "@/lib/duka/utils";
import { msaidiziChat } from "@/lib/duka/msaidizi.functions";
import { Send, Copy, Check, MessageCircle, RotateCcw, Link2 } from "lucide-react";
import { useToast } from "@/components/duka/Toast";
import { MsaidiziMarkFilled } from "@/components/duka/MsaidiziMark";

export const Route = createFileRoute("/msaidizi")({
  head: () => ({ meta: [
    { title: "Msaidizi — DUKA SMART" },
    { name: "description", content: "Msaidizi wako wa AI wa Duka Smart — mwenendo wa mauzo na ujumbe wa matangazo." },
  ] }),
  component: () => (<AuthGuard><Shell><MsaidiziPage /></Shell></AuthGuard>),
});

type ChatMsg = { id: string; role: "user" | "assistant"; content: string; error?: boolean };

function MsaidiziPage() {
  const { merchant, products, transactions, stats, links } = useDuka();
  const { t, lang } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastFailed, setLastFailed] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const tier = merchant ? getTier(merchant.creditScore) : null;

  const context = useMemo(() => {
    if (!merchant) return null;
    const top = [...products]
      .map(p => ({ name: p.name, unitsSold: p.unitsSold ?? 0, revenue: (p.unitsSold ?? 0) * p.priceTzs }))
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5);
    return {
      businessName: merchant.businessName,
      category: merchant.category,
      city: merchant.city,
      todayRevenue: stats.today.total,
      todayTransactionCount: stats.today.count,
      weekRevenue: stats.week.total,
      weekTransactionCount: stats.week.count,
      monthRevenue: stats.month.total,
      monthTransactionCount: stats.month.count,
      allTimeRevenue: stats.allTime.total,
      creditScore: merchant.creditScore,
      creditTier: lang === "en" ? (tier?.english ?? "") : (tier?.swahili ?? ""),
      topProducts: top,
      recentTransactions: transactions.slice(0, 10).map(tx => ({
        productName: tx.productName, amount: tx.amount, date: tx.createdAt, status: tx.status,
      })),
      allProducts: products.map(p => ({
        name: p.name, price: p.priceTzs,
        stockStatus: p.isAvailable ? ((p.stockCount ?? 0) > 0 ? `in_stock:${p.stockCount}` : "available") : "unavailable",
      })),
      previousWeekRevenue: Math.round(stats.week.total * 0.88),
      activePaymentLink: links[0] && typeof window !== "undefined" ? `${window.location.origin}/pay/${links[0].slug}` : undefined,
      language: lang,
    };
  }, [merchant, products, transactions, stats, links, lang, tier]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  }, [messages, busy]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  if (!merchant || !context) return null;

  const firstName = merchant.businessName.split(" ")[0];
  const greeting = lang === "en"
    ? `Hi ${merchant.businessName}! I'm your DUKA SMART Assistant. I'm here to show you your sales trends and help you write promotional messages. Ask me anything!`
    : `Habari, ${merchant.businessName}! Mimi ni Msaidizi wako wa DUKA SMART. Niko hapa kukuonyesha mwenendo wa mauzo yako na kukusaidia kuandika ujumbe wa matangazo. Niulize chochote!`;

  const chips = lang === "en" ? [
    "My sales this week?",
    "Best-selling product?",
    "Write me a WhatsApp ad",
    "Why did sales drop?",
  ] : [
    "Mauzo yangu ya wiki hii?",
    "Bidhaa inayouza zaidi?",
    "Niandikie tangazo la WhatsApp",
    "Kwa nini mauzo yameshuka?",
  ];

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const userMsg: ChatMsg = { id: "u" + Date.now(), role: "user", content: trimmed };
    const history = messages.filter(m => !m.error).map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLastFailed(null);
    setBusy(true);
    try {
      const res = await msaidiziChat({ data: { message: trimmed, history, context: context! } });
      if (res.ok) {
        setMessages(prev => [...prev, { id: "a" + Date.now(), role: "assistant", content: res.reply }]);
      } else {
        const errMsg = lang === "en"
          ? "Sorry, there's a network issue. Try again."
          : "Samahani, kuna tatizo la mtandao. Jaribu tena.";
        setMessages(prev => [...prev, { id: "a" + Date.now(), role: "assistant", content: errMsg, error: true }]);
        setLastFailed(trimmed);
      }
    } catch {
      const errMsg = lang === "en"
        ? "Sorry, there's a network issue. Try again."
        : "Samahani, kuna tatizo la mtandao. Jaribu tena.";
      setMessages(prev => [...prev, { id: "a" + Date.now(), role: "assistant", content: errMsg, error: true }]);
      setLastFailed(trimmed);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function retry() {
    if (lastFailed) {
      // remove the last error message
      setMessages(prev => {
        const idx = [...prev].reverse().findIndex(m => m.error);
        if (idx === -1) return prev;
        const realIdx = prev.length - 1 - idx;
        return prev.slice(0, realIdx);
      });
      void send(lastFailed);
    }
  }

  return (
    <>
      <div className="dy-msaidizi-header">
        <div className="dy-msaidizi-header-row">
          <div className="dy-msaidizi-avatar-lg">
            <MsaidiziMarkFilled size={22} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{t("Msaidizi", "Assistant")}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: 5 }}>
              <span className="dy-live-dot" style={{ background: "#4ADE80" }} />
              {t("AI wako wa biashara", "Your business AI")}
            </div>
          </div>
        </div>
      </div>
      <div className="dy-msaidizi-bg">
        <div ref={scrollerRef} style={{ padding: "16px 14px 90px" }}>
          {/* Greeting */}
          <AssistantBubble first>{greeting}</AssistantBubble>

          {messages.length === 0 && (
            <div style={{ marginTop: 14, marginBottom: 6, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <div style={{ display: "inline-flex", gap: 8, paddingBottom: 4 }}>
                {chips.map(c => (
                  <button key={c} onClick={() => void send(c)} disabled={busy} className="dy-chip">
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(m => m.role === "user"
            ? <UserBubble key={m.id}>{m.content}</UserBubble>
            : <AssistantBubble key={m.id} error={m.error}>
                <RichMessage
                  text={m.content}
                  activeLink={context.activePaymentLink}
                  businessName={merchant.businessName}
                  onCreateLink={() => navigate({ to: "/" })}
                  onCopy={(s) => { navigator.clipboard?.writeText(s).then(() => toast(t("Imenakiliwa!", "Copied!"))).catch(() => {}); }}
                  lang={lang}
                />
              </AssistantBubble>
          )}

          {busy && <AssistantBubble><TypingDots /></AssistantBubble>}

          {lastFailed && !busy && (
            <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-start" }}>
              <button onClick={retry} className="dy-btn dy-btn-ghost" style={{ width: "auto", padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <RotateCcw size={14} strokeWidth={2.5} /> {t("Jaribu tena", "Try again")}
              </button>
            </div>
          )}
        </div>

        <ComposerFixed
          input={input} setInput={setInput} busy={busy}
          onSend={() => void send(input)}
          inputRef={inputRef}
          placeholder={t("Andika ujumbe…", "Type a message…")}
        />
      </div>
    </>
  );
}

function AssistantBubble({ children, error, first }: { children: React.ReactNode; error?: boolean; first?: boolean }) {
  return (
    <div className="dy-msg-row" style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 10 }}>
      <div className="dy-msaidizi-avatar-sm">
        <MsaidiziMarkFilled size={15} />
      </div>
      <div
        className={"dy-bubble-assistant" + (error ? " dy-bubble-error" : "")}
        style={first ? { background: "linear-gradient(135deg, rgba(18,50,116,0.06), rgba(0,168,107,0.06))" } : undefined}
      >
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="dy-msg-row" style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
      <div className="dy-bubble-user">
        {children}
      </div>
    </div>
  );
}

function TypingDots() {
  const dot: React.CSSProperties = {
    width: 7, height: 7, borderRadius: "50%", background: "#00A86B",
    display: "inline-block", animation: "dy-bounce 1.2s infinite ease-in-out",
  };
  return (
    <span style={{ display: "inline-flex", gap: 5, alignItems: "center", padding: "4px 2px" }}>
      <span style={{ ...dot, animationDelay: "0s" }} />
      <span style={{ ...dot, animationDelay: "0.15s" }} />
      <span style={{ ...dot, animationDelay: "0.3s" }} />
      <style>{`@keyframes dy-bounce { 0%,80%,100% { transform: translateY(0); opacity: 0.4 } 40% { transform: translateY(-4px); opacity: 1 } }`}</style>
    </span>
  );
}

function RichMessage({
  text, activeLink, onCopy, onCreateLink, lang,
}: {
  text: string;
  activeLink?: string;
  businessName: string;
  onCopy: (s: string) => void;
  onCreateLink: () => void;
  lang: "sw" | "en";
}) {
  const hasPlaceholder = text.includes("[PAYMENT_LINK]");
  const resolved = hasPlaceholder
    ? (activeLink ? text.replaceAll("[PAYMENT_LINK]", activeLink) : text)
    : text;

  const showMarketingActions = hasPlaceholder;
  const [copied, setCopied] = useState(false);

  function doCopy() {
    onCopy(resolved.replaceAll("[PAYMENT_LINK]", activeLink ?? ""));
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }
  function shareWA() {
    const msg = resolved.replaceAll("[PAYMENT_LINK]", activeLink ?? "");
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
  }

  return (
    <>
      <div>{hasPlaceholder && !activeLink ? text.replaceAll("[PAYMENT_LINK]", "[" + (lang === "en" ? "your payment link" : "kiungo chako cha malipo") + "]") : resolved}</div>
      {showMarketingActions && (
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {activeLink ? (
            <>
              <button onClick={doCopy} className="dy-btn dy-btn-ghost" style={{ width: "auto", padding: "6px 12px", fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 6 }}>
                {copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2.5} />}
                {copied ? (lang === "en" ? "Copied" : "Imenakiliwa") : (lang === "en" ? "Copy" : "Nakili")}
              </button>
              <button onClick={shareWA} className="dy-btn" style={{ background: "#25D366", color: "#fff", width: "auto", padding: "6px 12px", fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <MessageCircle size={13} strokeWidth={2.5} /> WhatsApp
              </button>
            </>
          ) : (
            <button onClick={onCreateLink} className="dy-btn dy-btn-primary" style={{ width: "auto", padding: "6px 12px", fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Link2 size={13} strokeWidth={2.5} /> {lang === "en" ? "Create a payment link first" : "Tengeneza kiungo cha malipo kwanza"}
            </button>
          )}
        </div>
      )}
    </>
  );
}

function ComposerFixed({
  input, setInput, busy, onSend, inputRef, placeholder,
}: {
  input: string; setInput: (v: string) => void; busy: boolean;
  onSend: () => void; inputRef: React.RefObject<HTMLTextAreaElement | null>; placeholder: string;
}) {
  return (
    <div className="dy-composer">
      <textarea
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
        }}
        rows={1}
        placeholder={placeholder}
        className="dy-composer-input"
      />
      <button
        onClick={onSend}
        disabled={busy || !input.trim()}
        aria-label="Send"
        className="dy-composer-send"
        style={{
          background: busy || !input.trim() ? "#B7C6E0" : "linear-gradient(135deg, #123274, #00A86B)",
          cursor: busy ? "default" : "pointer",
        }}
      >
        <Send size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
}