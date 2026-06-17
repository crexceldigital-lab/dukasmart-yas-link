import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { slugify } from "./utils";

export type Merchant = {
  merchantId: string;
  dukaId: string;
  phone: string;
  businessName: string;
  category: string;
  city: string;
  bio: string;
  profilePhoto?: string;
  creditScore: number;
  createdAt: string;
  plan?: "free" | "pro";
  proRenewalDate?: string | null;
  customSlug?: string | null;
  staffPhones?: string[];
};

export type Product = {
  id: string;
  name: string;
  priceTzs: number;
  description?: string;
  photoUrl?: string;
  stockCount?: number;
  isAvailable: boolean;
  unitsSold?: number;
};

export type TxStatus = "confirmed" | "pending" | "failed";
export type Transaction = {
  id: string;
  productId?: string;
  productName: string;
  amount: number;
  status: TxStatus;
  buyerPhone?: string;
  buyerName?: string;
  createdAt: string;
  confirmedAt?: string;
  ref?: string;
};

export type PaymentLink = {
  linkId: string;
  slug: string;
  amount: number;
  label: string;
  productId?: string;
  productPhoto?: string;
  productDescription?: string;
  createdAt: string;
};

export type Reward = { id: string; label: string; value: string; createdAt: string };

export type SessionRole = "owner" | "staff";

export type Customer = {
  phone: string;
  name?: string;
  totalSpent: number;
  purchaseCount: number;
  lastPurchase: string;
};

const DEMO_MERCHANT: Merchant = {
  merchantId: "a0000000-0000-0000-0000-000000000001",
  dukaId: "DY-00001",
  phone: "0711000001",
  businessName: "African Boy",
  category: "Fashion",
  city: "Dar es Salaam",
  bio: "The original East African streetwear brand. Quality drip, real culture.",
  creditScore: 78,
  createdAt: "2026-01-01T00:00:00Z",
  plan: "free",
  proRenewalDate: null,
  customSlug: null,
  staffPhones: [],
};

const DEMO_PRODUCTS: Product[] = [
  { id: "p1", name: "AB Classic Hoodie",  priceTzs: 65000,  isAvailable: true,  unitsSold: 42, stockCount: 12 },
  { id: "p2", name: "AB Graphic Tee",     priceTzs: 35000,  isAvailable: true,  unitsSold: 67, stockCount: 28 },
  { id: "p3", name: "AB Cap Snapback",    priceTzs: 25000,  isAvailable: true,  unitsSold: 31, stockCount: 18 },
  { id: "p4", name: "AB Tracksuit Set",   priceTzs: 120000, isAvailable: false, unitsSold: 8,  stockCount: 0  },
  { id: "p5", name: "AB Bucket Hat",      priceTzs: 20000,  isAvailable: true,  unitsSold: 22, stockCount: 14 },
];

function makeDemoTx(): Transaction[] {
  const now = Date.now();
  const mk = (i: number, name: string, amount: number, status: TxStatus, hAgo: number, phone: string): Transaction => ({
    id: "t" + i, productName: name, amount, status,
    buyerPhone: phone,
    createdAt: new Date(now - hAgo * 3600 * 1000).toISOString(),
    confirmedAt: status === "confirmed" ? new Date(now - hAgo * 3600 * 1000 + 60000).toISOString() : undefined,
    ref: status === "confirmed" ? "MX" + (100000 + i) : undefined,
  });
  return [
    mk(1, "AB Graphic Tee",     35000,  "confirmed", 1,   "255712345678"),
    mk(2, "AB Classic Hoodie",  65000,  "confirmed", 3,   "255713111222"),
    mk(3, "AB Cap Snapback",    25000,  "pending",   4,   "255714555666"),
    mk(4, "AB Bucket Hat",      20000,  "confirmed", 6,   "255715777888"),
    mk(5, "AB Graphic Tee",     35000,  "confirmed", 26,  "255716999000"),
    mk(6, "Kiasi Maalum",       50000,  "failed",    30,  "255717222333"),
    mk(7, "AB Classic Hoodie",  65000,  "confirmed", 50,  "255718444555"),
    mk(8, "AB Graphic Tee",     35000,  "confirmed", 75,  "255719666777"),
  ];
}

const DEMO_REWARDS: Reward[] = [
  { id: "r1", value: "500MB",  label: "Data ya YAS — bonasi ya mauzo wiki hii",  createdAt: new Date().toISOString() },
  { id: "r2", value: "TZS 2,000", label: "Airtime — zawadi ya kiwango cha Imara", createdAt: new Date().toISOString() },
];

