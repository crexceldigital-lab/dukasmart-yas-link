// ============================================================
// DUKA SMART — Real Supabase Store
// Replace: src/lib/duka/store.tsx
//
// This replaces the localStorage mock with real Supabase calls.
// Every read/write goes to the database. Realtime subscriptions
// keep the UI in sync across devices.
// ============================================================

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "./utils";

// ---- Types (same shape as before so UI needs no changes) ----

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
  buyingPriceTzs?: number;
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
  provider?: string;
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

export type Reward = {
  id: string;
  label: string;
  value: string;
  createdAt: string;
};

export type SessionRole = "owner" | "staff";

export type Customer = {
  phone: string;
  name?: string;
  totalSpent: number;
  purchaseCount: number;
  lastPurchase: string;
};

export type Restock = {
  id: string;
  productId: string;
  quantity: number;
  newBuyingPrice?: number;
  createdAt: string;
};

export type ExpenseCategory =
  | "rent"
  | "transport"
  | "supplies"
  | "wages"
  | "utilities"
  | "other";
export type Expense = {
  id: string;
  amount: number;
  category: ExpenseCategory;
  note?: string;
  date: string;
  createdAt: string;
};

// ---- DB row → app type converters ----

function dbMerchant(row: Record<string, unknown>): Merchant {
  return {
    merchantId: row.id as string,
    dukaId: row.duka_id as string,
    phone: row.phone as string,
    businessName: row.business_name as string,
    category: row.category as string,
    city: row.city as string,
    bio: (row.bio as string) ?? "",
    profilePhoto: row.profile_photo as string | undefined,
    creditScore: (row.credit_score as number) ?? 20,
    createdAt: row.created_at as string,
    plan: (row.plan as "free" | "pro") ?? "free",
    proRenewalDate: row.pro_renewal_date as string | null,
    customSlug: row.custom_slug as string | null,
    staffPhones: (row.staff_phones as string[]) ?? [],
  };
}

function dbProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    name: row.name as string,
    priceTzs: row.price_tzs as number,
    buyingPriceTzs: row.buying_price_tzs as number | undefined,
    description: row.description as string | undefined,
    photoUrl: row.photo_url as string | undefined,
    stockCount: row.stock_count as number | undefined,
    isAvailable: row.is_available as boolean,
    unitsSold: (row.units_sold as number) ?? 0,
  };
}

function dbTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    productId: row.product_id as string | undefined,
    productName: row.product_name as string,
    amount: row.amount as number,
    status: row.status as TxStatus,
    buyerPhone: row.buyer_phone as string | undefined,
    buyerName: row.buyer_name as string | undefined,
    createdAt: row.created_at as string,
    confirmedAt: row.confirmed_at as string | undefined,
    ref: row.ref as string | undefined,
    provider: row.provider as string | undefined,
  };
}

function dbLink(row: Record<string, unknown>): PaymentLink {
  return {
    linkId: row.id as string,
    slug: row.slug as string,
    amount: row.amount as number,
    label: row.label as string,
    productId: row.product_id as string | undefined,
    productPhoto: row.product_photo as string | undefined,
    productDescription: row.product_description as string | undefined,
    createdAt: row.created_at as string,
  };
}

function dbReward(row: Record<string, unknown>): Reward {
  return {
    id: row.id as string,
    label: row.label as string,
    value: row.value as string,
    createdAt: row.created_at as string,
  };
}

function dbRestock(row: Record<string, unknown>): Restock {
  return {
    id: row.id as string,
    productId: row.product_id as string,
    quantity: row.quantity as number,
    newBuyingPrice: row.new_buying_price as number | undefined,
    createdAt: row.created_at as string,
  };
}

function dbExpense(row: Record<string, unknown>): Expense {
  return {
    id: row.id as string,
    amount: row.amount as number,
    category: row.category as ExpenseCategory,
    note: row.note as string | undefined,
    date: row.date as string,
    createdAt: row.created_at as string,
  };
}

// ---- Context type ----

