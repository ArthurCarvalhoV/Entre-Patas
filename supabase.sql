-- Entre Patas · Supabase (Postgres + Auth + Storage)
-- Rode UMA vez, em projeto novo: Supabase > SQL Editor > New query > cole tudo > Run.

-- ===== Tabelas =====
create table profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null constraint username_fmt check (username ~ '^[A-Za-z0-9_.]{3,20}$'),
  bio text not null default '' check (length(bio) <= 150),
  avatar text not null default '' check (avatar = '' or avatar like 'https://%/storage/v1/object/public/photos/%'),
  role text not null default 'user' check (role in ('user','admin')),
  banned boolean not null default false,
  created_at timestamptz not null default now());
create unique index profiles_username_key on profiles (lower(username));

create table posts(
  id bigint generated always as identity primary key,
  uid uuid not null default auth.uid() references profiles(id) on delete cascade,
  image text not null check (image like 'https://%/storage/v1/object/public/photos/%'),
  caption text not null default '' check (length(caption) <= 500),
  adoption boolean not null default false,
  species text not null default '' check (length(species) <= 60),
  age text not null default '' check (length(age) <= 60),
  city text not null default '' check (length(city) <= 60),
  status text not null default 'open' check (status in ('open','adopted','removed')),
  created_at timestamptz not null default now(),
  check (not adoption or (species <> '' and city <> '')));
create index on posts(uid);

create table likes(
  uid uuid references profiles(id) on delete cascade,
  pid bigint references posts(id) on delete cascade,
  primary key(uid, pid));

create table comments(
  id bigint generated always as identity primary key,
  pid bigint not null references posts(id) on delete cascade,
  uid uuid not null default auth.uid() references profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 300),
  created_at timestamptz not null default now());
create index on comments(pid);

create table friendships(  -- a = quem pediu, b = quem recebeu
  a uuid references profiles(id) on delete cascade,
  b uuid references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  primary key(a, b), check (a <> b));

create table notifs(
  id bigint generated always as identity primary key,
  uid uuid not null references profiles(id) on delete cascade,
  actor uuid not null constraint notifs_actor_fkey references profiles(id) on delete cascade,
  txt text not null, link text not null default '',
  seen boolean not null default false,
  created_at timestamptz not null default now());
create index on notifs(uid);

create table msgs(
  id bigint generated always as identity primary key,
  a uuid not null references profiles(id) on delete cascade,
  b uuid not null references profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 1000),
  seen boolean not null default false,
  created_at timestamptz not null default now(), check (a <> b));
create index on msgs(a, b);

create table adopt(
  id bigint generated always as identity primary key,
  pid bigint not null references posts(id) on delete cascade,
  uid uuid not null references profiles(id) on delete cascade,
  answers jsonb not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(), unique(pid, uid));

-- Feed: posts + autor + curtidas (respeita a segurança por linha de quem consulta)
create view posts_v with (security_invoker = true) as
  select p.id, p.uid, p.image, p.caption, p.adoption, p.species, p.age, p.city, p.status,
         extract(epoch from p.created_at)::float8 as created, u.username, u.avatar,
         (select count(*) from likes l where l.pid = p.id)::int as likes,
         exists(select 1 from likes l where l.pid = p.id and l.uid = auth.uid()) as liked
  from posts p join profiles u on u.id = p.uid
  where not u.banned and p.status <> 'removed';

-- ===== Funções auxiliares =====
create function active() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and not banned) $$;
create function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin' and not banned) $$;
create function must_login() returns void language plpgsql stable security definer set search_path = public as $$
begin if not active() then raise exception 'Entre para continuar'; end if; end $$;
create function add_notif(to_ uuid, t text, l text) returns void language sql security definer set search_path = public as $$
  insert into notifs(uid, actor, txt, link) select to_, auth.uid(), t, l where to_ is distinct from auth.uid() and auth.uid() is not null $$;
create function username_free(n text) returns boolean language sql stable security definer set search_path = public as $$
  select not exists(select 1 from profiles where lower(username) = lower(n)) $$;

-- Perfil criado automaticamente no cadastro. A PRIMEIRA conta vira administradora.
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, username, role) values(new.id,
    coalesce(new.raw_user_meta_data->>'username',
      left(regexp_replace(split_part(new.email,'@',1), '[^A-Za-z0-9_.]', '', 'g'), 14) || lpad(floor(random()*100000)::int::text, 5, '0')),
    'user');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create function comment_notify() returns trigger language plpgsql security definer set search_path = public as $$
begin perform add_notif((select uid from posts where id = new.pid), 'comentou: ' || left(new.body, 40), '#/me'); return new; end $$;
create trigger t_comment after insert on comments for each row execute function comment_notify();

-- ===== Funções chamadas pelo app (RPC) =====
create function me_info() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('user', jsonb_build_object('id', p.id, 'username', p.username, 'bio', p.bio, 'avatar', p.avatar, 'role', p.role),
    'notifs', (select count(*) from notifs where uid = p.id and not seen),
    'msgs', (select count(*) from msgs where b = p.id and not seen))
  from profiles p where p.id = auth.uid() and not p.banned $$;

