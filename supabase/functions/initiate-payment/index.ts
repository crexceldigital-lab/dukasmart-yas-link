// ============================================================
// DUKA SMART — Initiate Payment Edge Function
// Deploy: supabase functions deploy initiate-payment
//
// Called by the public pay page when a buyer taps "Lipa Sasa".
// 1. Creates a pending transaction in the DB
// 2. Calls Mixx / M-Pesa to trigger an STK push to buyer's phone
// 3. Returns the transaction ID so the frontend can poll status
//
// Secrets (set in Supabase Dashboard > Edge Functions > Secrets):
//   MIXX_API_KEY        — from YAS Business portal
//   MIXX_API_SECRET     — from YAS Business portal
//   MIXX_BASE_URL       — e.g. https://api.mixx.co.tz/v1
//   MPESA_CONSUMER_KEY
//   MPESA_CONSUMER_SECRET
//   MPESA_SHORTCODE
//   MPESA_PASSKEY
//   MPESA_BASE_URL      — sandbox: https://sandbox.safaricom.co.ke
//   SUPABASE_URL        — auto-injected
//   SUPABASE_SERVICE_ROLE_KEY — auto-injected
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---- Mixx by YAS ----
async function initiateMixxPayment(opts: {
  phone: string;
  amount: number;
  txId: string;
  label: string;
}): Promise<{ ok: boolean; providerRef?: string; error?: string }> {
  const apiKey = Deno.env.get("MIXX_API_KEY");
  const apiSecret = Deno.env.get("MIXX_API_SECRET");
  const baseUrl = Deno.env.get("MIXX_BASE_URL") ?? "https://api.mixx.co.tz/v1";

  if (!apiKey || !apiSecret) {
    // No credentials yet — log and return simulated success for development
    console.warn("[mixx] No credentials configured — simulating success");
    return { ok: true, providerRef: "SIM-" + Math.random().toString(36).slice(2, 10).toUpperCase() };
  }

  try {
    const res = await fetch(`${baseUrl}/payments/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        "X-Api-Secret": apiSecret,
      },
      body: JSON.stringify({
        phone: opts.phone,
        amount: opts.amount,
        external_id: opts.txId,          // We store our UUID here so webhook can find it
        description: opts.label,
        currency: "TZS",
        callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook?provider=mixx`,
      }),
    });

    const data = await res.json();
    if (!res.ok || data.status === "error") {
      return { ok: false, error: data.message ?? "Mixx error" };
    }

    return { ok: true, providerRef: data.reference ?? data.transaction_id };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ---- M-Pesa Tanzania (STK Push) ----
async function getMpesaToken(): Promise<string> {
  const key = Deno.env.get("MPESA_CONSUMER_KEY")!;
  const secret = Deno.env.get("MPESA_CONSUMER_SECRET")!;
  const base = Deno.env.get("MPESA_BASE_URL") ?? "https://sandbox.safaricom.co.ke";

  const res = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: {
      Authorization: "Basic " + btoa(`${key}:${secret}`),
    },
  });
  const data = await res.json();
  return data.access_token;
}

async function initiateMpesaPayment(opts: {
  phone: string;
  amount: number;
  txId: string;
  label: string;
}): Promise<{ ok: boolean; providerRef?: string; error?: string }> {
  const shortcode = Deno.env.get("MPESA_SHORTCODE");
  const passkey = Deno.env.get("MPESA_PASSKEY");
  const base = Deno.env.get("MPESA_BASE_URL") ?? "https://sandbox.safaricom.co.ke";

  if (!shortcode || !passkey) {
    console.warn("[mpesa] No credentials — simulating");
    return { ok: true, providerRef: "MP-" + Math.random().toString(36).slice(2, 10).toUpperCase() };
  }

  try {
    const token = await getMpesaToken();
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    const res = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(opts.amount),
        PartyA: opts.phone,
        PartyB: shortcode,
        PhoneNumber: opts.phone,
        CallBackURL: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook?provider=mpesa`,
        AccountReference: opts.txId,
        TransactionDesc: opts.label.slice(0, 20),
      }),
    });

    const data = await res.json();
    if (data.ResponseCode !== "0") {
      return { ok: false, error: data.ResponseDescription ?? "M-Pesa error" };
    }
    return { ok: true, providerRef: data.CheckoutRequestID };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ---- Main handler ----
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  let body: {
    linkSlug: string;
    buyerPhone: string;
    buyerName?: string;
    provider?: "mixx" | "mpesa";
  };
  try { body = await req.json(); }
  catch { return new Response("Bad JSON", { status: 400, headers: corsHeaders }); }

  const { linkSlug, buyerPhone, buyerName, provider = "mixx" } = body;

  if (!linkSlug || !buyerPhone) {
    return new Response(JSON.stringify({ ok: false, error: "linkSlug and buyerPhone are required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch the payment link
  const { data: linkRows } = await supabase.rpc("get_link_with_merchant", { p_slug: linkSlug });
  const link = linkRows?.[0];
  if (!link) {
    return new Response(JSON.stringify({ ok: false, error: "Payment link not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch merchant_id for the link
  const { data: linkRow } = await supabase
    .from("payment_links")
    .select("id, merchant_id, product_id")
    .eq("slug", linkSlug)
    .eq("is_active", true)
    .single();

  if (!linkRow) {
    return new Response(JSON.stringify({ ok: false, error: "Link inactive or not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create pending transaction
  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .insert({
      merchant_id: linkRow.merchant_id,
      link_id: linkRow.id,
      product_id: linkRow.product_id ?? null,
      product_name: link.label,
      amount: link.amount,
      status: "pending",
      buyer_phone: buyerPhone.replace(/\D/g, ""),
      buyer_name: buyerName ?? null,
      provider,
    })
    .select()
    .single();

  if (txErr || !tx) {
    return new Response(JSON.stringify({ ok: false, error: txErr?.message ?? "Failed to create transaction" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Log initiation event
  await supabase.from("payment_events").insert({
    transaction_id: tx.id,
    merchant_id: linkRow.merchant_id,
    event: "initiated",
    raw_payload: { provider, phone: buyerPhone, amount: link.amount },
  });

  // Trigger STK push
  let result: { ok: boolean; providerRef?: string; error?: string };
  if (provider === "mpesa") {
    result = await initiateMpesaPayment({
      phone: buyerPhone.replace(/\D/g, ""),
      amount: link.amount,
      txId: tx.id,
      label: link.label,
    });
  } else {
    result = await initiateMixxPayment({
      phone: buyerPhone.replace(/\D/g, ""),
      amount: link.amount,
      txId: tx.id,
      label: link.label,
    });
  }

  if (!result.ok) {
    // Mark failed immediately if push call itself errored
    await supabase.rpc("fail_transaction", {
      p_tx_id: tx.id,
      p_reason: result.error,
    });
    return new Response(JSON.stringify({ ok: false, error: result.error }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Store provider ref on the transaction for tracing
  if (result.providerRef) {
    await supabase
      .from("transactions")
      .update({ provider_tx_id: result.providerRef })
      .eq("id", tx.id);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      transactionId: tx.id,
      providerRef: result.providerRef,
      // Simulated mode if no credentials
      simulated: !Deno.env.get("MIXX_API_KEY") && !Deno.env.get("MPESA_CONSUMER_KEY"),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
