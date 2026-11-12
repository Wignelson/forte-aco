-- Forte Aço: execute once in Supabase SQL Editor.
-- Never put a service_role key in the browser. RLS is the authority.
create table if not exists public.products (
  id text primary key, name text not null check (char_length(name) between 2 and 70),
  category text not null check (char_length(category) <= 40), price numeric(12,2) not null check (price >= 0),
  unit text not null check (char_length(unit) between 1 and 30), badge text not null default '',
  description text not null default '', image text not null default '', shape text not null default 'beam',
  sort_order integer not null default 0, updated_at timestamptz not null default now()
);
create table if not exists public.store_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.store_admins enable row level security;
revoke all on public.store_admins from anon, authenticated;
create or replace function public.is_store_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select auth.uid() is not null and exists (select 1 from public.store_admins where user_id = auth.uid()) $$;
revoke all on function public.is_store_admin() from public, anon;
grant execute on function public.is_store_admin() to authenticated;

alter table public.products enable row level security;
revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
drop policy if exists "Public can view products" on public.products;
create policy "Public can view products" on public.products for select to anon, authenticated using (true);
drop policy if exists "Store admin manages products" on public.products;
create policy "Store admin manages products" on public.products for all to authenticated
using ((select public.is_store_admin()))
with check ((select public.is_store_admin()));

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(), order_number text not null unique,
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  cpf text not null check (cpf ~ '^[0-9]{11}$'),
  phone text not null check (phone ~ '^[0-9]{10,15}$'),
  payment_method text not null check (payment_method in ('Pix (combinar com o vendedor)','Cartão (combinar com o vendedor)','Dinheiro (combinar com o vendedor)','Outra forma (combinar com o vendedor)')) ,
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 30),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  status text not null default 'Aguardando envio' check (status in ('Aguardando envio','Em atendimento','Concluída','Cancelada')) ,
  created_at timestamptz not null default now()
);
create or replace function public.verify_order_items()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  item jsonb;
  product_row public.products%rowtype;
  quantity integer;
  verified_items jsonb := '[]'::jsonb;
  verified_total numeric(12,2) := 0;
begin
  if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) < 1 or jsonb_array_length(new.items) > 30 then
    raise exception 'Invalid order items';
  end if;
  for item in select value from jsonb_array_elements(new.items) loop
    quantity := (item ->> 'quantity')::integer;
    if quantity < 1 or quantity > 100 then raise exception 'Invalid item quantity'; end if;
    select * into product_row from public.products where id = item ->> 'product_id';
    if not found then raise exception 'Product is unavailable'; end if;
    verified_total := verified_total + round(product_row.price * quantity, 2);
    verified_items := verified_items || jsonb_build_array(jsonb_build_object(
      'product_id', product_row.id, 'name', product_row.name, 'unit', product_row.unit,
      'price', product_row.price, 'quantity', quantity,
      'line_total', round(product_row.price * quantity, 2)
    ));
  end loop;
  new.items := verified_items;
  new.subtotal := verified_total;
  new.status := 'Aguardando envio';
  return new;
end;
$$;
revoke all on function public.verify_order_items() from public, anon, authenticated;
drop trigger if exists verify_order_before_insert on public.orders;
create trigger verify_order_before_insert before insert on public.orders
for each row execute function public.verify_order_items();

alter table public.orders enable row level security;
revoke all on public.orders from anon, authenticated;
grant insert on public.orders to anon, authenticated;
grant select, update on public.orders to authenticated;
drop policy if exists "Visitors can create orders" on public.orders;
create policy "Visitors can create orders" on public.orders for insert to anon, authenticated
with check (char_length(customer_name) between 2 and 120 and cpf ~ '^[0-9]{11}$' and phone ~ '^[0-9]{10,15}$' and subtotal >= 0 and jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 30 and status = 'Aguardando envio');
drop policy if exists "Only store admin reads orders" on public.orders;
create policy "Only store admin reads orders" on public.orders for select to authenticated
using ((select public.is_store_admin()));
drop policy if exists "Only store admin updates orders" on public.orders;
create policy "Only store admin updates orders" on public.orders for update to authenticated
using ((select public.is_store_admin()))
with check ((select public.is_store_admin()));

insert into public.products (id,name,category,price,unit,badge,description,shape,sort_order) values
('p1','Tubo metalon 40 × 40','Tubos',86.90,'barra de 6 m','MAIS PEDIDO','Perfil versátil para estruturas, portões e serralheria.','square',1),
('p2','Viga I 4”','Perfis',249.90,'barra de 6 m','ESTRUTURA','Perfil estrutural para projetos que pedem resistência.','beam',2),
('p3','Chapa galvanizada','Chapas',189.50,'unidade · 1 × 2 m','GALVANIZADA','Proteção e durabilidade para aplicações diversas.','flat',3),
('p4','Vergalhão CA-50 10 mm','Vergalhões',42.90,'barra de 12 m','CA-50','Aço para concreto armado, com qualidade certificada.','round',4),
('p5','Tubo redondo 1½”','Tubos',73.50,'barra de 6 m','ACABAMENTO','Tubo de aço para serralheria e estruturas leves.','round',5),
('p6','Cantoneira 1½”','Perfis',58.90,'barra de 6 m','VERSÁTIL','Perfil angular para reforços e estruturas metálicas.','angle',6)
on conflict (id) do nothing;
