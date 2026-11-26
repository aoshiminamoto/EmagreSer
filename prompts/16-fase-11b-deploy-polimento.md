# Fase 11B: Deploy e polimento

Sessão 16 de 17 · Tamanho: Grande · Depende de: Fases 3 a 11A

## Antes de começar

1. Leia `AGENTS.md`, `docs/DECISOES.md` e `docs/PROGRESSO.md`.
2. Não leia a especificação inteira. Use só os trechos abaixo; se precisar de outro, busque pelo ID com `grep -n` em `docs/ESPECIFICACAO.md` e leia ao redor.
3. Se `docs/PROGRESSO.md` indicar um ponto de retomada para esta fase, comece dele.
4. Esta sessão mexe na interface: abra `docs/design/guia-de-design.png` (cores, tipografia, componentes e telas de referência) e siga a seção 6 da especificação, em especial as regras de contraste.

## Objetivo

Preparar a produção (Railway e roteiro de VPS), o polimento visual e a verificação de qualidade.

## Escopo desta sessão

- `Dockerfile` multiestágio de produção; migrações antes de iniciar; healthcheck; cabeçalhos de cache da seção 4.1; escuta em `process.env.PORT`.
- Aviso “Nova versão disponível” com `useRegisterSW` (verificação ao abrir, ao voltar ao primeiro plano e a cada hora).
- Guia de deploy na Railway no `README.md` (serviços, variáveis de referência, domínio, backups) e roteiro do VPS da Hostinger com Docker Compose e Caddy.
- Estados vazios, ícones (192, 512 e maskable), splash, revisão de acessibilidade e Lighthouse (PWA instalável e funcionando offline).
- Revisão dos requisitos não funcionais: segurança, logs sem dados de saúde, `npm audit` sem vulnerabilidades altas.

## Fora desta sessão

- Novas funcionalidades.

## Trechos da especificação

Copiados de `docs/ESPECIFICACAO.md`. Em caso de divergência, vale o documento original.

**4.2 Hospedagem**

**Railway (principal).**

- Um projeto com três serviços: `app` (Node, API e PWA), PostgreSQL e Redis.
- HTTPS e domínio `*.up.railway.app` são automáticos no deploy; domínio próprio é opcional.
- Ligue os serviços por variáveis de referência (`${{Postgres.DATABASE_URL}}`, `${{Redis.REDIS_URL}}`) em vez de copiar credenciais.
- Build com `Dockerfile` multiestágio na raiz do repositório; o servidor escuta em `process.env.PORT`; healthcheck em `/api/v1/health`; as migrações rodam antes de iniciar (`npm run migrate && node dist/server.js`).
- O worker de lembretes (seção 8.11) roda no mesmo processo da API no MVP e pode virar serviço separado depois.
- Ative os backups do PostgreSQL se o plano oferecer; caso contrário, agende `pg_dump` periódico e documente a restauração no `README.md`.

**Hostinger (alternativa).**

- Hospedagem compartilhada normalmente não oferece PostgreSQL nem Redis e pode limitar processos Node persistentes. Confirme o plano antes; se for o caso, ela serve apenas para o frontend estático (`apps/web/dist`), com a API hospedada em outro lugar.
- Para rodar tudo na Hostinger, use um VPS: Docker Compose com `app`, `postgres`, `redis` e Caddy na frente (HTTPS automático), firewall abrindo só 80, 443 e SSH, e backup do volume do PostgreSQL.
- Nenhum código pode depender de recurso exclusivo de uma das hospedagens: tudo é configurado por variáveis de ambiente e pelo `Dockerfile`. Entregue um `docker-compose.yml` que sirva tanto para desenvolvimento local quanto de base para o VPS.

**4.1 Arquitetura e cache offline**

O aparelho é a fonte de leitura da interface; a API é o ponto de encontro entre dispositivos e o backup dos dados.

```
[ Celular do usuário: PWA Vue 3 + Vuetify ]
   │  a interface lê e grava sempre no IndexedDB (Dexie)
   │  o service worker guarda o app shell e abre o app sem internet
   │
   ├── Offline ──> alterações ficam na fila de saída (outbox) no IndexedDB
   │
   └── Online  ──> HTTPS ──> [ Railway: API Node.js / Fastify ]
                                  ├──> PostgreSQL (dados dos usuários)
                                  └──> Redis (limites, sessões, filas de lembretes)
```

