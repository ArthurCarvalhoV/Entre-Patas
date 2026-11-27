-- Entre Patas · atualização do banco (rode DEPOIS do supabase.sql; pode rodar mais de uma vez)
-- Supabase > SQL Editor > New query > cole tudo > Run.

-- 1) Categoria dos pets (abas Cachorros / Gatos / Exóticos & Aves)
alter table posts add column if not exists category text not null default 'other' check (category in ('dog','cat','exotic','other'));
grant insert(category) on posts to authenticated;

create or replace view posts_v with (security_invoker = true) as
  select p.id, p.uid, p.image, p.caption, p.adoption, p.species, p.age, p.city, p.status,
         extract(epoch from p.created_at)::float8 as created, u.username, u.avatar,
         (select count(*) from likes l where l.pid = p.id)::int as likes,
         exists(select 1 from likes l where l.pid = p.id and l.uid = auth.uid()) as liked,
         p.category
  from posts p join profiles u on u.id = p.uid
  where not u.banned and p.status <> 'removed';

-- 2) Formulário de contato (visitantes e usuários podem enviar; só o administrador lê)
create table if not exists contacts(
  id bigint generated always as identity primary key,
  name text not null check (length(name) between 2 and 80),
  pet text not null check (length(pet) between 1 and 60),
  email text not null check (length(email) <= 120 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  subject text not null check (subject in ('Dúvida','Sugestão','Denúncia de Maus-Tratos','Parceria PetShop/Vet')),
  message text not null check (length(message) between 10 and 1000),
  created_at timestamptz not null default now());
alter table contacts enable row level security;
revoke all on contacts from anon, authenticated;
grant insert(name, pet, email, subject, message) on contacts to anon, authenticated;
drop policy if exists i_contact on contacts;
create policy i_contact on contacts for insert to anon, authenticated with check (true);

create or replace function admin_contacts() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Acesso restrito a administradores'; end if;
  return coalesce((select jsonb_agg(to_jsonb(c)) from (
    select id, name, pet, email, subject, message, extract(epoch from created_at)::float8 as created
    from contacts order by id desc limit 100) c), '[]'::jsonb);
end $$;
revoke execute on function admin_contacts() from public, anon;
grant execute on function admin_contacts() to authenticated;

-- 3) Visitantes (sem login) podem consultar me_info (devolve vazio) sem gerar erro no navegador
grant execute on function me_info() to anon;

-- 4) CORREÇÃO DO LIMITE DE CONTAS: confirma as contas que ficaram presas esperando e-mail.
--    (Para não enviar mais e-mails de confirmação: Authentication > Sign In / Providers > Email > desligue "Confirm email".)
update auth.users set email_confirmed_at = now() where email_confirmed_at is null;