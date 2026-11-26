# EmagreSer — Especificação Técnica e Funcional

*Versão **2.0 (PWA com API)** · Documento para execução por um agente de IA · Idioma**s do produto: pt-BR, en-US e es-419 (os dois últimos liberados por feature flag**)*

## 1. Como usar este documento

Você é um agente de IA de desenvolvimento. Este documento é a fonte única de verdade para construir o aplicativo EmagreSer do zero. Siga estas regras:

- Leia o documento inteiro antes de escrever código.
- Execute as fases da seção 13 na ordem. Ao fim de cada fase, rode os testes e confirme os critérios de aceite antes de seguir.
- Quando algo não estiver especificado, escolha a opção mais simples que respeite as restrições da seção 4 e registre a decisão em `docs/DECISOES.md`.
- Não implemente nada fora do escopo (seção 5.4). Não adicione dependências que chamem serviços de terceiros em tempo de execução (analytics, anúncios, CDNs, fontes externas) nem que gerem custo recorrente além da hospedagem.
- Toda regra de negócio fica em módulos puros (`packages/domain`), sem Vue e sem acesso a rede ou disco, com testes unitários.
- Todo texto visível ao usuário fica centralizado em `apps/web/src/i18n/``locales/`.
- Ao terminar, entregue o código, o `README.md` com instruções de execução e de deploy e um resumo do que foi feito e do que ficou pendente.

## 2. Visão do produto

**Nome:** EmagreSer — aplicativo de controle de peso.

**Slogan:** Mais que perder peso, transformar quem você é.

**Proposta:** o foco não está na restrição nem na balança, mas na mudança de mentalidade e de comportamento (o “ser”). O app ajuda a pessoa a acompanhar o peso sem ansiedade, a criar hábitos pequenos e a se sentir acolhida nos dias difíceis.

**Princípios de produto:**

1. Acolhimento antes de cobrança: nenhuma mensagem culpabiliza o usuário.
2. Tendência antes de número diário: o gráfico principal mostra a média móvel.
3. Privacidade por padrão: dados de saúde são sensíveis (LGPD); coletar só o necessário, sem analytics de terceiros e sem compartilhar dados.
4. Simplicidade: registrar o peso deve levar menos de 10 segundos.
5. Offline primeiro: o app abre e registra sem internet e sincroniza quando a rede volta.
6. Custo baixo e previsível: uma API enxuta, um PostgreSQL e um Redis, sem serviços pagos de terceiros.

## 3. Público e plataformas

- Público: adultos que querem emagrecer de forma gradual e sustentável.
- Plataforma: PWA instalável, mobile-first (a partir de 360 px de largura), testada no Chrome para Android e no Safari do iOS 16.4 ou superior, instalada pela Tela de Início. Em desktop o app não é acessível: a pessoa vê a landing page de apresentação (seção 8.16).
- Idiomas: pt-BR (padrão), en-US e es-419, preparados desde o início e liberados por feature flag (seção 4.7); enquanto os flags estiverem desligados, o app funciona só em pt-BR. Unidade: apenas quilogramas (kg).
- Conta: cadastro e login com e-mail e senha; o primeiro acesso exige internet.
- Funcionamento: offline primeiro. Depois do primeiro login, registrar e consultar dados funciona sem internet; a sincronização acontece quando a conexão volta.

## 4. Stack, arquitetura e infraestrutura

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

### 4.1 Arquitetura e cache offline

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

### 4.2 Hospedagem

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

### 4.3 Variáveis de ambiente

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

### 4.4 API e autenticação

Todas as rotas ficam sob `/api/v1`, com entrada validada por schema.

| Rota | Função | Exige login |
|---|---|---|
| `POST /auth/register` | Cria a conta (e-mail, senha, consentimento) | Não |
| `POST /auth/login` | Entra | Não |
| `POST /auth/refresh` | Renova o token de acesso | Cookie |
| `POST /auth/logout` | Encerra a sessão | Sim |
| `POST /auth/forgot-password`, `POST /auth/reset-password` | Recuperação de senha por e-mail | Não |
| `GET /me`, `PATCH /me` | Perfil | Sim |
| `GET /me/export` | Exporta todos os dados em JSON | Sim |
| `DELETE /me` | Exclui a conta e todos os dados | Sim |
| `POST /sync/push` | Envia alterações do aparelho | Sim |
| `GET /sync/pull` | Baixa alterações a partir de um cursor | Sim |
| `GET /push/public-key` | Chave pública VAPID | Não |
| `POST /push/subscribe`, `DELETE /push/subscribe` | Cadastra e remove a inscrição de Web Push | Sim |
| `GET /health` | Healthcheck (sem dados sensíveis) | Não |

Rota pública adicional, sem login: `GET /public/stats`, com totais anônimos para a landing page de desktop (seção 8.16). O campo `last_seen_at` do usuário é atualizado em `/auth/refresh` e em `/sync/push`, no máximo uma vez por dia.

Rota de flags: `GET /flags`, com login opcional, devolve os idiomas disponíveis para o usuário (seção 4.7). O servidor também usa o campo `locale` de `user_settings` e a mesma avaliação de flags para escolher o idioma dos lembretes por push e dos e-mails.

- Senha com no mínimo 8 caracteres, guardada com argon2id.
- Token de acesso JWT de 15 minutos, mantido só em memória. Refresh token aleatório de 256 bits, guardado com hash no PostgreSQL e enviado em cookie `HttpOnly; Secure; SameSite=Strict`, com rotação a cada uso. Reuso de um refresh já revogado encerra todas as sessões daquela conta.
- Redis guarda os contadores de limite de requisições (login: 5 tentativas por 15 minutos por e-mail e IP; demais rotas: limite geral por IP), um cache curto da validação de sessão e as filas do BullMQ. Redis é otimização, não fonte da verdade: se cair, a API continua funcionando com o PostgreSQL.
- Segurança HTTP: `@fastify/helmet` com CSP restritiva (somente a própria origem), SQL sempre parametrizado, erros padronizados sem detalhes internos.
- Offline: token de acesso expirado não bloqueia o uso local. O cliente renova ao reconectar. Se o refresh falhar com 401, mostrar o login e manter a fila de saída intacta até o mesmo usuário entrar de novo; nunca apagar dados locais por falha de autenticação.

### 4.5 Sincronização offline

1. Toda escrita vai ao IndexedDB e à fila de saída (`outbox`) na mesma transação, com `entity`, `id`, `op` (`upsert` ou `delete`), `data` e `clientUpdatedAt`.
2. Gatilhos: abertura do app, evento `online`, 2 segundos após cada escrita local e a cada 5 minutos com o app aberto. Onde existir, registre também Background Sync no service worker; o iOS não suporta, então o app não pode depender dele. Use a Web Locks API (navigator.locks) para impedir que duas abas sincronizem ao mesmo tempo.
3. Envio: `POST /sync/push` com `{deviceId, changes[]}`, em lotes de até 200. Cada alteração é idempotente por (`entity`, `id`). O servidor aplica o lote numa transação e responde com o que foi aplicado e os conflitos.
4. Recebimento: `GET /sync/pull?cursor=N&limit=500`, repetido enquanto `hasMore` for verdadeiro. O servidor numera cada alteração com um `change_seq` crescente; o cursor é o maior `change_seq` recebido e fica na store `meta` do IndexedDB.
5. Entidades sincronizadas: `settings`, `weight_entries`, `habits`, `habit_logs`, `water_logs`, `milestones`. Fotos não sincronizam.
6. Falha de rede: nova tentativa com espera crescente (2 s, 4 s, 8 s, até 5 minutos), mantendo a fila de saída.

**Regras de conflito**

- Por registro, vence a alteração com maior `clientUpdatedAt` (última escrita vence). O servidor limita esse valor a no máximo 5 minutos no futuro.
- Exclusões são tombstones (`deleted_at`) e também sincronizam. Um upsert mais novo que a exclusão a desfaz.
- Dois aparelhos criando peso para a mesma data com ids diferentes: o mais recente permanece e o outro vira tombstone, que volta pelo pull.
- Depois de cada pull, recalcule marcos e streak com os dados locais (RN-03 e RN-06).

