create table if not exists public.event_orders (
    id uuid primary key default gen_random_uuid(),
    stripe_session_id text not null unique,
    stripe_payment_intent_id text,
    customer_name text,
    customer_email text,
    amount_total integer not null,
    currency text not null,
    payment_status text not null,
    event_name text not null,
    event_date text,
    event_time text,
    event_location text,
    quantity integer not null,
    ticket_tier_summary text,
    purchased_at timestamptz not null,
    ticket_email_sent_at timestamptz,
    ticket_email_error text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.event_tickets (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.event_orders(id) on delete cascade,
    ticket_code text not null unique,
    event_name text not null,
    event_date text,
    event_time text,
    event_location text,
    ticket_id text,
    ticket_tier_id text,
    ticket_tier_name text,
    ticket_tier_amount integer,
    holder_name text,
    holder_email text,
    status text not null default 'valid',
    checked_in boolean not null default false,
    checked_in_at timestamptz,
    checked_in_by text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.event_orders
    add column if not exists ticket_tier_summary text;

alter table public.event_tickets
    add column if not exists ticket_id text,
    add column if not exists ticket_tier_id text,
    add column if not exists ticket_tier_name text,
    add column if not exists ticket_tier_amount integer;

create index if not exists event_tickets_ticket_code_idx
    on public.event_tickets (ticket_code);

create index if not exists event_tickets_checked_in_idx
    on public.event_tickets (checked_in);

create index if not exists event_tickets_event_tier_idx
    on public.event_tickets (event_name, ticket_tier_id);

create table if not exists public.event_ticket_reservations (
    id uuid primary key default gen_random_uuid(),
    stripe_session_id text not null,
    ticket_id text not null,
    event_name text not null,
    tier_id text not null,
    tier_name text not null,
    tier_amount integer not null,
    quantity integer not null,
    status text not null default 'pending',
    expires_at timestamptz not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists event_ticket_reservations_lookup_idx
    on public.event_ticket_reservations (ticket_id, tier_id, status, expires_at);

create index if not exists event_ticket_reservations_session_idx
    on public.event_ticket_reservations (stripe_session_id);

alter table public.event_orders enable row level security;
alter table public.event_tickets enable row level security;
alter table public.event_ticket_reservations enable row level security;

drop policy if exists "No public order access" on public.event_orders;
drop policy if exists "No public ticket access" on public.event_tickets;
drop policy if exists "No public reservation access" on public.event_ticket_reservations;

create policy "No public order access"
    on public.event_orders
    for all
    using (false);

create policy "No public ticket access"
    on public.event_tickets
    for all
    using (false);

create policy "No public reservation access"
    on public.event_ticket_reservations
    for all
    using (false);

create table if not exists public.app_settings (
    key text primary key,
    value text not null,
    updated_at timestamptz not null default now(),
    updated_by text
);

alter table public.app_settings enable row level security;

drop policy if exists "No public app_settings access" on public.app_settings;

create policy "No public app_settings access"
    on public.app_settings
    for all
    using (false);
