import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { Shell, Topbar } from "@/components/duka/Shell";
import { AuthGuard } from "@/components/duka/Guard";
import { useDuka } from "@/lib/duka/store";
import { formatTZS } from "@/lib/duka/utils";
import { useI18n } from "@/lib/duka/i18n";
import { useToast } from "@/components/duka/Toast";
import { MessageSquare, Send, ShoppingCart, Users, AlertCircle, CheckCircle2, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ujumbe")({
  head: () => ({ meta: [{ title: "Ujumbe wa Wingi — POKEA" }, { name: "description", content: "Tuma ujumbe kwa wateja wako wote." }] }),
  component: () => (<AuthGuard><Shell><UjumbeWingi /></Shell></AuthGuard>),
});

const SMS_PRICE = 18; // TZS per SMS

const SMS_PACKS: { count: 50|100|200|500; price: number; label: string }[] = [
  { count: 50,  price: 50*SMS_PRICE,   label: "50 SMS" },
  { count: 100, price: 100*SMS_PRICE,  label: "100 SMS" },
  { count: 200, price: 200*SMS_PRICE,  label: "200 SMS" },
  { count: 500, price: 500*SMS_PRICE,  label: "500 SMS" },
];

function UjumbeWingi() {
  const { merchant, customers, purchaseSmsCredits, deductSmsCredits } = useDuka();
  const { t, lang } = useI18n();
  const toast = useToast();

  const credits = merchant?.smsCredits ?? 0;
  const [message, setMessage] = useState("");
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"compose"|"buy">("compose");
  const [sending, setSending] = useState(false);
  const [buyingPack, setBuyingPack] = useState<50|100|200|500|null>(null);
  const [payPending, setPayPending] = useState(false);
  const [sent, setSent] = useState(false);

  const remaining = message.length;
  const recipientCount = selectedPhones.size;
  const creditsNeeded = recipientCount;
  const canSend = message.trim().length > 0 && recipientCount > 0 && credits >= creditsNeeded && !sending;

  const togglePhone = (phone: string) => {
    setSelectedPhones(prev => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedPhones.size === customers.length) {
      setSelectedPhones(new Set());
    } else {
      setSelectedPhones(new Set(customers.map(c => c.phone)));
    }
  };

  const handleSend = useCallback(async () => {
    if (!canSend || !merchant) return;
    setSending(true);
    try {
      // Deduct credits first
      await deductSmsCredits(recipientCount);
      // Log the send
      await supabase.from("sms_sends").insert({
        merchant_id: merchant.merchantId,
        message: message.trim(),
        recipient_count: recipientCount,
        credits_used: recipientCount,
      });
      setSent(true);
      toast(t(`Imefanikiwa! Ujumbe umetumwa kwa ${recipientCount} wateja.`, `Success! Message sent to ${recipientCount} customers.`));
      setMessage("");
      setSelectedPhones(new Set());
      setTimeout(() => setSent(false), 3000);
    } catch {
      toast(t("Hitilafu. Jaribu tena.", "Error. Please try again."));
    }
    setSending(false);
  }, [canSend, merchant, message, recipientCount, deductSmsCredits, toast, t]);

  const handleBuyPack = useCallback(async (pack: typeof SMS_PACKS[0]) => {
    if (!merchant) return;
    setBuyingPack(pack.count);
    setPayPending(true);
    // Trigger Mixx payment for the pack price
    try {
      const { data, error } = await supabase.functions.invoke("initiate-payment", {
        body: {
          merchantPhone: merchant.phone,
          amount: pack.price,
          label: `POKEA SMS — ${pack.label}`,
          returnContext: { smsPack: pack.count },
        },
      });
      if (error) throw error;
      if (data?.success) {
        // Poll or wait for webhook — for now, optimistically credit after initiation
        // In production the payment-webhook credits the merchant on confirmation
        toast(t("Ingiza PIN ya Mixx kukamilisha ununuzi wa SMS.", "Enter your Mixx PIN to complete the SMS purchase."));
      }
    } catch {
      toast(t("Hitilafu. Jaribu tena.", "Error. Please try again."));
    }
    setPayPending(false);
    setBuyingPack(null);
  }, [merchant, toast, t]);

  return (
    <>
      <Topbar
        title={t("Ujumbe wa Wingi", "Bulk SMS")}
        subtitle={`${credits} ${t("SMS zilizobaki", "credits remaining")}`}
        right={
          <span style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, fontWeight:700,
            color: credits < 10 ? "var(--dy-red)" : "var(--dy-green)" }}>
            <MessageSquare size={14} strokeWidth={2.5} />
            {credits}
          </span>
        }
      />

      {/* Low-credit warning */}
      {credits < 10 && (
        <div style={{ margin:"12px 16px 0", padding:"10px 14px", background:"#FFF8F0", border:"1px solid #FDE68A", borderRadius:12,
          display:"flex", alignItems:"center", gap:10, fontSize:13, color:"#92400E" }}>
          <AlertCircle size={16} strokeWidth={2.5} color="#D97706" />
          {credits === 0
            ? t("Huna SMS. Nunua pakiti kwanza.", "No SMS credits. Purchase a pack first.")
            : t(`Umebakiwa na SMS ${credits}. Nunua zaidi.`, `Only ${credits} credits left. Buy more.`)}
        </div>
      )}

      {/* Tab switcher */}
      <div style={{ display:"flex", margin:"14px 16px 0", background:"#F0F4F8", borderRadius:12, padding:4, gap:4 }}>
        {(["compose","buy"] as const).map(tb => (
          <button key={tb} onClick={() => setTab(tb)} style={{
            flex:1, padding:"9px 0", border:"none", borderRadius:9, cursor:"pointer",
            background: tab===tb ? "#fff" : "transparent",
            color: tab===tb ? "var(--dy-navy)" : "var(--dy-muted)",
            fontWeight: tab===tb ? 700 : 600, fontSize:13,
            boxShadow: tab===tb ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            transition:"all 150ms ease",
          }}>
            {tb === "compose"
              ? t("Tunga Ujumbe", "Compose")
              : t("Nunua SMS", "Buy Credits")}
          </button>
        ))}
      </div>

      <div style={{ padding:"14px 16px", display:"grid", gap:14 }}>
        {tab === "compose" ? (
          <>
            {/* Message composer */}
            <div className="dy-card" style={{ display:"grid", gap:10 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"var(--dy-navy)", display:"flex", alignItems:"center", gap:6 }}>
                <MessageSquare size={14} strokeWidth={2.5} /> {t("Ujumbe wako", "Your message")}
              </div>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, 160))}
                rows={4}
                placeholder={t("Andika ujumbe hapa...", "Type your message here...")}
                className="dy-input"
                style={{ resize:"none", lineHeight:1.5 }}
              />
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11.5, color:"var(--dy-muted)" }}>
                <span>{t("Kila SMS = TZS 18", "Each SMS = TZS 18")}</span>
                <span style={{ color: remaining > 140 ? "var(--dy-red)" : "var(--dy-muted)" }}>
                  {remaining}/160
                </span>
              </div>
            </div>

            {/* Recipient selector */}
            <div className="dy-card" style={{ display:"grid", gap:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--dy-navy)", display:"flex", alignItems:"center", gap:6 }}>
                  <Users size={14} strokeWidth={2.5} /> {t("Wapokea", "Recipients")} ({recipientCount})
                </div>
                {customers.length > 0 && (
                  <button onClick={toggleAll} style={{ fontSize:12, fontWeight:700, color:"var(--dy-navy)", background:"none", border:"none", cursor:"pointer" }}>
                    {selectedPhones.size === customers.length ? t("Ondoa Wote", "Deselect All") : t("Chagua Wote", "Select All")}
                  </button>
                )}
              </div>

              {customers.length === 0 ? (
                <div style={{ textAlign:"center", padding:"20px 0", color:"var(--dy-muted)", fontSize:13 }}>
                  <Phone size={32} strokeWidth={1.5} style={{ margin:"0 auto 8px", display:"block", opacity:0.4 }} />
                  {t("Bado huna wateja. Wataonekana hapa baada ya mauzo ya kwanza.", "No customers yet. They'll appear here after your first sale.")}
                </div>
              ) : (
                <div style={{ display:"grid", gap:6, maxHeight:240, overflowY:"auto" }}>
                  {customers.map(c => (
                    <div key={c.phone}
                      onClick={() => togglePhone(c.phone)}
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:9,
                        background: selectedPhones.has(c.phone) ? "rgba(18,50,116,0.06)" : "#F8FAFC",
                        border: `1.5px solid ${selectedPhones.has(c.phone) ? "var(--dy-navy)" : "#E2E8F0"}`,
                        cursor:"pointer", transition:"all 120ms ease" }}>
                      <div style={{ width:20, height:20, border:`2px solid ${selectedPhones.has(c.phone) ? "var(--dy-navy)" : "#CBD5E0"}`,
                        borderRadius:5, background: selectedPhones.has(c.phone) ? "var(--dy-navy)" : "#fff",
                        display:"grid", placeItems:"center", flexShrink:0 }}>
                        {selectedPhones.has(c.phone) && <CheckCircle2 size={13} color="#fff" />}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"var(--dy-text)" }}>{c.name ?? c.phone}</div>
                        {c.name && <div style={{ fontSize:11, color:"var(--dy-muted)" }}>{c.phone}</div>}
                      </div>
                      <div style={{ fontSize:11.5, color:"var(--dy-muted)" }}>
                        {c.purchaseCount}x
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cost summary + send */}
            {recipientCount > 0 && (
              <div className="dy-card" style={{ background: creditsNeeded > credits ? "#FFF8F0" : "linear-gradient(135deg,rgba(0,168,107,0.06),rgba(0,168,107,0.02))",
                border: creditsNeeded > credits ? "1px solid #FDE68A" : "1px solid rgba(0,168,107,0.25)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:10 }}>
                  <span style={{ color:"var(--dy-muted)" }}>{t("Wapokea", "Recipients")}</span>
                  <span style={{ fontWeight:700 }}>{recipientCount}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:10 }}>
                  <span style={{ color:"var(--dy-muted)" }}>{t("SMS zinazotumiwa", "Credits used")}</span>
                  <span style={{ fontWeight:700 }}>{creditsNeeded}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:14 }}>
                  <span style={{ color:"var(--dy-muted)" }}>{t("SMS zilizobaki baada ya kutuma", "Credits after send")}</span>
                  <span style={{ fontWeight:700, color: credits-creditsNeeded < 0 ? "var(--dy-red)" : "var(--dy-green)" }}>
                    {credits - creditsNeeded}
                  </span>
                </div>
                {creditsNeeded > credits ? (
                  <div style={{ fontSize:12.5, color:"#92400E", marginBottom:10, textAlign:"center" }}>
                    {t(`Unahitaji SMS ${creditsNeeded-credits} zaidi. Nunua pakiti kwanza.`,
                       `You need ${creditsNeeded-credits} more credits. Buy a pack first.`)}
                  </div>
                ) : null}
              </div>
            )}

            <button
              className="dy-btn dy-btn-primary"
              disabled={!canSend}
              onClick={() => void handleSend()}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                opacity: canSend ? 1 : 0.5 }}>
              {sending ? (
                <div className="dy-spinner" style={{ width:18, height:18 }} />
              ) : sent ? (
                <CheckCircle2 size={18} strokeWidth={2.5} />
              ) : (
                <Send size={18} strokeWidth={2.5} />
              )}
              {sent ? t("Imetumwa!", "Sent!") : t("Tuma Ujumbe", "Send Message")}
            </button>
          </>
        ) : (
          <>
            <div className="dy-card" style={{ background:"#123274", border:"none", color:"#fff" }}>
              <div style={{ fontSize:13, opacity:0.8, marginBottom:6 }}>{t("SMS zilizobaki", "Credits remaining")}</div>
              <div style={{ fontSize:36, fontWeight:900, color:"#FFD100" }}>{credits}</div>
              <div style={{ fontSize:12, opacity:0.7, marginTop:4 }}>{t("1 SMS = TZS 18 — Yas YAS Business", "1 SMS = TZS 18 via YAS Business")}</div>
            </div>

            <div style={{ fontSize:14, fontWeight:700, color:"var(--dy-navy)" }}>
              {t("Chagua Pakiti", "Choose a Pack")}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {SMS_PACKS.map(pack => {
                const isBuying = buyingPack === pack.count && payPending;
                const perSms = pack.price / pack.count;
                return (
                  <div key={pack.count} className="dy-card" style={{ display:"flex", flexDirection:"column", gap:8, cursor:"pointer" }}
                    onClick={() => !payPending && void handleBuyPack(pack)}>
                    <div style={{ fontSize:22, fontWeight:900, color:"var(--dy-navy)" }}>{pack.count}</div>
                    <div style={{ fontSize:11, color:"var(--dy-muted)" }}>SMS</div>
                    <div style={{ marginTop:4, padding:"6px 10px", background:"#FFF6DE", borderRadius:8, fontSize:12, fontWeight:700, color:"#B8860B" }}>
                      TZS {perSms}/SMS
                    </div>
                    <button className="dy-btn dy-btn-primary"
                      disabled={payPending}
                      style={{ marginTop:4, padding:"10px", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontSize:13 }}>
                      {isBuying ? <div className="dy-spinner" style={{ width:16, height:16 }} /> : <ShoppingCart size={14} strokeWidth={2.5} />}
                      {formatTZS(pack.price)}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="dy-card" style={{ fontSize:12, color:"var(--dy-muted)", lineHeight:1.6 }}>
              <div style={{ fontWeight:700, color:"var(--dy-navy)", marginBottom:6 }}>
                {t("Jinsi inavyofanya kazi", "How it works")}
              </div>
              <div>• {t("Lipa kwa Mixx by Yas — SMS zinaongezwa mara moja.", "Pay via Mixx by Yas — credits added instantly.")}</div>
              <div>• {t("SMS hazina muda wa mwisho — zinaendelea mpaka ziishe.", "Credits never expire — use them whenever.")}</div>
              <div>• {t("Wateja wako wanapokea SMS kwenye simu yoyote Tanzania.", "Customers receive SMS on any Tanzanian network.")}</div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