**Aceite:** num teste Playwright, três pesos registrados em modo offline aparecem no servidor, sem duplicar, quando a rede volta; duas abas editando o mesmo registro terminam com o valor da escrita mais recente nas duas.

### 4.6 Requisitos específicos de PWA

- Manifest: `name` EmagreSer, `short_name`, `display: standalone`, `lang: pt-BR`, `start_url: /`, `theme_color` #22C55E (token primary), `background_color` `#F``8FAFC`, ícones de 192 e 512 px e um ícone maskable de 512 px.
- Service worker com `strategies: 'injectManifest'` no `vite-plugin-pwa`, em `apps/web/src/sw.ts`, porque o app precisa de código próprio para os eventos `push` e `notificationclick`. O arquivo contém apenas: `precacheAndRoute(self.__WB_MANIFEST)`, `cleanupOutdatedCaches()`, uma `NavigationRoute` para `index.html` com `denylist: [/^\/api\//]`, `clientsClaim()`, o handler da mensagem `SKIP_WAITING` (sem `skipWaiting()` automático) e os handlers de push. Sem `runtimeCaching` para a API e sem `BackgroundSyncPlugin`: a sincronização é a da seção 4.5.
- Versões: fixe `vite-plugin-pwa` 2.x e `workbox-build` e `workbox-window` 7.4.x no `package.json`, e só atualize com os testes de PWA passando.
- Push: o formato das mensagens é o Declarative Web Push (seção 8.11). O handler `push` continua obrigatório para Chrome e Firefox e sempre deve chamar `showNotification`; se não mostrar nada, o navegador pode revogar a inscrição.
- Chame `navigator.storage.persist()` depois do onboarding, para reduzir o risco de o navegador apagar o IndexedDB (onde ficam as fotos).
- No iOS, o Web Push só funciona com o app instalado pela Tela de Início (iOS 16.4 ou superior). Mostre um aviso dispensável com o passo a passo (Compartilhar, depois Adicionar à Tela de Início).
- Teste o service worker sempre no build de produção (`vite build` e `vite preview`). Lighthouse: app instalável e funcionando offline após o primeiro carregamento.

### 4.7 Internacionalização (i18n) e feature flags

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

**Feature flags (liberação gradual).** Os três idiomas ficam prontos no código desde a primeira versão, mas en-US e es-419 só aparecem para quem tiver o flag ligado. O `pt-BR` está sempre disponível.

- Flags: `i18n_en` (en-US) e `i18n_es` (es-419), guardados na tabela `feature_flags` (seção 7), sem serviço de terceiros.
- Estados de cada flag: `off` (ninguém), `testers` (apenas e-mails da lista de testadores), `percent` (testadores mais uma porcentagem dos usuários) e `on` (todos).
- Avaliação no servidor: `off` é falso; `on` é verdadeiro; `testers` é verdadeiro se o e-mail do usuário estiver na lista; `percent` é verdadeiro para testadores ou quando um hash estável do id do usuário, módulo 100, for menor que a porcentagem. Sem usuário autenticado, só o estado `on` vale.
- Rota `GET /flags` (login opcional): devolve os flags avaliados e a lista de idiomas disponíveis para aquele usuário. Nunca expõe a lista de testadores nem a porcentagem. Resultado em cache no Redis por 60 segundos.
- Cliente: consulta ao abrir o app, depois do login, ao voltar ao primeiro plano e a cada 15 minutos; guarda o último resultado na store `meta` do IndexedDB. Sem rede, usa o último resultado; sem nenhum resultado, considera tudo desligado (só pt-BR). Um flag nunca bloqueia funções locais.
- Gestão sem painel: script `npm run flags:set -- i18n_en testers --emails a@exemplo.com,b@exemplo.com`, e variações `percent 20`, `on` e `off`. O script invalida o cache do Redis e atualiza `updated_at`. `off` serve de chave de emergência: o idioma some na próxima consulta do cliente.
- Roteiro de liberação: (1) produção com os dois flags em `off` e catálogos no código; (2) `testers` com a equipe, revisando textos em aparelhos reais; (3) `percent` em 10% e depois 50%; (4) `on`; (5) remover os flags do código depois de 30 dias estáveis em `on`.
- Em builds de desenvolvimento e de teste, `VITE_FORCE_LOCALES=pt-BR,en-US,es-419` ignora os flags. Em produção essa variável deve estar desligada (verificado no CI, como `VITE_ALLOW_DESKTOP`).

## 5. Escopo

### 5.1 MVP (obrigatório no dia 1)

- Conta de usuário: cadastro, login e recuperação de senha
- Registro de peso simplificado
- Armazenamento no aparelho (IndexedDB) com sincronização para a API e o PostgreSQL
- Gráfico de tendência com média móvel
- Metas parciais com recompensa visual
- Histórico em lista (ver, editar, apagar)
- IMC opcional: oculto por padrão, calculado só se a pessoa informar a altura (seção 8.15)
- Acesso ao app somente por dispositivos móveis, com landing page de apresentação em desktop (seção 8.16)
- Três idiomas (pt-BR, en-US e es-419) prontos no código e liberados por feature flag (seções 4.7 e 8.17)

### 5.2 Engajamento e hábito

- Contador de consistência (streak)
- Checklist de hábitos saudáveis
- Contador de água
- Lembretes diários por Web Push, enviados pela API

### 5.3 Abordagem comportamental e emocional

- Diário de humor com emojis, no momento do registro do peso
- Galeria privada de evolução visual, com fotos guardadas só no aparelho
- Mensagens de acolhimento quando o peso sobe

### 5.4 Fora de escopo (não implementar)

Contagem de calorias, tabelas nutricionais, receitas ou dietas, rede social ou ranking, login social (Google, Apple), integração com balanças, Apple Saúde ou Google Fit, unidades em libras, idiomas além de pt-BR, en-US e es-419, publicação nas lojas de aplicativos, pagamentos e qualquer recomendação médica individualizada. Também ficam para uma versão futura os percentis de IMC para menores de 18 anos e as faixas específicas para idosos (60 anos ou mais).

## 6. Identidade visual

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

## 7. Modelo de dados (PostgreSQL e IndexedDB)

O servidor usa PostgreSQL e o aparelho espelha as mesmas entidades no IndexedDB. Crie as tabelas abaixo na migração 1. Datas de calendário usam o tipo `date` (`YYYY-MM-DD`); instantes usam `timestamptz`. Em toda tabela sincronizável, as restrições de unicidade são índices parciais `WHERE deleted_at IS NULL`, para que um tombstone não bloqueie recriar o registro.

