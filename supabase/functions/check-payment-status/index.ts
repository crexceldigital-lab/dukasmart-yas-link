// DUKA SMART — check-payment-status
// Public endpoint used by the pay page to poll a transaction's status.
// Returns ONLY the status field — never buyer phone, name, or provider IDs.
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: CORS });

  let body: { transactionId?: string };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ ok: false, error: "Bad JSON" }), { status: 400, headers: CORS });
  }

  const id = (body.transactionId ?? "").trim();
  if (!UUID_RE.test(id)) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid id" }), { status: 400, headers: CORS });
  }

  const { data, error } = await supabase
    .from("transactions")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[check-payment-status]", error);
    return new Response(JSON.stringify({ ok: false, error: "DB error" }), { status: 500, headers: CORS });
  }
  if (!data) {
    return new Response(JSON.stringify({ ok: false, error: "Not found" }), { status: 404, headers: CORS });
  }

  return new Response(JSON.stringify({ ok: true, status: data.status }), { headers: CORS });
});