type Ctx = {
  merchant: Merchant | null;
  loading: boolean;
  sessionRole: SessionRole;
  products: Product[];
  transactions: Transaction[];
  rewards: Reward[];
  links: PaymentLink[];
  customers: Customer[];
  stats: { today: { total: number; count: number }, week: { total: number; count: number }, month: { total: number; count: number }, allTime: { total: number; count: number } };
  login: (merchant: Merchant, role?: SessionRole) => void;
  logout: () => void;
  updateProfile: (patch: Partial<Merchant>) => void;
  upgradeToPro: () => void;
  cancelPro: () => void;
  setCustomSlug: (slug: string | null) => void;
  addStaffPhone: (phone: string) => boolean;
  removeStaffPhone: (phone: string) => void;
  addProduct: (p: Omit<Product,"id"|"isAvailable"> & { isAvailable?: boolean }) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  toggleProduct: (id: string) => void;
  deleteProduct: (id: string) => void;
  createLink: (opts: { productId?: string; customAmountTzs?: number; customLabel?: string; buyerName?: string; buyerPhone?: string }) => PaymentLink;
  getLink: (slug: string) => PaymentLink | undefined;
  startTransaction: (slug: string, buyerPhone: string, buyerName?: string) => Transaction;
  confirmTransaction: (id: string) => Transaction | undefined;
  failTransaction: (id: string) => void;
  getTransaction: (id: string) => Transaction | undefined;
};

const StoreCtx = createContext<Ctx | null>(null);
const KEY = "dy_state_v1";
const TOKEN_KEY = "dy_token";
const ROLE_KEY = "dy_role";

type Persist = {
  merchant: Merchant | null;
  products: Product[];
  transactions: Transaction[];
  rewards: Reward[];
  links: PaymentLink[];
};

function loadPersist(): Persist | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Persist;
  } catch { return null; }
}
function savePersist(p: Persist) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
}

