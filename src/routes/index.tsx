import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Topbar } from "@/components/duka/Shell";
import { AuthGuard } from "@/components/duka/Guard";
import { useDuka } from "@/lib/duka/store";
import { formatTZS, formatDate, getGreeting, getTier } from "@/lib/duka/utils";
import { StatusPill } from "@/components/duka/StatusPill";
import { PaymentLinkModal } from "@/components/duka/PaymentLinkModal";
import { useI18n } from "@/lib/duka/i18n";
import { Zap, Star, Gift, ReceiptText, CheckCircle2, Clock, XCircle, ArrowRight, Sparkles, Users, TrendingUp, Wallet } from "lucide-react";
import { useProGate } from "@/lib/duka/useProGate";
import { ProLockOverlay } from "@/components/duka/ProLockOverlay";
import { useRealtime } from "@/lib/duka/useRealtime";
import { useCountUp } from "@/lib/duka/useCountUp";
import { CreditRing } from "@/components/duka/CreditRing";
import { PaymentToast } from "@/components/duka/PaymentToast";
import { MsaidiziMarkFilled } from "@/components/duka/MsaidiziMark";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Nyumbani — DUKA SMART" },
    { name: "description", content: "Dashibodi yako ya biashara. Tazama mauzo, kuunda viungo vya malipo na zaidi." },
  ] }),
  component: () => (<AuthGuard><Shell><Dashboard /></Shell></AuthGuard>),
});