type Ctx = {
  merchant: Merchant | null;
  loading: boolean;
  sessionRole: SessionRole;
  products: Product[];
  transactions: Transaction[];
  rewards: Reward[];
  links: PaymentLink[];
  customers: Customer[];
  restocks: Restock[];
  expenses: Expense[];
  stats: {
    today: { total: number; count: number };
    week: { total: number; count: number };
    month: { total: number; count: number };
    allTime: { total: number; count: number };
  };
  finance: {
    monthProfit: number;
    monthCostOfGoods: number;
    monthExpenses: number;
    prevMonthExpenses: number;
  };
  login: (phone: string, role?: SessionRole) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<Merchant>) => Promise<void>;
  upgradeToPro: () => Promise<void>;
  cancelPro: () => Promise<void>;
  setCustomSlug: (slug: string | null) => Promise<void>;
  addStaffPhone: (phone: string) => Promise<boolean>;
  removeStaffPhone: (phone: string) => Promise<void>;
  addProduct: (
    p: Omit<Product, "id" | "isAvailable"> & { isAvailable?: boolean }
  ) => Promise<Product>;
  updateProduct: (id: string, patch: Partial<Product>) => Promise<void>;
  toggleProduct: (id: string) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  restockProduct: (
    productId: string,
    quantity: number,
    newBuyingPrice?: number
  ) => Promise<void>;
  addExpense: (e: Omit<Expense, "id" | "createdAt">) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;
  createLink: (opts: {
    productId?: string;
    customAmountTzs?: number;
    customLabel?: string;
  }) => Promise<PaymentLink>;
  getLink: (slug: string) => PaymentLink | undefined;
  startTransaction: (
    slug: string,
    buyerPhone: string,
    buyerName?: string
  ) => Promise<Transaction>;
  confirmTransaction: (id: string) => Promise<Transaction | undefined>;
  failTransaction: (id: string) => Promise<void>;
  getTransaction: (id: string) => Transaction | undefined;
  refreshAll: () => Promise<void>;
};

const StoreCtx = createContext<Ctx | null>(null);

// ---- Provider ----

