import {
  createContext, useContext, useEffect, useMemo,
  useState, useCallback, type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "./utils";

export type Merchant = {
  merchantId: string; dukaId: string; phone: string;
  businessName: string; category: string; city: string; bio: string;
  profilePhoto?: string; creditScore: number; createdAt: string;
  plan?: "free" | "pro"; proRenewalDate?: string | null;
  customSlug?: string | null; staffPhones?: string[];
};
export type Product = {
  id: string; name: string; priceTzs: number; buyingPriceTzs?: number;
  description?: string; photoUrl?: string; stockCount?: number;
  isAvailable: boolean; unitsSold?: number;
};
export type TxStatus = "confirmed" | "pending" | "failed";
export type Transaction = {
  id: string; productId?: string; productName: string; amount: number;
  status: TxStatus; buyerPhone?: string; buyerName?: string;
  createdAt: string; confirmedAt?: string; ref?: string; provider?: string;
};
export type PaymentLink = {
  linkId: string; slug: string; amount: number; label: string;
  productId?: string; productPhoto?: string; productDescription?: string; createdAt: string;
};
export type Reward = { id: string; label: string; value: string; createdAt: string };
export type SessionRole = "owner" | "staff";
export type Customer = {
  phone: string; name?: string; totalSpent: number; purchaseCount: number; lastPurchase: string;
};
export type Restock = {
  id: string; productId: string; quantity: number; newBuyingPrice?: number; createdAt: string;
};
export type ExpenseCategory = "rent" | "transport" | "supplies" | "wages" | "utilities" | "other";
export type Expense = {
  id: string; amount: number; category: ExpenseCategory; note?: string; date: string; createdAt: string;
};

function toMerchant(r: Record<string,unknown>): Merchant {
  return {
    merchantId: r.id as string, dukaId: r.duka_id as string, phone: r.phone as string,
    businessName: r.business_name as string, category: r.category as string,
    city: r.city as string, bio: (r.bio as string) ?? "",
    profilePhoto: r.profile_photo as string|undefined,
    creditScore: (r.credit_score as number) ?? 20,
    createdAt: r.created_at as string,
    plan: (r.plan as "free"|"pro") ?? "free",
    proRenewalDate: r.pro_renewal_date as string|null,
    customSlug: r.custom_slug as string|null,
    staffPhones: (r.staff_phones as string[]) ?? [],
  };
}
function toProd(r: Record<string,unknown>): Product {
  return {
    id: r.id as string, name: r.name as string, priceTzs: r.price_tzs as number,
    buyingPriceTzs: r.buying_price_tzs as number|undefined,
    description: r.description as string|undefined, photoUrl: r.photo_url as string|undefined,
    stockCount: r.stock_count as number|undefined, isAvailable: r.is_available as boolean,
    unitsSold: (r.units_sold as number) ?? 0,
  };
}
function toTx(r: Record<string,unknown>): Transaction {
  return {
    id: r.id as string, productId: r.product_id as string|undefined,
    productName: r.product_name as string, amount: r.amount as number,
    status: r.status as TxStatus, buyerPhone: r.buyer_phone as string|undefined,
    buyerName: r.buyer_name as string|undefined, createdAt: r.created_at as string,
    confirmedAt: r.confirmed_at as string|undefined, ref: r.ref as string|undefined,
    provider: r.provider as string|undefined,
  };
}
function toLink(r: Record<string,unknown>): PaymentLink {
  return {
    linkId: r.id as string, slug: r.slug as string, amount: r.amount as number,
    label: r.label as string, productId: r.product_id as string|undefined,
    productPhoto: r.product_photo as string|undefined,
    productDescription: r.product_description as string|undefined,
    createdAt: r.created_at as string,
  };
}
function toRestock(r: Record<string,unknown>): Restock {
  return {
    id: r.id as string, productId: r.product_id as string, quantity: r.quantity as number,
    newBuyingPrice: r.new_buying_price as number|undefined, createdAt: r.created_at as string,
  };
}
function toExpense(r: Record<string,unknown>): Expense {
  return {
    id: r.id as string, amount: r.amount as number, category: r.category as ExpenseCategory,
    note: r.note as string|undefined, date: r.date as string, createdAt: r.created_at as string,
  };
}

type Ctx = {
  merchant: Merchant|null; loading: boolean; sessionRole: SessionRole;
  products: Product[]; transactions: Transaction[]; rewards: Reward[];
  links: PaymentLink[]; customers: Customer[]; restocks: Restock[]; expenses: Expense[];
  stats: { today:{total:number;count:number}; week:{total:number;count:number}; month:{total:number;count:number}; allTime:{total:number;count:number} };
  finance: { monthProfit:number; monthCostOfGoods:number; monthExpenses:number; prevMonthExpenses:number };
  login: (phone:string, role?:SessionRole) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch:Partial<Merchant>) => Promise<void>;
  upgradeToPro: () => Promise<void>;
  cancelPro: () => Promise<void>;
  setCustomSlug: (slug:string|null) => Promise<void>;
  addStaffPhone: (phone:string) => Promise<boolean>;
  removeStaffPhone: (phone:string) => Promise<void>;
  addProduct: (p:Omit<Product,"id"|"isAvailable">&{isAvailable?:boolean}) => Promise<Product>;
  updateProduct: (id:string, patch:Partial<Product>) => Promise<void>;
  toggleProduct: (id:string) => Promise<void>;
  deleteProduct: (id:string) => Promise<void>;
  restockProduct: (productId:string, quantity:number, newBuyingPrice?:number) => Promise<void>;
  addExpense: (e:Omit<Expense,"id"|"createdAt">) => Promise<Expense>;
  deleteExpense: (id:string) => Promise<void>;
  createLink: (opts:{productId?:string;customAmountTzs?:number;customLabel?:string;buyerName?:string;buyerPhone?:string}) => Promise<PaymentLink>;
  getLink: (slug:string) => PaymentLink|undefined;
  startTransaction: (slug:string, buyerPhone:string, buyerName?:string) => Promise<Transaction>;
  confirmTransaction: (id:string) => Promise<Transaction|undefined>;
  failTransaction: (id:string) => Promise<void>;
  getTransaction: (id:string) => Transaction|undefined;
  refreshAll: () => Promise<void>;
};