```sql
CREATE EXTENSION IF NOT EXISTS citext;
CREATE SEQUENCE change_seq;  -- cursor global de sincronização

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name  text,
  consent_at    timestamptz NOT NULL,  -- consentimento LGPD
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz            -- atualizado no sync, no máximo 1 vez por dia
);

CREATE TABLE refresh_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id  uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   text NOT NULL UNIQUE,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabelas sincronizáveis: id gerado no cliente, client_updated_at vindo do
-- cliente, change_seq = nextval('change_seq') a cada escrita, deleted_at = tombstone.

CREATE TABLE user_settings (  -- uma linha por usuário; entidade 'settings', id = user_id
  user_id            uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  start_weight_kg    numeric(4,1),
  target_weight_kg   numeric(4,1),
  start_date         date,
  milestone_step_kg  numeric(3,1) NOT NULL DEFAULT 2,
  reminder_enabled   boolean NOT NULL DEFAULT true,
  reminder_time      time NOT NULL DEFAULT '07:30',
  reminder_days      smallint[] NOT NULL DEFAULT '{1,2,3,4,5,6,7}',
  timezone           text NOT NULL DEFAULT 'America/Sao_Paulo',
  water_goal_glasses smallint NOT NULL DEFAULT 8,
  water_glass_ml     smallint NOT NULL DEFAULT 250,
  locale             text NOT NULL DEFAULT 'pt-BR' CHECK (locale IN ('pt-BR','en-US','es-419')),
  onboarding_done    boolean NOT NULL DEFAULT false,
  height_cm          smallint CHECK (height_cm BETWEEN 100 AND 250),  -- opcional (IMC)
  -- IMC: só a altura é coletada (sem idade nem sexo)
  bmi_visible        boolean NOT NULL DEFAULT false,                  -- IMC oculto por padrão
  client_updated_at  timestamptz NOT NULL,
  change_seq         bigint NOT NULL
);

CREATE TABLE weight_entries (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date              date NOT NULL,
  weight_kg         numeric(4,1) NOT NULL CHECK (weight_kg BETWEEN 20 AND 500),
  mood              text CHECK (mood IN ('feliz','ansioso','cansado','estressado')),
  note              text,
  client_updated_at timestamptz NOT NULL,
  change_seq        bigint NOT NULL,
  deleted_at        timestamptz
);
CREATE UNIQUE INDEX weight_entries_user_date ON weight_entries (user_id, date) WHERE deleted_at IS NULL;
CREATE INDEX weight_entries_pull ON weight_entries (user_id, change_seq);

CREATE TABLE milestones (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone_kg      numeric(4,1) NOT NULL,
  achieved_date     date,
  client_updated_at timestamptz NOT NULL,
  change_seq        bigint NOT NULL,
  deleted_at        timestamptz
);
CREATE UNIQUE INDEX milestones_user_kg ON milestones (user_id, milestone_kg) WHERE deleted_at IS NULL;

CREATE TABLE habits (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key               text NOT NULL,
  label             text,  -- só em hábitos personalizados; os padrão usam key e são traduzidos na interface
  active            boolean NOT NULL DEFAULT true,
  sort_order        integer NOT NULL DEFAULT 0,
  client_updated_at timestamptz NOT NULL,
  change_seq        bigint NOT NULL,
  deleted_at        timestamptz
);
CREATE UNIQUE INDEX habits_user_key ON habits (user_id, key) WHERE deleted_at IS NULL;

CREATE TABLE habit_logs (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date              date NOT NULL,
  habit_id          uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  done              boolean NOT NULL DEFAULT true,
  client_updated_at timestamptz NOT NULL,
  change_seq        bigint NOT NULL,
  deleted_at        timestamptz
);
CREATE UNIQUE INDEX habit_logs_user_date_habit ON habit_logs (user_id, date, habit_id) WHERE deleted_at IS NULL;

CREATE TABLE water_logs (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date              date NOT NULL,
  glasses           smallint NOT NULL DEFAULT 0 CHECK (glasses >= 0),
  client_updated_at timestamptz NOT NULL,
  change_seq        bigint NOT NULL,
  deleted_at        timestamptz
);
CREATE UNIQUE INDEX water_logs_user_date ON water_logs (user_id, date) WHERE deleted_at IS NULL;

CREATE TABLE feature_flags (
  key             text PRIMARY KEY,
  state           text NOT NULL DEFAULT 'off' CHECK (state IN ('off','testers','percent','on')),
  rollout_percent smallint NOT NULL DEFAULT 0 CHECK (rollout_percent BETWEEN 0 AND 100),
  tester_emails   text[] NOT NULL DEFAULT '{}',  -- sempre em minúsculas
  updated_at      timestamptz NOT NULL DEFAULT now()
);
INSERT INTO feature_flags (key) VALUES ('i18n_en'), ('i18n_es');  -- ambos começam em 'off'
```

**Seeds no cliente.** Ao concluir o onboarding, o app cria no aparelho três hábitos padrão, com ids gerados no cliente e somente a chave: `vegetais`, `sono` e `exercicio`. O texto exibido vem do catálogo do idioma ativo (por exemplo, a chave `habits.vegetais`); por isso `label` fica vazio nos hábitos padrão e só é preenchido nos personalizados. Eles sincronizam como qualquer outro registro. Valores padrão das configurações: meta de água de 8 copos, copo de 250 ml, passo de meta de 2 kg, lembrete às 07:30 todos os dias e idioma `pt-BR`.

**IndexedDB (Dexie).** Cada registro sincronizável guarda também `updatedAt` e `deleted` (tombstone). O campo `celebrated` dos marcos existe só no aparelho e não sincroniza.

```ts
db.version(1).stores({
  settings: 'id',
  weightEntries: 'id, date, updatedAt',
  milestones: 'id, milestoneKg',
  habits: 'id, key',
  habitLogs: 'id, date, habitId',
  waterLogs: 'id, date',
  outbox: '++seq, entity, id',   // fila de saída da sincronização
  meta: 'key',                   // lastPullCursor, deviceId
  progressPhotos: 'id, date, angle'  // blob da imagem; nunca sincroniza
});
```

## 8. Requisitos funcionais

Prioridade: **M** = obrigatório, **D** = desejável (implementar se sobrar tempo, sem atrasar os obrigatórios).

### 8.1 Onboarding (M)

- **RF-01** Depois do cadastro ou do login, enquanto onboarding_done for falso, exibir 5 telas curtas: boas-vindas e slogan; peso atual; peso-alvo e passo das metas parciais (opções 1, 2, 3 ou 5 kg, padrão 2); altura para o IMC (opcional, RF-56); horário do lembrete diário (pode ser pulado).
- **RF-02** Nome é opcional. Validar que o peso-alvo é menor que o peso atual.
- **RF-03** Ao concluir, gravar o peso atual como primeiro registro, gravar o fuso horário do aparelho em timezone (atualizado quando mudar), gerar os marcos (RN-03) e marcar `onboarding_done`.
- **Aceite:** reabrir o app depois do onboarding vai direto para a tela Hoje; fechar e abrir no meio do onboarding recomeça do passo 1 sem dados corrompidos; pular a tela do IMC não impede concluir o onboarding.

### 8.2 Registro de peso (M)

- **RF-04** Tela direta com campo numérico grande, botões de ajuste de ±0,1 kg e botão Salvar. Aceitar vírgula ou ponto como separador decimal, em qualquer idioma (RN-16). Valor inicial sugerido: último peso registrado.
- **RF-05** Há no máximo um registro por dia. Salvar em um dia que já tem registro atualiza o existente (upsert).
- **RF-06** Permitir escolher a data do registro (padrão: hoje; não permitir datas futuras).
- **RF-07** Logo após salvar, oferecer a escolha opcional de humor (ver 8.8) e exibir, se aplicável, a mensagem de acolhimento (8.9) ou a celebração de meta (8.4).
- **Aceite:** registrar o peso de hoje exige no máximo 3 toques a partir da tela Hoje; valores fora de 20–500 kg são recusados com mensagem amigável.

### 8.3 Gráfico de tendência (M)

- **RF-08** Gráfico de linha com duas séries: pontos de peso diário (discretos, em cinza suave) e linha de média móvel (destaque, cor primária).
- **RF-09** Seletor de período: 30 dias, 90 dias, 6 meses, tudo. Padrão: 30 dias.
- **RF-10** Exibir linhas horizontais tracejadas para o peso-alvo e para o próximo marco.
- **RF-11** Abaixo do gráfico, mostrar: peso atual, média móvel atual, variação total desde o início e variação na média dos últimos 7 dias.
- **RF-12** Estado vazio: com menos de 2 registros, mostrar ilustração e texto explicando que a tendência aparece com mais registros.
- **Aceite:** a linha de média usa exatamente a regra RN-01; o gráfico é legível em telas de 360 px de largura.

### 8.4 Metas parciais e recompensas (M)

- **RF-13** Mostrar na tela Hoje uma barra de progresso até o próximo marco, com o texto “Faltam X kg para o próximo passo”.
- **RF-14** Ao atingir um marco pela primeira vez, exibir uma celebração em tela cheia (animação simples de confete ou brilho, mensagem de parabéns e o marco alcançado). Cada marco é celebrado uma única vez.
- **RF-15** Tela Metas lista todos os marcos com estado: alcançado (com data) ou pendente.
- **RF-16** Se o usuário editar a meta ou o passo, regenerar os marcos conforme RN-03 preservando os já alcançados.
- **Aceite:** registrar um peso que cruza dois marcos de uma vez marca os dois como alcançados e celebra o mais distante, mencionando a quantidade de marcos conquistados.

### 8.5 Histórico (M)

