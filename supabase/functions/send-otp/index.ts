// DUKA SMART — send-otp (Africa's Talking)
// Generates a 6-digit code, stores its HMAC hash in phone_otps, sends via AT SMS.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

async function sendAT(phoneE164: string, otp: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("AFRICASTALKING_API_KEY");
  const username = Deno.env.get("AFRICASTALKING_USERNAME") ?? "sandbox";
  const senderId = Deno.env.get("AFRICASTALKING_SENDER_ID");
  if (!apiKey) return { ok: false, error: "AFRICASTALKING_API_KEY not set" };

  const message = `Msimbo wako wa DUKA SMART ni: ${otp}. Usimwambie mtu yeyote. Muda: dakika 5.`;
  const params = new URLSearchParams({
    username, to: phoneE164, message,
    ...(senderId ? { from: senderId } : {}),
  });

  const host = username === "sandbox"
    ? "https://api.sandbox.africastalking.com"
    : "https://api.africastalking.com";

  const res = await fetch(`${host}/version1/messaging`, {
    method: "POST",
    headers: { apiKey, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: params.toString(),
  });
  const text = await res.text();
  if (!res.ok) return { ok: false, error: `AT HTTP ${res.status}: ${text}` };
  let json: { SMSMessageData?: { Recipients?: { status?: string; statusCode?: number }[] } };
  try { json = JSON.parse(text); } catch { return { ok: false, error: `AT non-JSON: ${text}` }; }
  const r = json?.SMSMessageData?.Recipients?.[0];
  if (!r || r.status !== "Success") return { ok: false, error: r?.status ?? "AT send failed" };
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: CORS });

  let body: { phone?: string };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ ok: false, error: "Bad JSON" }), { status: 400, headers: CORS }); }

  const digits = (body.phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid phone" }), { status: 400, headers: CORS });
  }
  const phoneE164 = "+" + digits;

  const otp = genOtp();
  const secret = Deno.env.get("OTP_SECRET") ?? "fallback-secret";
  const code_hash = await hmac(secret, otp + ":" + digits);
  const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Invalidate previous unconsumed OTPs for this phone, then insert new one.
  await supabase.from("phone_otps").update({ consumed: true }).eq("phone", digits).eq("consumed", false);
  const { error: insErr } = await supabase.from("phone_otps").insert({ phone: digits, code_hash, expires_at });
  if (insErr) {
    console.error("[send-otp] db insert:", insErr);
    return new Response(JSON.stringify({ ok: false, error: "DB error" }), { status: 500, headers: CORS });
  }

  const sent = await sendAT(phoneE164, otp);
  if (!sent.ok) {
    console.error("[send-otp] AT:", sent.error);
    return new Response(JSON.stringify({ ok: false, error: sent.error }), { status: 502, headers: CORS });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: CORS });
});