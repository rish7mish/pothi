-- Pothi database setup. Run once in the Supabase SQL editor.
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  is_demo boolean not null default false,
  notebook text not null,
  seq int not null,
  image_path text not null,
  status text not null default 'new',
  skandha int,
  adhyay int,
  heading text,
  date_written text,
  blocks jsonb not null default '[]'::jsonb,
  flags jsonb not null default '{}'::jsonb,
  notes jsonb not null default '{}'::jsonb,
  ocr_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only the server (service role key) touches this table.
alter table public.pages enable row level security;
revoke all on public.pages from anon, authenticated;

create index if not exists pages_order on public.pages (is_demo, notebook, seq);

-- Private bucket for page photos.
insert into storage.buckets (id, name, public)
values ('pages', 'pages', false)
on conflict (id) do nothing;