- **RF-17** Lista em ordem decrescente de data, com data, peso, variação em relação ao registro anterior (texto neutro, sem setas vermelhas) e emoji de humor, se houver.
- **RF-18** Tocar em um item abre a edição de peso, data (sem duplicar dia), humor e nota. Deslizar ou botão de lixeira apaga, com confirmação.
- **RF-19** Apagar ou editar registros recalcula gráfico, marcos e streak. Marcos já alcançados não são “desfeitos” por edição posterior (a data de conquista permanece).
- **Aceite:** a lista com 1.000 registros rola sem travamentos (usar lista virtualizada).

### 8.6 Consistência — streak (M)

- **RF-20** Exibir na tela Hoje um selo com o número de dias seguidos e o recorde pessoal.
- **RF-21** Um dia é “ativo” se houver ao menos uma ação: peso registrado, hábito marcado, copo de água adicionado ou humor registrado.
- **RF-22** Regra de continuidade: se hoje ainda não é ativo mas ontem foi, o streak atual é mantido até o fim do dia de hoje; o streak só zera quando passa um dia inteiro sem ação.
- **Aceite:** testes unitários cobrem virada de dia, dias perdidos, edição retroativa e streak de 0 dias.

### 8.7 Hábitos e água (M)

- **RF-23** Checklist do dia com os hábitos ativos; tocar marca ou desmarca, com resposta tátil leve. Reinicia a cada novo dia (cada dia tem seu próprio registro).
- **RF-24** Contador de água: botão grande de +1 copo com animação simples de enchimento, botão de −1 e indicador “X de Y copos”. A meta padrão é 8 copos e é editável nas configurações.
- **RF-25 (D)** Permitir ativar, desativar e criar hábitos personalizados (até 8 no total).
- **RF-26 (D)** Tela de histórico de hábitos com percentual de dias cumpridos nos últimos 30 dias.
- **Aceite:** o estado de hoje persiste ao fechar e reabrir o app; mudar de dia à meia-noite zera a visualização sem apagar o histórico.

### 8.8 Diário de humor (M)

- **RF-27** Opções de humor com emoji e rótulo: Feliz, Ansioso, Cansado, Estressado. Escolha opcional e pulável, apresentada logo após salvar o peso.
- **RF-28 (D)** Na tela de Evolução, mostrar a distribuição de humores dos últimos 30 dias.

### 8.9 Mensagens de acolhimento (M)

- **RF-29** Quando o peso registrado for maior que o registro anterior ou maior que a média móvel anterior (RN-05), exibir um cartão acolhedor explicando que oscilações de líquido são normais e incentivando a continuar.
- **RF-30** Manter pelo menos 8 mensagens diferentes em `src/i18n/``locales/ (pt-BR.json, en-US.json e es-419.json)`, sorteadas sem repetir a anterior. Exemplos de tom:
    - “Seu corpo oscila ao longo da semana, e isso é normal. Retenção de líquido pode mudar o número sem mudar o seu progresso.”
    - “Um dia não define sua jornada. O que conta é a tendência, e você continua firme nela.”
    - “Obrigado por registrar mesmo hoje. Voltar a se cuidar já é uma conquista.”
- **RF-31** Nunca usar linguagem de culpa, punição, “falhou” ou “errou”.

### 8.10 Galeria de evolução (M)

- **RF-32** Tela com filtro por ângulo: frente, lado, costas. Adicionar foto pela câmera ou pela galeria do aparelho, escolhendo o ângulo e a data. Use `input type="file" accept="image/*"` (com `capture` para a câmera), sem depender de APIs com permissão especial.
- **RF-33** Reduzir a imagem no cliente (lado maior de 1280 px, JPEG com qualidade 0,8) e guardar o Blob na store `progressPhotos` do IndexedDB. A foto nunca é enviada ao servidor.
- **RF-34** Modo de comparação lado a lado de duas fotos do mesmo ângulo, escolhidas pelo usuário.
- **RF-35** Permitir excluir uma foto, com confirmação.
- **RF-36** Avisar na tela que as fotos ficam só neste aparelho, não vão para a conta e se perdem se os dados do navegador forem limpos ou o app for desinstalado. Oferecer o botão “Baixar foto”.
- **Aceite:** nenhuma requisição de rede carrega ou envia fotos (verificar em teste) e a galeria funciona em modo avião.

### 8.11 Lembretes por Web Push (M)

- **RF-37** Lembrete diário por Web Push, no horário e nos dias da semana escolhidos, no fuso guardado em `timezone`. O servidor agenda com BullMQ (um job repetível por usuário, recriado quando as configurações mudam) e envia com a biblioteca `web-push`. Notificações locais agendadas do navegador não são confiáveis em PWA, por isso o envio parte do servidor.
- **RF-38** O app cadastra a inscrição em `POST /push/subscribe`: com `window.pushManager` quando existir (Safari 18.4 ou superior, sem depender do service worker) e com `registration.pushManager` nos demais navegadores, sempre com a chave VAPID pública e `userVisibleOnly: true`. A inscrição é removida ao desativar o lembrete ou sair da conta. O servidor apaga inscrições que respondem 404 ou 410.
- **RF-39** Antes de enviar, o servidor confere se já existe peso registrado na data local do usuário e, se existir, não envia. As mensagens têm TTL de 6 horas, para não chegarem muito atrasadas.
- **RF-40** O servidor envia sempre o JSON do padrão Declarative Web Push: `{"web_push": 8030, "notification": {"title": "...", "body": "...", "lang": "``{locale}``", "dir": "ltr", "navigate": "<APP_ORIGIN>/registrar", "silent": false}}`, com `navigate` em URL absoluta HTTPS. O Safari 18.4 ou superior exibe a notificação sem JavaScript e continua recebendo mesmo que o iOS apague o service worker por inatividade. Chrome e Firefox tratam a mesma mensagem no handler `push` do service worker, que chama `showNotification` e abre `navigate` no `notificationclick`. Textos amigáveis e variados, nunca de cobrança e sem dados de saúde (o peso nunca aparece). Exemplo: “Bom dia! Que tal um registro rápido para acompanhar sua jornada?”.
- **RF-41** Pedir a permissão de notificação só depois de um gesto do usuário (ao ativar o lembrete). No iOS, exigir o app instalado (seção 4.6). Se a permissão for negada ou indisponível, explicar o motivo em Configurações, com orientação para ativar.
- **Aceite:** com o app fechado e o aparelho online, a notificação chega no horário configurado; se o aparelho estava offline, chega ao reconectar dentro do TTL. Desativar o lembrete cancela o job e remove a inscrição.

### 8.12 Configurações (M)

- **RF-42** Editar nome, peso-alvo, passo das metas, lembrete (ativo, horário, dias), meta de água e tamanho do copo. As alterações sincronizam. Os dados e a visibilidade do IMC ficam na seção própria (RF-59 e RF-62).
- **RF-43** Tela “Sobre e privacidade” em linguagem simples: quais dados ficam na conta (peso, hábitos, água, humor, configurações e, se informados, os dados do IMC), que as fotos ficam só no aparelho, que nada é vendido ou compartilhado e que não há analytics de terceiros, e que a página pública de apresentação mostra apenas totais anônimos. Mostrar também a versão do app e o aviso de que o app não substitui acompanhamento de profissionais de saúde.
- **RF-44** “Exportar meus dados” em JSON e CSV, a partir de `GET /me/export`, entregue pelo compartilhamento do navegador. Atende ao direito de portabilidade da LGPD.
- **RF-45** “Excluir minha conta e todos os meus dados” com confirmação dupla e senha. `DELETE /me` apaga usuário, registros, sessões e inscrições de push no servidor; em seguida o app limpa IndexedDB, fotos e caches. Sem internet, avisar que a exclusão exige conexão.

### 8.13 Conta e autenticação (M)

