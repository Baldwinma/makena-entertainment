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
    holder_name text,
    holder_email text,
    status text not null default 'valid',
    checked_in boolean not null default false,
    checked_in_at timestamptz,
    checked_in_by text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists event_tickets_ticket_code_idx
    on public.event_tickets (ticket_code);

create index if not exists event_tickets_checked_in_idx
    on public.event_tickets (checked_in);

alter table public.event_orders enable row level security;
alter table public.event_tickets enable row level security;

drop policy if exists "No public order access" on public.event_orders;
drop policy if exists "No public ticket access" on public.event_tickets;

create policy "No public order access"
    on public.event_orders
    for all
    using (false);

create policy "No public ticket access"
    on public.event_tickets
    for all
    using (false);
