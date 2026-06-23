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

  // Try the host that matches the username first, then fall back to the other
  // host on auth failure (handles sandbox-key / live-username mismatches).
  const liveHost = "https://api.africastalking.com";
  const sandboxHost = "https://api.sandbox.africastalking.com";
  const primary = username === "sandbox" ? sandboxHost : liveHost;
  const secondary = username === "sandbox" ? liveHost : sandboxHost;

  const attempt = async (host: string, user: string) => {
    const params = new URLSearchParams({
      username: user, to: phoneE164, message,
      ...(senderId ? { from: senderId } : {}),
    });
    const res = await fetch(`${host}/version1/messaging`, {
      method: "POST",
      headers: { apiKey, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: params.toString(),
    });
    const text = await res.text();
    return { status: res.status, ok: res.ok, text, host, user };
  };

  // First attempt with configured username
  let r = await attempt(primary, username);
  console.log("[send-otp] AT attempt1", r.host, "user=", r.user, "status=", r.status);

  // On 401, try the other host (key may belong to the other environment)
  if (r.status === 401) {
    const r2 = await attempt(secondary, username);
    console.log("[send-otp] AT attempt2", r2.host, "user=", r2.user, "status=", r2.status);
    if (r2.ok || r2.status !== 401) r = r2;
    else {
      // Final attempt: if username is not "sandbox" but live host rejected,
      // try sandbox endpoint with the literal "sandbox" username (default app).
      if (username !== "sandbox") {
        const r3 = await attempt(sandboxHost, "sandbox");
        console.log("[send-otp] AT attempt3 sandbox/sandbox status=", r3.status);
        r = r3;
      }
    }
  }

  if (!r.ok) return { ok: false, error: `AT HTTP ${r.status}: ${r.text.slice(0, 300)}` };

  let json: { SMSMessageData?: { Recipients?: { status?: string; statusCode?: number; cost?: string }[] } };
  try { json = JSON.parse(r.text); } catch { return { ok: false, error: `AT non-JSON: ${r.text.slice(0, 300)}` }; }
  const rec = json?.SMSMessageData?.Recipients?.[0];
  if (!rec) return { ok: false, error: "AT returned no recipient — check Sender ID approval and credit balance" };
  if (rec.status !== "Success") return { ok: false, error: `AT recipient status: ${rec.status}` };
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