- **RF-46** Cadastro com e-mail, senha (mínimo de 8 caracteres) e uma caixa de consentimento obrigatória, desmarcada por padrão, que explica o tratamento de dados de saúde (peso, hábitos, humor e, se o usuário optar, altura para o IMC) para o funcionamento do app, com link para a tela de privacidade. Guardar a data em `consent_at`.
- **RF-47** Login com e-mail e senha. Erros genéricos (“E-mail ou senha incorretos”), sem revelar se o e-mail existe, e com limite de tentativas (seção 4.4).
- **RF-48** Sessão persistente: o usuário continua conectado por até 30 dias de inatividade (validade do refresh token, renovada a cada uso).
- **RF-49** Recuperação de senha por e-mail, com link de uso único válido por 30 minutos e resposta idêntica exista ou não o e-mail. Trocar a senha encerra todas as sessões.
- **RF-50** Ao sair, apagar os dados locais do usuário. Se houver pendências na fila de saída, avisar e oferecer sincronizar antes. Como as fotos de evolução existem só no aparelho, avisar que elas serão apagadas e oferecer baixá-las antes de sair.
- **RF-51 (D)** Trocar a senha com o usuário logado.
- **Aceite:** depois do primeiro login, fechar e reabrir o app em modo avião leva direto à tela Hoje.

### 8.14 Sincronização (M)

- **RF-52** Implementar o protocolo da seção 4.5: fila de saída, envio, recebimento por cursor e regras de conflito.
- **RF-53** Em um aparelho novo ou depois do login, baixar todos os dados (pull a partir do cursor 0) com indicador de progresso. Se `onboarding_done` já for verdadeiro no servidor, pular o onboarding.
- **RF-54** Indicador discreto do estado (sincronizado, pendente, offline) na barra superior e em Configurações. A sincronização nunca bloqueia a interface.
- **RF-55** Nenhuma tela mostra erro técnico por falha de rede; a falha vira o estado “pendente”.
- **Aceite:** o teste descrito na seção 4.5 passa.

### 8.15 IMC opcional e oculto por padrão (M)

O IMC é uma referência opcional. Nada relacionado a ele aparece no app até a pessoa informar a altura e ligar o interruptor “Mostrar IMC”. Os campos novos (altura e visibilidade do IMC) ficam em `user_settings` (seção 7) e sincronizam como as demais configurações.

- **RF-56** Tela opcional do onboarding, depois do peso-alvo. Título: “Quer acompanhar o seu IMC?”. Texto: “Para calcular o IMC, precisamos apenas da sua altura. É opcional: você pode pular agora e informar depois, em Configurações.” Campo: altura em cm. Interruptor “Mostrar o IMC no app”, desligado por padrão. Botões “Pular” e “Salvar”. Pular não grava nada e não bloqueia nenhuma outra função.
- **RF-57** Validação: altura entre 100 e 250 cm. O app não coleta idade, data de nascimento nem sexo biológico.
- **RF-58** O IMC só é calculado quando há altura informada (RN-09). Sem altura, nenhuma tela menciona IMC, exceto a seção “IMC” em Configurações, que convida a informar a altura.
- **RF-59** Visibilidade: o IMC fica oculto por padrão em todo o app. O interruptor “Mostrar IMC” fica em Configurações, na seção “IMC”, e permanece desabilitado enquanto faltar a altura, com um texto dizendo o que falta. Desligar o interruptor esconde o IMC de imediato em todas as telas, sem apagar a altura.
- **RF-60** Com o IMC visível, mostrar um cartão “IMC” na tela Evolução: valor atual com 1 casa decimal, a faixa (tabela da RN-09) e o IMC do início da jornada. O cartão tem um ícone de olho para ocultar rapidamente. O IMC não aparece nas telas Hoje, Metas e Histórico.
- **RF-61** O cartão traz sempre esta nota neutra: “O IMC é uma referência geral para adultos. Ele não considera massa muscular, idade ou distribuição de gordura, e as faixas não se aplicam a menores de 18 anos nem são ideais a partir dos 60. Converse com um profissional de saúde para interpretá-lo.” Nunca usar vermelho nem linguagem de julgamento; as faixas usam as cores do tema, sem sinal de alerta.
- **RF-62** Na seção “IMC” de Configurações é possível editar a altura e usar “Apagar meus dados de IMC”, que limpa a altura, desliga o interruptor e sincroniza a mudança.
- **RF-63** Como o app não pergunta a idade, a faixa é a de adultos e vem sempre acompanhada da nota do RF-61. Nenhuma tela nem regra presume a idade da pessoa; o público do app é adulto (seção 3).
- **RF-64** Aviso de peso-alvo (RN-10): ao definir ou editar o peso-alvo, se ele ficar abaixo da faixa de peso adequado para a altura informada, mostrar um aviso gentil, sem bloquear e sem revelar o número do IMC quando ele estiver oculto.
- **Aceite:** com o interruptor desligado, nenhuma tela, notificação ou mensagem exibe IMC; pular a tela do onboarding não deixa nenhum dado gravado; apagar os dados de IMC remove a altura no aparelho e no servidor; os testes cobrem todas as faixas e os limites entre elas.

### 8.16 Landing page de apresentação para desktop (M)

Histórias de usuário:

- Como pessoa que abriu o EmagreSer em um computador, quero entender que o app é de uso exclusivo em celulares e como acessá-lo, para continuar no aparelho certo.
- Como visitante, quero ver o que o app oferece e quantas pessoas já o usam, para decidir se vale instalar.

A landing é exibida conforme RN-13 e atende à estrutura STRU-01, com as quatro seções obrigatórias abaixo.

- **RF-65 Alerta de restrição.** Seção no topo, visível sem rolar a página. Título: “O EmagreSer é de uso exclusivo em celulares e tablets.” Texto: “Aponte a câmera do celular para o QR Code ou abra o endereço abaixo no navegador do seu celular.” Inclui um QR Code gerado no cliente, em SVG, por biblioteca empacotada no build (por exemplo `qrcode`), sem serviço externo; o QR aponta sempre para a raiz de `APP_ORIGIN`. Mostra também o endereço em texto e o botão “Copiar link”. O alerta usa o estilo informativo do tema (superfície branca com contorno e ícone de informação), nunca vermelho nem laranja.
- **RF-66 Resumo de funcionalidades.** Grade de cartões (`v-card`, ícones `@mdi/font` e ilustrações suaves, sem fotos de corpos) com: registro de peso e gráfico de tendência com média móvel; metas parciais com recompensas; hábitos e contador de água; diário de humor; fotos de evolução privadas; lembretes diários; funciona offline e sincroniza; IMC opcional e oculto por padrão. Os textos ficam em `locales/ (pt-BR.json, en-US.json e es-419.json)`.
- **RF-67 Dados de uso do app.** Seção com indicadores agregados de `GET /public/stats`: registros de peso, hábitos concluídos e copos de água registrados, formatados no idioma resolvido (`Intl.NumberFormat`) e acompanhados de “Atualizado em” com data e hora. Nenhuma métrica de peso perdido.
- **RF-68 Prova social e métricas de comunidade.** Bloco em destaque, logo após o alerta de restrição: número de usuários ativos nos últimos 30 dias, em tamanho grande, e total de usuários cadastrados como informação secundária, sempre conforme RN-14. Sem depoimentos nem logotipos inventados.
- **RF-69 Estrutura geral.** Cabeçalho com logo e slogan; rodapé com link para a página pública “Sobre e privacidade” e versão do app. Sem botão de entrar e sem formulário de cadastro.
- **RF-70 Carregamento.** A landing é um chunk separado, carregado sob demanda. Ela renderiza primeiro e só depois chama `GET /public/stats`, com `v-skeleton-loader` enquanto espera; a página continua útil sem os números. Metadados `title`, `description` e Open Graph definidos.
- **RF-71 Rota ****`GET /public/stats`****.** Sem login, com limite de requisições por IP no Redis, sem parâmetros. Resposta: `{ activeUsers30d, totalUsers, weightEntries, habitsCompleted, waterGlasses, updatedAt }` ou `{ belowThreshold: true }` quando valer a regra do mínimo (RN-14). Resultado em cache no Redis por 15 minutos e cabeçalho `Cache-Control: public, max-age=300`.
- **RF-72 Acessibilidade.** Contraste AA, landmarks semânticos, navegação por teclado, QR Code com `aria-label` e endereço em texto como alternativa.
- **Aceite:** em desktop, nenhuma tela do app é renderizada, o service worker não é registrado e a landing mostra as quatro seções; em celular e tablet a landing nunca é exibida nem baixada; no Chrome para Android o banner de instalação aparece depois do onboarding e respeita o intervalo de 14 dias; sem rede, ou com a rota falhando, a landing continua mostrando alerta e funcionalidades; os testes cobrem a classificação (RN-11) com User Agents de Android, iPhone, iPad, iPadOS que se identifica como Mac, Chrome, Firefox e Safari de desktop e janela estreita de desktop.