function Dashboard() {
  const { merchant, products, transactions, rewards, stats, customers, finance, refreshAll } = useDuka();
  const [paymentToast, setPaymentToast] = useState<string | null>(null);
  const [justArrivedTxId, setJustArrivedTxId] = useState<string | null>(null);
  useRealtime({
    merchantId: merchant?.merchantId,
    onTransactionUpdated: (tx) => {
      if (tx.status === "confirmed") {
        setPaymentToast(formatTZS(tx.amount as number));
        setJustArrivedTxId(tx.id as string);
        refreshAll();
      }
    },
    onProductUpdated: () => refreshAll(),
  });
  const { t, lang } = useI18n();
  const { isPro } = useProGate();
  const [open, setOpen] = useState(false);
  const animatedToday = useCountUp(stats.today.total);
  const animatedWeek = useCountUp(stats.week.total);
  if (!merchant) return null;
  const tier = getTier(merchant.creditScore);

  const top = [...products]
    .map(p => ({ ...p, revenue: (p.unitsSold ?? 0) * p.priceTzs }))
    .sort((a,b) => (b.unitsSold ?? 0) - (a.unitsSold ?? 0))
    .slice(0, 3);
  const medalColors = ["#FFD100", "#C0C0C0", "#CD7F32"];
  const recent = transactions.slice(0, 5);

  const topCustomers = customers.slice(0, 5);
  const customerCard = (
    <section className="dy-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={sectionTitle}><Users size={14} strokeWidth={2.5} style={iconInline} /> {t("Wateja Wako", "Your Customers")}</h3>
        {isPro && customers.length > 5 && (
          <Link to="/wateja" style={{ fontSize: 12, fontWeight: 700, color: "var(--dy-navy)", display: "inline-flex", alignItems: "center", gap: 4 }}>{t("Tazama Wote", "View All")} <ArrowRight size={12} strokeWidth={2.5} /></Link>
        )}
      </div>
      {topCustomers.length === 0 ? (
        <div style={{ padding: "20px 10px", textAlign: "center", color: "var(--dy-muted)", fontSize: 13 }}>
          {t("Bado hakuna wateja", "No customers yet")}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {topCustomers.map(c => (
            <div key={c.phone} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--dy-navy)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 13, flexShrink: 0 }}>
                {(c.name ?? c.phone).slice(0, 1).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name ?? `+${c.phone}`}</div>
              <div style={{ fontSize: 11.5, color: "var(--dy-muted)" }}>{c.purchaseCount} {t("ununuzi", "purchases")} • {formatDate(c.lastPurchase)}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--dy-green)" }}>{formatTZS(c.totalSpent)}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <>
      <Topbar
        title={merchant.businessName}
        subtitle={`${merchant.dukaId} • ${merchant.city}`}
        right={
          <span className="dy-pill" style={{ background: "rgba(0,168,107,0.2)", color: "#fff", border: `1px solid ${tier.color}` }}>
            <span className="dy-live-dot" style={{ marginRight: 1 }} />
            {lang === "en" ? tier.english : tier.swahili}
          </span>
        }
      />
      <div className="dy-stagger" style={{ padding: 16, display: "grid", gap: 14 }}>
        <div className="dy-hero" style={{ "--dy-i": 0 } as React.CSSProperties}>
          <div style={{ fontSize: 13, opacity: 0.85 }}>{getGreeting()}, {merchant.businessName.split(" ")[0]}</div>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>{t("Mauzo ya leo", "Today's sales")}</div>
          <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.02em", marginTop: 2 }}>{formatTZS(animatedToday)}</div>
          <div style={{ fontSize: 12.5, opacity: 0.8 }}>{stats.today.count} {t("miamala leo", "transactions today")}</div>
          <button className="dy-btn dy-btn-primary" style={{ marginTop: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={() => setOpen(true)}>
            <Zap size={16} strokeWidth={2.5} />
            {t("Unda Kiungo cha Malipo", "Create Payment Link")}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, "--dy-i": 1 } as React.CSSProperties}>
          <StatCard label={t("Wiki Hii", "This Week")} value={formatTZS(animatedWeek)} sub={`${stats.week.count} ${t("miamala", "txns")}`} accent="var(--dy-green)" />
          <StatCard label={t("Mwezi Huu", "This Month")} value={formatTZS(stats.month.total)} sub={`${stats.month.count} ${t("miamala", "txns")}`} />
          <StatCard label={t("Jumla Yote", "All Time")} value={formatTZS(stats.allTime.total)} sub={`${stats.allTime.count} ${t("miamala", "txns")}`} />
          <div className="dy-card" style={{ background: "linear-gradient(135deg, #123274, #1B49A6)", color: "#fff", border: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <CreditRing score={merchant.creditScore} size={52} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, opacity: 0.8, textTransform: "uppercase", letterSpacing: ".05em" }}>{t("Afya ya Biashara", "Business Health")}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#FFD100", marginTop: 2 }}>{lang === "en" ? tier.english : tier.swahili}</div>
            </div>
          </div>
        </div>

        {top.length > 0 && (
          <section className="dy-card" style={{ "--dy-i": 2 } as React.CSSProperties}>
            <h3 style={sectionTitle}><Star size={14} strokeWidth={2.5} style={iconInline} /> {t("Bidhaa Zinazouza", "Top Products")}</h3>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {top.map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", background: medalColors[i], color: "var(--dy-navy)", fontWeight: 900, fontSize: 13, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "var(--dy-muted)" }}>{p.unitsSold ?? 0} {t("zimeuzwa", "sold")}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--dy-green)" }}>{formatTZS(p.revenue)}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div style={{ "--dy-i": 3 } as React.CSSProperties}>
          {isPro ? customerCard : <ProLockOverlay message={t("Pandisha kuona wateja wako", "Upgrade to see your customers")}>{customerCard}</ProLockOverlay>}
        </div>

        <div style={{ "--dy-i": 4 } as React.CSSProperties}>
        {(() => {
          const profitCard = (
            <section className="dy-card" style={{ background: "linear-gradient(135deg, rgba(0,168,107,0.08), rgba(0,168,107,0.02))", border: "1px solid rgba(0,168,107,0.25)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--dy-green)", color: "#fff", display: "grid", placeItems: "center" }}>
                  <TrendingUp size={18} strokeWidth={2.5} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--dy-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>{t("Faida ya Mwezi Huu", "This Month's Profit")}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--dy-green)", marginTop: 2 }}>{formatTZS(finance.monthProfit)}</div>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--dy-muted)", marginTop: 8 }}>
                {t("Kutoka bidhaa zilizo na bei ya ununuzi", "From products with buying price set")}
              </div>
            </section>
          );
          return isPro ? profitCard : <ProLockOverlay message={t("Pandisha kuona faida yako", "Upgrade to see your profit")}>{profitCard}</ProLockOverlay>;
        })()}
        </div>

        <Link
          to="/matumizi"
          className="dy-card"
          style={{ "--dy-i": 5, textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 12 } as React.CSSProperties}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(231,76,60,0.12)", color: "var(--dy-red)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Wallet size={20} strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}>
              {t("Matumizi", "Expenses")}
              {!isPro && <span style={{ fontSize: 10, fontWeight: 900, background: "#F5A623", color: "#fff", padding: "2px 6px", borderRadius: 999 }}>PRO</span>}
            </div>
            <div style={{ fontSize: 12, color: "var(--dy-muted)", marginTop: 2 }}>
              {t("Fuatilia gharama za biashara yako", "Track your business expenses")}
            </div>
          </div>
          <ArrowRight size={18} strokeWidth={2.5} color="var(--dy-muted)" />
        </Link>

        {rewards.length > 0 && (
          <section className="dy-card" style={{ "--dy-i": 6 } as React.CSSProperties}>
            <h3 style={sectionTitle}><Gift size={14} strokeWidth={2.5} style={iconInline} /> {t("Zawadi za YAS", "YAS Rewards")}</h3>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {rewards.map(r => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#FFD100,#E0B400)", color: "#123274", display: "grid", placeItems: "center" }}><Gift size={20} strokeWidth={2.5} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--dy-yellow)" }}>{r.value}</div>
                    <div style={{ fontSize: 12, color: "var(--dy-muted)" }}>{r.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="dy-card" style={{ "--dy-i": 7 } as React.CSSProperties}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={sectionTitle}>{t("Miamala ya Hivi Karibuni", "Recent Transactions")}</h3>
            <Link to="/mauzo" style={{ fontSize: 12, fontWeight: 700, color: "var(--dy-navy)", display: "inline-flex", alignItems: "center", gap: 4 }}>{t("Yote", "All")} <ArrowRight size={12} strokeWidth={2.5} /></Link>
          </div>
          {recent.length === 0 ? (
            <div style={{ padding: "30px 10px", textAlign: "center" }}>
              <div style={{ display: "inline-flex", color: "var(--dy-muted)" }}><ReceiptText size={40} strokeWidth={1.5} /></div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>{t("Bado Hakuna Miamala", "No Transactions Yet")}</div>
              <p style={{ fontSize: 13, color: "var(--dy-muted)", marginTop: 4 }}>{t("Unda kiungo cha kwanza ili kuanza kuuza", "Create your first link to start selling")}</p>
              <button className="dy-btn dy-btn-primary" style={{ marginTop: 12, width: "auto", padding: "10px 18px", display: "inline-flex", alignItems: "center", gap: 8 }} onClick={() => setOpen(true)}>
                <Zap size={14} strokeWidth={2.5} /> {t("Unda Kiungo", "Create Link")}
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {recent.map(tx => {
                const Icon = tx.status === "confirmed" ? CheckCircle2 : tx.status === "pending" ? Clock : XCircle;
                const iconColor = tx.status === "confirmed" ? "var(--dy-green)" : tx.status === "pending" ? "var(--dy-yellow)" : "var(--dy-red)";
                const isNew = tx.id === justArrivedTxId;
                return (
                  <div key={tx.id} className={isNew ? "dy-row-new" : undefined} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon size={18} strokeWidth={2.5} color={iconColor} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.productName}</div>
                      <div style={{ fontSize: 11.5, color: "var(--dy-muted)" }}>{formatDate(tx.createdAt)}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--dy-green)" }}>{formatTZS(tx.amount)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <PaymentLinkModal open={open} onClose={() => setOpen(false)} />

      {paymentToast && (
        <PaymentToast
          message={t(`Malipo ya ${paymentToast} yamefika!`, `Payment of ${paymentToast} received!`)}
          onDone={() => setPaymentToast(null)}
        />
      )}

      <Link
        to="/msaidizi"
        aria-label={t("Msaidizi", "Assistant")}
        className="dy-fab-msaidizi"
      >
        <span className="dy-fab-msaidizi-ring" />
        <MsaidiziMarkFilled size={26} />
      </Link>
    </>
  );
}

const sectionTitle: React.CSSProperties = { fontSize: 14, fontWeight: 800, color: "var(--dy-text)" };
const iconInline: React.CSSProperties = { display: "inline-block", verticalAlign: "-2px", marginRight: 4, color: "var(--dy-navy)" };

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="dy-card">
      <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--dy-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, marginTop: 6, color: accent ?? "var(--dy-text)" }}>{value}</div>
      {sub ? <div style={{ fontSize: 11.5, color: "var(--dy-muted)" }}>{sub}</div> : null}
    </div>
  );
}