- Um único serviço Node entrega a PWA estática (`@fastify/static`, pasta `apps/web/dist`) e a API em `/api/v1`. Mesma origem significa sem CORS, cookies simples e um só domínio HTTPS. Se a PWA for separada da API (por exemplo, frontend estático na Hostinger), configure CORS com lista de origens permitidas e cookies `SameSite=None; Secure`.
- Cache do app shell: precache do Workbox, com arquivos de nome versionado por hash, para abrir em modo avião. A rota de navegação (fallback para `index.html`) exclui `/api/`, que nunca passa pelo cache do service worker.
- Cabeçalhos HTTP: `sw.js`, `index.html` e `manifest.webmanifest` com `Cache-Control: no-cache`, para o navegador sempre conferir se há versão nova; arquivos com hash em `/assets/` com `Cache-Control: public, max-age=31536000, immutable`. Sem isso, as atualizações do app não chegam aos usuários.
- Decisão: no lugar de “network-first com fallback para o IndexedDB” em cada leitura, o app lê o IndexedDB primeiro e sincroniza em segundo plano. O resultado para o usuário é o mesmo (registrar offline e sincronizar depois), sem telas que dependam da rede.
- Atualização do app: `registerType: 'prompt'`, usando `useRegisterSW` de `virtual:pwa-register/vue`. O app procura versão nova ao abrir, ao voltar ao primeiro plano (`visibilitychange`) e a cada hora com o app aberto (`registration.update()`), porque PWAs instaladas raramente recarregam sozinhas. Com a versão nova pronta, mostra o snackbar “Nova versão disponível” com o botão Atualizar, que envia `SKIP_WAITING` ao service worker e recarrega a página. Nunca recarregar sozinho: o usuário pode estar no meio de um registro.

**4.3 Variáveis de ambiente**

Entregue um `.env.example` sem valores reais, com as variáveis abaixo e ainda `PUBLIC_STATS_MIN_USERS` (mínimo de contas para exibir os números da landing, padrão 50) e, só para o build do frontend, `VITE_ALLOW_DESKTOP` e `VITE_FORCE_LOCALES` (sempre desligadas em produção):

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Conexão com o PostgreSQL |
| `REDIS_URL` | Conexão com o Redis |
| `JWT_SECRET` | Assinatura dos tokens de acesso |
| `COOKIE_SECRET` | Assinatura dos cookies |
| `APP_ORIGIN` | URL pública do app (links de e-mail, CORS se houver) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push (o subject é um `mailto:`) |
| `SMTP_URL` | Envio do e-mail de recuperação de senha, com qualquer provedor SMTP |
| `PORT`, `NODE_ENV` | Porta e ambiente |

**11. Requisitos não funcionais**

- **Offline primeiro:** o app abre e registra sem rede. Testar em modo avião depois do primeiro login.
- **Desempenho:** abertura a frio em até 2 segundos em aparelhos intermediários; carregar as telas sob demanda e importar só os componentes usados do Vuetify; consultas SQL indexadas por usuário e `change_seq`.
- **Confiabilidade:** escritas em transações, no aparelho e no servidor; migrações versionadas e testadas (no cliente, via `db.version` do Dexie); nenhuma perda de dados ao atualizar o app.
- **Segurança:** conforme a seção 4.4; HTTPS sempre; `npm audit` sem vulnerabilidades altas no CI.
- **Privacidade e LGPD:** dados de saúde são sensíveis. Coletar só o necessário, com consentimento explícito (RF-46), exportação (RF-44) e exclusão (RF-45). Sem telemetria de terceiros; logs sem e-mail, peso ou qualquer dado de saúde.
- **Observabilidade:** logs estruturados (pino), healthcheck em `/api/v1/health` e erros inesperados registrados com um id de requisição.
- **Acessibilidade:** conforme a seção 6; suporte a fontes grandes do sistema sem quebrar o layout.
- **Qualidade de código:** TypeScript estrito, ESLint e Prettier sem avisos no final; o CI roda lint, testes e build.

**6. Identidade visual**