### 8.17 Idiomas (pt-BR, en-US e es-419) liberados por feature flag (M)

Histórias de usuário:

- Como pessoa que fala inglês ou espanhol, quero usar o app no meu idioma, com datas e números no formato que conheço.
- Como equipe do produto, quero deixar os três idiomas prontos no código e liberá-los aos poucos, para revisar os textos antes de abrir ao público.
- **RF-73 Catálogos e infraestrutura.** Todo texto visível passa pelo `vue-i18n`, com os três catálogos completos desde a primeira versão. O CI roda `i18n:check` e a regra de lint contra texto fixo (seção 4.7).
- **RF-74 Seletor de idioma.** Em Configurações, seção “Idioma”, e nas telas de login e cadastro (a escolha fica em meta.localePref). Só aparece quando há dois ou mais idiomas disponíveis. Os nomes aparecem no próprio idioma (Português, English, Español). A troca vale na hora.
- **RF-75 Datas e horas.** Todas as telas usam os formatadores centrais `formatDate`, `formatTime` e `formatRelative`, em `apps/web/src/i18n/format.ts`. É proibido espalhar `toLocaleDateString` ou `format` do date-fns com padrão fixo. Pontos a validar, um a um: histórico (RF-17), edição de registro (RF-18), seletor de data do registro de peso (RF-06), eixos e dicas do gráfico (RF-08), data de conquista dos marcos (RF-15), data da foto na galeria (RF-32), horário e dias do lembrete (RF-37 e RF-42), “Atualizado em” da landing (RF-67) e rótulos “hoje” e “ontem”. O seletor de data usa o `v-date-picker` do Vuetify com o mesmo locale e o primeiro dia da semana do idioma.
- **RF-76 Números.** Pesos, altura, IMC, percentuais, copos e contadores da landing usam `Intl.NumberFormat` do locale. Os campos de peso e altura têm `inputmode="decimal"` e aceitam vírgula ou ponto (RN-16).
- **RF-77 Plural e gênero.** Mensagens com contagem (dias de streak, copos, marcos, “faltam X kg”) usam plural do `vue-i18n`. Testes de snapshot por idioma para 0, 1, 2 e valores maiores.
- **RF-78 Servidor.** Textos de push e e-mails ficam em `apps/api/src/i18n`, escolhidos pelo `locale` do usuário e pelo mesmo flag (RN-15), com fallback para pt-BR. O campo `lang` do payload de push e o cabeçalho `Content-Language` do e-mail refletem o idioma usado. A API devolve apenas códigos de erro.
- **RF-79 Hábitos padrão e humor.** Traduzidos a partir da chave, sem gravar texto no banco. O campo `label` só existe em hábitos personalizados.
- **RF-80 Conteúdo sensível.** As mensagens de acolhimento (RF-30, pelo menos 8 por idioma), o aviso de peso-alvo (RN-10), a nota do IMC (RF-61), o texto de consentimento (RF-46) e a política de privacidade exigem revisão por falante nativo antes de o flag de cada idioma sair de `testers`. Registrar data e revisor em `docs/DECISOES.md`.
- **RF-81 Landing e metadados.** Textos, `title`, `description`, Open Graph e números da landing seguem o idioma resolvido (sem login valem os passos 2 a 4 da RN-15, apenas com flags no estado `on`).
- **RF-82 Exportação.** Cabeçalhos do CSV no idioma ativo; datas em ISO 8601 e números com ponto decimal.
- **RF-83 Feature flags.** Tabela `feature_flags`, avaliação no servidor, `GET /flags`, cache local no IndexedDB, script de gestão e `VITE_FORCE_LOCALES`, conforme a seção 4.7.
- **Aceite:** com os dois flags em `off`, nenhum seletor aparece e o app funciona só em pt-BR, mesmo com o navegador em inglês; com `testers`, só os e-mails da lista veem o seletor e os idiomas; ao desligar um flag, o usuário volta a pt-BR sem perder a preferência salva; a mesma data (guardada como 2026-12-31) aparece no formato de cada idioma em todas as telas do RF-75; `i18n:check` falha o CI quando falta chave ou o parâmetro de uma mensagem difere; teste de layout nos três idiomas em 360 px sem texto cortado; push e e-mail saem no idioma do usuário.

## 9. Regras de negócio

- **RN-01 Média móvel de 7 dias.** Para cada data D com registro, a média é a média aritmética dos pesos registrados nos 7 dias de calendário terminados em D (D−6 até D). Dias sem registro são ignorados, sem preenchimento. A média existe se houver ao menos 1 registro na janela. Arredondar para 1 casa apenas na exibição.
- **RN-02 Peso atual de referência.** Para o progresso e os marcos, usar o **peso mais recente registrado** (não a média), para que a conquista seja percebida de forma concreta. A média é usada apenas no gráfico e nas comparações de tendência.
- **RN-03 Geração de marcos.** Dado peso inicial P, peso-alvo A e passo S, os marcos são P−S, P−2S, P−3S… enquanto o valor for maior que A, e o último marco é sempre A. Exemplo: P=90, A=80, S=4 gera 86, 82, 80. Um marco é considerado alcançado quando algum peso registrado for menor ou igual a ele.
- **RN-04 Progresso.** Percentual até a meta final = (P − peso atual) ÷ (P − A), limitado entre 0% e 100%.
- **RN-05 Detecção de subida.** Há subida quando o peso registrado é maior que o registro imediatamente anterior ou maior que a média móvel calculada sem o novo registro. Em qualquer dos casos, exibir a mensagem de acolhimento uma vez por registro.
- **RN-06 Streak.** Conforme RF-20 a RF-22. Calcular a partir da união das datas com qualquer ação registrada.
- **RN-07 Segurança de linguagem.** O app não define metas de calorias e não faz julgamento de peso corporal. Como medida de cuidado, se a média móvel cair mais de 1% do peso corporal por semana durante 3 semanas seguidas, exibir um aviso gentil sugerindo conversar com um profissional de saúde (desejável, não bloqueante).
- **RN-08 Dia civil.** Todas as viradas de dia usam o fuso local do aparelho; ao abrir o app, recalcular “hoje” e atualizar a interface.

- **RN-09 IMC.** IMC = peso (kg) ÷ altura (m)², com o peso mais recente registrado (RN-02), arredondado a 1 casa só na exibição. A faixa segue a tabela abaixo (adultos) e é sempre exibida junto da nota do RF-61. O app não usa idade nem sexo no cálculo.
- **RN-10 Aviso de peso-alvo.** Com a altura informada, o peso mínimo da faixa de peso adequado é 18,5 × altura (m)². Se o peso-alvo for menor que isso, exibir o aviso do RF-64: “Esse peso-alvo está abaixo da faixa considerada saudável para a sua altura. Vale conversar com um profissional de saúde antes de seguir com ele.” O aviso não impede o usuário de continuar.

Faixas do IMC para adultos (RN-09):

| IMC | Rótulo no app |
|---|---|
| Menor que 18,5 | Abaixo do peso |
| 18,5 a 24,9 | Peso adequado |
| 25,0 a 29,9 | Sobrepeso |
| 30,0 a 34,9 | Obesidade grau I |
| 35,0 a 39,9 | Obesidade grau II |
| 40,0 ou mais | Obesidade grau III |

- **RN-11 Detecção de dispositivo (móvel ou desktop).** A classificação acontece uma única vez, no carregamento inicial da PWA, antes de montar qualquer tela (script síncrono em `main.ts`, sem esperar rede nem IndexedDB). Sinais usados, nesta ordem:
    - `navigator.userAgentData.mobile`, quando existir (navegadores Chromium);
    - User Agent com `Android`, `iPhone`, `iPad`, `iPod` ou `Mobile`;
    - iPadOS que se identifica como Mac: User Agent com `Macintosh` e `navigator.maxTouchPoints > 1`;
    - viewport e ponteiro, só como desempate quando os sinais acima forem inconclusivos: `matchMedia('(pointer: coarse) and (hover: none)')` verdadeiro.
    - A largura da janela, sozinha, nunca classifica um aparelho como móvel: uma janela estreita de desktop continua sendo desktop. Tablets contam como dispositivo móvel. O resultado é recalculado a cada carregamento e não é gravado.
