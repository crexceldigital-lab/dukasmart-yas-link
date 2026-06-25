import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Shell, Topbar } from "@/components/duka/Shell";
import { AuthGuard } from "@/components/duka/Guard";
import { useDuka, type ExpenseCategory } from "@/lib/duka/store";
import { formatTZS, formatDate } from "@/lib/duka/utils";
import { Modal } from "@/components/duka/Modal";
import { useToast } from "@/components/duka/Toast";
import { useI18n } from "@/lib/duka/i18n";
import { useProGate } from "@/lib/duka/useProGate";
import { Wallet, Plus, Trash2, Lock, Sparkles, Home as HomeIcon, Truck, Package, Users as UsersIcon, Zap, MoreHorizontal, TrendingUp, TrendingDown, Save } from "lucide-react";

export const Route = createFileRoute("/matumizi")({
  head: () => ({ meta: [{ title: "Matumizi — POKEA" }, { name: "description", content: "Fuatilia matumizi ya biashara yako." }] }),
  component: () => (<AuthGuard><Shell><Matumizi /></Shell></AuthGuard>),
});

const CATEGORIES: { key: ExpenseCategory; sw: string; en: string; icon: typeof HomeIcon; color: string }[] = [
  { key: "rent",      sw: "Kodi",       en: "Rent",      icon: HomeIcon,        color: "#6366F1" },
  { key: "transport", sw: "Usafiri",    en: "Transport", icon: Truck,           color: "#F59E0B" },
  { key: "supplies",  sw: "Vifaa",      en: "Supplies",  icon: Package,         color: "#10B981" },
  { key: "wages",     sw: "Mishahara",  en: "Wages",     icon: UsersIcon,       color: "#3B82F6" },
  { key: "utilities", sw: "Umeme/Maji", en: "Utilities", icon: Zap,             color: "#EF4444" },
  { key: "other",     sw: "Mengine",    en: "Other",     icon: MoreHorizontal,  color: "#6B7280" },
];

