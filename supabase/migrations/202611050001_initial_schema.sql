create extension if not exists pgcrypto;

create table if not exists public.customers (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.catalog_items (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  unit text not null default 'piece',
  price numeric(14,2) not null default 0 check (price >= 0),
  category text not null default 'Printing',
  created_at timestamptz not null default now()
);
create table if not exists public.sales_documents (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('quotation','invoice')),
  number text not null,
  customer_id text not null,
  customer_name text not null,
  customer_phone text not null default '',
  customer_email text not null default '',
  customer_address text not null default '',
  items jsonb not null default '[]'::jsonb,
  discount_percent numeric(5,2) not null default 0 check (discount_percent between 0 and 100),
  notes text not null default '',
  status text not null default 'draft',
  issue_date date not null default current_date,
  due_date date not null default current_date,
  source_quote text,
  created_at timestamptz not null default now(),
  unique(owner_id, number)
);
create table if not exists public.payments (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_id text not null references public.sales_documents(id) on delete cascade,
  number text not null,
  paid_at date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  method text not null,
  reference text not null default '',
  created_at timestamptz not null default now(),
  unique(owner_id, number)
);
create table if not exists public.company_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'NexTone',
  tagline text not null default 'Printing & Branding',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  website text not null default '',
  logo_url text not null default '',
  default_notes text not null default ''
);

alter table public.customers enable row level security;
alter table public.catalog_items enable row level security;
alter table public.sales_documents enable row level security;
alter table public.payments enable row level security;
alter table public.company_settings enable row level security;

create policy "owner manages customers" on public.customers for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owner manages catalog" on public.catalog_items for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owner manages documents" on public.sales_documents for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owner manages payments" on public.payments for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owner manages settings" on public.company_settings for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
