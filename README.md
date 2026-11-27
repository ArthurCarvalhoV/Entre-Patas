# Entre Patas – rede social para pets e seus tutores

Site feito com HTML5, CSS3 e JavaScript puro (sem framework), com login, banco de dados e upload de fotos reais no **Supabase** e publicação na **Vercel**.

## 1. Estrutura de arquivos
```
entre-patas-final/
├── index.html           estrutura da página (barra de acessibilidade, cabeçalho, conteúdo, rodapé)
├── styles.css           sistema de design: cores, temas claro/escuro/alto contraste, layout responsivo
├── app.js               interface: rotas, página inicial, carrossel, feed, filtros e formulários
├── api.js               camada de dados: conversa com o Supabase (Auth, Postgres e Storage)
├── config.js            URL e chave pública do seu projeto Supabase
├── supabase.sql         banco de dados: tabelas, segurança (RLS), funções e bucket de fotos
├── supabase-update.sql  atualização: categorias de pets, mensagens de contato e correção de contas
├── vercel.json          cabeçalhos de segurança da publicação
└── README.md
```

## 2. Como o site foi construído (passo a passo)
1. **Planejamento.** Defini o público (tutores, ONGs e protetores), os módulos obrigatórios (cartões, abas de pesquisa, contato, carrossel, imagens, cartões explicativos, modo escuro/claro e rodapé) e a identidade visual: terracota, azul-petróleo e creme.
2. **Estrutura HTML semântica.** Usei `header`, `nav`, `main`, `section`, `footer`, `form` e `dialog`, mais o link "pular para o conteúdo" e atributos `aria-*` nos componentes interativos.
3. **Sistema de design em CSS.** Variáveis CSS (`:root`, `[data-t=d]` e `[data-c=h]`) definem os temas claro, escuro e alto contraste. Os tamanhos usam `rem`, o layout usa Grid e Flexbox (mobile-first) e há `:focus-visible` e `prefers-reduced-motion`.
4. **Barra de acessibilidade.** Botões de tema, A-/A/A+ (que mudam o `font-size` da raiz) e alto contraste. As escolhas ficam salvas no `localStorage`.
5. **Carrossel.** Três slides com setas, indicadores, botão de pausa, pausa ao passar o mouse ou focar e setas do teclado. Quem prefere menos movimento não recebe rotação automática.
6. **Cartões, abas e pesquisa.** Cartões de pets, busca em tempo real e abas Todos, Cachorros, Gatos, Exóticos & Aves e Adoção.
7. **Formulários.** Contato com validação acessível e consentimento LGPD, login e cadastro, e nova publicação com upload de foto.
8. **Banco de dados.** No Supabase criei as tabelas, as regras de segurança por linha (RLS) e as funções SQL de curtir, amizade, mensagens, adoção e administração.
9. **Integração.** O arquivo `api.js` traduz cada ação da interface em uma chamada ao Supabase.
10. **Publicação.** Repositório no GitHub conectado à Vercel, que publica a cada `git push`.
11. **Testes.** Contraste (WCAG), navegação por teclado, leitor de tela e responsividade em 375, 768 e 1440 px.

## 3. Configurar o Supabase
1. Crie um projeto em supabase.com.
2. Abra **SQL Editor**, cole o conteúdo de `supabase.sql` e clique em **Run** (apenas em projeto novo).
3. Cole e rode também o `supabase-update.sql`.
4. Em **Authentication > Sign In / Providers > Email**, **desligue "Confirm email"**. Veja a seção 7.
5. Em **Project Settings > API**, copie a *Project URL* e a chave *anon/publishable* para o `config.js`. Nunca use a chave `service_role` no site.
6. Em **Authentication > URL Configuration**, coloque o endereço do site (Vercel) em *Site URL*.
7. A primeira conta criada vira administradora.

## 4. Rodar no computador
```
cd entre-patas-final
python3 -m http.server 3000
```
Abra http://localhost:3000 no navegador.

## 5. Publicar na Vercel
1. Envie a pasta para um repositório do GitHub.
2. Na Vercel, clique em *Add New > Project* e importe o repositório. Em *Framework Preset* escolha **Other** e deixe o comando de build em branco.
3. Clique em *Deploy*. Depois disso, cada `git push` atualiza o site.

## 6. Versões no GitHub
Cada etapa virou um commit com mensagem clara, para mostrar a evolução do projeto:
```
git init
git add . && git commit -m "v1: protótipo estático (HTML, CSS e JS)"
git commit -am "v2: servidor Python, SQLite e login real"
git commit -am "v3: Supabase e Vercel"
git commit -am "v4: página inicial completa, design e acessibilidade"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/entre-patas.git
git push -u origin main
```

## 7. Problemas comuns
- **Só consigo criar umas 3 contas / erro "email rate limit exceeded".** Com "Confirm email" ligado, cada cadastro envia um e-mail, e o servidor de e-mail padrão do Supabase aceita pouquíssimos por hora. Desligue "Confirm email" (passo 4 da seção 3) ou configure um SMTP próprio. Contas que ficaram presas esperando confirmação são liberadas pelo `supabase-update.sql`.
- **Aparece "Falta configurar o config.js".** Cole a URL e a chave pública do projeto no `config.js`.
- **O feed fica vazio.** O feed só mostra publicações de quem já criou conta e publicou. Crie uma conta e publique a primeira foto.
- **Erro ao enviar foto.** Confirme que rodou o `supabase.sql` completo, que cria o bucket `photos`.

## Administrador

O cadastro de qualquer pessoa começa como usuário comum. Depois de criar sua conta, o proprietário deve promovê-la manualmente no Supabase SQL Editor, substituindo o e-mail abaixo pelo e-mail usado no cadastro:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'SEU_EMAIL');
```

Não coloque a chave `service_role` ou qualquer chave secreta no frontend. O arquivo `config.js` usa somente a chave pública publishable/anon.
