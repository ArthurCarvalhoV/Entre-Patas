'use strict';
const $=s=>document.querySelector(s),R=document.documentElement;
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let U=null,N={},P={},poll;
const S=k=>{try{return localStorage.getItem(k)}catch{}},W=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
function pref(){R.dataset.t=S('ep_t')||(matchMedia('(prefers-color-scheme:dark)').matches?'d':'l');R.dataset.c=S('ep_hc')=='1'?'h':'n';R.style.fontSize=(S('ep_fs')||100)+'%';
  document.querySelectorAll('[data-a=th]').forEach(x=>x.setAttribute('aria-pressed',R.dataset.t=='d'));document.querySelectorAll('[data-a=hc]').forEach(x=>x.setAttribute('aria-pressed',S('ep_hc')=='1'))}
const toast=m=>{const t=$('#toast');t.textContent=m;t.className='show';clearTimeout(toast.t);toast.t=setTimeout(()=>t.className='',3500)};
const ago=t=>{const s=(Date.now()/1e3-t)|0;return s<60?'agora':s<3600?(s/60|0)+' min':s<86400?(s/3600|0)+' h':(s/86400|0)+' d'};
const av=(u,c='')=>u.avatar?`<img class="av ${c}" src="${E(u.avatar)}" alt="">`:`<span class="av ${c}" aria-hidden="true">${E(u.username[0].toUpperCase())}</span>`;
function shrink(file,max=1080){return new Promise((ok,no)=>{const i=new Image();i.onload=()=>{const s=Math.min(1,max/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=i.width*s;c.height=i.height*s;c.getContext('2d').drawImage(i,0,0,c.width,c.height);c.toBlob(b=>b?ok(b):no(Error('Falha ao processar a foto')),'image/jpeg',.85)};i.onerror=()=>no(Error('Arquivo de imagem inválido'));i.src=URL.createObjectURL(file)})}
const up=async(f,max)=>(await api('/upload',{m:'POST',raw:await shrink(f,max),type:'image/jpeg'})).url;

function head(){
  $('#top').innerHTML=`<a class="logo" href="#/${U?'feed':'home'}" aria-label="Entre Patas, início"><span class="mark" aria-hidden="true">🐾</span>Entre Patas</a>`+(U?`<nav aria-label="Principal">
<a href="#/feed" aria-label="Início">🏠</a><a href="#/adoptions" aria-label="Adoção responsável">🐕</a><a href="#/new" aria-label="Nova publicação">➕</a>
<a href="#/chat" aria-label="Mensagens${N.msgs?`, ${N.msgs} novas`:''}">💬${N.msgs?`<i>${N.msgs}</i>`:''}</a>
<a href="#/notifs" aria-label="Notificações${N.notifs?`, ${N.notifs} novas`:''}">🔔${N.notifs?`<i>${N.notifs}</i>`:''}</a>
<a href="#/friends" aria-label="Amigos">👥</a>${U.role=='admin'?'<a href="#/admin" aria-label="Painel administrativo">🛡️</a>':''}
<a href="#/me" aria-label="Meu perfil">${av(U)}</a></nav><div class="hactions"><button type="button" class="btn ghost sm" data-a="out">Sair</button></div>`
  :`<nav class="pub" aria-label="Principal"><a href="#/home">Início</a><a href="#/home/pets">Pets</a><a href="#/home/como">Como funciona</a><a href="#/home/contato">Contato</a></nav><div class="hactions"><a class="btn ghost sm" href="#/login">Entrar</a><a class="btn sm" href="#/register">Criar conta</a></div>`)}

async function go(){
  clearInterval(poll);clearInterval(go.c);let [,r,a]=location.hash.slice(1).split('/');
  if(!CFG.url||/SEU-PROJETO/.test(CFG.url)){$('#v').innerHTML='<p class="card pad">Falta configurar o <b>config.js</b> com a URL e a chave pública do Supabase (veja o README).</p>';return}
  try{N=await api('/me');U=N.user}catch{U=null}
  r=r||(U?'feed':'home');head();foot();
  $('#v').className=U&&r!='home'?'narrow':'';
  try{
    if(!U)await(r=='home'?V.home(a):auth());else await(V[r=='login'||r=='register'?'feed':r]||V.feed)(a);
    if(r!='home'||!a)scrollTo(0,0)
  }catch(e){$('#v').innerHTML=`<p class="err pad" role="alert">${E(e.message)}</p>`}
  if(!go.f){go.f=1}else $('#v').focus({preventScroll:true})}
addEventListener('hashchange',go);

function auth(){
  const reg=location.hash=='#/register';
  $('#v').innerHTML=`<section class="authwrap"><aside class="authside" aria-hidden="true"><h2>Entre na matilha</h2><p>Compartilhe fotos, converse com outros tutores e ajude um pet a encontrar um lar.</p></aside>
<form class="card auth" data-f="${reg?'reg':'login'}"><h1>${reg?'Criar conta':'Entrar'}</h1><p class="mu">${reg?'Crie o perfil e entre na matilha.':'Bem-vindo de volta! Entre para ver os pets dos seus amigos.'}</p>
${reg?`<label>Usuário<input name="username" autocomplete="username" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_.]{3,20}" title="3 a 20 letras, números, _ ou ."></label><label>E-mail<input name="email" type="email" autocomplete="email" required></label>`:`<label>E-mail<input name="login" type="email" autocomplete="email" required></label>`}
<label>Senha${reg?' (8+ caracteres e 1 número)':''}<span class="pw"><input id="pw" name="password" type="password" autocomplete="${reg?'new-password':'current-password'}" required minlength="${reg?8:1}"><button type="button" class="btn ghost sm" data-a="pw" aria-controls="pw" aria-pressed="false">Mostrar</button></span></label>
<p class="err" role="alert"></p><button class="btn big">${reg?'Criar conta':'Entrar'}</button>
<p class="center">${reg?'Já tem conta? <a href="#/login">Entrar</a>':'Novo por aqui? <a href="#/register">Criar conta</a>'}</p></form></section>`}

const card=p=>{P[p.id]=p;const own=!!U&&(U.id==p.uid||U.role=='admin');return`<article class="card post" id="p${p.id}">
<header class="ph"><a class="who" href="#/u/${E(p.username)}">${av(p)}<b>${E(p.username)}</b></a>${p.adoption?`<span class="badge">${p.status=='adopted'?'Adotado 🏡':'Para adoção'}</span>`:''}${own?`<button class="x" data-a="del" data-id="${p.id}" aria-label="Excluir publicação">🗑</button>`:''}</header>
<img class="pic" src="${E(p.image)}" alt="Foto de ${E(p.username)}${p.caption?': '+E(p.caption.slice(0,80)):''}" loading="lazy">
<div class="pb"><div class="acts"><button data-a="${p.sample?'demo':'like'}" data-id="${p.id}" aria-pressed="${!!p.liked}" aria-label="Curtir">${p.liked?'♥':'♡'}</button><button data-a="${p.sample?'demo':'cmt'}" data-id="${p.id}" aria-label="Comentários">💬</button>${p.adoption&&p.status=='open'&&p.uid!=(U&&U.id)?`<button class="btn sm" data-a="${p.sample?'demo':'adopt'}" data-id="${p.id}">Quero adotar</button>`:''}</div>
<p><b class="lk">${p.likes}</b> curtidas</p>${p.adoption?`<p class="mu">${E(p.species)} · ${E(p.age)} · ${E(p.city)}</p>`:''}
<p><b>${E(p.username)}</b> ${E(p.caption)}</p><p class="mu"><small>${ago(p.created)}</small></p><div class="cm" hidden></div></div></article>`};

async function cms(id,c){
  const {comments}=await api(`/posts/${id}/comments`);
  c.innerHTML=comments.map(x=>`<p><b>${E(x.username)}</b> ${E(x.body)}</p>`).join('')+`<form data-f="cm" data-id="${id}"><label class="sr" for="c${id}">Comentário</label><input id="c${id}" name="body" maxlength="300" placeholder="Adicionar comentário…" required><button class="btn sm">Publicar</button></form>`;
  c.querySelector('input').focus()}

const ul=(a,act,lb,act2,lb2)=>a.map(u=>`<li class="row">${av(u)}<a href="#/u/${E(u.username)}">${E(u.username)}</a>${act?`<button class="btn sm" data-a="${act}" data-u="${E(u.username)}">${lb}</button>`:''}${act2?`<button class="btn sm ghost" data-a="${act2}" data-u="${E(u.username)}">${lb2}</button>`:''}</li>`).join('')||'<li class="mu">Ninguém por aqui.</li>';

const V={
  async home(sec){
    FEED=SAMPLE;FC='all';FQ='';
    $('#v').innerHTML=hero()+`<section class="wrap" id="s-pets"><p class="eyebrow">Comunidade</p><h2>Pets em destaque</h2><p class="lead">Conheça alguns pets da matilha. Busque por nome, raça ou cidade e filtre por categoria.</p>${fbar('')}<p id="fcount" class="mu" role="status"></p><div id="plist" class="cards"></div><p class="center">${U?'<a class="btn big" href="#/feed">Ir para o meu feed</a>':'<a class="btn big" href="#/register">Quero publicar o meu pet</a>'}</p></section>
<section class="band" id="s-como"><div class="wrap"><p class="eyebrow">Passo a passo</p><h2>Como funciona</h2>
<ol class="steps"><li><span class="ic" aria-hidden="true">📸</span><h3>1. Crie o perfil do seu pet</h3><p>Foto, nome, raça e uma bio. O cartão do seu pet fica pronto em poucos minutos.</p></li>
<li><span class="ic" aria-hidden="true">🌳</span><h3>2. Conecte-se com vizinhos e parques</h3><p>Adicione amigos, converse por mensagens e combine passeios e encontros.</p></li>
<li><span class="ic" aria-hidden="true">🏠</span><h3>3. Rede de apoio e adoção</h3><p>Divulgue pets que procuram um lar e analise cada candidatura com responsabilidade.</p></li>
<li><span class="ic" aria-hidden="true">🩺</span><h3>4. Saúde e bem-estar</h3><p>Compartilhe cuidados, vacinas em dia e dicas com a ajuda da comunidade.</p></li></ol></div></section>
<section class="wrap" id="s-contato"><div class="contact"><div><p class="eyebrow">Contato</p><h2>Fale com a gente</h2><p class="lead">Dúvidas, sugestões, parcerias com PetShops e clínicas ou denúncias de maus-tratos: escreva e responderemos em até 2 dias úteis.</p></div>
<form class="card pad" data-f="contact" novalidate>
<div class="grid2"><div class="f"><label for="c-name">Nome do tutor</label><input id="c-name" name="name" data-v="req" autocomplete="name"><p class="fe" id="c-name-e" aria-live="polite"></p></div>
<div class="f"><label for="c-pet">Nome do pet</label><input id="c-pet" name="pet" data-v="req"><p class="fe" id="c-pet-e" aria-live="polite"></p></div>
<div class="f"><label for="c-email">E-mail</label><input id="c-email" name="email" type="email" data-v="req email" autocomplete="email"><p class="fe" id="c-email-e" aria-live="polite"></p></div>
<div class="f"><label for="c-sub">Assunto</label><select id="c-sub" name="subject" data-v="req"><option value="">Selecione</option><option>Dúvida</option><option>Sugestão</option><option>Denúncia de Maus-Tratos</option><option>Parceria PetShop/Vet</option></select><p class="fe" id="c-sub-e" aria-live="polite"></p></div></div>
<div class="f"><label for="c-msg">Mensagem</label><textarea id="c-msg" name="message" rows="4" data-v="req min10"></textarea><p class="fe" id="c-msg-e" aria-live="polite"></p></div>
<div class="f"><label class="ck"><input type="checkbox" id="c-lgpd" name="lgpd" data-v="req">Concordo com o tratamento dos meus dados pessoais conforme a LGPD.</label><p class="fe" id="c-lgpd-e" aria-live="polite"></p></div>
<button class="btn big">Enviar mensagem</button></form></div></section>`;
    $('#fq').oninput=e=>{FQ=e.target.value;plist()};plist();carInit();
    if(sec)document.getElementById('s-'+sec)?.scrollIntoView()},
  async feed(sc='all'){
    const [{posts},fr]=await Promise.all([api('/feed?tab='+(sc=='friends'?'friends':'all')),api('/friends')]);
    FEED=posts;FC='all';FQ='';
    $('#v').innerHTML=`<div class="stories" aria-label="Amigos e sugestões">${[...fr.friends,...fr.suggest].map(u=>`<a href="#/u/${E(u.username)}"><span class="ring">${av(u)}</span>${E(u.username)}</a>`).join('')}</div>
<p class="center"><a class="btn big" href="#/new">➕ Nova publicação</a></p>
${fbar(`<div class="seg" role="group" aria-label="Origem das publicações"><a href="#/feed" ${sc=='friends'?'':'aria-current="page"'}>Para você</a><a href="#/feed/friends" ${sc=='friends'?'aria-current="page"':''}>Amigos</a></div>`)}
<p id="fcount" class="mu" role="status"></p><div id="plist"></div>`;
    $('#fq').oninput=e=>{FQ=e.target.value;plist()};plist()},
  new(){
    $('#v').innerHTML=`<form class="card pad" data-f="post"><h1>Nova publicação</h1><label>Foto<input type="file" name="file" accept="image/*" required></label><img id="pv" class="pic" alt="Pré-visualização da foto" hidden>
<label>Categoria<select name="category" required><option value="">Selecione</option><option value="dog">Cachorro</option><option value="cat">Gato</option><option value="exotic">Exótico ou ave</option><option value="other">Outro</option></select></label><label>Legenda<textarea name="caption" maxlength="500" rows="3"></textarea></label>
<label class="ck"><input type="checkbox" name="adoption" id="ad">Este pet está disponível para adoção responsável</label>
<div id="adf" hidden><label>Espécie e raça<input name="species" maxlength="60"></label><label>Idade<input name="age" maxlength="60" placeholder="Ex.: 2 anos"></label><label>Cidade<input name="city" maxlength="60"></label><p class="mu">Conte na legenda se o pet é vacinado e castrado. Você decide quem pode adotar.</p></div>
<p class="err" role="alert"></p><button class="btn">Publicar</button></form>`;
    $('[name=file]').onchange=e=>{const f=e.target.files[0];if(f){$('#pv').src=URL.createObjectURL(f);$('#pv').hidden=false}};
    $('#ad').onchange=e=>$('#adf').hidden=!e.target.checked},
  me(){return V.u(U.username)},
  async u(un){
    const {user:u,rel,friends,posts}=await api('/users/'+un);posts.forEach(p=>P[p.id]=p);const x=E(u.username);
    const btn={self:'<button class="btn ghost" data-a="edit">Editar perfil</button>',none:`<button class="btn" data-a="fr" data-u="${x}">Adicionar amigo</button>`,sent:`<button class="btn ghost" data-a="unfr" data-u="${x}">Pedido enviado · cancelar</button>`,received:`<button class="btn" data-a="fr" data-u="${x}">Aceitar pedido</button>`,friends:`<button class="btn ghost" data-a="unfr" data-u="${x}">Amigos ✓ · desfazer</button>`}[rel];
    $('#v').innerHTML=`<section class="card pad prof">${av(u,'big')}<div><h1>${x}</h1><p><b>${posts.length}</b> publicações · <b>${friends}</b> amigos</p><p>${E(u.bio)}</p><p class="row">${btn}${rel!='self'?`<a class="btn ghost" href="#/chat/${x}">Mensagem</a>`:''}</p></div></section><div id="ed"></div>
<div class="grid">${posts.map(p=>`<button data-a="open" data-id="${p.id}"><img src="${E(p.image)}" alt="${E((p.caption||'').slice(0,60)||'Publicação de '+u.username)}"></button>`).join('')||'<p class="mu pad">Nenhuma publicação ainda.</p>'}</div>`},
  async friends(){
    const r=await api('/friends');
    $('#v').innerHTML=`<h1 class="pad">Amigos</h1><form data-f="search" class="row pad" role="search"><label class="sr" for="q">Buscar tutores</label><input id="q" name="q" placeholder="Buscar tutores…" style="flex:1"><button class="btn">Buscar</button></form>
${r.requests.length?`<h2 class="pad">Pedidos recebidos</h2><ul class="card list">${ul(r.requests,'fr','Aceitar','unfr','Recusar')}</ul>`:''}
<h2 class="pad">Seus amigos</h2><ul class="card list">${ul(r.friends,'chat','Mensagem')}</ul><h2 class="pad">Sugestões</h2><ul class="card list" id="sg">${ul(r.suggest,'fr','Adicionar')}</ul>`},
  async notifs(){
    const {items}=await api('/notifications');
    $('#v').innerHTML=`<h1 class="pad">Notificações</h1><ul class="card list">${items.map(n=>`<li class="${n.seen?'':'new'}"><a class="row" href="${E(n.link)}">${av(n)}<span><b>${E(n.username)}</b> ${E(n.text)} <small class="mu">${ago(n.created)}</small></span></a></li>`).join('')||'<li class="mu">Sem notificações por enquanto.</li>'}</ul>`;
    N.notifs=0;head()},
  async chat(u){
    if(u)return thread(u);
    const {items}=await api('/conversations');
    $('#v').innerHTML=`<h1 class="pad">Mensagens</h1><ul class="card list">${items.map(c=>`<li><a class="row" href="#/chat/${E(c.username)}">${av(c)}<span><b>${E(c.username)}</b>${c.unread?` <i>${c.unread}</i>`:''}<br><small class="mu">${E(c.body.slice(0,50))}</small></span></a></li>`).join('')||'<li class="mu">Nenhuma conversa ainda. Abra o perfil de um amigo e toque em “Mensagem”.</li>'}</ul>`},
  async adoptions(){
    const {inbox,mine}=await api('/adoptions'),L={pending:'Em análise',approved:'Aprovada 🎉',rejected:'Recusada'};
    $('#v').innerHTML=`<h1 class="pad">Adoção responsável</h1><p class="pad mu">Leia as respostas, converse com o candidato e só aprove depois de conhecer o lar. Pets adotados saem da lista de disponíveis.</p>
<h2 class="pad">Candidaturas recebidas</h2><ul class="card list">${inbox.map(a=>{const r=JSON.parse(a.answers);return`<li><div class="row"><img class="th" src="${E(a.image)}" alt=""><span><b>${E(a.username)}</b> quer adotar ${E(a.species)}</span><span class="badge">${L[a.status]}</span></div>
<dl><dt>Moradia</dt><dd>${E(r.home)}</dd><dt>Outros pets</dt><dd>${E(r.pets)}</dd><dt>Experiência</dt><dd>${E(r.experience)}</dd><dt>Motivo</dt><dd>${E(r.why)}</dd></dl>
<div class="row"><a class="btn ghost sm" href="#/chat/${E(a.username)}">Conversar</a>${a.status=='pending'?`<button class="btn sm" data-a="dec" data-id="${a.id}" data-v="approve">Aprovar</button><button class="btn ghost sm" data-a="dec" data-id="${a.id}" data-v="reject">Recusar</button>`:''}</div></li>`}).join('')||'<li class="mu">Nenhuma candidatura ainda.</li>'}</ul>
<h2 class="pad">Minhas candidaturas</h2><ul class="card list">${mine.map(a=>`<li class="row"><img class="th" src="${E(a.image)}" alt=""><span>${E(a.species)} de <a href="#/u/${E(a.owner)}">${E(a.owner)}</a></span><span class="badge">${L[a.status]}</span></li>`).join('')||'<li class="mu">Você ainda não se candidatou. Veja a aba Adoção no feed.</li>'}</ul>`},
  async admin(){
    const [{stats,users,posts},{items:cts}]=await Promise.all([api('/admin'),api('/admin/contacts')]);
    $('#v').innerHTML=`<h1 class="pad">Painel administrativo</h1><div class="stats">${Object.entries(stats).map(([k,v])=>`<div class="card pad"><b>${v}</b><br>${E(k)}</div>`).join('')}</div>
<h2 class="pad">Usuários</h2><div class="card scroll"><table><caption class="sr">Usuários cadastrados</caption><tr><th>Usuário</th><th>E-mail</th><th>Perfil</th><th>Ações</th></tr>${users.map(u=>`<tr><td><a href="#/u/${E(u.username)}">${E(u.username)}</a></td><td>${E(u.email)}</td><td>${u.role}${u.banned?' · suspenso':''}</td><td>${u.id==U.id?'—':`<button class="btn sm ghost" data-a="adm" data-id="${u.id}" data-v="${u.banned?'unban':'ban'}">${u.banned?'Reativar':'Suspender'}</button>${u.role!='admin'?` <button class="btn sm ghost" data-a="adm" data-id="${u.id}" data-v="promote">Tornar admin</button>`:''}`}</td></tr>`).join('')}</table></div>
<h2 class="pad">Mensagens de contato</h2><ul class="card list">${cts.map(c=>`<li><b>${E(c.subject)}</b> · ${E(c.name)} (pet: ${E(c.pet)}) · <a href="mailto:${E(c.email)}">${E(c.email)}</a><br>${E(c.message)}</li>`).join('')||'<li class="mu">Nenhuma mensagem ainda.</li>'}</ul><h2 class="pad">Publicações recentes</h2>${posts.map(card).join('')}`}
};

async function thread(u){
  $('#v').innerHTML=`<section class="card chat"><h1 class="pad"><a href="#/chat" aria-label="Voltar">‹</a> <a href="#/u/${E(u)}">${E(u)}</a></h1><div class="msgs" role="log" aria-live="polite" tabindex="0"></div>
<form data-f="msg" data-u="${E(u)}" class="row"><label class="sr" for="mb">Mensagem</label><input id="mb" name="body" maxlength="1000" autocomplete="off" placeholder="Escreva uma mensagem…" required><button class="btn sm">Enviar</button></form></section>`;
  const load=thread.load=async()=>{const {items}=await api('/messages/'+u),b=$('.msgs');if(!b||b.childElementCount==items.length)return;b.innerHTML=items.map(m=>`<p class="m ${m.mine?'me':''}">${E(m.body)}</p>`).join('');b.scrollTop=b.scrollHeight};
  await load();poll=setInterval(()=>load().catch(()=>{}),4000)}

const F={
  login:async(f,d)=>{await api('/login',{m:'POST',b:d});history.replaceState(null,'','#/feed');go()},
  reg:async(f,d)=>{const r=await api('/register',{m:'POST',b:d});if(!r.session){toast('Conta criada! Confirme o link enviado ao seu e-mail e depois entre.');history.replaceState(null,'','#/login');return go()}history.replaceState(null,'','#/feed');go()},
  post:async(f,d)=>{const file=f.elements.file.files[0];if(!file)throw Error('Escolha uma foto');
    await api('/posts',{m:'POST',b:{image:await up(file),caption:d.caption,adoption:!!d.adoption,species:d.species,age:d.age,city:d.city,category:d.category}});toast('Publicado!');location.hash='#/feed'},
  cm:async(f,d)=>{const c=f.closest('.cm');await api(`/posts/${f.dataset.id}/comments`,{m:'POST',b:d});await cms(f.dataset.id,c)},
  msg:async(f,d)=>{await api('/messages/'+f.dataset.u,{m:'POST',b:d});f.reset();await thread.load()},
  search:async(f,d)=>{const r=await api('/friends?q='+encodeURIComponent(d.q||''));$('#sg').innerHTML=ul(r.suggest,'fr','Adicionar')},
  adopt:async(f,d)=>{d.terms=!!d.terms;await api('/adopt/'+f.dataset.id,{m:'POST',b:d});$('#dlg').close();toast('Candidatura enviada! O tutor foi avisado.')},
  prof:async(f,d)=>{let a=U.avatar;const x=f.elements.file.files[0];if(x)a=await up(x,400);await api('/me',{m:'PUT',b:{bio:d.bio,avatar:a}});toast('Perfil atualizado.');go()}
};
document.addEventListener('submit',async e=>{
  const f=e.target,k=f.dataset.f;if(!k||!F[k])return;e.preventDefault();
  const d=Object.fromEntries(new FormData(f)),b=f.querySelector('.btn');b&&(b.disabled=true);
  try{await F[k](f,d)}catch(x){const er=f.querySelector('.err');er?er.textContent=x.message:toast(x.message)}
  b&&(b.disabled=false)});

const post_=(p,m)=>api(p,{m:m||'POST'});
const A={
  like:async b=>{const r=await post_(`/posts/${b.dataset.id}/like`);Object.assign(P[b.dataset.id]||{},{liked:!!r.liked,likes:r.likes});b.textContent=r.liked?'♥':'♡';b.setAttribute('aria-pressed',!!r.liked);b.closest('.post').querySelector('.lk').textContent=r.likes},
  cmt:async b=>{const c=b.closest('.post').querySelector('.cm');c.hidden=!c.hidden;if(!c.hidden)await cms(b.dataset.id,c)},
  del:async b=>{if(!confirm('Excluir esta publicação?'))return;await post_('/posts/'+b.dataset.id,'DELETE');toast('Publicação excluída.');if($('#dlg').open)$('#dlg').close();go()},
  open:b=>{const d=$('#dlg');d.innerHTML=`<button class="x" data-a="close" aria-label="Fechar">✕</button>`+card(P[b.dataset.id]);d.showModal()},
  close:()=>$('#dlg').close(),
  adopt:b=>{const d=$('#dlg');d.innerHTML=`<form data-f="adopt" data-id="${b.dataset.id}" class="pad"><h2>Candidatura de adoção</h2>
<label>Como é a sua moradia? (casa, apartamento, telas de proteção…)<textarea name="home" maxlength="300" required></textarea></label>
<label>Tem outros pets? Quais?<input name="pets" maxlength="300" required></label><label>Experiência com animais<input name="experience" maxlength="300" required></label>
<label>Por que quer adotar?<textarea name="why" maxlength="300" required></textarea></label>
<label class="ck"><input type="checkbox" name="terms" required>Me comprometo a cuidar do pet por toda a vida: vacinas, veterinário e castração. Não vou abandonar, vender nem repassar o animal.</label>
<p class="err" role="alert"></p><div class="row"><button class="btn">Enviar candidatura</button><button type="button" class="btn ghost" data-a="close">Cancelar</button></div></form>`;d.showModal()},
  fr:async b=>{await post_('/friends/'+b.dataset.u);toast('Pronto!');go()},
  unfr:async b=>{await post_('/friends/'+b.dataset.u,'DELETE');go()},
  chat:b=>{location.hash='#/chat/'+b.dataset.u},
  edit:()=>{$('#ed').innerHTML=`<form class="card pad" data-f="prof"><label>Foto do perfil<input type="file" name="file" accept="image/*"></label><label>Bio<textarea name="bio" maxlength="150" rows="2">${E(U.bio)}</textarea></label><p class="err" role="alert"></p><button class="btn">Salvar</button></form>`},
  dec:async b=>{if(!confirm(b.dataset.v=='approve'?'Aprovar esta adoção? O pet será marcado como adotado.':'Recusar esta candidatura?'))return;await post_(`/adoptions/${b.dataset.id}/${b.dataset.v}`);go()},
  adm:async b=>{await post_(`/admin/users/${b.dataset.id}/${b.dataset.v}`);toast('Feito.');go()},
  th:()=>{W('ep_t',R.dataset.t=='d'?'l':'d');pref()},
  fs:b=>{const d=+b.dataset.d;W('ep_fs',d?Math.min(140,Math.max(80,+(S('ep_fs')||100)+10*d)):100);pref()},
  out:async()=>{await post_('/logout');history.replaceState(null,'','#/login');go()}
};
document.addEventListener('click',async e=>{const b=e.target.closest('[data-a]');if(!b)return;if(b.tagName=='A')e.preventDefault();if(!U&&/^(like|cmt|adopt)$/.test(b.dataset.a)){toast('Entre na matilha para interagir.');location.hash='#/login';return}try{await A[b.dataset.a](b)}catch(x){toast(x.message)}});
$('#dlg').addEventListener('click',e=>{if(e.target.id=='dlg')e.target.close()});
/* ===== Landing page, filtros, carrossel, validação de contato e rodapé ===== */
const CATS=[['all','Todos'],['dog','Cachorros'],['cat','Gatos'],['exotic','Exóticos & Aves'],['adoption','Adoção']];
let FEED=[],FC='all',FQ='';
const IU=(id,w=800)=>`https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
const SAMPLE=[
  ['thor','photo-1552053831-71594a27632d','dog','Golden Retriever','Primeiro dia de praia: aprovou a água e rejeitou a toalha.',0,'Brasília',128],
  ['luna','photo-1514888286974-6c03e2ca1dba','cat','Siamês','Soneca na janela. Ninguém acorda a rainha da casa.',0,'Goiânia',96],
  ['mel','photo-1587300003388-59208cc962cb','dog','SRD','Castrada, vacinada e muito carinhosa. Procura um lar com amor e passeios.',1,'Brasília',74],
  ['kiwi','photo-1552728089-57bdde30beb3','exotic','Arara-canindé','Aprendeu a dizer “bom dia” e agora acorda o prédio inteiro.',0,'Anápolis',59],
  ['bolinha','photo-1585110396000-c9ffd4e4b308','exotic','Coelho Mini Lop','Cenoura aprovada. Orelhas em modo antena.',0,'Taguatinga',41],
  ['nina','photo-1543852786-1cf6624b9987','cat','Gata SRD','Dócil, brincalhona e pronta para ser a rainha de um novo lar.',1,'Brasília',67]
].map((s,i)=>({sample:true,id:'s'+i,uid:'',username:s[0],avatar:'',image:IU(s[1]),category:s[2],species:s[3],caption:s[4],adoption:!!s[5],age:'',city:s[6],status:'open',likes:s[7],liked:false,created:Date.now()/1e3-3600*(i+2)}));

const fbar=sc=>`<div class="fbar card">${sc}<div class="f"><label class="sr" for="fq">Buscar pets</label><input id="fq" type="search" placeholder="🔎 Buscar por pet, raça, tutor ou cidade…" autocomplete="off"></div><div class="tabs" role="group" aria-label="Categorias">${CATS.map(([k,l])=>`<button type="button" class="tab" data-a="cat" data-c="${k}" aria-pressed="${k==FC}">${l}</button>`).join('')}</div></div>`;
function plist(){
  const q=FQ.trim().toLowerCase(),l=FEED.filter(p=>(FC=='all'||(FC=='adoption'?p.adoption:p.category==FC))&&(!q||[p.username,p.caption,p.species,p.city].join(' ').toLowerCase().includes(q)));
  $('#plist').innerHTML=l.map(card).join('')||'<p class="card pad center">🐾 Nenhum pet encontrado. Tente outra busca ou categoria.</p>';
  $('#fcount').textContent=`${l.length} ${l.length==1?'publicação encontrada':'publicações encontradas'}`}

const SL=[
  ['photo-1552053831-71594a27632d','Pets da Semana','Conheça os bichinhos mais queridos da vizinhança e vote com um petisco.','Ver pets em destaque','#/home/pets'],
  ['photo-1587300003388-59208cc962cb','Feira de Adoção Responsável','Cães e gatos vacinados e castrados esperando um lar. Candidate-se e converse com o tutor.','Conhecer a adoção','#/register'],
  ['photo-1583511655857-d19b40a7a54e','Encontros no Parque','Passeios coletivos aos domingos. Crie o perfil do seu pet e conheça os tutores do bairro.','Criar perfil do pet','#/register']];
let ci=0,playing=!matchMedia('(prefers-reduced-motion:reduce)').matches;
const hero=()=>`<section class="hero" id="car" aria-roledescription="carrossel" aria-label="Destaques da comunidade"><h1 class="sr">Entre Patas, a rede social dos pets e seus tutores</h1>${SL.map((s,i)=>`<article class="slide${i?'':' on'}" role="group" aria-roledescription="slide" aria-label="${i+1} de ${SL.length}" style="--img:url('${IU(s[0],1600)}')"><div class="cap"><p class="eyebrow">Entre Patas</p><h2>${s[1]}</h2><p>${s[2]}</p><a class="btn big" href="${U&&s[4]=='#/register'?'#/feed':s[4]}">${s[3]}</a></div></article>`).join('')}
<div class="ctl"><button type="button" data-a="sl" data-d="-1" aria-label="Slide anterior">‹</button><button type="button" data-a="pp" aria-label="${playing?'Pausar':'Iniciar'} rotação automática">${playing?'❚❚':'▶'}</button><button type="button" data-a="sl" data-d="1" aria-label="Próximo slide">›</button><span class="dots">${SL.map((_,i)=>`<button type="button" data-a="sd" data-i="${i}" aria-label="Ir para o slide ${i+1}" aria-current="${!i}"></button>`).join('')}</span></div></section>`;
function slide(n){const s=document.querySelectorAll('#car .slide'),d=document.querySelectorAll('#car .dots button');if(!s.length)return;ci=(n+s.length)%s.length;s.forEach((x,k)=>x.classList.toggle('on',k==ci));d.forEach((x,k)=>x.setAttribute('aria-current',k==ci))}
function auto(){clearInterval(go.c);if(playing)go.c=setInterval(()=>slide(ci+1),6000)}
function carInit(){const c=$('#car');if(!c)return;ci=0;['mouseenter','focusin'].forEach(e=>c.addEventListener(e,()=>clearInterval(go.c)));['mouseleave','focusout'].forEach(e=>c.addEventListener(e,auto));c.addEventListener('keydown',e=>{if(e.key=='ArrowRight')slide(ci+1);if(e.key=='ArrowLeft')slide(ci-1)});auto()}

function chk(el){
  const v=el.type=='checkbox'?el.checked:el.value.trim(),r=el.dataset.v.split(' ');let m='';
  if(r.includes('req')&&!v)m=el.type=='checkbox'?'Aceite os termos para continuar.':'Preencha este campo.';
  else if(r.includes('email')&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))m='Informe um e-mail válido, como nome@exemplo.com.';
  else if(r.includes('min10')&&v.length<10)m='Escreva pelo menos 10 caracteres.';
  el.setAttribute('aria-invalid',!!m);el.setAttribute('aria-describedby',el.id+'-e');
  const o=document.getElementById(el.id+'-e');if(o)o.textContent=m;return!m}
