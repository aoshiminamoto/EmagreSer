# Fase 8: Lembretes por Web Push

Sessão 12 de 17 · Tamanho: Grande · Depende de: Fases 2B e 3B

## Antes de começar

1. Leia `AGENTS.md`, `docs/DECISOES.md` e `docs/PROGRESSO.md`.
2. Não leia a especificação inteira. Use só os trechos abaixo; se precisar de outro, busque pelo ID com `grep -n` em `docs/ESPECIFICACAO.md` e leia ao redor.
3. Se `docs/PROGRESSO.md` indicar um ponto de retomada para esta fase, comece dele.

## Objetivo

Implementar os lembretes diários por Web Push, no servidor e no cliente.

## Escopo desta sessão

- Servidor: job repetível por usuário no BullMQ (recriado quando as configurações mudam), fuso do usuário, verificação de peso já registrado no dia, envio com `web-push` no formato Declarative Web Push, TTL de 6 horas, remoção de inscrições 404 e 410.
- Textos do lembrete por idioma em `apps/api/src/i18n`, com `lang` correto no payload e sem dados de saúde.
- Rotas `GET /push/public-key`, `POST /push/subscribe` e `DELETE /push/subscribe`; script para gerar as chaves VAPID.
- Cliente: inscrição com `window.pushManager` quando existir e `registration.pushManager` nos demais, sempre com `userVisibleOnly: true`; permissão pedida só após um gesto do usuário.
- Service worker: handlers de `push` (sempre chama `showNotification`) e `notificationclick` (abre a rota de registro).
- Fluxo reutilizável de “ativar lembrete” (permissão, inscrição, mensagem se negada) e aviso de instalação no iOS.

## Fora desta sessão

- Tela completa de configurações do lembrete (Fase 10), que reutilizará o fluxo criado aqui.

## Trechos da especificação

Copiados de `docs/ESPECIFICACAO.md`. Em caso de divergência, vale o documento original.

**8.11 Lembretes por Web Push (M)**

- **RF-37** Lembrete diário por Web Push, no horário e nos dias da semana escolhidos, no fuso guardado em `timezone`. O servidor agenda com BullMQ (um job repetível por usuário, recriado quando as configurações mudam) e envia com a biblioteca `web-push`. Notificações locais agendadas do navegador não são confiáveis em PWA, por isso o envio parte do servidor.
- **RF-38** O app cadastra a inscrição em `POST /push/subscribe`: com `window.pushManager` quando existir (Safari 18.4 ou superior, sem depender do service worker) e com `registration.pushManager` nos demais navegadores, sempre com a chave VAPID pública e `userVisibleOnly: true`. A inscrição é removida ao desativar o lembrete ou sair da conta. O servidor apaga inscrições que respondem 404 ou 410.
- **RF-39** Antes de enviar, o servidor confere se já existe peso registrado na data local do usuário e, se existir, não envia. As mensagens têm TTL de 6 horas, para não chegarem muito atrasadas.
- **RF-40** O servidor envia sempre o JSON do padrão Declarative Web Push: `{"web_push": 8030, "notification": {"title": "...", "body": "...", "lang": "``{locale}``", "dir": "ltr", "navigate": "<APP_ORIGIN>/registrar", "silent": false}}`, com `navigate` em URL absoluta HTTPS. O Safari 18.4 ou superior exibe a notificação sem JavaScript e continua recebendo mesmo que o iOS apague o service worker por inatividade. Chrome e Firefox tratam a mesma mensagem no handler `push` do service worker, que chama `showNotification` e abre `navigate` no `notificationclick`. Textos amigáveis e variados, nunca de cobrança e sem dados de saúde (o peso nunca aparece). Exemplo: “Bom dia! Que tal um registro rápido para acompanhar sua jornada?”.
- **RF-41** Pedir a permissão de notificação só depois de um gesto do usuário (ao ativar o lembrete). No iOS, exigir o app instalado (seção 4.6). Se a permissão for negada ou indisponível, explicar o motivo em Configurações, com orientação para ativar.
- **Aceite:** com o app fechado e o aparelho online, a notificação chega no horário configurado; se o aparelho estava offline, chega ao reconectar dentro do TTL. Desativar o lembrete cancela o job e remove a inscrição.