create function toggle_like(p bigint) returns jsonb language plpgsql security definer set search_path = public as $$
declare o uuid; l boolean := false;
begin
  perform must_login();
  select uid into o from posts where id = p and status <> 'removed';
  if not found then raise exception 'Publicação não encontrada'; end if;
  delete from likes where uid = auth.uid() and pid = p;
  if not found then insert into likes values(auth.uid(), p); l := true; perform add_notif(o, 'curtiu sua publicação', '#/me'); end if;
  return jsonb_build_object('liked', l, 'likes', (select count(*) from likes where pid = p));
end $$;

create function remove_post(p bigint) returns void language plpgsql security definer set search_path = public as $$
begin
  perform must_login();
  update posts set status = 'removed' where id = p and (uid = auth.uid() or is_admin());
  if not found then raise exception 'Sem permissão'; end if;
end $$;

create function profile(un text) returns jsonb language plpgsql security definer set search_path = public as $$
declare u profiles; f friendships; me uuid := auth.uid(); r text; n int;
begin
  perform must_login();
  select * into u from profiles where lower(username) = lower(un) and not banned;
  if not found then raise exception 'Perfil não encontrado'; end if;
  select * into f from friendships where (a = me and b = u.id) or (a = u.id and b = me);
  r := case when u.id = me then 'self' when f.a is null then 'none' when f.status = 'accepted' then 'friends' when f.a = me then 'sent' else 'received' end;
  select count(*) into n from friendships where status = 'accepted' and (a = u.id or b = u.id);
  return jsonb_build_object('user', jsonb_build_object('id', u.id, 'username', u.username, 'bio', u.bio, 'avatar', u.avatar, 'role', u.role),
    'rel', r, 'friends', n,
    'posts', coalesce((select jsonb_agg(to_jsonb(v)) from (select * from posts_v where uid = u.id order by id desc limit 60) v), '[]'::jsonb));
end $$;

create function friend_add(un text) returns void language plpgsql security definer set search_path = public as $$
declare t uuid; f friendships;
begin
  perform must_login();
  select id into t from profiles where lower(username) = lower(un) and not banned;
  if not found or t = auth.uid() then raise exception 'Usuário inválido'; end if;
  select * into f from friendships where (a = auth.uid() and b = t) or (a = t and b = auth.uid());
  if not found then
    insert into friendships(a, b) values(auth.uid(), t);
    perform add_notif(t, 'enviou um pedido de amizade', '#/friends');
  elsif f.status = 'pending' and f.a = t then
    update friendships set status = 'accepted' where a = t and b = auth.uid();
    perform add_notif(t, 'aceitou seu pedido de amizade', '#/friends');
  end if;
end $$;

create function friend_del(un text) returns void language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  perform must_login();
  select id into t from profiles where lower(username) = lower(un);
  delete from friendships where (a = auth.uid() and b = t) or (a = t and b = auth.uid());
end $$;

create function conversations() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x.mid desc), '[]'::jsonb) from (
    select p.username, p.avatar, m.body, extract(epoch from m.created_at)::float8 as created, m.id as mid,
           (select count(*) from msgs where a = p.id and b = auth.uid() and not seen)::int as unread
    from profiles p
    join msgs m on m.id = (select max(id) from msgs where (a = auth.uid() and b = p.id) or (a = p.id and b = auth.uid()))
    where not p.banned) x $$;

create function thread(un text) returns jsonb language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  perform must_login();
  select id into t from profiles where lower(username) = lower(un) and not banned;
  if not found then raise exception 'Usuário não encontrado'; end if;
  update msgs set seen = true where a = t and b = auth.uid() and not seen;
  return coalesce((select jsonb_agg(jsonb_build_object('mine', a = auth.uid(), 'body', body, 'created', extract(epoch from created_at)) order by id)
    from msgs where (a = auth.uid() and b = t) or (a = t and b = auth.uid())), '[]'::jsonb);
end $$;

create function send_msg(un text, m text) returns void language plpgsql security definer set search_path = public as $$
declare t uuid; txt text := left(trim(coalesce(m, '')), 1000);
begin
  perform must_login();
  select id into t from profiles where lower(username) = lower(un) and not banned;
  if not found or t = auth.uid() or txt = '' then raise exception 'Mensagem inválida'; end if;
  insert into msgs(a, b, body) values(auth.uid(), t, txt);
end $$;

create function apply_adoption(p bigint, d jsonb) returns void language plpgsql security definer set search_path = public as $$
declare o posts; ans jsonb;
begin
  perform must_login();
  select * into o from posts where id = p and adoption and status = 'open';
  if not found then raise exception 'Este anúncio não está mais disponível'; end if;
  if o.uid = auth.uid() then raise exception 'Este anúncio é seu'; end if;
  if coalesce(d->>'terms', '') <> 'true' then raise exception 'Aceite o termo de adoção responsável'; end if;
  ans := jsonb_build_object('home', left(trim(coalesce(d->>'home', '')), 300), 'pets', left(trim(coalesce(d->>'pets', '')), 300),
                            'experience', left(trim(coalesce(d->>'experience', '')), 300), 'why', left(trim(coalesce(d->>'why', '')), 300));
  if exists(select 1 from jsonb_each_text(ans) where value = '') then raise exception 'Responda todas as perguntas'; end if;
  insert into adopt(pid, uid, answers) values(p, auth.uid(), ans);
  perform add_notif(o.uid, 'quer adotar ' || coalesce(nullif(o.species, ''), 'seu pet'), '#/adoptions');