function catMeta(key: ExpenseCategory) {
  return CATEGORIES.find(c => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}

function Matumizi() {
  const { t } = useI18n();
  const { isPro, openUpgrade } = useProGate();
  const { expenses, stats, finance, addExpense, deleteExpense } = useDuka();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  if (!isPro) {
    return (
      <>
        <Topbar title={t("Matumizi", "Expenses")} />
        <div style={{ padding: 24, display: "grid", placeItems: "center", gap: 16, marginTop: 40, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F5A623", color: "#fff", display: "grid", placeItems: "center", boxShadow: "0 8px 20px rgba(245,166,35,0.35)" }}>
            <Lock size={28} strokeWidth={2.5} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "var(--dy-navy)" }}>{t("Kipengele cha Pro", "Pro Feature")}</div>
          <p style={{ fontSize: 14, color: "var(--dy-muted)", lineHeight: 1.5, maxWidth: 320 }}>
            {t("Fuatilia matumizi yako ya biashara — kodi, usafiri, vifaa na zaidi — kwa kupandisha hadi Pro.", "Track your business expenses — rent, transport, supplies and more — by upgrading to Pro.")}
          </p>
          <button className="dy-btn" onClick={openUpgrade} style={{ background: "var(--dy-navy)", color: "#fff", width: "auto", padding: "12px 22px", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} strokeWidth={2.5} /> {t("Pandisha hadi Pro", "Upgrade to Pro")}
          </button>
        </div>
      </>
    );
  }

  const monthRevenue = stats.month.total;
  const netProfit = monthRevenue - finance.monthCostOfGoods - finance.monthExpenses;
  const netPositive = netProfit >= 0;

  const pctDiff = finance.prevMonthExpenses > 0
    ? Math.round(((finance.monthExpenses - finance.prevMonthExpenses) / finance.prevMonthExpenses) * 100)
    : null;

  const byCategory = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const ms = new Date(y, m, 1).getTime();
    const me = new Date(y, m + 1, 1).getTime();
    const totals = new Map<ExpenseCategory, number>();
    for (const e of expenses) {
      const ts = new Date(e.date).getTime();
      if (ts < ms || ts >= me) continue;
      totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    }
    const total = Array.from(totals.values()).reduce((a, b) => a + b, 0);
    return { totals, total };
  }, [expenses]);

  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      <Topbar title={t("Matumizi", "Expenses")} subtitle={t("Fuatilia gharama zako", "Track your costs")} />
      <div style={{ padding: 16, display: "grid", gap: 14 }}>
        <div className="dy-hero">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Wallet size={18} />
            <div style={{ fontSize: 13, opacity: 0.85 }}>{t("Matumizi ya Mwezi Huu", "This Month's Expenses")}</div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-0.02em", marginTop: 6 }}>{formatTZS(finance.monthExpenses)}</div>
          {pctDiff != null && (
            <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
              {pctDiff >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {Math.abs(pctDiff)}% {pctDiff >= 0 ? t("zaidi", "more") : t("kidogo", "less")} {t("kuliko mwezi uliopita", "than last month")}
            </div>
          )}
        </div>

        {/* Net profit breakdown */}
        <section className="dy-card" style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--dy-text)" }}>{t("Faida Halisi ya Mwezi Huu", "This Month's Net Profit")}</div>
          <Row label={t("Mauzo", "Revenue")} value={formatTZS(monthRevenue)} color="var(--dy-green)" />
          <Row label={t("− Gharama za Bidhaa", "− Cost of Goods")} value={formatTZS(finance.monthCostOfGoods)} color="var(--dy-muted)" />
          <Row label={t("− Matumizi", "− Expenses")} value={formatTZS(finance.monthExpenses)} color="var(--dy-red)" />
          <div style={{ height: 1, background: "var(--dy-border)", margin: "4px 0" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>{t("Faida Halisi", "Net Profit")}</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: netPositive ? "var(--dy-green)" : "var(--dy-red)" }}>{formatTZS(netProfit)}</span>
          </div>
        </section>

        {/* Category breakdown */}
        {byCategory.total > 0 && (
          <section className="dy-card" style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{t("Mgawanyiko wa Matumizi", "Expense Breakdown")}</div>
            <div style={{ display: "flex", height: 10, borderRadius: 999, overflow: "hidden", background: "#F0F4F8" }}>
              {CATEGORIES.map(c => {
                const amt = byCategory.totals.get(c.key) ?? 0;
                if (amt <= 0) return null;
                const pct = (amt / byCategory.total) * 100;
                return <div key={c.key} style={{ width: `${pct}%`, background: c.color }} title={`${c.sw}: ${pct.toFixed(0)}%`} />;
              })}
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {CATEGORIES.map(c => {
                const amt = byCategory.totals.get(c.key) ?? 0;
                if (amt <= 0) return null;
                const pct = Math.round((amt / byCategory.total) * 100);
                return (
                  <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{t(c.sw, c.en)}</span>
                    <span style={{ fontWeight: 700, color: "var(--dy-muted)" }}>{pct}%</span>
                    <span style={{ fontWeight: 800, minWidth: 80, textAlign: "right" }}>{formatTZS(amt)}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Expense list */}
        <section className="dy-card" style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{t("Orodha ya Matumizi", "Expense List")}</div>
            <div style={{ fontSize: 12, color: "var(--dy-muted)" }}>{expenses.length}</div>
          </div>
          {sortedExpenses.length === 0 ? (
            <div style={{ padding: "30px 10px", textAlign: "center" }}>
              <Wallet size={40} strokeWidth={1.5} color="var(--dy-muted)" />
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>
                {t("Bado hakuna matumizi yaliyorekodiwa.", "No expenses recorded yet.")}
              </div>
              <p style={{ fontSize: 12.5, color: "var(--dy-muted)", marginTop: 4 }}>
                {t("Anza kufuatilia gharama zako.", "Start tracking your costs.")}
              </p>
              <button className="dy-btn dy-btn-primary" style={{ marginTop: 12, width: "auto", padding: "10px 18px", display: "inline-flex", alignItems: "center", gap: 8 }} onClick={() => setOpen(true)}>
                <Plus size={14} strokeWidth={2.5} /> {t("Ongeza Matumizi", "Add Expense")}
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {sortedExpenses.map(e => {
                const c = catMeta(e.category);
                const Icon = c.icon;
                return (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: c.color + "22", color: c.color, display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <Icon size={16} strokeWidth={2.5} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t(c.sw, c.en)}{e.note ? ` • ${e.note}` : ""}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--dy-muted)" }}>{formatDate(e.date)}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--dy-red)" }}>−{formatTZS(e.amount)}</div>
                    <button
                      onClick={() => { if (confirm(t("Futa matumizi haya?", "Delete this expense?"))) { deleteExpense(e.id); toast(t("Imefutwa", "Deleted")); } }}
                      style={{ background: "transparent", border: "none", color: "var(--dy-muted)", cursor: "pointer", padding: 4, display: "inline-flex" }}
                      aria-label="delete"
                    >
                      <Trash2 size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Floating add button */}
      <button
        onClick={() => setOpen(true)}
        aria-label={t("Ongeza Matumizi", "Add Expense")}
        style={{
          position: "fixed", right: 16, bottom: 80, zIndex: 40,
          background: "var(--dy-navy)", color: "#fff", border: "none",
          borderRadius: 999, padding: "14px 18px", fontWeight: 800, fontSize: 14,
          boxShadow: "0 8px 20px rgba(18,50,116,0.35)", cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 8,
        }}
      >
        <Plus size={18} strokeWidth={2.5} /> {t("Ongeza", "Add")}
      </button>

      <AddExpenseSheet
        open={open} onClose={() => setOpen(false)}
        onSave={(data) => {
          addExpense(data);
          toast(t("Matumizi yamehifadhiwa", "Expense saved"));
          setOpen(false);
        }}
      />
    </>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13, color: "var(--dy-muted)" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 800, color: color ?? "var(--dy-text)" }}>{value}</span>
    </div>
  );
}

function todayStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function AddExpenseSheet({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (data: { amount: number; category: ExpenseCategory; note?: string; date: string }) => void }) {
  const { t } = useI18n();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("supplies");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());

  // reset on open
  useMemo(() => {
    if (open) { setAmount(""); setCategory("supplies"); setNote(""); setDate(todayStr()); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    onSave({ amount: amt, category, note: note.trim() || undefined, date });
  };

  return (
    <Modal open={open} onClose={onClose} title={t("Ongeza Matumizi", "Add Expense")} subtitle={t("Rekodi gharama mpya ya biashara", "Record a new business expense")}>
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <label className="dy-label">{t("Kiasi (TZS) *", "Amount (TZS) *")}</label>
          <input className="dy-input" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="50000" autoFocus />
        </div>
        <div>
          <label className="dy-label">{t("Aina", "Category")}</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {CATEGORIES.map(c => {
              const Icon = c.icon;
              const active = category === c.key;
              return (
                <button key={c.key} type="button" onClick={() => setCategory(c.key)}
                  style={{
                    background: active ? c.color + "22" : "#F0F4F8",
                    border: active ? `1.5px solid ${c.color}` : "1.5px solid transparent",
                    color: "var(--dy-text)", borderRadius: 10, padding: "10px 6px",
                    display: "grid", placeItems: "center", gap: 4, cursor: "pointer",
                  }}>
                  <Icon size={18} strokeWidth={2.5} color={c.color} />
                  <span style={{ fontSize: 11.5, fontWeight: 700 }}>{t(c.sw, c.en)}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="dy-label">{t("Maelezo (Hiari)", "Note (Optional)")}</label>
          <input className="dy-input" value={note} onChange={e => setNote(e.target.value)} placeholder={t("k.m. Bajaji kwenda sokoni", "e.g. Boda to market")} />
        </div>
        <div>
          <label className="dy-label">{t("Tarehe", "Date")}</label>
          <input className="dy-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <button className="dy-btn dy-btn-primary" onClick={submit} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Save size={16} strokeWidth={2.5} /> {t("Hifadhi Matumizi", "Save Expense")}
        </button>
      </div>
    </Modal>
  );
}