// POKEA — send-otp
// Generates 6-digit OTP, stores HMAC hash, sends via Africa's Talking.
// Demo fallback: when DEMO_OTP_MODE=true OR no AT credentials configured,
// returns the code in the response so login works end-to-end in sandbox.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-app-name",
  "Content-Type": "application/json",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function hmac(secret: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function genOtp(): string {
  const a = new Uint32Array(1); crypto.getRandomValues(a);
  return String(100000 + (a[0] % 900000));
}

type SendResult = { ok: boolean; channel: "sms" | "demo"; error?: string; demoCode?: string };

async function sendAT(phoneE164: string, otp: string): Promise<{ ok: boolean; error?: string }> {
  const username = (Deno.env.get("AT_USERNAME")?.trim() || Deno.env.get("AFRICASTALKING_USERNAME")?.trim() || "").replace(/^sandbox$/i, "");
  const apiKey = Deno.env.get("AT_API_KEY")?.trim() || Deno.env.get("AFRICASTALKING_API_KEY")?.trim();
  const senderId = Deno.env.get("AT_SENDER_ID")?.trim() || Deno.env.get("AFRICASTALKING_SENDER_ID")?.trim();
  if (!username || !apiKey) return { ok: false, error: "AT credentials missing" };

  const message = `Msimbo wako wa POKEA ni: ${otp}. Usimwambie mtu yeyote. Muda: dakika 5.`;
  const params = new URLSearchParams({ username, to: phoneE164, message, ...(senderId ? { from: senderId } : {}) });
  const res = await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: { apiKey, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: params.toString(),
  });
  const text = await res.text();
  console.log("[send-otp] AT status=", res.status, "body=", text.slice(0, 300));
  if (!res.ok) return { ok: false, error: `Gateway HTTP ${res.status}` };
  try {
    const json = JSON.parse(text) as { SMSMessageData?: { Message?: string; Recipients?: { status?: string }[] } };
    const rec = json?.SMSMessageData?.Recipients?.[0];
    if (rec?.status === "Success") return { ok: true };
    return { ok: false, error: json?.SMSMessageData?.Message || rec?.status || "Send failed" };
  } catch {
    return { ok: false, error: "Bad gateway response" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: CORS });

  let body: { phone?: string };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ ok: false, error: "Bad JSON" }), { status: 400, headers: CORS }); }

  const digits = (body.phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return new Response(JSON.stringify({ ok: false, error: "Invalid phone" }), { status: 400, headers: CORS });
  const phoneE164 = "+" + digits;

  const otp = genOtp();
  const secret = Deno.env.get("OTP_SECRET") ?? "fallback-secret";
  const code_hash = await hmac(secret, otp + ":" + digits);
  const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  await supabase.from("phone_otps").update({ consumed: true }).eq("phone", digits).eq("consumed", false);
  const { error: insErr } = await supabase.from("phone_otps").insert({ phone: digits, code_hash, expires_at });
  if (insErr) {
    console.error("[send-otp] db insert:", insErr);
    return new Response(JSON.stringify({ ok: false, error: "DB error" }), { status: 500, headers: CORS });
  }

  const demoMode = (Deno.env.get("DEMO_OTP_MODE") ?? "").toLowerCase() === "true";
  const hasAT = Boolean(
    (Deno.env.get("AT_USERNAME")?.trim() || Deno.env.get("AFRICASTALKING_USERNAME")?.trim()) &&
    (Deno.env.get("AT_API_KEY")?.trim() || Deno.env.get("AFRICASTALKING_API_KEY")?.trim())
  );

  // Demo fallback path: skip SMS, return code so user can complete login.
  if (demoMode || !hasAT) {
    const result: SendResult = { ok: true, channel: "demo", demoCode: otp };
    console.log("[send-otp] demo mode active, returning code in response");
    return new Response(JSON.stringify(result), { headers: CORS });
  }

  const sent = await sendAT(phoneE164, otp);
  if (!sent.ok) {
    console.error("[send-otp] AT failed:", sent.error);
    // Keep OTP valid; surface failure so UI can show banner.
    const result: SendResult = { ok: false, channel: "sms", error: sent.error ?? "SMS delivery failed" };
    return new Response(JSON.stringify(result), { status: 200, headers: CORS });
  }

  const result: SendResult = { ok: true, channel: "sms" };
  return new Response(JSON.stringify(result), { headers: CORS });
});
