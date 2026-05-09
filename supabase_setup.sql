-- ============================================================
-- SCRIPT DE CONFIGURAÇÃO DO BANCO DE DADOS - Higino Lopes
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- Tabela de produtos
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null,
  created_at timestamptz default now()
);

-- Tabela de usuários da aplicação (colaboradores da panificadora)
create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password text not null,
  name text not null,
  role text not null check (role in ('admin', 'cashier', 'attendant')),
  created_at timestamptz default now()
);

-- Tabela de pedidos
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity,
  total numeric(10,2) not null,
  status text not null check (status in ('pending', 'finalized', 'cancelled')),
  attendant_id uuid references app_users(id) on delete set null,
  attendant_name text,
  created_at timestamptz default now(),
  finalized_at timestamptz
);

-- Tabela de itens do pedido
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid,
  name text not null,
  price numeric(10,2) not null,
  quantity int not null
);

-- Tabela de configurações (única linha, id fixo = 1)
create table if not exists settings (
  id int primary key default 1,
  logo_url text default '',
  constraint single_row check (id = 1)
);

-- ─── Dados Iniciais ──────────────────────────────────────────────────────────

-- Configurações padrão
insert into settings (id, logo_url) values (1, '')
  on conflict (id) do nothing;

-- Usuários padrão
insert into app_users (email, password, name, role) values
  ('admin@higinolopes.com', 'admin123', 'Admin', 'admin'),
  ('caixa@higinolopes.com', '123', 'Caixa 1', 'cashier'),
  ('atendente@higinolopes.com', '123', 'Atendente 1', 'attendant')
  on conflict (email) do nothing;

-- Produtos padrão
insert into products (name, price) values
  ('Pão Francês', 0.50),
  ('Pão de Queijo', 2.50),
  ('Bolo de Cenoura', 15.00),
  ('Café Expresso', 4.00),
  ('Leite 1L', 5.50),
  ('Manteiga 200g', 12.00)
  on conflict do nothing;
