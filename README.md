# Entre-Patas — rede social para pets e tutores

Projeto acadêmico de Desenvolvimento de Interfaces, desenvolvido com HTML5, CSS3 e JavaScript puro (ES6+), sem frameworks ou etapa de build.

## Como executar
1. Baixe ou clone este repositório.
2. Mantenha `index.html`, `styles.css` e `script.js` na mesma pasta.
3. Abra `index.html` no navegador.

É necessária conexão com a internet para carregar fontes do Google Fonts e imagens do Unsplash.

## Estrutura
| Arquivo | Responsabilidade |
|---|---|
| `index.html` | Estrutura semântica, acessibilidade, carrossel, feed, contato e modal |
| `styles.css` | Temas, layout responsivo, foco visível e redução de movimento |
| `script.js` | Preferências, validação, autenticação demonstrativa, carrossel e feed |
| `docs/ROADMAP.md` | Etapas planejadas para evolução |

## Funcionalidades do protótipo
- Feed demonstrativo com filtros e busca.
- Publicação local de postagens e comentários.
- Preferências de tema, tamanho de fonte e alto contraste.
- Carrossel de destaques.
- Formulários com validação no navegador.
- Interface de login/cadastro demonstrativa.

## Acessibilidade
O protótipo inclui HTML semântico, link para pular ao conteúdo, foco visível, atributos ARIA, mensagens de validação associadas aos campos e suporte a `prefers-reduced-motion`. A conformidade WCAG deve ser confirmada com testes automatizados e manuais antes de qualquer declaração formal de conformidade.

## Limitações conhecidas
- Não há backend nem banco de dados.
- Login e cadastro são simulados; não existe autenticação real.
- Feed, comentários e preferências são armazenados apenas no navegador via `localStorage`.
- O formulário de contato apenas simula o envio; não transmite mensagens.
- Links institucionais e redes sociais são placeholders.
- As imagens e fontes externas dependem de conexão com a internet.
- Não use dados pessoais reais nesta versão demonstrativa.

## Contribuição
Crie uma branch para cada melhoria (`feature/nome` ou `fix/nome`), teste a alteração no navegador e abra um Pull Request descrevendo o que mudou e como foi testado.

---
Projeto acadêmico — Entre-Patas, 2026.
