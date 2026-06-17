import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const ContextSchema = z.object({
  businessName: z.string(),
  category: z.string().optional().default(""),
  city: z.string().optional().default(""),
  todayRevenue: z.number(),
  todayTransactionCount: z.number(),
  weekRevenue: z.number(),
  weekTransactionCount: z.number(),
  monthRevenue: z.number(),
  monthTransactionCount: z.number(),
  allTimeRevenue: z.number(),
  creditScore: z.number(),
  creditTier: z.string(),
  topProducts: z.array(z.object({ name: z.string(), unitsSold: z.number(), revenue: z.number() })),
  recentTransactions: z.array(z.object({ productName: z.string(), amount: z.number(), date: z.string(), status: z.string() })),
  allProducts: z.array(z.object({ name: z.string(), price: z.number(), stockStatus: z.string() })),
  previousWeekRevenue: z.number(),
  activePaymentLink: z.string().optional(),
  language: z.enum(["sw", "en"]).default("sw"),
});

const InputSchema = z.object({
  message: z.string().min(1),
  history: z.array(MessageSchema).default([]),
  context: ContextSchema,
});

function buildSystemPrompt(ctx: z.infer<typeof ContextSchema>): string {
  const langLine = ctx.language === "en"
    ? "The merchant has selected ENGLISH. Respond in English by default."
    : "The merchant has selected SWAHILI. Respond in Swahili by default.";
  return `You are Msaidizi, a friendly and sharp business assistant inside DUKA SMART, a POS app for Tanzanian youth entrepreneurs. You ALWAYS respond in Swahili unless the merchant writes in English, then you respond in English. You are warm but direct — like a smart friend who's good with numbers, not a corporate chatbot.

${langLine}

You have access to this merchant's real sales data:
${JSON.stringify(ctx, null, 2)}

Rules:
- Always reference SPECIFIC numbers from their actual data — never give generic advice.
- If asked "why did sales drop" or similar, compare current period to previous period and name the actual products/days involved.
- If asked to write a WhatsApp ad or promotional message, write it in Swahili by default, keep it under 40 words, include relevant emoji sparingly, make it sound like a real small business owner wrote it (not corporate), and ALWAYS end with a [PAYMENT_LINK] placeholder where their payment link would go.
- If asked about credit score / Afya ya Biashara, explain it using their actual score and tier, and give ONE specific actionable tip based on their weakest scoring factor.
- Keep responses SHORT — 2-4 sentences for data questions, slightly longer only for drafted marketing copy.
- Never invent numbers that aren't in the provided data.
- If the merchant asks something unrelated to their business, respond briefly and warmly, then gently redirect to how you can help with their shop.
- Use TZS formatting like "TZS 1,720,000".`;
}

export const msaidiziChat = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "missing_api_key", reply: "" };
    }

    const systemPrompt = buildSystemPrompt(data.context);
    const messages = [
      { role: "system", content: systemPrompt },
      ...data.history.slice(-12),
      { role: "user", content: data.message },
    ];

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
        }),
      });

      if (!res.ok) {
        const status = res.status;
        const text = await res.text().catch(() => "");
        return { ok: false as const, error: `gateway_${status}`, reply: "", detail: text.slice(0, 300) };
      }

      const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      const reply = json.choices?.[0]?.message?.content?.trim() ?? "";
      if (!reply) return { ok: false as const, error: "empty_reply", reply: "" };
      return { ok: true as const, reply };
    } catch (e) {
      return { ok: false as const, error: "network", reply: "", detail: e instanceof Error ? e.message : String(e) };
    }
  });