export function DukaProvider({ children }: { children: ReactNode }) {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [sessionRole, setSessionRole] = useState<SessionRole>("owner");
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    const role = typeof window !== "undefined" ? localStorage.getItem(ROLE_KEY) : null;
    const p = loadPersist();
    if (token && p?.merchant) {
      setMerchant({ plan: "free", proRenewalDate: null, customSlug: null, staffPhones: [], ...p.merchant });
      setSessionRole(role === "staff" ? "staff" : "owner");
      setProducts(p.products);
      setTransactions(p.transactions);
      setRewards(p.rewards);
      setLinks(p.links);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!merchant) return;
    savePersist({ merchant, products, transactions, rewards, links });
  }, [merchant, products, transactions, rewards, links]);

  const stats = useMemo(() => {
    const now = Date.now();
    const dayMs = 86400 * 1000;
    const acc = { today: { total: 0, count: 0 }, week: { total: 0, count: 0 }, month: { total: 0, count: 0 }, allTime: { total: 0, count: 0 } };
    for (const t of transactions) {
      if (t.status !== "confirmed") continue;
      const ts = new Date(t.createdAt).getTime();
      const age = now - ts;
      acc.allTime.total += t.amount; acc.allTime.count += 1;
      if (age < dayMs) { acc.today.total += t.amount; acc.today.count += 1; }
      if (age < 7 * dayMs) { acc.week.total += t.amount; acc.week.count += 1; }
      if (age < 30 * dayMs) { acc.month.total += t.amount; acc.month.count += 1; }
    }
    // Blend with demo aggregate baseline so the dashboard looks lively
    return {
      today:   { total: acc.today.total   + 280000,   count: acc.today.count   + 4 },
      week:    { total: acc.week.total    + 1400000,  count: acc.week.count    + 18 },
      month:   { total: acc.month.total   + 4800000,  count: acc.month.count   + 67 },
      allTime: { total: acc.allTime.total + 18200000, count: acc.allTime.count + 243 },
    };
  }, [transactions]);

  const customers = useMemo<Customer[]>(() => {
    const map = new Map<string, Customer>();
    for (const t of transactions) {
      if (t.status !== "confirmed" || !t.buyerPhone) continue;
      const cur = map.get(t.buyerPhone);
      if (cur) {
        cur.totalSpent += t.amount;
        cur.purchaseCount += 1;
        if (new Date(t.createdAt) > new Date(cur.lastPurchase)) cur.lastPurchase = t.createdAt;
        if (t.buyerName && !cur.name) cur.name = t.buyerName;
      } else {
        map.set(t.buyerPhone, {
          phone: t.buyerPhone,
          name: t.buyerName,
          totalSpent: t.amount,
          purchaseCount: 1,
          lastPurchase: t.createdAt,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [transactions]);

  const value: Ctx = {
    merchant, loading, sessionRole, products, transactions, rewards, links, customers, stats,
    login(m, role = "owner") {
      setMerchant(m);
      setSessionRole(role);
      // Seed demo data if first time
      const existing = loadPersist();
      if (!existing || existing.merchant?.merchantId !== m.merchantId) {
        setProducts(DEMO_PRODUCTS);
        setTransactions(makeDemoTx());
        setRewards(DEMO_REWARDS);
        setLinks([]);
      }
      if (typeof window !== "undefined") {
        localStorage.setItem(TOKEN_KEY, "demo-token-" + m.merchantId);
        localStorage.setItem(ROLE_KEY, role);
      }
    },
    logout() {
      setMerchant(null); setSessionRole("owner"); setProducts([]); setTransactions([]); setRewards([]); setLinks([]);
      if (typeof window !== "undefined") {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(KEY);
        localStorage.removeItem(ROLE_KEY);
      }
    },
    updateProfile(patch) { setMerchant(m => m ? { ...m, ...patch } : m); },
    upgradeToPro() {
      const renewal = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
      setMerchant(m => m ? { ...m, plan: "pro", proRenewalDate: renewal } : m);
    },
    cancelPro() {
      setMerchant(m => m ? { ...m, plan: "free", proRenewalDate: null } : m);
    },
    setCustomSlug(slug) {
      setMerchant(m => m ? { ...m, customSlug: slug } : m);
    },
    addStaffPhone(phone) {
      let ok = false;
      setMerchant(m => {
        if (!m) return m;
        const list = m.staffPhones ?? [];
        if (list.length >= 2 || list.includes(phone)) return m;
        ok = true;
        return { ...m, staffPhones: [...list, phone] };
      });
      return ok;
    },
    removeStaffPhone(phone) {
      setMerchant(m => m ? { ...m, staffPhones: (m.staffPhones ?? []).filter(p => p !== phone) } : m);
    },
    addProduct(p) {
      const np: Product = { id: "p" + Math.random().toString(36).slice(2,8), isAvailable: true, ...p };
      setProducts(list => [np, ...list]);
      return np;
    },
    updateProduct(id, patch) { setProducts(list => list.map(x => x.id === id ? { ...x, ...patch } : x)); },
    toggleProduct(id) { setProducts(list => list.map(x => x.id === id ? { ...x, isAvailable: !x.isAvailable } : x)); },
    deleteProduct(id) { setProducts(list => list.filter(x => x.id !== id)); },
    createLink({ productId, customAmountTzs, customLabel }) {
      let amount = 0, label = "Kiasi Maalum", photo: string | undefined, desc: string | undefined;
      if (productId) {
        const p = products.find(x => x.id === productId);
        if (p) { amount = p.priceTzs; label = p.name; photo = p.photoUrl; desc = p.description; }
      } else {
        amount = customAmountTzs ?? 0;
        label = customLabel || "Kiasi Maalum";
      }
      const slug = slugify(label) + "-" + Math.random().toString(36).slice(2,6);
      const link: PaymentLink = {
        linkId: "l" + Math.random().toString(36).slice(2,8),
        slug, amount, label, productId,
        productPhoto: photo, productDescription: desc,
        createdAt: new Date().toISOString(),
      };
      setLinks(list => [link, ...list]);
      return link;
    },
    getLink(slug) { return links.find(l => l.slug === slug); },
    startTransaction(slug, buyerPhone, buyerName) {
      const link = links.find(l => l.slug === slug);
      const tx: Transaction = {
        id: "t" + Math.random().toString(36).slice(2,8),
        productId: link?.productId,
        productName: link?.label ?? "Malipo",
        amount: link?.amount ?? 0,
        status: "pending", buyerPhone, buyerName,
        createdAt: new Date().toISOString(),
      };
      setTransactions(list => [tx, ...list]);
      return tx;
    },
    confirmTransaction(id) {
      let updated: Transaction | undefined;
      setTransactions(list => list.map(t => {
        if (t.id !== id) return t;
        updated = { ...t, status: "confirmed", confirmedAt: new Date().toISOString(), ref: "MX" + Math.floor(100000 + Math.random()*900000) };
        return updated;
      }));
      return updated;
    },
    failTransaction(id) {
      setTransactions(list => list.map(t => t.id === id ? { ...t, status: "failed" } : t));
    },
    getTransaction(id) { return transactions.find(t => t.id === id); },
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useDuka(): Ctx {
  const v = useContext(StoreCtx);
  if (!v) throw new Error("useDuka must be used inside DukaProvider");
  return v;
}

export const DEMO_MERCHANT_FALLBACK = DEMO_MERCHANT;