- **RN-12 Fluxo móvel (acesso permitido).** Em dispositivo móvel a landing page é ignorada: o app é carregado direto e o código da landing nem é baixado. A rota inicial segue as regras de acesso: sessão válida e `onboarding_done` verdadeiro abrem a tela Hoje; sem sessão, abre o login ou o cadastro; com sessão e sem onboarding, abre o onboarding. No navegador móvel (fora do modo instalado), o app trata o evento `beforeinstallprompt`:
    - o listener é registrado no carregamento inicial, antes de montar o app, para não perder o evento; o evento é guardado e `preventDefault()` é chamado;
    - o convite é um banner próprio (`v-banner` ou `v-snackbar`), mostrado só depois de concluído o onboarding, nunca durante o cadastro ou o onboarding nem sobre a tela de registro de peso;
    - o botão “Instalar” chama `prompt()` a partir de um gesto do usuário, o resultado de `userChoice` é tratado e o evento `appinstalled` esconde o banner;
    - se o usuário dispensar, o banner não volta por 14 dias (data guardada na store `meta` do IndexedDB);
    - não mostrar quando o app já roda instalado (`matchMedia('(display-mode: standalone)')` ou `navigator.standalone`);
    - em navegadores sem esse evento (Safari no iOS), mostrar o aviso manual de instalação da seção 4.6;
    - o registro do service worker e a captura de `beforeinstallprompt` existem apenas no fluxo móvel.
- **RN-13 Fluxo desktop (bloqueio e landing page).** Em dispositivo não móvel, a pessoa fica retida na landing page de apresentação (seção 8.16), em qualquer rota (`/`, rotas internas, links diretos). Os links de recuperação de senha abertos no desktop também mostram a landing, com a orientação de abrir o e-mail no celular. Exceção: a página pública “Sobre e privacidade”. Na landing não há service worker, IndexedDB, login nem chamadas a `/auth` ou `/sync`; a única chamada de rede é `GET /public/stats`. O bloqueio é uma regra de experiência e não de segurança: a API continua aceitando requisições de qualquer cliente e nenhuma rota do servidor depende da classificação. Para desenvolvimento e testes existe o bypass `VITE_ALLOW_DESKTOP=true`, aceito apenas em builds de desenvolvimento e de teste e verificado como desligado no build de produção (CI). Os testes Playwright usam emulação de dispositivo móvel.
- **RN-14 Dados públicos agregados.** Os números da landing são totais anônimos: nunca expõem dados individuais (e-mail, nome, peso ou data de um usuário) nem valores de peso ou de perda de peso. Definições: usuários ativos são as contas com `last_seen_at` nos últimos 30 dias; usuários cadastrados são todas as contas; registros de peso são as linhas não excluídas de `weight_entries` (só a contagem); hábitos concluídos são as linhas não excluídas de `habit_logs` com `done` verdadeiro; copos de água são a soma de `water_logs.glasses` das linhas não excluídas. Nenhum número é inventado, fixo no código ou arredondado para cima. Abaixo do mínimo de `PUBLIC_STATS_MIN_USERS` contas cadastradas (variável de ambiente, padrão 50), o servidor não envia os números e a landing mostra “Estamos começando agora. Seja uma das primeiras pessoas a usar o EmagreSer.”. Se a rota falhar, a seção de números simplesmente não aparece (nunca exibir zero).

- **RN-15 Resolução do idioma.** O idioma efetivo é o primeiro disponível, segundo os flags, nesta ordem: (1) `user_settings.locale`; (2) a escolha feita antes do login, guardada em `meta.localePref`; (3) o idioma do navegador (`navigator.languages`: prefixo `pt` para pt-BR, `en` para en-US, `es` para es-419); (4) pt-BR. A preferência salva pelo usuário é mantida mesmo que o flag seja desligado: nesse caso o app mostra pt-BR e volta ao idioma escolhido quando o flag for religado. Trocar de idioma aplica a mudança na hora, sem recarregar, atualiza `html lang` e sincroniza o novo `locale`.
- **RN-16 Cálculo e formatação independentes.** Datas, horas e números só são formatados na camada de apresentação, com `Intl`; as regras RN-01 a RN-10 nunca dependem do idioma. Campos numéricos aceitam vírgula ou ponto em qualquer idioma (se houver os dois símbolos, o último é o decimal) e o valor é normalizado antes de validar e gravar. Datas nunca são digitadas em texto livre: usar seletor.

## 10. Telas e navegação

Barra de abas inferior (v-bottom-navigation, do Vuetify) com 5 itens:

1. **Hoje** — cumprimento, selo de streak, peso atual com atalho para registrar, progresso até o próximo marco, checklist de hábitos, contador de água.
2. **Evolução** — gráfico de tendência, indicadores, cartão de IMC (só se ativado), distribuição de humor (D) e atalho para a galeria.
3. **Histórico** — lista de registros de peso.
4. **Metas** — marcos e estados.
5. **Mais** — galeria de fotos, configurações, sobre e privacidade, exportar dados (D).

Telas modais: registrar peso, escolha de humor, celebração de marco, edição de registro, adicionar foto, comparação de fotos. Telas fora das abas: landing page de apresentação (somente desktop), boas-vindas, cadastro, login, recuperação de senha, onboarding, aviso de instalação no iOS e aviso “Nova versão disponível”.

## 11. Requisitos não funcionais

- **Offline primeiro:** o app abre e registra sem rede. Testar em modo avião depois do primeiro login.
- **Desempenho:** abertura a frio em até 2 segundos em aparelhos intermediários; carregar as telas sob demanda e importar só os componentes usados do Vuetify; consultas SQL indexadas por usuário e `change_seq`.
- **Confiabilidade:** escritas em transações, no aparelho e no servidor; migrações versionadas e testadas (no cliente, via `db.version` do Dexie); nenhuma perda de dados ao atualizar o app.
- **Segurança:** conforme a seção 4.4; HTTPS sempre; `npm audit` sem vulnerabilidades altas no CI.
- **Privacidade e LGPD:** dados de saúde são sensíveis. Coletar só o necessário, com consentimento explícito (RF-46), exportação (RF-44) e exclusão (RF-45). Sem telemetria de terceiros; logs sem e-mail, peso ou qualquer dado de saúde.
- **Observabilidade:** logs estruturados (pino), healthcheck em `/api/v1/health` e erros inesperados registrados com um id de requisição.
- **Acessibilidade:** conforme a seção 6; suporte a fontes grandes do sistema sem quebrar o layout.
- **Qualidade de código:** TypeScript estrito, ESLint e Prettier sem avisos no final; o CI roda lint, testes e build.

## 12. Estrutura sugerida do projeto

```
emagreser/
  apps/
    web/                 # PWA Vue 3 + Vuetify
      src/
        pages/           # telas (Vue Router)
        features/        # peso, grafico, metas, habitos, agua, humor, fotos, lembretes, conta
        data/            # Dexie, repositórios locais, outbox, motor de sincronização
        plugins/         # vuetify.ts, pinia, router
        i18n/            # vue-i18n, formatadores e locales/ (pt-BR.json, en-US.json, es-419.json)
        flags/           # feature flags: cache local e verificação
        sw.ts            # service worker (injectManifest): precache, push, notificationclick
    api/                 # Fastify + TypeScript
      src/
        routes/          # auth, me, sync, push, health
        db/              # conexão e migrações SQL
        jobs/            # BullMQ: lembretes por Web Push
        i18n/            # textos do servidor (push e e-mails) por idioma
        flags/           # avaliação de feature flags e script flags:set
        plugins/         # helmet, limites de requisição, autenticação, redis
  packages/
    domain/              # regras puras: média móvel, marcos, streak, mensagens
  docs/DECISOES.md
  docker-compose.yml     # app, postgres e redis (desenvolvimento e base do VPS)
  Dockerfile
  .env.example
  README.md
```

