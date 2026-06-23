// DUKA SMART — verify-otp
// Validates the 6-digit code, finds/creates an auth user keyed by phone,
// rotates a server-side password, returns it so the client can signInWithPassword.
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

function randomPassword(): string {
  const a = new Uint8Array(24); crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/[^A-Za-z0-9]/g, "") + "Aa1!";
}

async function findUserByEmail(email: string) {
  // Paginate; small project so first pages are enough. Bump perPage if needed.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: CORS });

  let body: { phone?: string; code?: string };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ ok: false, error: "Bad JSON" }), { status: 400, headers: CORS }); }

  const digits = (body.phone ?? "").replace(/\D/g, "");
  const code = (body.code ?? "").replace(/\D/g, "");
  if (digits.length < 10 || code.length !== 6) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid input" }), { status: 400, headers: CORS });
  }

  // Fetch most recent unconsumed OTP for this phone
  const { data: row, error: selErr } = await supabase
    .from("phone_otps")
    .select("id, code_hash, expires_at, attempts, consumed")
    .eq("phone", digits)
    .eq("consumed", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selErr) {
    console.error("[verify-otp] select:", selErr);
    return new Response(JSON.stringify({ ok: false, error: "DB error" }), { status: 500, headers: CORS });
  }
  if (!row) return new Response(JSON.stringify({ ok: false, error: "No code requested" }), { status: 400, headers: CORS });
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await supabase.from("phone_otps").update({ consumed: true }).eq("id", row.id);
    return new Response(JSON.stringify({ ok: false, error: "Code expired" }), { status: 400, headers: CORS });
  }
  if (row.attempts >= 5) {
    await supabase.from("phone_otps").update({ consumed: true }).eq("id", row.id);
    return new Response(JSON.stringify({ ok: false, error: "Too many attempts" }), { status: 429, headers: CORS });
  }

  const secret = Deno.env.get("OTP_SECRET") ?? "fallback-secret";
  const expected = await hmac(secret, code + ":" + digits);

  // Constant-time compare
  let diff = expected.length ^ row.code_hash.length;
  for (let i = 0; i < Math.max(expected.length, row.code_hash.length); i++) {
    diff |= (expected.charCodeAt(i) || 0) ^ (row.code_hash.charCodeAt(i) || 0);
  }
  if (diff !== 0) {
    await supabase.from("phone_otps").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    return new Response(JSON.stringify({ ok: false, error: "Invalid code" }), { status: 400, headers: CORS });
  }

  // Consume the OTP
  await supabase.from("phone_otps").update({ consumed: true }).eq("id", row.id);

  // Find or create auth user (synthetic email)
  const email = `${digits}@phone.duka.app`;
  const password = randomPassword();

  let user = await findUserByEmail(email);
  if (!user) {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      phone: "+" + digits,
      user_metadata: { phone: digits, login_method: "phone-otp" },
    });
    if (createErr || !created.user) {
      console.error("[verify-otp] createUser:", createErr);
      return new Response(JSON.stringify({ ok: false, error: "User create failed" }), { status: 500, headers: CORS });
    }
    user = created.user;
  } else {
    const { error: updErr } = await supabase.auth.admin.updateUserById(user.id, { password });
    if (updErr) {
      console.error("[verify-otp] updateUser:", updErr);
      return new Response(JSON.stringify({ ok: false, error: "Password rotate failed" }), { status: 500, headers: CORS });
    }
  }

  return new Response(JSON.stringify({ ok: true, email, password }), { headers: CORS });
});