**Referência visual.** O guia de design está em `docs/design/guia-de-design.png` e vale para cores, tipografia, formas, sombras e componentes. O nome PesoPro e o logotipo que aparecem nele são provisórios: a marca é EmagreSer. Funcionalidades e navegação seguem este documento; onde o guia mostrar algo diferente (botão central “+” na barra inferior, foto de perfil, botão “Compartilhar” na celebração, abas de período Semanal, Mensal e Anual), vale o que está aqui.

**Estilo.** Minimalista com Soft Neumorphism: fundo claro, cartões brancos com cantos bem arredondados e sombras suaves e difusas, bastante espaço em branco. O verde é a cor de destaque, reservada a ações e progresso. Ilustrações suaves; sem fotos de corpos e sem foto de perfil (usar as iniciais do nome). Tema escuro fica fora do escopo.

**Cores.** Defina como tema do Vuetify em `apps/web/src/plugins/vuetify.ts`. Os seis primeiros valores vêm do guia; os três últimos são derivados, para cumprir o contraste AA.

| Token | Valor | Uso |
|---|---|---|
| `primary` | `#22C55E` | Ações principais, progresso, barras e áreas de gráfico |
| `success` | `#10B981` | Confirmações, dicas e marcos |
| `warning` | `#F59E0B` | Avisos informativos |
| `text` | `#111827` | Texto principal e texto sobre `primary`, `success` e `warning` |
| `text-secondary` | `#6B7280` | Texto secundário e legendas |
| `surface` | `#F8FAFC` | Fundo do app |
| `surface-card` | `#FFFFFF` | Cartões e campos (derivado) |
| `primary-text` | `#15803D` | Texto, links, ícone ativo e linhas essenciais de gráfico sobre fundo claro (derivado) |
| `error` | `#B91C1C` | Só ações destrutivas e erro de formulário (derivado; não consta no guia) |

**Regras de uso das cores.**

- O verde `primary` marca ações e progresso (botão principal, barras, anel de progresso, aba ativa); não decora outros elementos.
- Aumento de peso nunca usa vermelho, laranja nem verde de sucesso: usar `text-secondary` com seta neutra. A queda em relação à semana passada pode usar `primary-text` com seta para baixo, como no guia.
- As faixas do IMC usam só `text` e `text-secondary`, sem `warning` nem vermelho.
- `warning` serve a avisos informativos (aviso de peso-alvo, pendência de sincronização, offline): fundo suave do `warning` (cerca de 12% de opacidade), com ícone e texto em `text`.
- `success` serve a confirmações (“Peso registrado com sucesso”) e dicas: fundo suave (cerca de 12%) com texto em `text`.
- `error` nunca aparece em dados de peso, IMC, marcos ou mensagens de acolhimento.
- Confete e ilustrações da celebração usam os verdes e o laranja suave da paleta, sem vermelho.

**Contraste (WCAG AA).**

- Texto sobre `primary` ou `success` usa `#111827` (7,79:1 e 6,99:1). O guia mostra texto branco nos botões verdes, mas branco sobre `#22C55E` tem 2,28:1 e não atinge AA (4,5:1). Decisão D-07 em `docs/DECISOES.md`; para voltar ao texto branco, o botão teria de usar `primary-text` como fundo (5,02:1 com branco).
- `primary` não serve como cor de texto nem de ícone solto sobre fundo claro (2,18:1 sobre a superfície): texto, links e ícones verdes usam `primary-text` (4,79:1).
- Elementos gráficos essenciais (linha da média móvel, anel de progresso, ícone da aba ativa) exigem 3:1 contra o fundo: traço em `primary-text`; áreas e barras preenchidas podem usar `primary`, sempre com o valor escrito.
- `warning` nunca é cor de texto (2,05:1 sobre a superfície); sempre fundo com texto `text` (8,26:1).
- `text-secondary` só sobre `surface` ou `surface-card` (4,62:1 e 4,83:1), nunca sobre cores de preenchimento.
- Contorno de campos de entrada e do botão secundário com contraste mínimo de 3:1 contra o fundo (por exemplo `#6B7280`): a sombra suave sozinha não basta. Foco visível com anel de 2 px em `primary-text`.

**Tipografia.** Plus Jakarta Sans, empacotada com `@fontsource/plus-jakarta-sans` (pesos 400 e 600; subconjuntos latin e latin-ext, para acentos e ñ), com `system-ui` como reserva.

