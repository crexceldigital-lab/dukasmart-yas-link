import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Topbar } from "@/components/duka/Shell";
import { AuthGuard } from "@/components/duka/Guard";
import { useDuka } from "@/lib/duka/store";
import { formatTZS, formatDate, getGreeting, getTier } from "@/lib/duka/utils";
import { StatusPill } from "@/components/duka/StatusPill";
import { PaymentLinkModal } from "@/components/duka/PaymentLinkModal";
import { useI18n } from "@/lib/duka/i18n";
import { Zap, Star, Gift, ReceiptText, CheckCircle2, Clock, XCircle, ArrowRight, Sparkles, Users } from "lucide-react";
import { useProGate } from "@/lib/duka/useProGate";
import { ProLockOverlay } from "@/components/duka/ProLockOverlay";
import { formatDate as fmtDate } from "@/lib/duka/utils";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Nyumbani — DUKA SMART" },
    { name: "description", content: "Dashibodi yako ya biashara. Tazama mauzo, kuunda viungo vya malipo na zaidi." },
  ] }),
  component: () => (<AuthGuard><Shell><Dashboard /></Shell></AuthGuard>),
});

function Dashboard() {
  const { merchant, products, transactions, rewards, stats, customers } = useDuka();
  const { t, lang } = useI18n();
  const { isPro } = useProGate();
  const [open, setOpen] = useState(false);
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
                <div style={{ fontSize: 11.5, color: "var(--dy-muted)" }}>{c.purchaseCount} {t("ununuzi", "purchases")} • {fmtDate(c.lastPurchase)}</div>
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
        right={<span className="dy-pill" style={{ background: "rgba(0,168,107,0.2)", color: "#fff", border: `1px solid ${tier.color}` }}>{lang === "en" ? tier.english : tier.swahili}</span>}
      />
      <div style={{ padding: 16, display: "grid", gap: 14 }}>
        <div className="dy-hero">
          <div style={{ fontSize: 13, opacity: 0.85 }}>{getGreeting()}, {merchant.businessName.split(" ")[0]}</div>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>{t("Mauzo ya leo", "Today's sales")}</div>
          <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.02em", marginTop: 2 }}>{formatTZS(stats.today.total)}</div>
          <div style={{ fontSize: 12.5, opacity: 0.8 }}>{stats.today.count} {t("miamala leo", "transactions today")}</div>
          <button className="dy-btn dy-btn-primary" style={{ marginTop: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={() => setOpen(true)}>
            <Zap size={16} strokeWidth={2.5} />
            {t("Unda Kiungo cha Malipo", "Create Payment Link")}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <StatCard label={t("Wiki Hii", "This Week")} value={formatTZS(stats.week.total)} sub={`${stats.week.count} ${t("miamala", "txns")}`} accent="var(--dy-green)" />
          <StatCard label={t("Mwezi Huu", "This Month")} value={formatTZS(stats.month.total)} sub={`${stats.month.count} ${t("miamala", "txns")}`} />
          <StatCard label={t("Jumla Yote", "All Time")} value={formatTZS(stats.allTime.total)} sub={`${stats.allTime.count} ${t("miamala", "txns")}`} />
          <div className="dy-card" style={{ background: "linear-gradient(135deg, #123274, #1B49A6)", color: "#fff", border: "none" }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, opacity: 0.8, textTransform: "uppercase", letterSpacing: ".06em" }}>{t("Afya ya Biashara", "Business Health")}</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>{merchant.creditScore}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#FFD100", marginTop: 2 }}>{lang === "en" ? tier.english : tier.swahili}</div>
          </div>
        </div>

        {top.length > 0 && (
          <section className="dy-card">
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

        {isPro ? customerCard : <ProLockOverlay message={t("Pandisha kuona wateja wako", "Upgrade to see your customers")}>{customerCard}</ProLockOverlay>}

        {rewards.length > 0 && (
          <section className="dy-card">
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

        <section className="dy-card">
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
              {recent.map(t => {
                const Icon = t.status === "confirmed" ? CheckCircle2 : t.status === "pending" ? Clock : XCircle;
                const iconColor = t.status === "confirmed" ? "var(--dy-green)" : t.status === "pending" ? "var(--dy-yellow)" : "var(--dy-red)";
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon size={18} strokeWidth={2.5} color={iconColor} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.productName}</div>
                      <div style={{ fontSize: 11.5, color: "var(--dy-muted)" }}>{formatDate(t.createdAt)}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--dy-green)" }}>{formatTZS(t.amount)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <PaymentLinkModal open={open} onClose={() => setOpen(false)} />

      <Link
        to="/msaidizi"
        aria-label={t("Msaidizi", "Assistant")}
        style={{
          position: "fixed",
          right: 16,
          bottom: 80,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #123274, #00A86B)",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          boxShadow: "0 8px 20px rgba(18,50,116,0.35)",
          zIndex: 40,
          textDecoration: "none",
        }}
      >
        <Sparkles size={24} strokeWidth={2.5} />
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