exception when unique_violation then raise exception 'Você já se candidatou a este pet';
end $$;

create function adoptions() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'inbox', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'status', a.status, 'answers', a.answers::text, 'username', u.username, 'species', p.species, 'image', p.image) order by a.id desc)
       from adopt a join posts p on p.id = a.pid join profiles u on u.id = a.uid where p.uid = auth.uid()), '[]'::jsonb),
    'mine', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'status', a.status, 'species', p.species, 'image', p.image, 'owner', o.username) order by a.id desc)
       from adopt a join posts p on p.id = a.pid join profiles o on o.id = p.uid where a.uid = auth.uid()), '[]'::jsonb)) $$;

create function decide_adoption(aid bigint, act text) returns void language plpgsql security definer set search_path = public as $$
declare a adopt; o uuid;
begin
  perform must_login();
  if act not in ('approve', 'reject') then raise exception 'Ação inválida'; end if;
  select * into a from adopt where id = aid;
  select uid into o from posts where id = a.pid;
  if o is distinct from auth.uid() then raise exception 'Sem permissão'; end if;
  update adopt set status = case act when 'approve' then 'approved' else 'rejected' end where id = aid;
  if act = 'approve' then
    update posts set status = 'adopted' where id = a.pid;
    update adopt set status = 'rejected' where pid = a.pid and id <> aid and status = 'pending';
  end if;
  perform add_notif(a.uid, case act when 'approve' then 'aprovou sua candidatura de adoção 🎉' else 'recusou sua candidatura de adoção' end, '#/adoptions');
end $$;

create function admin_data() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Acesso restrito a administradores'; end if;
  return jsonb_build_object(
    'stats', jsonb_build_object('Usuários', (select count(*) from profiles), 'Publicações', (select count(*) from posts where status <> 'removed'),
      'Pets adotados', (select count(*) from posts where status = 'adopted'), 'Candidaturas pendentes', (select count(*) from adopt where status = 'pending'),
      'Mensagens', (select count(*) from msgs)),
    'users', coalesce((select jsonb_agg(to_jsonb(x)) from (select p.id, p.username, u.email, p.role, p.banned from profiles p join auth.users u on u.id = p.id order by p.created_at desc limit 100) x), '[]'::jsonb),
    'posts', coalesce((select jsonb_agg(to_jsonb(v)) from (select * from posts_v order by id desc limit 30) v), '[]'::jsonb));
end $$;

create function admin_user(u uuid, act text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Acesso restrito a administradores'; end if;
  if u = auth.uid() then raise exception 'Você não pode alterar a própria conta'; end if;
  if act = 'promote' then update profiles set role = 'admin' where id = u;
  elsif act in ('ban', 'unban') then update profiles set banned = (act = 'ban') where id = u;
  else raise exception 'Ação inválida'; end if;
end $$;

-- ===== Permissões mínimas + segurança por linha (RLS) =====
revoke all on profiles, posts, likes, comments, friendships, notifs, msgs, adopt, posts_v from anon, authenticated;
grant select on profiles, posts, likes, comments, friendships, notifs, posts_v to authenticated;
grant update(bio, avatar) on profiles to authenticated;                         -- ninguém altera o próprio papel (role) ou banimento
grant insert(image, caption, adoption, species, age, city) on posts to authenticated;
grant insert(pid, body) on comments to authenticated;
grant update(seen) on notifs to authenticated;
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function username_free(text) to anon;

alter table profiles enable row level security;  alter table posts enable row level security;
alter table likes enable row level security;     alter table comments enable row level security;
alter table friendships enable row level security; alter table notifs enable row level security;
alter table msgs enable row level security;      alter table adopt enable row level security;  -- msgs e adopt: só via funções

create policy s_prof on profiles for select to authenticated using (true);
create policy u_prof on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy s_post on posts for select to authenticated using (status <> 'removed');
create policy i_post on posts for insert to authenticated with check (uid = auth.uid() and active());
create policy s_like on likes for select to authenticated using (true);
create policy s_com on comments for select to authenticated using (true);
create policy i_com on comments for insert to authenticated with check (uid = auth.uid() and active());
create policy s_fr on friendships for select to authenticated using (auth.uid() in (a, b));
create policy s_not on notifs for select to authenticated using (uid = auth.uid());
create policy u_not on notifs for update to authenticated using (uid = auth.uid()) with check (uid = auth.uid());

-- ===== Storage: bucket público "photos" (só imagens de até 5 MB, cada um na própria pasta) =====
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
  values('photos', 'photos', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif']) on conflict (id) do nothing;
create policy "photos_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text and public.active());
create policy "photos_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);