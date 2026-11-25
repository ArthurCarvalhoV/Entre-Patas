'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* armazenamento indisponível */ } },
  del(k) { try { localStorage.removeItem(k); } catch { } }
};
let toastT;
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 4000); };

/* ---------- Acessibilidade: tema, fonte, alto contraste ---------- */
const root = document.documentElement, P = store.get('pn_prefs', {});
function applyPrefs() {
  const th = P.theme || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  root.dataset.theme = th; root.dataset.contrast = P.hc ? 'high' : 'normal';
  root.style.fontSize = (P.fs || 100) + '%';
  $('#theme').setAttribute('aria-pressed', th === 'dark'); $('#hc').setAttribute('aria-pressed', !!P.hc);
}
const savePrefs = () => { store.set('pn_prefs', P); applyPrefs(); };
$('#theme').onclick = () => { P.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; savePrefs(); };
$('#hc').onclick = () => { P.hc = !P.hc; savePrefs(); };
$$('[data-fs]').forEach(b => b.onclick = () => {
  const d = +b.dataset.fs; P.fs = d === 0 ? 100 : Math.min(140, Math.max(80, (P.fs || 100) + d * 10)); savePrefs();
});
applyPrefs();

/* ---------- Validação ---------- */
function check(el) {
  if (el.closest('[hidden]')) return true;
  const v = el.type === 'checkbox' ? el.checked : el.value.trim(); let m = '';
  for (const r of (el.dataset.v || '').split(' ')) {
    if (r === 'req' && !v) m = el.type === 'checkbox' ? 'Aceite os termos para continuar.' : 'Preencha este campo.';
    else if (r === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) m = 'Informe um e-mail válido, como nome@exemplo.com.';
    else if (r === 'pass' && v && !(v.length >= 8 && /\d/.test(v))) m = 'Use pelo menos 8 caracteres e 1 número.';
    else if (r === 'min10' && v && v.length < 10) m = 'Escreva pelo menos 10 caracteres.';
    else if (r === 'url' && v && !/^https?:\/\/\S+$/.test(v)) m = 'Informe um link que comece com http:// ou https://.';
    if (m) break;
  }
  el.setAttribute('aria-invalid', !!m);
  const o = $('#' + el.id + '-e'); if (o) o.textContent = m;
  return !m;
}
const validate = f => { const bad = $$('[data-v]', f).filter(e => !check(e)); if (bad[0]) bad[0].focus(); return !bad.length; };
['input', 'focusout'].forEach(ev => document.addEventListener(ev, e => { if (e.target.dataset && e.target.dataset.v) check(e.target); }));

