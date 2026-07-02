create table sku (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  size text,
  price numeric not null,
  image_path text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table shop (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table invoice (
  id uuid primary key default gen_random_uuid(),
  display_number integer,
  shop_id uuid references shop(id) not null,
  invoice_date date not null,
  created_at timestamptz not null default now(),
  total_amount numeric not null,
  total_boxes integer not null,
  cash_amount numeric not null default 0,
  paytm_amount numeric not null default 0,
  udhaar_amount numeric not null default 0,
  status text not null default 'active',
  printed boolean not null default false,
  device_id text
);

create table invoice_item (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoice(id) not null,
  sku_id uuid references sku(id) not null,
  boxes integer not null,
  amount numeric not null
);

create table stock_ledger (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid references sku(id) not null,
  entry_date date not null,
  quantity integer not null,
  entry_type text not null,
  invoice_id uuid references invoice(id),
  created_at timestamptz not null default now(),
  device_id text
);

create index idx_stock_ledger_sku_date on stock_ledger(sku_id, entry_date);
create index idx_invoice_date on invoice(invoice_date);
create index idx_invoice_item_invoice on invoice_item(invoice_id);