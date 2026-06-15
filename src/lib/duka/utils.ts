export function formatTZS(amount: number): string {
  if (amount == null || isNaN(amount)) return "TZS 0";
  return "TZS " + Math.round(amount).toLocaleString("en-TZ");
}

export function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const months = ["Jan","Feb","Mac","Apr","Mei","Jun","Jul","Ago","Sep","Okt","Nov","Des"];
  const hh = String(date.getHours()).padStart(2,"0");
  const mm = String(date.getMinutes()).padStart(2,"0");
  return `${date.getDate()} ${months[date.getMonth()]}, ${hh}:${mm}`;
}

export function normalizePhone(phone: string): string {
  let p = (phone || "").replace(/\D/g, "");
  if (p.startsWith("0")) p = "255" + p.slice(1);
  if (!p.startsWith("255") && p.length === 9) p = "255" + p;
  return p;
}

export type Tier = { swahili: string; english: string; color: string; min: number; max: number; benefit: string };
export const TIERS: Tier[] = [
  { swahili: "Mwanzo", english: "Starter",   color: "#95A5A6", min: 0,  max: 30,  benefit: "Anza kuuza mara kwa mara" },
  { swahili: "Inakua", english: "Growing",   color: "#F5A623", min: 31, max: 60,  benefit: "Upatikanaji wa ripoti za biashara" },
  { swahili: "Imara",  english: "Strong",    color: "#2E86DE", min: 61, max: 80,  benefit: "Mkopo wa hadi TZS 500,000 unakaribia" },
  { swahili: "Bora",   english: "Excellent", color: "#00A86B", min: 81, max: 100, benefit: "Stahili mkopo wa biashara na YAS Mixx" },
];
export function getTier(score: number): Tier {
  return TIERS.find(t => score >= t.min && score <= t.max) ?? TIERS[0];
}

export function getGreeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Habari za Asubuhi";
  if (h < 17) return "Habari za Mchana";
  return "Habari za Jioni";
}

export function categoryEmoji(c: string): string {
  const m: Record<string,string> = { Fashion:"👕", Food:"🍲", Electronics:"📱", Services:"🛠️", Other:"🛒" };
  return m[c] ?? "🛒";
}

export function slugify(s: string): string {
  return (s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40) || "kiungo";
}