| Estilo | Tamanho / entrelinha | Peso | Uso |
|---|---|---|---|
| H1 | 32/40 | Semibold | Títulos de tela e números de destaque (peso atual) |
| H2 | 24/32 | Semibold | Títulos de seção |
| H3 | 20/28 | Semibold | Títulos de cartão |
| Body | 16/24 | Regular | Texto corrido (tamanho mínimo) |
| Caption | 14/20 | Regular | Legendas e apoio |

**Componentes.**

- Botão primário: pílula (cantos totalmente arredondados), fundo `primary`, texto `#111827` em Semibold, altura mínima de 48 px. Botão secundário: pílula branca com contorno e sombra suave.
- Cartões: brancos, raio de 20 a 24 px, sombra suave. Valor sugerido: `0 8px 24px rgba(17,24,39,0.06), 0 2px 6px rgba(17,24,39,0.04)`. O realce neumórfico claro (`-4px -4px 10px rgba(255,255,255,0.9)`) só em cartões de destaque, como o peso atual.
- Seletor segmentado (por exemplo, períodos do gráfico): trilho cinza claro com o item ativo em pílula branca (`v-btn-toggle`).
- Interruptores (`v-switch`): ligado em `primary`, desligado em cinza, com diferença que não dependa só da cor (posição do botão).
- Progresso: anel circular (`v-progress-circular`) com o percentual no centro e barra linear (`v-progress-linear`) com cantos arredondados.
- Gráficos: área suave e barras arredondadas em `primary`; linha essencial em `primary-text`.
- Botões de ícone circulares brancos com sombra suave, alvo mínimo de 44×44 px; campo de busca em pílula cinza claro.
- Ícones: estilo de contorno, traço uniforme, com `@mdi/font` na variante outline (por exemplo `mdi-home-outline`, `mdi-trophy-outline`, `mdi-bell-outline`, `mdi-cog-outline`).
- Navegação: a barra inferior segue a seção 10 (5 abas); o botão central “+” do guia não entra nesta versão. Item ativo em `primary-text`, com rótulo.
- Celebração de marco: tela cheia com troféu em círculo verde, mensagem de parabéns e o marco alcançado, sem botão “Compartilhar”, em linha com a privacidade do app.
- Tema do Vuetify: `defaults` com `VBtn` em `rounded="pill"` e `VCard` em `rounded="xl"` com elevação baixa; cores `on-primary`, `on-success` e `on-warning` iguais a `#111827`.

**Acessibilidade.** Alvos de toque de pelo menos 44×44 px, rótulos de acessibilidade em todos os botões e ícones, respeito à preferência de reduzir movimento (inclusive nas animações de sombra e celebração) e suporte a fontes grandes do sistema.

## Pronto quando

- Imagem de produção sobe localmente com `docker compose` e responde ao healthcheck.
- O README permite fazer o deploy na Railway e descreve o roteiro de VPS, com backup e restauração do PostgreSQL.
- O aviso de nova versão funciona em teste (duas versões do build).
- Lighthouse: app instalável e abrindo offline; contraste, alvos de toque e rótulos de acessibilidade verificados nas telas principais.
- `npm audit` sem vulnerabilidades altas.

## Insumos que dependem do dono do projeto

- Conta na Railway (ou o VPS), domínio e o `SMTP_URL` de produção, quando for publicar de fato.

## Ao terminar (obrigatório)

1. Rode `npm run lint`, `npm test` e `npm run build`; todos devem passar. Corrija o que falhar antes de seguir.
2. Revise o diff: nada fora do escopo, nenhuma dependência desnecessária, nenhum segredo, nenhum texto fixo em componente.
3. Atualize `docs/PROGRESSO.md` (marque a sessão) e `docs/DECISOES.md` (decisões novas).
4. Escreva `docs/relatorios/16-fase-11b-deploy-polimento.md` pelo modelo `docs/MODELO_RELATORIO.md` (máximo de 40 linhas).
5. Faça o commit: `fase 11B: <resumo curto>`.
6. Pare. Não comece a próxima sessão (prompts/17-fase-12-idiomas-flags.md). Responda no chat só com o resumo de 5 linhas do relatório.
