# Fase 0: Base do monorepo

Sessão 1 de 17 · Tamanho: Média · Depende de: nenhuma

## Antes de começar

1. Leia `AGENTS.md`, `docs/DECISOES.md` e `docs/PROGRESSO.md`.
2. Não leia a especificação inteira. Use só os trechos abaixo; se precisar de outro, busque pelo ID com `grep -n` em `docs/ESPECIFICACAO.md` e leia ao redor.
3. Se `docs/PROGRESSO.md` indicar um ponto de retomada para esta fase, comece dele.
4. Esta sessão mexe na interface: abra `docs/design/guia-de-design.png` (cores, tipografia, componentes e telas de referência) e siga a seção 6 da especificação, em especial as regras de contraste.

## Objetivo

Criar o esqueleto do projeto: monorepo, ferramentas, tema, navegação vazia, i18n, service worker mínimo e API com health check.

## Escopo desta sessão

- Monorepo com npm workspaces: `apps/web`, `apps/api`, `packages/domain`, na estrutura da seção 12.
- TypeScript estrito, ESLint, Prettier e Vitest. Scripts na raiz: `npm run lint`, `npm test`, `npm run build`, `npm run i18n:check`.
- CI (GitHub Actions) rodando lint, testes e build, e um passo que falha se `VITE_ALLOW_DESKTOP` ou `VITE_FORCE_LOCALES` estiverem ligadas no build de produção.
- Web: Vue 3, Vite, Pinia, Vue Router com as 5 abas vazias (`v-bottom-navigation`), Vuetify 3 com o tema da seção 6 (tokens de cor, Plus Jakarta Sans empacotada e `defaults` dos componentes).
- i18n: `vue-i18n` 11 com `@intlify/unplugin-vue-i18n`, os três catálogos com as chaves mínimas, regra de lint contra texto fixo, `i18n:check` e os formatadores de `apps/web/src/i18n/format.ts` (`formatDate`, `formatTime`, `formatRelative`, `formatNumber`) com testes nos três idiomas.
- PWA: `vite-plugin-pwa` 2.x com `injectManifest`, `sw.ts` mínimo (precache, `NavigationRoute` com `denylist` de `/api/`, `SKIP_WAITING`), manifest básico.
- API: Fastify 5 com `GET /api/v1/health`, `@fastify/static` servindo `apps/web/dist`, helmet com CSP restritiva, logs com pino, configuração por variáveis de ambiente e `.env.example` (seção 4.3).
- `docker-compose.yml` de desenvolvimento com app, PostgreSQL e Redis.

## Fora desta sessão

- Telas de funcionalidades, banco de dados, autenticação, regras de negócio, Dockerfile de produção.

## Trechos da especificação

Copiados de `docs/ESPECIFICACAO.md`. Em caso de divergência, vale o documento original.

**4. Stack, arquitetura e infraestrutura**

O EmagreSer é uma PWA offline primeiro: o aparelho guarda os dados no IndexedDB e sincroniza com uma API hospedada quando há internet. Use a stack abaixo; se houver razão forte para trocar algo, registre em `docs/DECISOES.md`.

| Camada | Escolha |
|---|---|
| Frontend | Vue 3 (Composition API com script setup) e TypeScript estrito |
| Build | Vite |
| PWA | `vite-plugin-pwa` 2.x (Workbox 7.4, estratégia injectManifest). O nome `@vite-pwa/plugin`, citado na descrição original, não existe no npm; o pacote oficial é `vite-plugin-pwa` |
| Interface | Vuetify 3 (Material Design), fixado em `^3`. A v4 já existe, mas não migre sem registrar a decisão |
| Estado e rotas | Pinia e Vue Router |
| Banco local | IndexedDB, via Dexie |
| Backend | Node.js (LTS) com Fastify 5 e TypeScript; validação de entrada com TypeBox ou Zod |
| Banco de dados | PostgreSQL, com migrações versionadas (por exemplo `node-pg-migrate`) |
| Cache, filas e limites | Redis; filas com BullMQ |
| Push | Web Push com VAPID, pela biblioteca `web-push` (sem serviço pago) |
| Hospedagem | Railway (principal) ou VPS na Hostinger (seção 4.2) |
| Testes | Vitest (domínio, web e API); integração da API com PostgreSQL e Redis reais em Docker; Playwright para o fluxo offline |

**Restrições obrigatórias:**

- Toda comunicação usa HTTPS. Nenhuma chamada a domínios de terceiros em tempo de execução: sem CDNs, sem Google Fonts, sem analytics, anúncios ou crash reporting. Fontes e ícones são empacotados no build (`@fontsource/*`, `@mdi/font`), para funcionar offline.
- A interface lê e grava sempre no IndexedDB. A rede serve só para autenticação, sincronização e push; nenhuma tela espera a API para abrir.
- Datas de calendário são texto `YYYY-MM-DD` no fuso local do aparelho, para evitar erros de fuso horário.
- Pesos em kg com 1 casa decimal (`NUMERIC(4,1)` no PostgreSQL).
- IDs de registros são UUID v4 gerados no cliente, para permitir criar dados offline sem colisão.
- Fotos de progresso nunca saem do aparelho: ficam só no IndexedDB e não são enviadas ao servidor.
- Dados de saúde nunca aparecem em logs, URLs, mensagens de erro ou notificações.
- Segredos entram só por variáveis de ambiente, nunca no repositório.

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