const StoreCtx = createContext<Ctx|null>(null);

export function DukaProvider({ children }: { children: ReactNode }) {
  const [merchant, setMerchant] = useState<Merchant|null>(null);
  const [sessionRole, setSessionRole] = useState<SessionRole>("owner");
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [restocks, setRestocks] = useState<Restock[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async (mid: string) => {
    const [p,t,r,l,rs,ex] = await Promise.all([
      supabase.from("products").select("*").eq("merchant_id",mid).order("created_at",{ascending:false}),
      supabase.from("transactions").select("*").eq("merchant_id",mid).order("created_at",{ascending:false}),
      supabase.from("rewards").select("*").eq("merchant_id",mid).order("created_at",{ascending:false}),
      supabase.from("payment_links").select("*").eq("merchant_id",mid).eq("is_active",true).order("created_at",{ascending:false}),
      supabase.from("restocks").select("*").eq("merchant_id",mid).order("created_at",{ascending:false}),
      supabase.from("expenses").select("*").eq("merchant_id",mid).order("date",{ascending:false}),
    ]);
    setProducts((p.data??[]).map(x=>toProd(x as Record<string,unknown>)));
    setTransactions((t.data??[]).map(x=>toTx(x as Record<string,unknown>)));
    setRewards((r.data??[]).map(x=>({id:x.id as string,label:x.label as string,value:x.value as string,createdAt:x.created_at as string})));
    setLinks((l.data??[]).map(x=>toLink(x as Record<string,unknown>)));
    setRestocks((rs.data??[]).map(x=>toRestock(x as Record<string,unknown>)));
    setExpenses((ex.data??[]).map(x=>toExpense(x as Record<string,unknown>)));
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>|null = null;
    async function init() {
      const { data:{ session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      const { data:row } = await supabase.from("merchants").select("*").eq("user_id",session.user.id).maybeSingle();
      if (row) {
        const m = toMerchant(row as Record<string,unknown>);
        setMerchant(m);
        await loadAll(m.merchantId);
        channel = supabase.channel(`m:${m.merchantId}`)
          .on("postgres_changes",{event:"*",schema:"public",table:"transactions",filter:`merchant_id=eq.${m.merchantId}`},
            payload => {
              const row2 = (payload.new??payload.old) as Record<string,unknown>;
              if (payload.eventType==="DELETE") setTransactions(l=>l.filter(x=>x.id!==(payload.old as Record<string,unknown>).id));
              else { const tx=toTx(row2); setTransactions(l=>{const i=l.findIndex(x=>x.id===tx.id);if(i>=0){const n=[...l];n[i]=tx;return n;}return[tx,...l];}); }
            })
          .on("postgres_changes",{event:"*",schema:"public",table:"products",filter:`merchant_id=eq.${m.merchantId}`},
            payload => {
              const row2 = (payload.new??payload.old) as Record<string,unknown>;
              if (payload.eventType==="DELETE") setProducts(l=>l.filter(x=>x.id!==(payload.old as Record<string,unknown>).id));
              else { const prod=toProd(row2); setProducts(l=>{const i=l.findIndex(x=>x.id===prod.id);if(i>=0){const n=[...l];n[i]=prod;return n;}return[prod,...l];}); }
            })
          .subscribe();
      }
      setLoading(false);
    }
    init();
    const { data:{ subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event==="SIGNED_OUT") { setMerchant(null);setProducts([]);setTransactions([]);setRewards([]);setLinks([]);setRestocks([]);setExpenses([]);channel?.unsubscribe(); }
      if (event==="SIGNED_IN"&&session?.user) {
        const { data:row } = await supabase.from("merchants").select("*").eq("user_id",session.user.id).maybeSingle();
        if (row) { const m=toMerchant(row as Record<string,unknown>);setMerchant(m);await loadAll(m.merchantId); }
      }
    });
    return () => { subscription.unsubscribe(); channel?.unsubscribe(); };
  }, [loadAll]);

  const stats = useMemo(() => {
    const now=Date.now(), day=86400000;
    const acc={today:{total:0,count:0},week:{total:0,count:0},month:{total:0,count:0},allTime:{total:0,count:0}};
    for(const t of transactions){
      if(t.status!=="confirmed")continue;
      const age=now-new Date(t.createdAt).getTime();
      acc.allTime.total+=t.amount;acc.allTime.count++;
      if(age<day){acc.today.total+=t.amount;acc.today.count++;}
      if(age<7*day){acc.week.total+=t.amount;acc.week.count++;}
      if(age<30*day){acc.month.total+=t.amount;acc.month.count++;}
    }
    return acc;
  }, [transactions]);

  const customers = useMemo<Customer[]>(() => {
    const map=new Map<string,Customer>();
    for(const t of transactions){
      if(t.status!=="confirmed"||!t.buyerPhone)continue;
      const c=map.get(t.buyerPhone);
      if(c){c.totalSpent+=t.amount;c.purchaseCount++;if(new Date(t.createdAt)>new Date(c.lastPurchase))c.lastPurchase=t.createdAt;if(t.buyerName&&!c.name)c.name=t.buyerName;}
      else map.set(t.buyerPhone,{phone:t.buyerPhone,name:t.buyerName,totalSpent:t.amount,purchaseCount:1,lastPurchase:t.createdAt});
    }
    return [...map.values()].sort((a,b)=>b.totalSpent-a.totalSpent);
  }, [transactions]);

  const finance = useMemo(() => {
    const now=new Date(),y=now.getFullYear(),m=now.getMonth();
    const ms=new Date(y,m,1).getTime(),nms=new Date(y,m+1,1).getTime(),pms=new Date(y,m-1,1).getTime();
    const pm=new Map(products.map(p=>[p.id,p]));
    let mp=0,mc=0,me=0,pe=0;
    for(const t of transactions){
      if(t.status!=="confirmed")continue;
      const ts=new Date(t.createdAt).getTime();
      if(ts>=ms&&ts<nms&&t.productId){const p=pm.get(t.productId);if(p?.buyingPriceTzs!=null){mp+=p.priceTzs-p.buyingPriceTzs;mc+=p.buyingPriceTzs;}}
    }
    for(const e of expenses){
      const ts=new Date(e.date).getTime();
      if(ts>=ms&&ts<nms)me+=e.amount;
      else if(ts>=pms&&ts<ms)pe+=e.amount;
    }
    return{monthProfit:mp,monthCostOfGoods:mc,monthExpenses:me,prevMonthExpenses:pe};
  }, [transactions,products,expenses]);

  const login = useCallback(async (phone:string, role:SessionRole="owner") => {
    const { data:{ user } } = await supabase.auth.getUser();
    if(!user)throw new Error("Not authenticated");
    let { data:row } = await supabase.from("merchants").select("*").eq("user_id",user.id).maybeSingle();
    if(!row){
      const { data:nr,error } = await supabase.from("merchants").insert({user_id:user.id,phone,business_name:"Duka Langu"}).select().single();
      if(error)throw error;
      row=nr;
    }
    const m=toMerchant(row as Record<string,unknown>);
    setMerchant(m);setSessionRole(role);
    await loadAll(m.merchantId);
  },[loadAll]);

  const logout = useCallback(async () => { await supabase.auth.signOut(); }, []);

  const updateProfile = useCallback(async (patch:Partial<Merchant>) => {
    if(!merchant)return;
    const db:Record<string,unknown>={};
    if(patch.businessName!==undefined)db.business_name=patch.businessName;
    if(patch.category!==undefined)db.category=patch.category;
    if(patch.city!==undefined)db.city=patch.city;
    if(patch.bio!==undefined)db.bio=patch.bio.slice(0,120);
    if(patch.profilePhoto!==undefined)db.profile_photo=patch.profilePhoto;
    const { data } = await supabase.from("merchants").update(db).eq("id",merchant.merchantId).select().single();
    if(data)setMerchant(toMerchant(data as Record<string,unknown>));
  },[merchant]);

  const upgradeToPro = useCallback(async () => {
    if(!merchant)return;
    const renewal=new Date(Date.now()+30*86400000).toISOString();
    const { data } = await supabase.from("merchants").update({plan:"pro",pro_renewal_date:renewal}).eq("id",merchant.merchantId).select().single();
    if(data)setMerchant(toMerchant(data as Record<string,unknown>));
  },[merchant]);

  const cancelPro = useCallback(async () => {
    if(!merchant)return;
    const { data } = await supabase.from("merchants").update({plan:"free",pro_renewal_date:null}).eq("id",merchant.merchantId).select().single();
    if(data)setMerchant(toMerchant(data as Record<string,unknown>));
  },[merchant]);

  const setCustomSlug = useCallback(async (slug:string|null) => {
    if(!merchant)return;
    const { data } = await supabase.from("merchants").update({custom_slug:slug}).eq("id",merchant.merchantId).select().single();
    if(data)setMerchant(toMerchant(data as Record<string,unknown>));
  },[merchant]);

  const addStaffPhone = useCallback(async (phone:string):Promise<boolean> => {
    if(!merchant)return false;
    const cur=merchant.staffPhones??[];
    if(cur.length>=2||cur.includes(phone))return false;
    const updated=[...cur,phone];
    const { data } = await supabase.from("merchants").update({staff_phones:updated}).eq("id",merchant.merchantId).select().single();
    if(data)setMerchant(toMerchant(data as Record<string,unknown>));
    return true;
  },[merchant]);

  const removeStaffPhone = useCallback(async (phone:string) => {
    if(!merchant)return;
    const updated=(merchant.staffPhones??[]).filter(p=>p!==phone);
    const { data } = await supabase.from("merchants").update({staff_phones:updated}).eq("id",merchant.merchantId).select().single();
    if(data)setMerchant(toMerchant(data as Record<string,unknown>));
  },[merchant]);

  const addProduct = useCallback(async (p:Omit<Product,"id"|"isAvailable">&{isAvailable?:boolean}):Promise<Product> => {
    if(!merchant)throw new Error("Not logged in");
    const { data,error } = await supabase.from("products").insert({
      merchant_id:merchant.merchantId,name:p.name,price_tzs:p.priceTzs,
      buying_price_tzs:p.buyingPriceTzs,description:p.description,photo_url:p.photoUrl,
      stock_count:p.stockCount??0,is_available:p.isAvailable??true,units_sold:p.unitsSold??0,
    }).select().single();
    if(error)throw error;
    const prod=toProd(data as Record<string,unknown>);
    setProducts(l=>[prod,...l]);
    return prod;
  },[merchant]);

  const updateProduct = useCallback(async (id:string,patch:Partial<Product>) => {
    const db:Record<string,unknown>={};
    if(patch.name!==undefined)db.name=patch.name;
    if(patch.priceTzs!==undefined)db.price_tzs=patch.priceTzs;
    if(patch.buyingPriceTzs!==undefined)db.buying_price_tzs=patch.buyingPriceTzs;
    if(patch.description!==undefined)db.description=patch.description;
    if(patch.photoUrl!==undefined)db.photo_url=patch.photoUrl;
    if(patch.stockCount!==undefined)db.stock_count=patch.stockCount;
    if(patch.isAvailable!==undefined)db.is_available=patch.isAvailable;
    const { data } = await supabase.from("products").update(db).eq("id",id).select().single();
    if(data)setProducts(l=>l.map(x=>x.id===id?toProd(data as Record<string,unknown>):x));
  },[]);

  const toggleProduct = useCallback(async (id:string) => {
    const p=products.find(x=>x.id===id);if(!p)return;
    await updateProduct(id,{isAvailable:!p.isAvailable});
  },[products,updateProduct]);

  const deleteProduct = useCallback(async (id:string) => {
    await supabase.from("products").delete().eq("id",id);
    setProducts(l=>l.filter(x=>x.id!==id));
  },[]);

  const restockProduct = useCallback(async (productId:string,quantity:number,newBuyingPrice?:number) => {
    if(!merchant||!quantity||quantity<=0)return;
    await supabase.from("restocks").insert({merchant_id:merchant.merchantId,product_id:productId,quantity,new_buying_price:newBuyingPrice});
    const p=products.find(x=>x.id===productId);if(!p)return;
    const db:Record<string,unknown>={stock_count:(p.stockCount??0)+quantity};
    if(newBuyingPrice!=null)db.buying_price_tzs=newBuyingPrice;
    const { data } = await supabase.from("products").update(db).eq("id",productId).select().single();
    if(data)setProducts(l=>l.map(x=>x.id===productId?toProd(data as Record<string,unknown>):x));
    const { data:rst } = await supabase.from("restocks").select("*").eq("merchant_id",merchant.merchantId).order("created_at",{ascending:false});
    if(rst)setRestocks(rst.map(x=>toRestock(x as Record<string,unknown>)));
  },[merchant,products]);

  const addExpense = useCallback(async (e:Omit<Expense,"id"|"createdAt">):Promise<Expense> => {
    if(!merchant)throw new Error("Not logged in");
    const { data,error } = await supabase.from("expenses").insert({merchant_id:merchant.merchantId,amount:e.amount,category:e.category,note:e.note,date:e.date}).select().single();
    if(error)throw error;
    const exp=toExpense(data as Record<string,unknown>);
    setExpenses(l=>[exp,...l]);
    return exp;
  },[merchant]);

  const deleteExpense = useCallback(async (id:string) => {
    await supabase.from("expenses").delete().eq("id",id);
    setExpenses(l=>l.filter(x=>x.id!==id));
  },[]);

  const createLink = useCallback(async (opts:{productId?:string;customAmountTzs?:number;customLabel?:string;buyerName?:string;buyerPhone?:string}):Promise<PaymentLink> => {
    if(!merchant)throw new Error("Not logged in");
    let amount=0,label="Kiasi Maalum",photo:string|undefined,desc:string|undefined;
    if(opts.productId){const p=products.find(x=>x.id===opts.productId);if(p){amount=p.priceTzs;label=p.name;photo=p.photoUrl;desc=p.description;}}
    else{amount=opts.customAmountTzs??0;label=opts.customLabel||"Kiasi Maalum";}
    const slug=slugify(label)+"-"+Math.random().toString(36).slice(2,6);
    const { data,error } = await supabase.from("payment_links").insert({
      merchant_id:merchant.merchantId,slug,amount,label,
      product_id:opts.productId,product_photo:photo,product_description:desc,
    }).select().single();
    if(error)throw error;
    const link=toLink(data as Record<string,unknown>);
    setLinks(l=>[link,...l]);
    return link;
  },[merchant,products]);

  const getLink = useCallback((slug:string)=>links.find(l=>l.slug===slug),[links]);

  const startTransaction = useCallback(async (slug:string,buyerPhone:string,buyerName?:string):Promise<Transaction> => {
    if(!merchant)throw new Error("Not logged in");
    const link=links.find(l=>l.slug===slug);
    const { data,error } = await supabase.from("transactions").insert({
      merchant_id:merchant.merchantId,link_id:link?.linkId,product_id:link?.productId,
      product_name:link?.label??"Malipo",amount:link?.amount??0,
      status:"pending",buyer_phone:buyerPhone,buyer_name:buyerName??null,provider:"mixx",
    }).select().single();
    if(error)throw error;
    const tx=toTx(data as Record<string,unknown>);
    setTransactions(l=>[tx,...l]);
    return tx;
  },[merchant,links]);

  const confirmTransaction = useCallback(async (id:string):Promise<Transaction|undefined> => {
    const ref="MX"+Math.floor(100000+Math.random()*900000);
    const { data } = await supabase.from("transactions").update({
      status:"confirmed",ref,confirmed_at:new Date().toISOString(),
    }).eq("id",id).select().single();
    if(!data)return undefined;
    const tx=toTx(data as Record<string,unknown>);
    setTransactions(l=>l.map(x=>x.id===id?tx:x));
    if(tx.productId){
      const p=products.find(x=>x.id===tx.productId);
      if(p){await supabase.from("products").update({units_sold:(p.unitsSold??0)+1,stock_count:Math.max(0,(p.stockCount??0)-1)}).eq("id",tx.productId);}
    }
    return tx;
  },[products]);

  const failTransaction = useCallback(async (id:string) => {
    await supabase.from("transactions").update({status:"failed"}).eq("id",id);
    setTransactions(l=>l.map(x=>x.id===id?{...x,status:"failed" as TxStatus}:x));
  },[]);

  const getTransaction = useCallback((id:string)=>transactions.find(x=>x.id===id),[transactions]);

  const refreshAll = useCallback(async () => {
    if(!merchant)return;
    const { data:row } = await supabase.from("merchants").select("*").eq("id",merchant.merchantId).single();
    if(row)setMerchant(toMerchant(row as Record<string,unknown>));
    await loadAll(merchant.merchantId);
  },[merchant,loadAll]);

  const value:Ctx = {
    merchant,loading,sessionRole,products,transactions,rewards,links,customers,restocks,expenses,stats,finance,
    login,logout,updateProfile,upgradeToPro,cancelPro,setCustomSlug,
    addStaffPhone,removeStaffPhone,addProduct,updateProduct,toggleProduct,deleteProduct,
    restockProduct,addExpense,deleteExpense,createLink,getLink,
    startTransaction,confirmTransaction,failTransaction,getTransaction,refreshAll,
  };
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useDuka():Ctx {
  const v=useContext(StoreCtx);
  if(!v)throw new Error("useDuka must be inside DukaProvider");
  return v;
}
export const DEMO_MERCHANT_FALLBACK=null;