export function DukaProvider({ children }: { children: ReactNode }) {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [sessionRole, setSessionRole] = useState<SessionRole>("owner");
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [restocks, setRestocks] = useState<Restock[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- Load all data for a merchant ----
  const loadAll = useCallback(async (merchantId: string) => {
    const [
      { data: prods },
      { data: txs },
      { data: rews },
      { data: lnks },
      { data: rst },
      { data: exp },
    ] = await Promise.all([
      supabase.from("products").select("*").eq("merchant_id", merchantId).order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").eq("merchant_id", merchantId).order("created_at", { ascending: false }),
      supabase.from("rewards").select("*").eq("merchant_id", merchantId).order("created_at", { ascending: false }),
      supabase.from("payment_links").select("*").eq("merchant_id", merchantId).eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("restocks").select("*").eq("merchant_id", merchantId).order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").eq("merchant_id", merchantId).order("date", { ascending: false }),
    ]);

    setProducts((prods ?? []).map(r => dbProduct(r as Record<string, unknown>)));
    setTransactions((txs ?? []).map(r => dbTransaction(r as Record<string, unknown>)));
    setRewards((rews ?? []).map(r => dbReward(r as Record<string, unknown>)));
    setLinks((lnks ?? []).map(r => dbLink(r as Record<string, unknown>)));
    setRestocks((rst ?? []).map(r => dbRestock(r as Record<string, unknown>)));
    setExpenses((exp ?? []).map(r => dbExpense(r as Record<string, unknown>)));
  }, []);

  // ---- Bootstrap: check existing auth session ----
  useEffect(() => {
    let realtimeSub: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const { data: row } = await supabase
        .from("merchants")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (row) {
        const m = dbMerchant(row as Record<string, unknown>);
        setMerchant(m);
        await loadAll(m.merchantId);
        realtimeSub = setupRealtime(m.merchantId);
      }
      setLoading(false);
    }

    init();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setMerchant(null);
        setProducts([]); setTransactions([]); setRewards([]);
        setLinks([]); setRestocks([]); setExpenses([]);
        realtimeSub?.unsubscribe();
      }
      if (event === "SIGNED_IN" && session?.user) {
        const { data: row } = await supabase
          .from("merchants")
          .select("*")
          .eq("user_id", session.user.id)
          .single();
        if (row) {
          const m = dbMerchant(row as Record<string, unknown>);
          setMerchant(m);
          await loadAll(m.merchantId);
          realtimeSub = setupRealtime(m.merchantId);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      realtimeSub?.unsubscribe();
    };
  }, [loadAll]);

  // ---- Realtime subscriptions ----
  function setupRealtime(merchantId: string) {
    return supabase
      .channel(`merchant:${merchantId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "transactions",
        filter: `merchant_id=eq.${merchantId}`,
      }, payload => {
        const row = (payload.new ?? payload.old) as Record<string, unknown>;
        if (payload.eventType === "DELETE") {
          setTransactions(list => list.filter(t => t.id !== (payload.old as Record<string, unknown>).id));
        } else {
          const tx = dbTransaction(row);
          setTransactions(list => {
            const idx = list.findIndex(t => t.id === tx.id);
            if (idx >= 0) { const n = [...list]; n[idx] = tx; return n; }
            return [tx, ...list];
          });
        }
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "products",
        filter: `merchant_id=eq.${merchantId}`,
      }, payload => {
        const row = (payload.new ?? payload.old) as Record<string, unknown>;
        if (payload.eventType === "DELETE") {
          setProducts(list => list.filter(p => p.id !== (payload.old as Record<string, unknown>).id));
        } else {
          const prod = dbProduct(row);
          setProducts(list => {
            const idx = list.findIndex(p => p.id === prod.id);
            if (idx >= 0) { const n = [...list]; n[idx] = prod; return n; }
            return [prod, ...list];
          });
        }
      })
      .subscribe();
  }

  // ---- Derived stats (same logic as before) ----
  const stats = useMemo(() => {
    const now = Date.now();
    const dayMs = 86400 * 1000;
    const acc = {
      today: { total: 0, count: 0 },
      week: { total: 0, count: 0 },
      month: { total: 0, count: 0 },
      allTime: { total: 0, count: 0 },
    };
    for (const t of transactions) {
      if (t.status !== "confirmed") continue;
      const age = now - new Date(t.createdAt).getTime();
      acc.allTime.total += t.amount; acc.allTime.count++;
      if (age < dayMs) { acc.today.total += t.amount; acc.today.count++; }
      if (age < 7 * dayMs) { acc.week.total += t.amount; acc.week.count++; }
      if (age < 30 * dayMs) { acc.month.total += t.amount; acc.month.count++; }
    }
    return acc;
  }, [transactions]);

  const customers = useMemo<Customer[]>(() => {
    const map = new Map<string, Customer>();
    for (const t of transactions) {
      if (t.status !== "confirmed" || !t.buyerPhone) continue;
      const cur = map.get(t.buyerPhone);
      if (cur) {
        cur.totalSpent += t.amount;
        cur.purchaseCount++;
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
    return [...map.values()].sort((a, b) => b.totalSpent - a.totalSpent);
  }, [transactions]);

  const finance = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const monthStart = new Date(y, m, 1).getTime();
    const nextMonthStart = new Date(y, m + 1, 1).getTime();
    const prevMonthStart = new Date(y, m - 1, 1).getTime();
    const prodMap = new Map(products.map(p => [p.id, p]));
    let monthProfit = 0, monthCostOfGoods = 0, monthExpenses = 0, prevMonthExpenses = 0;

    for (const t of transactions) {
      if (t.status !== "confirmed") continue;
      const ts = new Date(t.createdAt).getTime();
      if (ts < monthStart || ts >= nextMonthStart) continue;
      if (!t.productId) continue;
      const p = prodMap.get(t.productId);
      if (!p || p.buyingPriceTzs == null) continue;
      monthProfit += p.priceTzs - p.buyingPriceTzs;
      monthCostOfGoods += p.buyingPriceTzs;
    }
    for (const e of expenses) {
      const ts = new Date(e.date).getTime();
      if (ts >= monthStart && ts < nextMonthStart) monthExpenses += e.amount;
      else if (ts >= prevMonthStart && ts < monthStart) prevMonthExpenses += e.amount;
    }
    return { monthProfit, monthCostOfGoods, monthExpenses, prevMonthExpenses };
  }, [transactions, products, expenses]);

  // ---- Actions ----

  const login = useCallback(async (phone: string, role: SessionRole = "owner") => {
    // Called after OTP verification succeeds (Supabase auth handles the session).
    // We just need to find or create the merchant row.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    let { data: row } = await supabase
      .from("merchants")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!row) {
      // First login — create merchant
      const { data: newRow, error } = await supabase
        .from("merchants")
        .insert({ user_id: user.id, phone, business_name: "Duka Langu" })
        .select()
        .single();
      if (error) throw error;
      row = newRow;
    }

    const m = dbMerchant(row as Record<string, unknown>);
    setMerchant(m);
    setSessionRole(role);
    await loadAll(m.merchantId);
  }, [loadAll]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const updateProfile = useCallback(async (patch: Partial<Merchant>) => {
    if (!merchant) return;
    const dbPatch: Record<string, unknown> = {};
    if (patch.businessName !== undefined) dbPatch.business_name = patch.businessName;
    if (patch.category !== undefined) dbPatch.category = patch.category;
    if (patch.city !== undefined) dbPatch.city = patch.city;
    if (patch.bio !== undefined) dbPatch.bio = patch.bio.slice(0, 120);
    if (patch.profilePhoto !== undefined) dbPatch.profile_photo = patch.profilePhoto;

    const { data } = await supabase
      .from("merchants")
      .update(dbPatch)
      .eq("id", merchant.merchantId)
      .select()
      .single();

    if (data) setMerchant(dbMerchant(data as Record<string, unknown>));
  }, [merchant]);

  const upgradeToPro = useCallback(async () => {
    if (!merchant) return;
    const renewal = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
    const { data } = await supabase
      .from("merchants")
      .update({ plan: "pro", pro_renewal_date: renewal })
      .eq("id", merchant.merchantId)
      .select().single();
    if (data) setMerchant(dbMerchant(data as Record<string, unknown>));
  }, [merchant]);

  const cancelPro = useCallback(async () => {
    if (!merchant) return;
    const { data } = await supabase
      .from("merchants")
      .update({ plan: "free", pro_renewal_date: null })
      .eq("id", merchant.merchantId)
      .select().single();
    if (data) setMerchant(dbMerchant(data as Record<string, unknown>));
  }, [merchant]);

  const setCustomSlug = useCallback(async (slug: string | null) => {
    if (!merchant) return;
    const { data } = await supabase
      .from("merchants")
      .update({ custom_slug: slug })
      .eq("id", merchant.merchantId)
      .select().single();
    if (data) setMerchant(dbMerchant(data as Record<string, unknown>));
  }, [merchant]);

  const addStaffPhone = useCallback(async (phone: string): Promise<boolean> => {
    if (!merchant) return false;
    const current = merchant.staffPhones ?? [];
    if (current.length >= 2 || current.includes(phone)) return false;
    const updated = [...current, phone];
    const { data } = await supabase
      .from("merchants")
      .update({ staff_phones: updated })
      .eq("id", merchant.merchantId)
      .select().single();
    if (data) setMerchant(dbMerchant(data as Record<string, unknown>));
    return true;
  }, [merchant]);

  const removeStaffPhone = useCallback(async (phone: string) => {
    if (!merchant) return;
    const updated = (merchant.staffPhones ?? []).filter(p => p !== phone);
    const { data } = await supabase
      .from("merchants")
      .update({ staff_phones: updated })
      .eq("id", merchant.merchantId)
      .select().single();
    if (data) setMerchant(dbMerchant(data as Record<string, unknown>));
  }, [merchant]);

  const addProduct = useCallback(async (
    p: Omit<Product, "id" | "isAvailable"> & { isAvailable?: boolean }
  ): Promise<Product> => {
    if (!merchant) throw new Error("Not logged in");
    const { data, error } = await supabase
      .from("products")
      .insert({
        merchant_id: merchant.merchantId,
        name: p.name,
        price_tzs: p.priceTzs,
        buying_price_tzs: p.buyingPriceTzs,
        description: p.description,
        photo_url: p.photoUrl,
        stock_count: p.stockCount ?? 0,
        is_available: p.isAvailable ?? true,
        units_sold: p.unitsSold ?? 0,
      })
      .select().single();
    if (error) throw error;
    const prod = dbProduct(data as Record<string, unknown>);
    setProducts(list => [prod, ...list]);
    return prod;
  }, [merchant]);

  const updateProduct = useCallback(async (id: string, patch: Partial<Product>) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.priceTzs !== undefined) dbPatch.price_tzs = patch.priceTzs;
    if (patch.buyingPriceTzs !== undefined) dbPatch.buying_price_tzs = patch.buyingPriceTzs;
    if (patch.description !== undefined) dbPatch.description = patch.description;
    if (patch.photoUrl !== undefined) dbPatch.photo_url = patch.photoUrl;
    if (patch.stockCount !== undefined) dbPatch.stock_count = patch.stockCount;
    if (patch.isAvailable !== undefined) dbPatch.is_available = patch.isAvailable;

    const { data } = await supabase
      .from("products").update(dbPatch).eq("id", id).select().single();
    if (data) setProducts(list => list.map(x => x.id === id ? dbProduct(data as Record<string, unknown>) : x));
  }, []);

  const toggleProduct = useCallback(async (id: string) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    await updateProduct(id, { isAvailable: !prod.isAvailable });
  }, [products, updateProduct]);

  const deleteProduct = useCallback(async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    setProducts(list => list.filter(p => p.id !== id));
  }, []);

  const restockProduct = useCallback(async (productId: string, quantity: number, newBuyingPrice?: number) => {
    if (!merchant || !quantity || quantity <= 0) return;
    const { error: restockErr } = await supabase.from("restocks").insert({
      merchant_id: merchant.merchantId,
      product_id: productId,
      quantity,
      new_buying_price: newBuyingPrice,
    });
    if (restockErr) throw restockErr;

    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    const patch: Record<string, unknown> = {
      stock_count: (prod.stockCount ?? 0) + quantity,
    };
    if (newBuyingPrice != null) patch.buying_price_tzs = newBuyingPrice;
    const { data } = await supabase.from("products").update(patch).eq("id", productId).select().single();
    if (data) {
      const updated = dbProduct(data as Record<string, unknown>);
      setProducts(list => list.map(p => p.id === productId ? updated : p));
    }
    setRestocks(list => [{
      id: "rs-local",
      productId,
      quantity,
      newBuyingPrice,
      createdAt: new Date().toISOString(),
    }, ...list]);
    // Re-fetch restocks to get real ID
    const { data: rst } = await supabase.from("restocks").select("*")
      .eq("merchant_id", merchant.merchantId).order("created_at", { ascending: false });
    if (rst) setRestocks(rst.map(r => dbRestock(r as Record<string, unknown>)));
  }, [merchant, products]);

  const addExpense = useCallback(async (e: Omit<Expense, "id" | "createdAt">): Promise<Expense> => {
    if (!merchant) throw new Error("Not logged in");
    const { data, error } = await supabase.from("expenses").insert({
      merchant_id: merchant.merchantId,
      amount: e.amount,
      category: e.category,
      note: e.note,
      date: e.date,
    }).select().single();
    if (error) throw error;
    const exp = dbExpense(data as Record<string, unknown>);
    setExpenses(list => [exp, ...list]);
    return exp;
  }, [merchant]);

  const deleteExpense = useCallback(async (id: string) => {
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses(list => list.filter(e => e.id !== id));
  }, []);

  const createLink = useCallback(async (opts: {
    productId?: string;
    customAmountTzs?: number;
    customLabel?: string;
  }): Promise<PaymentLink> => {
    if (!merchant) throw new Error("Not logged in");
    let amount = 0, label = "Kiasi Maalum";
    let photo: string | undefined, desc: string | undefined;

    if (opts.productId) {
      const prod = products.find(p => p.id === opts.productId);
      if (prod) { amount = prod.priceTzs; label = prod.name; photo = prod.photoUrl; desc = prod.description; }
    } else {
      amount = opts.customAmountTzs ?? 0;
      label = opts.customLabel || "Kiasi Maalum";
    }

    const slug = slugify(label) + "-" + Math.random().toString(36).slice(2, 6);
    const { data, error } = await supabase.from("payment_links").insert({
      merchant_id: merchant.merchantId,
      slug,
      amount,
      label,
      product_id: opts.productId,
      product_photo: photo,
      product_description: desc,
    }).select().single();
    if (error) throw error;
    const link = dbLink(data as Record<string, unknown>);
    setLinks(list => [link, ...list]);
    return link;
  }, [merchant, products]);

  const getLink = useCallback((slug: string) => links.find(l => l.slug === slug), [links]);

  const startTransaction = useCallback(async (
    slug: string, buyerPhone: string, buyerName?: string
  ): Promise<Transaction> => {
    if (!merchant) throw new Error("Not logged in");
    const link = links.find(l => l.slug === slug);
    const { data, error } = await supabase.from("transactions").insert({
      merchant_id: merchant.merchantId,
      link_id: link?.linkId,
      product_id: link?.productId,
      product_name: link?.label ?? "Malipo",
      amount: link?.amount ?? 0,
      status: "pending",
      buyer_phone: buyerPhone,
      buyer_name: buyerName,
    }).select().single();
    if (error) throw error;
    const tx = dbTransaction(data as Record<string, unknown>);
    setTransactions(list => [tx, ...list]);
    return tx;
  }, [merchant, links]);

  const confirmTransaction = useCallback(async (id: string): Promise<Transaction | undefined> => {
    const ref = "MX" + Math.floor(100000 + Math.random() * 900000);
    const { data, error } = await supabase.rpc("confirm_transaction", {
      p_tx_id: id,
      p_ref: ref,
    });
    if (error) throw error;
    const tx = dbTransaction(data as Record<string, unknown>);
    setTransactions(list => list.map(t => t.id === id ? tx : t));
    return tx;
  }, []);

  const failTransaction = useCallback(async (id: string) => {
    await supabase.rpc("fail_transaction", { p_tx_id: id, p_reason: "User cancelled" });
    setTransactions(list => list.map(t => t.id === id ? { ...t, status: "failed" as TxStatus } : t));
  }, []);

  const getTransaction = useCallback((id: string) => transactions.find(t => t.id === id), [transactions]);

  const refreshAll = useCallback(async () => {
    if (!merchant) return;
    const { data: row } = await supabase.from("merchants").select("*").eq("id", merchant.merchantId).single();
    if (row) setMerchant(dbMerchant(row as Record<string, unknown>));
    await loadAll(merchant.merchantId);
  }, [merchant, loadAll]);

  const value: Ctx = {
    merchant, loading, sessionRole, products, transactions, rewards,
    links, customers, restocks, expenses, stats, finance,
    login, logout, updateProfile, upgradeToPro, cancelPro, setCustomSlug,
    addStaffPhone, removeStaffPhone, addProduct, updateProduct, toggleProduct,
    deleteProduct, restockProduct, addExpense, deleteExpense, createLink,
    getLink, startTransaction, confirmTransaction, failTransaction,
    getTransaction, refreshAll,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useDuka(): Ctx {
  const v = useContext(StoreCtx);
  if (!v) throw new Error("useDuka must be used inside DukaProvider");
  return v;
}

// Keep for backward compat
export const DEMO_MERCHANT_FALLBACK = null;
