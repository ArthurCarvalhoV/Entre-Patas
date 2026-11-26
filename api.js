/* Entre Patas – camada de dados. Traduz as chamadas do app para Supabase (Auth, Postgres/RPC e Storage). */
'use strict';
const CFG = window.ENTRE_PATAS || {};
const sb = supabase.createClient(CFG.url || 'https://x.supabase.co', CFG.key || 'x');
const MSG = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail pelo link que enviamos e tente de novo.',
  'User already registered': 'Este e-mail já está cadastrado.'
};
const D = async r => { r = await r; if (r.error) throw Error(MSG[r.error.message] || r.error.message); return r.data; };
const uid = async () => (await sb.auth.getSession()).data.session?.user.id;

async function rel() { // amizades do usuário logado (a política RLS só devolve as dele)
  const me = await uid(), x = { friends: [], requests: [], related: [me] };
  (await D(sb.from('friendships').select('a,b,status'))).forEach(f => {
    const o = f.a == me ? f.b : f.a; x.related.push(o);
    if (f.status == 'accepted') x.friends.push(o); else if (f.b == me) x.requests.push(o);
  });
  return x;
}

async function api(p, o = {}) {
  const [path, qs] = p.split('?'), q = new URLSearchParams(qs || ''), [k, a, c, e] = path.split('/').filter(Boolean), m = o.m || 'GET', b = o.b || {};
  switch (k) {
    case 'me': {
      if (m == 'PUT') return D(sb.from('profiles').update({ bio: b.bio || '', avatar: b.avatar || '' }).eq('id', await uid()));
      const r = await D(sb.rpc('me_info'));
      if (!r) { await sb.auth.signOut(); return { user: null }; }
      return r;
    }
    case 'login': await D(sb.auth.signInWithPassword({ email: b.login, password: b.password })); return {};
    case 'register': {
      if (!/^[\w.]{3,20}$/.test(b.username)) throw Error('Usuário: 3 a 20 letras, números, _ ou .');
      if (b.password.length < 8 || !/\d/.test(b.password)) throw Error('Senha: mínimo de 8 caracteres e 1 número');
      if (!(await D(sb.rpc('username_free', { n: b.username })))) throw Error('Este nome de usuário já está em uso.');
      const r = await D(sb.auth.signUp({ email: b.email, password: b.password, options: { data: { username: b.username } } }));
      return { session: !!r.session };
    }
    case 'logout': return D(sb.auth.signOut());
    case 'upload': {
      const n = `${await uid()}/${crypto.randomUUID()}.jpg`;
      await D(sb.storage.from('photos').upload(n, o.raw, { contentType: 'image/jpeg' }));
      return { url: sb.storage.from('photos').getPublicUrl(n).data.publicUrl };
    }
    case 'feed': {
      const t = q.get('tab');
      let s = sb.from('posts_v').select('*').order('id', { ascending: false }).limit(30);
      if (t == 'adoption') s = s.eq('adoption', true);
      if (t == 'friends') s = s.in('uid', [await uid(), ...(await rel()).friends]);
      return { posts: await D(s) };
    }
    case 'posts':
      if (!a) {
        if (b.adoption && !(b.species && b.city)) throw Error('Para adoção, informe espécie/raça e cidade');
        return D(sb.from('posts').insert({ image: b.image, caption: b.caption || '', adoption: !!b.adoption, species: b.species || '', age: b.age || '', city: b.city || '' }));
      }
      if (c == 'like') return D(sb.rpc('toggle_like', { p: +a }));
      if (c == 'comments') {
        if (m == 'POST') return D(sb.from('comments').insert({ pid: +a, body: (b.body || '').trim() }));
        const r = await D(sb.from('comments').select('body,profiles(username)').eq('pid', +a).order('id'));
        return { comments: r.map(x => ({ body: x.body, username: x.profiles.username })) };
      }
      return D(sb.rpc('remove_post', { p: +a }));
    case 'users': return D(sb.rpc('profile', { un: a }));
    case 'friends': {
      if (m != 'GET') return D(sb.rpc(m == 'POST' ? 'friend_add' : 'friend_del', { un: a }));
      const x = await rel(), ids = [...new Set([...x.friends, ...x.requests])], t = (q.get('q') || '').replace(/[%_,()]/g, '');
      const pr = ids.length ? await D(sb.from('profiles').select('id,username,avatar').in('id', ids).eq('banned', false)) : [];
      const sg = await D(sb.from('profiles').select('username,avatar').not('id', 'in', `(${x.related.join(',')})`).eq('banned', false).ilike('username', `%${t}%`).limit(12));
      return { friends: pr.filter(u => x.friends.includes(u.id)), requests: pr.filter(u => x.requests.includes(u.id)), suggest: sg };
    }
    case 'notifications': {
      const r = await D(sb.from('notifs').select('txt,link,seen,created_at,actor:profiles!notifs_actor_fkey(username,avatar)').order('id', { ascending: false }).limit(40));
      await sb.from('notifs').update({ seen: true }).eq('seen', false);
      return { items: r.map(n => ({ text: n.txt, link: n.link, seen: n.seen, created: Date.parse(n.created_at) / 1e3, username: n.actor.username, avatar: n.actor.avatar })) };
    }
    case 'conversations': return { items: await D(sb.rpc('conversations')) };
    case 'messages': return m == 'POST' ? D(sb.rpc('send_msg', { un: a, m: b.body })) : { items: await D(sb.rpc('thread', { un: a })) };
    case 'adopt': return D(sb.rpc('apply_adoption', { p: +a, d: b }));
    case 'adoptions': return m == 'POST' ? D(sb.rpc('decide_adoption', { aid: +a, act: c })) : D(sb.rpc('adoptions'));
    case 'admin': return a == 'users' ? D(sb.rpc('admin_user', { u: c, act: e })) : D(sb.rpc('admin_data'));
  }
  throw Error('Ação desconhecida: ' + p);
}
