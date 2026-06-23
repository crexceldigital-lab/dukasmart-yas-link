
create extension if not exists "pgcrypto";

do $$ begin
  create type tx_status as enum ('pending','confirmed','failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_type as enum ('free','pro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type expense_cat as enum ('rent','transport','supplies','wages','utilities','other');
exception when duplicate_object then null; end $$;

create sequence if not exists duka_id_seq start 1;

create or replace function public.gen_duka_id() returns text
  language sql as $$ select 'DY-'||lpad(nextval('duka_id_seq')::text,5,'0'); $$;

create or replace function public.touch_upd() returns trigger
  language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

-- MERCHANTS
create table if not exists public.merchants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  duka_id text not null unique default public.gen_duka_id(),
  phone text not null,
  business_name text not null default 'Duka Langu',
  category text not null default 'Other',
  city text not null default 'Dar es Salaam',
  bio text default '',
  profile_photo text,
  credit_score integer not null default 20,
  plan plan_type not null default 'free',
  pro_renewal_date timestamptz,
  custom_slug text unique,
  staff_phones text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.merchants to authenticated;
grant all on public.merchants to service_role;
alter table public.merchants enable row level security;
drop trigger if exists m_upd on public.merchants;
create trigger m_upd before update on public.merchants for each row execute procedure public.touch_upd();

create or replace function public.cur_mid() returns uuid
  language sql security definer stable
  set search_path = public
  as $$ select id from public.merchants where user_id = auth.uid() limit 1; $$;

-- PRODUCTS
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  name text not null,
  price_tzs integer not null,
  buying_price_tzs integer,
  description text,
  photo_url text,
  stock_count integer default 0,
  is_available boolean not null default true,
  units_sold integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
drop trigger if exists p_upd on public.products;
create trigger p_upd before update on public.products for each row execute procedure public.touch_upd();
create index if not exists products_merchant_idx on public.products(merchant_id);

-- PAYMENT LINKS
create table if not exists public.payment_links (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  slug text not null unique,
  amount integer not null,
  label text not null,
  product_id uuid references public.products(id) on delete set null,
  product_photo text,
  product_description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.payment_links to authenticated;
grant select on public.payment_links to anon;
grant all on public.payment_links to service_role;
alter table public.payment_links enable row level security;
create index if not exists payment_links_merchant_idx on public.payment_links(merchant_id);

-- TRANSACTIONS
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  link_id uuid references public.payment_links(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  amount integer not null,
  status tx_status not null default 'pending',
  buyer_phone text,
  buyer_name text,
  ref text,
  provider text default 'mixx',
  provider_tx_id text,
  confirmed_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.transactions to authenticated;
grant select on public.transactions to anon;
grant all on public.transactions to service_role;
alter table public.transactions enable row level security;
drop trigger if exists t_upd on public.transactions;
create trigger t_upd before update on public.transactions for each row execute procedure public.touch_upd();
create index if not exists transactions_merchant_idx on public.transactions(merchant_id);
create index if not exists transactions_merchant_created_idx on public.transactions(merchant_id, created_at desc);

-- RESTOCKS
create table if not exists public.restocks (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null,
  new_buying_price integer,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.restocks to authenticated;
grant all on public.restocks to service_role;
alter table public.restocks enable row level security;
create index if not exists restocks_merchant_idx on public.restocks(merchant_id);

-- EXPENSES
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  amount integer not null,
  category expense_cat not null default 'other',
  note text,
  date date not null default current_date,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.expenses to authenticated;
grant all on public.expenses to service_role;
alter table public.expenses enable row level security;
create index if not exists expenses_merchant_idx on public.expenses(merchant_id);

-- REWARDS
create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  label text not null,
  value text not null,
  claimed boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.rewards to authenticated;
grant all on public.rewards to service_role;
alter table public.rewards enable row level security;

-- POLICIES
drop policy if exists "own" on public.merchants;
create policy "own" on public.merchants for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own" on public.products;
create policy "own" on public.products for all
  using (merchant_id = public.cur_mid()) with check (merchant_id = public.cur_mid());

drop policy if exists "own_w" on public.payment_links;
create policy "own_w" on public.payment_links for all
  using (merchant_id = public.cur_mid()) with check (merchant_id = public.cur_mid());

drop policy if exists "pub_r" on public.payment_links;
create policy "pub_r" on public.payment_links for select
  using (is_active = true);

drop policy if exists "own" on public.transactions;
create policy "own" on public.transactions for all
  using (merchant_id = public.cur_mid()) with check (merchant_id = public.cur_mid());

-- Allow public buyer pay page to poll transaction status by ID (anon)
drop policy if exists "pub_status_r" on public.transactions;
create policy "pub_status_r" on public.transactions for select
  to anon using (true);

drop policy if exists "own" on public.restocks;
create policy "own" on public.restocks for all
  using (merchant_id = public.cur_mid()) with check (merchant_id = public.cur_mid());

drop policy if exists "own" on public.expenses;
create policy "own" on public.expenses for all
  using (merchant_id = public.cur_mid()) with check (merchant_id = public.cur_mid());

drop policy if exists "own" on public.rewards;
create policy "own" on public.rewards for all
  using (merchant_id = public.cur_mid()) with check (merchant_id = public.cur_mid());

-- RPC for public pay page: resolve link + merchant by slug
create or replace function public.get_link_with_merchant(p_slug text)
returns table (
  label text,
  amount integer,
  product_photo text,
  product_description text,
  merchant_name text,
  merchant_city text
)
language sql
security definer
stable
set search_path = public
as $$
  select l.label, l.amount, l.product_photo, l.product_description,
         m.business_name as merchant_name, m.city as merchant_city
  from public.payment_links l
  join public.merchants m on m.id = l.merchant_id
  where l.slug = p_slug and l.is_active = true
  limit 1;
$$;
grant execute on function public.get_link_with_merchant(text) to anon, authenticated;

-- REALTIME
do $$ begin
  alter publication supabase_realtime add table public.transactions;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.products;
exception when duplicate_object then null; end $$;