**4.6 Requisitos específicos de PWA**

- Manifest: `name` EmagreSer, `short_name`, `display: standalone`, `lang: pt-BR`, `start_url: /`, `theme_color` #22C55E (token primary), `background_color` `#F8FAFC`, ícones de 192 e 512 px e um ícone maskable de 512 px.
- Service worker com `strategies: 'injectManifest'` no `vite-plugin-pwa`, em `apps/web/src/sw.ts`, porque o app precisa de código próprio para os eventos `push` e `notificationclick`. O arquivo contém apenas: `precacheAndRoute(self.__WB_MANIFEST)`, `cleanupOutdatedCaches()`, uma `NavigationRoute` para `index.html` com `denylist: [/^\/api\//]`, `clientsClaim()`, o handler da mensagem `SKIP_WAITING` (sem `skipWaiting()` automático) e os handlers de push. Sem `runtimeCaching` para a API e sem `BackgroundSyncPlugin`: a sincronização é a da seção 4.5.
- Versões: fixe `vite-plugin-pwa` 2.x e `workbox-build` e `workbox-window` 7.4.x no `package.json`, e só atualize com os testes de PWA passando.
- Push: o formato das mensagens é o Declarative Web Push (seção 8.11). O handler `push` continua obrigatório para Chrome e Firefox e sempre deve chamar `showNotification`; se não mostrar nada, o navegador pode revogar a inscrição.
- Chame `navigator.storage.persist()` depois do onboarding, para reduzir o risco de o navegador apagar o IndexedDB (onde ficam as fotos).
- No iOS, o Web Push só funciona com o app instalado pela Tela de Início (iOS 16.4 ou superior). Mostre um aviso dispensável com o passo a passo (Compartilhar, depois Adicionar à Tela de Início).
- Teste o service worker sempre no build de produção (`vite build` e `vite preview`). Lighthouse: app instalável e funcionando offline após o primeiro carregamento.

**4.7 Internacionalização (i18n) e feature flags**

**Idiomas.** Três locales, usados com o mesmo código no app, no banco e no servidor: `pt-BR` (padrão e idioma-fonte), `en-US` e `es-419` (espanhol da América Latina). As variantes são decisão de produto: registre-as em `docs/DECISOES.md`; trocar, por exemplo, `es-419` por `es-ES` altera só configuração e catálogo.

**Abordagem.**

- Biblioteca: `vue-i18n` 11 (Composition API, `useI18n`) com `@intlify/unplugin-vue-i18n` 11, que precompila os catálogos no build. Assim o build de produção usa a versão do `vue-i18n` sem compilador em tempo de execução, o que evita problemas com a CSP restritiva da seção 4.4. Pluralização e formatação de datas e números vêm do próprio `vue-i18n`, sobre o `Intl` do navegador.
- Catálogos em JSON: `apps/web/src/i18n/locales/pt-BR.json`, `en-US.json` e `es-419.json`, com chaves por funcionalidade (por exemplo `weight.save`). O `pt-BR` entra no bundle inicial; o catálogo do idioma ativo carrega sob demanda (`import()` dinâmico). Os três entram no precache do service worker, para trocar de idioma sem internet.
- Nenhum texto fixo em componentes (regra de lint `@intlify/vue-i18n/no-raw-text`) e nenhuma frase montada por concatenação: usar parâmetros, plural (`$t('streak.days', n)`) e mensagens completas por contexto, porque a ordem das palavras e o gênero mudam entre idiomas.
- Verificação no CI: `npm run i18n:check` falha se faltar chave em algum catálogo, se os parâmetros de uma mensagem forem diferentes entre idiomas ou se houver chave sem uso.
- Vuetify: usar o adaptador `createVueI18nAdapter`, para que os textos internos dos componentes (seletor de data, rótulos de acessibilidade) acompanhem o idioma ativo, e configurar o adaptador de datas do Vuetify com o mesmo locale.
- Rascunhos: o agente entrega `en-US` e `es-419` completos, mas como rascunho de tradução; a revisão humana é exigida antes da liberação (RF-80).

**Dados neutros em relação ao idioma.** O banco e a sincronização guardam só valores sem idioma: datas `YYYY-MM-DD`, horas `HH:mm`, pesos em kg e chaves (`mood`, `angle`, `key` dos hábitos padrão). Os identificadores `feliz`, `frente` e semelhantes são internos e nunca aparecem na tela. Nenhum texto traduzido é gravado; o texto digitado pela pessoa (nome, nota, hábito personalizado) não é traduzido.

**Formatação por tipo de dado.** Toda formatação acontece só na camada de apresentação, com `Intl`:

| Dado | Como é guardado | Como é exibido |
|---|---|---|
| Data de calendário | `YYYY-MM-DD` | `Intl.DateTimeFormat` do locale, em estilos curto, longo e mês/ano. Exemplo da data 2026-12-31: 31/12/2026 em pt-BR, 12/31/2026 em en-US e 31/12/2026 em es-419 |
| Data relativa (hoje, ontem) | Calculada | `Intl.RelativeTimeFormat` com `numeric: 'auto'` |
| Hora do lembrete | `HH:mm` | 24 h ou 12 h (AM/PM) conforme o locale; o seletor de hora do Vuetify segue o mesmo formato |
| Peso, altura, IMC, percentuais, copos, contadores | Número | `Intl.NumberFormat`; peso com 1 casa e unidade kg |
| Dias da semana do lembrete | Números de 1 a 7 (ISO, 1 = segunda) | Nomes pelo `Intl`, na ordem do primeiro dia da semana do idioma, definido em `locale-config.ts` |
| Plurais (1 dia, 2 dias) | Número | Regras de plural do catálogo |

**Onde mais o idioma aparece.** Além das telas do app, o idioma afeta: a landing page de desktop (textos, números e “Atualizado em”); os lembretes por push (texto gerado no servidor e campo `lang` do payload); os e-mails de recuperação de senha; os erros da API, que passam a devolver códigos estáveis (por exemplo `AUTH_INVALID_CREDENTIALS`) e nunca texto traduzido; o CSV da exportação (cabeçalhos traduzidos; datas em ISO 8601 e números com ponto decimal, para leitura por máquina); o atributo `html lang`, que muda junto com o idioma; e os metadados `title`, `description` e Open Graph da landing. O manifest permanece com `lang: pt-BR` (é um arquivo estático), o nome EmagreSer é o mesmo em todos os idiomas e o slogan é traduzido.

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

**Requisitos de idioma**

- **RF-73 Catálogos e infraestrutura.** Todo texto visível passa pelo `vue-i18n`, com os três catálogos completos desde a primeira versão. O CI roda `i18n:check` e a regra de lint contra texto fixo (seção 4.7).
- **RF-75 Datas e horas.** Todas as telas usam os formatadores centrais `formatDate`, `formatTime` e `formatRelative`, em `apps/web/src/i18n/format.ts`. É proibido espalhar `toLocaleDateString` ou `format` do date-fns com padrão fixo. Pontos a validar, um a um: histórico (RF-17), edição de registro (RF-18), seletor de data do registro de peso (RF-06), eixos e dicas do gráfico (RF-08), data de conquista dos marcos (RF-15), data da foto na galeria (RF-32), horário e dias do lembrete (RF-37 e RF-42), “Atualizado em” da landing (RF-67) e rótulos “hoje” e “ontem”. O seletor de data usa o `v-date-picker` do Vuetify com o mesmo locale e o primeiro dia da semana do idioma.
- **RF-76 Números.** Pesos, altura, IMC, percentuais, copos e contadores da landing usam `Intl.NumberFormat` do locale. Os campos de peso e altura têm `inputmode="decimal"` e aceitam vírgula ou ponto (RN-16).
- **RN-16 Cálculo e formatação independentes.** Datas, horas e números só são formatados na camada de apresentação, com `Intl`; as regras RN-01 a RN-10 nunca dependem do idioma. Campos numéricos aceitam vírgula ou ponto em qualquer idioma (se houver os dois símbolos, o último é o decimal) e o valor é normalizado antes de validar e gravar. Datas nunca são digitadas em texto livre: usar seletor.

## Pronto quando

- `docker compose up` sobe app, PostgreSQL e Redis, e `/api/v1/health` responde.
- O app abre com as 5 abas vazias e o tema aplicado; trocar de aba funciona.
- O tema usa os tokens da seção 6 e a fonte Plus Jakarta Sans empacotada, sem nenhuma requisição ao Google Fonts; o texto sobre botões verdes é `#111827`.
- `npm run lint`, `npm test`, `npm run build` e `npm run i18n:check` passam, e o CI roda os quatro.
- Um texto fixo num componente faz o lint falhar (mostre o teste ou o exemplo no relatório).
- Os formatadores têm testes para pt-BR, en-US e es-419.
- Com `vite build` e `vite preview`, o app abre sem internet depois do primeiro carregamento.

## Insumos que dependem do dono do projeto

- Nenhum.

## Ao terminar (obrigatório)

1. Rode `npm run lint`, `npm test` e `npm run build`; todos devem passar. Corrija o que falhar antes de seguir.
2. Revise o diff: nada fora do escopo, nenhuma dependência desnecessária, nenhum segredo, nenhum texto fixo em componente.
3. Atualize `docs/PROGRESSO.md` (marque a sessão) e `docs/DECISOES.md` (decisões novas).
4. Escreva `docs/relatorios/01-fase-00-base.md` pelo modelo `docs/MODELO_RELATORIO.md` (máximo de 40 linhas).
5. Faça o commit: `fase 0: <resumo curto>`.
6. Pare. Não comece a próxima sessão (prompts/02-fase-01-dominio.md). Responda no chat só com o resumo de 5 linhas do relatório.