## 13. Plano de execução por fases

**Fase 0 — Base.** Criar o monorepo (npm workspaces) com `apps/web`, `apps/api` e `packages/domain`; TypeScript estrito, lint, CI, tema do Vuetify, vue-i18n com os três catálogos e a verificação i18n:check (seção 4.7), navegação por abas, manifest PWA básico e `docker-compose.yml`. *Pronto quando:* `docker compose up` sobe app, PostgreSQL e Redis; o app abre com as 5 abas vazias e a API responde em `/api/v1/health`.

**Fase 1 — Domínio puro.** Implementar em `packages/domain` as regras RN-01 a RN-06, RN-09, RN-10 e RN-11 (esta como função pura de classificação de dispositivo), com testes unitários. *Pronto quando:* os testes cobrem média móvel, geração de marcos, progresso, subida de peso, streak e IMC (todas as faixas e os limites entre elas), incluindo casos de borda.

**Fase 2 — Backend.** Migrações do PostgreSQL, autenticação (RF-46 a RF-49), `POST /sync/push` e `GET /sync/pull`, limites de requisição no Redis, exportação e exclusão de conta (parte do servidor de RF-44 e RF-45) e feature flags (RF-83). *Pronto quando:* os testes de integração, com PostgreSQL e Redis reais, passam, incluindo idempotência, conflito por última escrita e rotação do refresh token.

**Fase 3 — Dados locais e sincronização.** Dexie, fila de saída e motor de sincronização (RF-52 a RF-55). *Pronto quando:* o teste Playwright offline-para-online da seção 4.5 passa.

**Fase 4 — Conta, onboarding, registro e histórico.** Telas de cadastro, login e recuperação (RF-46 a RF-50), onboarding (RF-01 a RF-03, com a tela opcional do IMC, RF-56 e RF-57), registro de peso (RF-04 a RF-07) e histórico (RF-17 a RF-19). *Pronto quando:* é possível criar conta, concluir o onboarding, registrar, editar e apagar pesos, com tudo persistindo e sincronizando, e reabrir o app em modo avião leva direto à tela Hoje.

**Fase 5 — Gráfico e metas.** RF-08 a RF-16. *Pronto quando:* o gráfico exibe a média móvel correta e os marcos são celebrados uma única vez.

**Fase 6 — Hábitos, água e streak.** RF-20 a RF-26. *Pronto quando:* o estado diário persiste, sincroniza e o streak se comporta conforme os testes.

**Fase 7 — Humor e acolhimento.** RF-27 a RF-31. *Pronto quando:* a mensagem de acolhimento aparece nos casos de RN-05 e nunca repete a anterior.

**Fase 8 — Lembretes por Web Push.** RF-37 a RF-41: inscrição no cliente, handlers de `push` e `notificationclick` no service worker e worker do BullMQ no servidor, com textos por idioma (RF-78). *Pronto quando:* o aceite da seção 8.11 passa no Chrome para Android e no iOS com o app instalado.

**Fase 9 — Galeria de fotos.** RF-32 a RF-36. *Pronto quando:* é possível adicionar, comparar e apagar fotos, sem nenhuma requisição de rede envolvendo as imagens.

**Fase 10 — Configurações e privacidade.** RF-42 a RF-45, RF-58 a RF-64 (IMC opcional) e RF-74 (seletor de idioma), incluindo a tela de privacidade, a exportação e a exclusão de conta. *Pronto quando:* exportar entrega todos os dados do usuário e excluir a conta apaga tudo, no servidor e no aparelho.

**Fase 11 — Deploy e polimento.** `Dockerfile` de produção, deploy na Railway com migrações automáticas e backup do PostgreSQL, roteiro do VPS da Hostinger no `README.md`, detecção de dispositivo, fluxos móvel e desktop e banner de instalação (RN-11 a RN-13), landing page de desktop e rota pública de estatísticas (seção 8.16), revisão de acessibilidade, estados vazios, ícones, splash e Lighthouse. *Pronto quando:* todos os critérios da seção 14 estiverem atendidos e o app estiver publicado com HTTPS e instalável.

**Fase 12 — Revisão de idiomas e liberação por flags.** Completar e revisar os catálogos en-US e es-419, validar todos os pontos de formatação do RF-75, testes de plural (RF-77) e de layout em 360 px nos três idiomas, script de gestão dos flags e roteiro de liberação da seção 4.7. *Pronto quando:* o aceite da seção 8.17 passa e o app está em produção com os flags `i18n_en` e `i18n_es` em `off`, prontos para a fase de `testers`.

## 14. Definição de pronto (checklist final)

- [ ] Todos os requisitos marcados como M foram implementados e atendem aos critérios de aceite.
- [ ] Os testes unitários do domínio (RN-01 a RN-06 e RN-09 a RN-11), os testes de integração da API e o teste Playwright offline-para-online passam.
- [ ] Depois do primeiro login, o app abre e registra dados em modo avião; ao reconectar, sincroniza sem duplicar.
- [ ] Nenhuma requisição a domínios de terceiros em tempo de execução (verificado na aba de rede) e nenhuma dependência de analytics, anúncios ou serviços pagos.
- [ ] Segurança: senhas com argon2id, refresh token com rotação, limite de tentativas no login, helmet com CSP, SQL parametrizado e `npm audit` sem vulnerabilidades altas.
- [ ] Nenhum texto usa linguagem de culpa; aumentos de peso nunca aparecem em vermelho.
- [ ] Fotos ficam só no aparelho; exportar (RF-44) e excluir conta (RF-45) funcionam e apagam tudo.
- [ ] O lembrete por Web Push chega com o app fechado (Chrome para Android e iOS com o app instalado), com o JSON no formato Declarative Web Push.
- [ ] A PWA é instalável, mostra o aviso “Nova versão disponível” quando há atualização, abre em qualquer rota sem internet e nunca serve `/api/` pelo fallback de navegação.
- [ ] Contraste, alvos de toque e rótulos de acessibilidade verificados nas telas principais.
- [ ] Deploy na Railway com HTTPS, migrações automáticas, healthcheck e backup do PostgreSQL; roteiro do VPS da Hostinger no README.
- [ ] `README.md` (instalar, rodar, testar, fazer deploy) e `docs/DECISOES.md` completos.

- [ ] O IMC fica oculto por padrão em todo o app; sem altura nada é calculado; a tela do onboarding pode ser pulada sem gravar dados; o cartão sempre mostra a nota de que as faixas valem para adultos; o aviso de peso-alvo funciona mesmo com o IMC oculto.

- [ ] Em desktop o app não é acessível e a landing mostra alerta com QR Code, funcionalidades, dados de uso e usuários ativos; em celular e tablet a landing não é exibida; o bypass `VITE_ALLOW_DESKTOP` está desligado no build de produção.
- [ ] A rota `GET /public/stats` devolve apenas totais anônimos, com cache e limite de requisições, e nunca números inventados.

- [ ] Os três catálogos (pt-BR, en-US e es-419) estão completos, `i18n:check` passa no CI e não há texto fixo em componentes.
- [ ] Com os flags em `off` em produção, o app funciona só em pt-BR; `testers` e `percent` liberam en-US e es-419 por usuário; `VITE_FORCE_LOCALES` está desligado no build de produção.
- [ ] Datas, horas e números seguem o locale em todas as telas, na landing, nos pushes, nos e-mails e na exportação; os campos numéricos aceitam vírgula e ponto.
- [ ] Os textos sensíveis (acolhimento, aviso de peso-alvo, nota do IMC, consentimento e privacidade) foram revisados por falante nativo antes de liberar cada idioma.

## 15. Entrega esperada do agente

1. Repositório com o código completo, organizado conforme a seção 12, com `docker-compose.yml`, `Dockerfile` e `.env.example`.
2. Testes executáveis com um único comando (`npm test`) e instruções para rodar o teste offline com Playwright.
3. Resumo final com: o que foi implementado por fase, itens desejáveis (D) não feitos, decisões tomadas e problemas conhecidos.