/* ---------- Autenticação (simulada) ---------- */
const dlg = $('#auth'), af = $('#auth-form'); let mode = 'login';
function setMode(m) {
  mode = m;
  $$('.su', af).forEach(e => e.hidden = m === 'login');
  $('#auth-t').textContent = m === 'login' ? 'Entrar na Matilha' : 'Criar perfil do pet';
  $('#auth-go').textContent = m === 'login' ? 'Entrar' : 'Criar perfil';
  $('#auth-sw').textContent = m === 'login' ? 'Ainda não tem perfil? Crie o do seu pet' : 'Já tem perfil? Entrar';
  $('#a-pw').type = 'password'; $('#pw-t').textContent = 'Mostrar'; $('#pw-t').setAttribute('aria-pressed', 'false');
  $$('[data-v]', af).forEach(e => { e.setAttribute('aria-invalid', 'false'); $('#' + e.id + '-e').textContent = ''; });
}
function openAuth(m) { setMode(m); dlg.showModal(); (m === 'signup' ? $('#a-pet') : $('#a-email')).focus(); }
$('#auth-sw').onclick = () => setMode(mode === 'login' ? 'signup' : 'login');
$('#auth-x').onclick = () => dlg.close();
dlg.onclick = e => { if (e.target === dlg) dlg.close(); };
$('#pw-t').onclick = e => {
  const i = $('#a-pw'), show = i.type === 'password'; i.type = show ? 'text' : 'password';
  e.currentTarget.textContent = show ? 'Ocultar' : 'Mostrar'; e.currentTarget.setAttribute('aria-pressed', show);
};
af.onsubmit = e => {
  e.preventDefault(); if (!validate(af)) return;
  const em = $('#a-email').value.trim().toLowerCase(), acc = store.get('pn_acc', {});
  if (mode === 'signup') acc[em] = { pet: $('#a-pet').value.trim(), breed: $('#a-breed').value.trim() || 'SRD' };
  store.set('pn_acc', acc);
  const u = { ...(acc[em] || { pet: 'Thor', breed: 'Golden Retriever' }), email: em };
  store.set('pn_user', u); dlg.close(); af.reset(); renderUser(); toast(`Bem-vindo à matilha, ${u.pet}! 🐾`);
};
function renderUser() {
  const u = store.get('pn_user'), b = $('#user');
  b.innerHTML = u
    ? `<span class="chip"><span class="av" aria-hidden="true">${esc(u.pet[0].toUpperCase())}</span><span><strong>${esc(u.pet)}</strong><small>${esc(u.breed)}</small></span></span><button class="btn ghost" id="out" type="button">Sair</button>`
    : '<button class="btn" id="in" type="button">Entrar na Matilha</button>';
  if (u) $('#out').onclick = () => { store.del('pn_user'); renderUser(); toast('Você saiu da matilha. Até logo!'); };
  else $('#in').onclick = () => openAuth('login');
}
$$('[data-auth]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openAuth(a.dataset.auth); }));
$$('[data-soon]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); toast('Esta página estará disponível em breve.'); }));
renderUser();

/* ---------- Carrossel ---------- */
const car = $('#destaques'), sl = $$('.slide'), dots = $('#dots'), play = $('#play');
let ci = 0, timer, playing = !matchMedia('(prefers-reduced-motion:reduce)').matches;
sl.forEach((_, k) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = k + 1; b.setAttribute('aria-label', `Ir para o slide ${k + 1}`); b.onclick = () => go(k); dots.append(b); });
function go(n) {
  ci = (n + sl.length) % sl.length;
  sl.forEach((s, k) => s.classList.toggle('on', k === ci));
  [...dots.children].forEach((d, k) => d.setAttribute('aria-current', k === ci));
}
const stop = () => clearInterval(timer), run = () => { stop(); if (playing) timer = setInterval(() => go(ci + 1), 6000); };
function syncPlay() {
  play.textContent = playing ? '❚❚' : '▶'; play.setAttribute('aria-label', playing ? 'Pausar rotação automática' : 'Iniciar rotação automática');
  $('#slides').setAttribute('aria-live', playing ? 'off' : 'polite');
}
$('#prev').onclick = () => go(ci - 1); $('#next').onclick = () => go(ci + 1);
play.onclick = () => { playing = !playing; syncPlay(); run(); };
car.addEventListener('mouseenter', stop); car.addEventListener('mouseleave', run);
car.addEventListener('focusin', stop); car.addEventListener('focusout', run);
car.addEventListener('keydown', e => { if (e.key === 'ArrowRight') go(ci + 1); if (e.key === 'ArrowLeft') go(ci - 1); });
go(0); syncPlay(); run();

/* ---------- Feed ---------- */
const img = id => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`;
const DEF = { dog: 'photo-1587300003388-59208cc962cb', cat: 'photo-1514888286974-6c03e2ca1dba', exotic: 'photo-1585110396000-c9ffd4e4b308' };
const SEED = [
  { id: 1, name: 'Thor', breed: 'Golden Retriever', owner: 'Marina', cat: 'dog', vac: 1, adopt: 0, cap: 'Primeiro dia de praia: aprovou a água e rejeitou a toalha.', img: img('photo-1552053831-71594a27632d'), likes: 128, cm: ['Rafael: Que sorriso lindo!', 'Carla: Vamos marcar um passeio no parque?'] },
  { id: 2, name: 'Luna', breed: 'Siamês', owner: 'Rafael', cat: 'cat', vac: 1, adopt: 0, cap: 'Soneca na janela. Ninguém acorda a rainha da casa.', img: img('photo-1514888286974-6c03e2ca1dba'), likes: 96, cm: ['Marina: Que olhar!'] },
  { id: 3, name: 'Mel', breed: 'SRD', owner: 'ONG Patas Amigas', cat: 'dog', vac: 1, adopt: 1, cap: 'Castrada, vacinada e muito carinhosa. Procura um lar com amor e passeios.', img: img('photo-1587300003388-59208cc962cb'), likes: 74, cm: [] },
  { id: 4, name: 'Kiwi', breed: 'Arara-canindé', owner: 'Bruno', cat: 'exotic', vac: 0, adopt: 0, cap: 'Aprendeu a dizer “bom dia” e agora acorda o prédio inteiro.', img: img('photo-1552728089-57bdde30beb3'), likes: 59, cm: ['Davi: Que penas incríveis!'] },
  { id: 5, name: 'Bolinha', breed: 'Coelho Mini Lop', owner: 'Carla', cat: 'exotic', vac: 1, adopt: 0, cap: 'Cenoura aprovada. Orelhas em modo antena.', img: img('photo-1585110396000-c9ffd4e4b308'), likes: 41, cm: [] },
  { id: 6, name: 'Nina', breed: 'Gata SRD', owner: 'ONG Patas Amigas', cat: 'cat', vac: 1, adopt: 1, cap: 'Dócil, brincalhona e pronta para ser a rainha de um novo lar.', img: img('photo-1543852786-1cf6624b9987'), likes: 67, cm: [] }
];
let posts = store.get('pn_posts', null) || SEED, st = store.get('pn_st', { liked: [], saved: [] }), cat = 'all', q = '';
const persist = () => { store.set('pn_posts', posts); store.set('pn_st', st); };
const who = () => (store.get('pn_user') || {}).pet || 'Visitante';
const card = p => `<article class="card" data-id="${p.id}" aria-labelledby="t${p.id}">
  <img src="${esc(p.img)}" alt="Foto de ${esc(p.name)}, ${esc(p.breed)}" loading="lazy">
  <div class="bd"><h3 id="t${p.id}">${esc(p.name)}${p.vac ? '<span class="badge">✔ Vacinado</span>' : ''}${p.adopt ? '<span class="badge">Adoção</span>' : ''}</h3>
  <p class="mu">${esc(p.breed)} · ${esc(p.owner)}</p><p>${esc(p.cap)}</p>
  <div class="act">
    <button type="button" class="like" aria-pressed="${st.liked.includes(p.id)}" aria-label="Dar petisco para ${esc(p.name)}">🦴 <b>${p.likes}</b></button>
    <button type="button" class="cm" aria-expanded="false" aria-controls="c${p.id}" aria-label="Comentários de ${esc(p.name)}">💬 <b>${p.cm.length}</b></button>
    <button type="button" class="sv" aria-pressed="${st.saved.includes(p.id)}">★ Salvar</button>
  </div>
  <div class="cbox" id="c${p.id}" hidden><ul>${p.cm.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
    <form><label class="sr" for="ci${p.id}">Escreva um comentário</label><input id="ci${p.id}" maxlength="140" autocomplete="off" placeholder="Escreva um comentário"><button class="btn" type="submit">Enviar</button></form></div>
  </div></article>`;
function render() {
  const k = q.toLowerCase();
  const list = posts.filter(p => (cat === 'all' || (cat === 'adopt' ? p.adopt : p.cat === cat)) && [p.name, p.breed, p.owner, p.cap].join(' ').toLowerCase().includes(k));
  $('#grid').innerHTML = list.map(card).join('');
  $('#count').textContent = `${list.length} ${list.length === 1 ? 'pet encontrado' : 'pets encontrados'}`;
  $('#empty').hidden = !!list.length;
}
const syncTabs = () => $$('.tab').forEach(b => b.setAttribute('aria-pressed', b.dataset.cat === cat));
$$('.tab').forEach(b => b.onclick = () => { cat = b.dataset.cat; syncTabs(); render(); });
$$('[data-filter]').forEach(a => a.addEventListener('click', () => { cat = a.dataset.filter; syncTabs(); render(); }));
$('#q').oninput = e => { q = e.target.value.trim(); render(); };

$('#grid').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const c = b.closest('.card'), p = posts.find(x => x.id == c.dataset.id);
  if (b.classList.contains('like')) {
    const on = !st.liked.includes(p.id); st.liked = on ? [...st.liked, p.id] : st.liked.filter(i => i !== p.id);
    p.likes += on ? 1 : -1; b.setAttribute('aria-pressed', on); $('b', b).textContent = p.likes;
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  } else if (b.classList.contains('cm')) {
    const box = $('.cbox', c), open = box.hidden; box.hidden = !open; b.setAttribute('aria-expanded', open); if (open) $('input', box).focus();
  } else if (b.classList.contains('sv')) {
    const on = !st.saved.includes(p.id); st.saved = on ? [...st.saved, p.id] : st.saved.filter(i => i !== p.id);
    b.setAttribute('aria-pressed', on); toast(on ? `${p.name} foi salvo nos favoritos.` : `${p.name} saiu dos favoritos.`);
  } else return;
  persist();
});
$('#grid').addEventListener('submit', e => {
  e.preventDefault(); const f = e.target, c = f.closest('.card'), p = posts.find(x => x.id == c.dataset.id), i = $('input', f), t = i.value.trim();
  if (!t) { i.focus(); return; }
  const line = `${who()}: ${t}`; p.cm.push(line);
  $('ul', c).insertAdjacentHTML('beforeend', `<li>${esc(line)}</li>`); $('.cm b', c).textContent = p.cm.length;
  i.value = ''; persist(); toast('Comentário publicado.');
});

const nf = $('#new');
nf.onsubmit = e => {
  e.preventDefault(); if (!validate(nf)) return;
  const g = id => $('#' + id).value.trim(), c = g('n-cat'), u = store.get('pn_user');
  posts.unshift({ id: Date.now(), name: g('n-name'), breed: g('n-breed') || 'SRD', owner: u ? 'Tutor de ' + u.pet : 'Visitante', cat: c, vac: $('#n-vac').checked ? 1 : 0, adopt: $('#n-adopt').checked ? 1 : 0, cap: g('n-cap'), img: g('n-img') || img(DEF[c]), likes: 0, cm: [] });
  persist(); nf.reset(); cat = 'all'; q = ''; $('#q').value = ''; syncTabs(); render();
  toast('Postagem publicada! Seu pet já está no feed. 🐶');
};
render();

/* ---------- Contato ---------- */
const cf = $('#contact');
cf.onsubmit = e => { e.preventDefault(); if (!validate(cf)) return; cf.reset(); toast('Mensagem enviada! Responderemos em até 2 dias úteis.'); };