function vcheck(f){let bad;f.querySelectorAll('[data-v]').forEach(el=>{if(!chk(el)&&!bad)bad=el});if(bad)bad.focus();return!bad}
['input','focusout'].forEach(ev=>document.addEventListener(ev,e=>{const t=e.target;if(t.dataset&&t.dataset.v&&(ev=='focusout'||t.getAttribute('aria-invalid')=='true'))chk(t)}));
F.contact=async(f,d)=>{if(!vcheck(f))return;await api('/contact',{m:'POST',b:d});f.reset();toast('Mensagem enviada! Responderemos em até 2 dias úteis.')};

function foot(){$('#foot').innerHTML=`<div class="wrap fcols"><div><p class="logo flogo"><span class="mark" aria-hidden="true">🐾</span>Entre Patas</p><p>Nossa missão: aproximar tutores, valorizar a adoção responsável e cuidar do bem-estar de todos os pets.</p></div>
<nav aria-label="Links rápidos"><h2>Links rápidos</h2><a href="#/home">Início</a><a href="#/home/pets">Pets em destaque</a><a href="#/home/como">Como funciona</a><a href="#/home/contato">Contato</a></nav>
<nav aria-label="Comunidade"><h2>Comunidade</h2><a href="#" data-a="soon">Política de privacidade</a><a href="#" data-a="soon">Diretrizes da comunidade pet</a><a href="#" data-a="soon">Termos de uso</a></nav>
<div><h2>Acessibilidade</h2><p class="seal">♿ Conforme WCAG 2.1 AA</p><p>Tema claro e escuro, fonte ajustável, alto contraste e navegação completa por teclado.</p></div></div>
<p class="credit">Projeto acadêmico de Desenvolvimento de Interfaces · Entre Patas ${new Date().getFullYear()}</p>`}

Object.assign(A,{
  hc:()=>{W('ep_hc',S('ep_hc')=='1'?'0':'1');pref()},
  cat:b=>{FC=b.dataset.c;document.querySelectorAll('[data-a=cat]').forEach(x=>x.setAttribute('aria-pressed',x==b));plist()},
  sl:b=>{slide(ci+ +b.dataset.d);auto()},
  sd:b=>{slide(+b.dataset.i);auto()},
  pp:b=>{playing=!playing;b.textContent=playing?'❚❚':'▶';b.setAttribute('aria-label',(playing?'Pausar':'Iniciar')+' rotação automática');auto()},
  pw:b=>{const i=$('#pw'),s=i.type=='password';i.type=s?'text':'password';b.textContent=s?'Ocultar':'Mostrar';b.setAttribute('aria-pressed',s)},
  soon:()=>toast('Esta página estará disponível em breve.'),
  demo:()=>{if(U)toast('Estes são pets de exemplo. Abra o seu feed para interagir!');else{toast('Entre na matilha para interagir.');location.hash='#/login'}}
});

pref();go();