# Recicla AI — Protótipo multipáginas

Versão refeita do protótipo com **um HTML separado para cada tela**, evitando que todas as áreas do site fiquem na mesma página.

## Arquivos
- `index.html` — Login
- `dashboard.html` — Início / Dashboard
- `qrcode.html` — Leitura do QR Code
- `ecopontos.html` — Mapa + lista de ecopontos
- `recompensas.html` — Catálogo de recompensas
- `pontos.html` — Meus Pontos
- `historico.html` — Histórico de pontos
- `perfil.html` — Perfil do usuário
- `css/style.css` — Estilos compartilhados e responsividade
- `js/app.js` — Interações simuladas e `localStorage`

## Como testar
Abra `index.html`. O login é demonstrativo: qualquer e-mail e senha válidos no formulário redirecionam para `dashboard.html`.

## Responsividade
- Desktop: sidebar fixa à esquerda.
- Tablet: conteúdo se reorganiza para uma coluna quando necessário.
- Celular: a sidebar vira navegação inferior compacta, como no protótipo mobile.
- Cada arquivo exibe somente a tela correspondente; não há mais todas as páginas empilhadas no mesmo documento.

## Observação
Ainda não há API nem banco de dados. O botão de QR Code apenas simula a adição de 10 pontos e salva esse valor no `localStorage`.


## Responsividade V3
A escala do layout foi refeita para uso real em navegador:
- Full HD / telas grandes: conteúdo mais largo, textos e cards maiores.
- Notebook: sidebar e grids reduzidos sem deixar a interface minúscula.
- Tablet: grids principais passam para uma coluna quando necessário.
- Celular: menu lateral vira navegação inferior e cards reorganizam sem overflow.

## Revisão de interface — Mobile / Configurações / CSS
- Navegação mobile agora usa 5 itens: Início, QR Code, Ecopontos, Recompensas e **Mais**.
- O menu **Mais** dá acesso a Meu Perfil, Meus Pontos, Histórico, Configurações e Sair.
- As abas de Configurações agora trocam o conteúdo de verdade.
- Os toggles e dados de conta em Configurações são salvos no `localStorage` enquanto não há API.
- O `style.css` foi refeito e organizado por seções, removendo media queries duplicadas e CSS inline da página Meus Pontos.


## Perfil + configurações unificados
A área `Meu Perfil` agora concentra:
- troca e remoção da foto de perfil;
- edição de nome e e-mail;
- área de conta e segurança;
- preferências de notificações e localização;
- resumo de pontos.

`configuracoes.html` foi mantido apenas como redirecionamento para `perfil.html`, evitando links antigos quebrados.


## Integração com a API de usuários

Esta versão usa as rotas reais da API servida no mesmo domínio:

- `POST /usuarios/cadastro`
- `POST /usuarios/login`
- `GET /usuarios/me`
- `PATCH /usuarios/me`

O token JWT é salvo no `sessionStorage` por padrão. Se o usuário marcar **Lembrar de mim**, o token é salvo no `localStorage`.

As páginas internas verificam a existência/validade do token e redirecionam para o login quando necessário. A proteção real dos dados continua sendo responsabilidade das rotas JWT no back-end.

A foto de perfil ainda fica somente no navegador porque ainda não existe endpoint de upload. Histórico, QR Code, ecopontos e recompensas continuam com dados de protótipo até as próximas APIs.

## Ajuste atual
- Barras de filtros removidas das páginas.
- Foto de perfil agora é vinculada ao usuário pela API (`PATCH /usuarios/me`) e não por uma chave global do navegador.