**4.6 Requisitos específicos de PWA**

- Manifest: `name` EmagreSer, `short_name`, `display: standalone`, `lang: pt-BR`, `start_url: /`, `theme_color` #22C55E (token primary), `background_color` `#F8FAFC`, ícones de 192 e 512 px e um ícone maskable de 512 px.
- Service worker com `strategies: 'injectManifest'` no `vite-plugin-pwa`, em `apps/web/src/sw.ts`, porque o app precisa de código próprio para os eventos `push` e `notificationclick`. O arquivo contém apenas: `precacheAndRoute(self.__WB_MANIFEST)`, `cleanupOutdatedCaches()`, uma `NavigationRoute` para `index.html` com `denylist: [/^\/api\//]`, `clientsClaim()`, o handler da mensagem `SKIP_WAITING` (sem `skipWaiting()` automático) e os handlers de push. Sem `runtimeCaching` para a API e sem `BackgroundSyncPlugin`: a sincronização é a da seção 4.5.
- Versões: fixe `vite-plugin-pwa` 2.x e `workbox-build` e `workbox-window` 7.4.x no `package.json`, e só atualize com os testes de PWA passando.
- Push: o formato das mensagens é o Declarative Web Push (seção 8.11). O handler `push` continua obrigatório para Chrome e Firefox e sempre deve chamar `showNotification`; se não mostrar nada, o navegador pode revogar a inscrição.
- Chame `navigator.storage.persist()` depois do onboarding, para reduzir o risco de o navegador apagar o IndexedDB (onde ficam as fotos).
- No iOS, o Web Push só funciona com o app instalado pela Tela de Início (iOS 16.4 ou superior). Mostre um aviso dispensável com o passo a passo (Compartilhar, depois Adicionar à Tela de Início).
- Teste o service worker sempre no build de produção (`vite build` e `vite preview`). Lighthouse: app instalável e funcionando offline após o primeiro carregamento.

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

**Servidor por idioma**

- **RF-78 Servidor.** Textos de push e e-mails ficam em `apps/api/src/i18n`, escolhidos pelo `locale` do usuário e pelo mesmo flag (RN-15), com fallback para pt-BR. O campo `lang` do payload de push e o cabeçalho `Content-Language` do e-mail refletem o idioma usado. A API devolve apenas códigos de erro.

**Regras**

- **RN-08 Dia civil.** Todas as viradas de dia usam o fuso local do aparelho; ao abrir o app, recalcular “hoje” e atualizar a interface.

## Pronto quando

- Testes de integração do job: horário e dias corretos por fuso, não envia se o peso do dia já foi registrado, remove inscrição expirada, desativar cancela o job.
- Teste de unidade do formato do payload (JSON do Declarative Web Push) nos três idiomas.
- Teste manual em aparelho real (Chrome para Android e iOS com o app instalado): a notificação chega com o app fechado. Registre o resultado no relatório.
- Nenhum dado de saúde no texto da notificação.

## Insumos que dependem do dono do projeto

- Você precisa guardar o par de chaves VAPID que o script gerar e configurá-lo nas variáveis de ambiente.
- Um celular Android e um iPhone (iOS 16.4 ou superior) para o teste manual.

## Ao terminar (obrigatório)

1. Rode `npm run lint`, `npm test` e `npm run build`; todos devem passar. Corrija o que falhar antes de seguir.
2. Revise o diff: nada fora do escopo, nenhuma dependência desnecessária, nenhum segredo, nenhum texto fixo em componente.
3. Atualize `docs/PROGRESSO.md` (marque a sessão) e `docs/DECISOES.md` (decisões novas).
4. Escreva `docs/relatorios/12-fase-08-lembretes-push.md` pelo modelo `docs/MODELO_RELATORIO.md` (máximo de 40 linhas).
5. Faça o commit: `fase 8: <resumo curto>`.
6. Pare. Não comece a próxima sessão (prompts/13-fase-09-galeria.md). Responda no chat só com o resumo de 5 linhas do relatório.
