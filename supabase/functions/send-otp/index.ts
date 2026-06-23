// DUKA SMART — send-otp (Africa's Talking)
// Generates a 6-digit code, stores its HMAC hash in phone_otps, sends via AT SMS.
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

async function sendAT(phoneE164: string, otp: string, appName?: string | null): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("AFRICASTALKING_API_KEY")?.trim();
  const configuredUsername = Deno.env.get("AFRICASTALKING_USERNAME")?.trim();
  const senderId = Deno.env.get("AFRICASTALKING_SENDER_ID")?.trim();
  if (!apiKey) return { ok: false, error: "SMS gateway API key is not configured." };

  const message = `Msimbo wako wa DUKA SMART ni: ${otp}. Usimwambie mtu yeyote. Muda: dakika 5.`;
  const liveHost = "https://api.africastalking.com";
  const usernameCandidates = [
    configuredUsername,
    appName,
    appName?.replace(/-/g, "_"),
    appName?.replace(/[-_\s]/g, ""),
  ]
    .map((name) => name?.trim())
    .filter((name): name is string => Boolean(name && name.toLowerCase() !== "sandbox"));

  const usernames = Array.from(new Set(usernameCandidates));
  if (usernames.length === 0) {
    return {
      ok: false,
      error: "Real SMS is not configured: the SMS gateway is still in sandbox/test mode, which does not deliver OTPs to phones.",
    };
  }

  const attempt = async (user: string, includeSender: boolean) => {
    const params = new URLSearchParams({
      username: user,
      to: phoneE164,
      message,
      ...(includeSender && senderId ? { from: senderId } : {}),
    });
    const res = await fetch(`${liveHost}/version1/messaging`, {
      method: "POST",
      headers: { apiKey, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: params.toString(),
    });
    const text = await res.text();
    console.log("[send-otp] live AT attempt user=", user, "sender=", includeSender && Boolean(senderId), "status=", res.status);
    return { status: res.status, ok: res.ok, text, user };
  };

  const parseAttempt = (text: string) => {
    try {
      const json = JSON.parse(text) as {
        SMSMessageData?: { Message?: string; Recipients?: { status?: string; statusCode?: number; cost?: string; messageId?: string }[] };
      };
      console.log("[send-otp] live AT response:", text.slice(0, 500));
      const rec = json?.SMSMessageData?.Recipients?.[0];
      if (rec?.status === "Success") return { ok: true as const };
      return { ok: false as const, message: json?.SMSMessageData?.Message ?? rec?.status ?? "no recipient" };
    } catch {
      return { ok: false as const, message: `non-JSON: ${text.slice(0, 300)}` };
    }
  };

  let lastError = "SMS gateway rejected the request.";
  for (const username of usernames) {
    const first = await attempt(username, true);
    if (!first.ok) {
      lastError = `HTTP ${first.status}: ${first.text.slice(0, 180)}`;
      continue;
    }

    const parsed = parseAttempt(first.text);
    if (parsed.ok) return { ok: true };
    lastError = parsed.message;

    if (senderId && /InvalidSenderId/i.test(parsed.message)) {
      console.log("[send-otp] sender ID rejected; retrying live send without sender ID");
      const retry = await attempt(username, false);
      if (!retry.ok) {
        lastError = `HTTP ${retry.status}: ${retry.text.slice(0, 180)}`;
        continue;
      }
      const retryParsed = parseAttempt(retry.text);
      if (retryParsed.ok) return { ok: true };
      lastError = retryParsed.message;
    }
  }

  const sandboxHint = configuredUsername?.toLowerCase() === "sandbox"
    ? " The current username is sandbox/test mode, so replace it with the live SMS username/API key for real delivery."
    : "";
  return { ok: false, error: `SMS was not delivered by the live gateway: ${lastError}.${sandboxHint}` };
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