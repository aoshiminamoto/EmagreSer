# EmagreSer

PWA de controle de peso, pensada para celular e offline primeiro. A interface lê e grava no IndexedDB; uma API Fastify com PostgreSQL e Redis sincroniza os dados. Em desktop, a pessoa vê apenas uma landing page de apresentação.

## Requisitos

- Node.js 22 ou superior e npm.
- Docker com Compose v2.24+ (para development e para o VPS).
- A especificação completa está em `docs/ESPECIFICACAO.md`; as decisões em `docs/DECISOES.md`.

## Desenvolvimento local

```bash
cp .env.example .env          # preencha os segredos locais
docker compose up --build     # API :3000, web :5173, Postgres :55432, Redis :6379
```

O compose usa o alvo `development` do `Dockerfile` e monta o código. Para rodar sem Docker: suba Postgres e Redis, configure `.env` e execute `npm install && npm run dev`. As migrações são aplicadas com `npm run migrate`.

Sem Docker, o `DATABASE_URL` local aponta para a porta `55432` (evita conflito com PostgreSQL nativo no Windows). No CI e em produção, use a porta real do serviço.

## Variáveis de ambiente

Copie `.env.example`; nunca comite valores reais. Principais variáveis:

| Variável | Uso |
|---|---|
| `DATABASE_URL`, `REDIS_URL` | Banco e cache/fila |
| `JWT_SECRET`, `COOKIE_SECRET` | Assinatura do token e do cookie |
| `APP_ORIGIN` | URL pública (links, CORS se houver) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push (`mailto:`) |
| `SMTP_URL`, `SMTP_FROM` | E-mail de recuperação de senha |
| `PORT`, `NODE_ENV`, `COOKIE_SECURE` | Servidor e cookie (`Secure` em produção) |
| `PUBLIC_STATS_MIN_USERS` | Mínimo de contas para mostrar números na landing (padrão 50) |
| `VITE_ALLOW_DESKTOP`, `VITE_FORCE_LOCALES` | Apenas build de desenvolvimento; **desligadas em produção** |
| `DOMAIN` | Domínio do Caddy no VPS |

`npm run check:prod-env` falha se as duas flags de desenvolvimento estiverem ligadas.

## Qualidade

```bash
npm run lint && npm test && npm run i18n:check && npm run build
npm audit --audit-level=high     # também roda no CI
npm run test:e2e                 # exige API, Postgres e Redis reais
```

Os ícones (192, 512, maskable, `apple-touch-icon` e splash) são gerados sem dependências externas com `npm run icons --workspace @emagreser/web`.

## Idiomas e feature flags

`pt-BR` é sempre disponível. `en-US` e `es-419` estão completos no código, mas são rascunho até revisão humana (textos sensíveis em `docs/REVISAO_TRADUCOES.md`). Cada idioma tem um flag na tabela `feature_flags`: `i18n_en` e `i18n_es`.

O script `flags:set` altera o estado sem painel e invalida o cache do Redis:

```bash
npm run flags:set -- i18n_en off
npm run flags:set -- i18n_en testers --emails a@exemplo.com,b@exemplo.com
npm run flags:set -- i18n_en percent 20
npm run flags:set -- i18n_en on
# substitua i18n_en por i18n_es para o espanhol
```

Estados: `off` (ninguém), `testers` (só os e-mails listados), `percent` (testadores mais a porcentagem de usuários, por hash estável do id) e `on` (todos). Sem login autenticado, só `on` vale; a rota `GET /api/v1/flags` nunca expõe testadores nem percentual. O cliente consulta ao abrir, após login, ao voltar ao primeiro plano e a cada 15 min, e guarda o último resultado no IndexedDB: sem rede ele usa o cache e, sem cache, mostra só `pt-BR`. Desligar um flag volta o app a `pt-BR` sem apagar a preferência salva.

Roteiro de liberação: (1) produção com os dois flags em `off`; (2) `testers` com a equipe, revisando em aparelhos reais; (3) `percent` em 10% e depois 50%; (4) `on`; (5) remover os flags do código após 30 dias estáveis. `VITE_FORCE_LOCALES=pt-BR,en-US,es-419` ignora os flags apenas em desenvolvimento/teste; `npm run check:prod-env` falha se essa variável (ou `VITE_ALLOW_DESKTOP`) estiver ligada no build de produção.

## Deploy na Railway (principal)

1. Crie um projeto com três serviços: `app`, `PostgreSQL` e `Redis`.
2. No serviço `app`, use o `Dockerfile` da raiz como build. O processo escuta em `PORT` e o entrypoint aplica as migrações compiladas antes de iniciar o servidor (`node apps/api/dist/db/migrate-cli.js && node apps/api/dist/server.js`); o healthcheck usa `/api/v1/health`.
3. Ligação dos serviços por variáveis de referência, sem copiar credenciais:
   - `DATABASE_URL=${{Postgres.DATABASE_URL}}`
   - `REDIS_URL=${{Redis.REDIS_URL}}`
   - Demais variáveis da tabela acima, com `NODE_ENV=production`, `COOKIE_SECURE=true`, `APP_ORIGIN=https://<seu-domínio>` e `PUBLIC_STATS_MIN_USERS=50`. Gere as chaves VAPID com `npm run vapid:keys`.
4. HTTPS e o domínio `*.up.railway.app` são automáticos; adicione um domínio próprio em *Settings → Domains* se quiser. Não configure domínio de terceiros no código: tudo vem de `APP_ORIGIN`.
5. O worker de lembretes roda no mesmo processo da API no MVP.
6. Backups: ative os backups automáticos do PostgreSQL no plano. Se o plano não oferecer, agende `pg_dump` (instruções abaixo, trocando `docker compose exec postgres` por `railway run --service Postgres`).
7. Publique com `VITE_ALLOW_DESKTOP=false` e `VITE_FORCE_LOCALES=false`; en-US e es-419 seguem como rascunho até revisão humana.

## VPS na Hostinger (alternativa)

Hospedagem compartilhada normalmente não tem PostgreSQL/Redis nem processos Node persistentes. Nesse caso ela serve só para `apps/web/dist`, com a API em outro lugar. Para rodar tudo, use um VPS:

1. Instale Docker, Compose v2.24+ e o CLI do Caddy não é necessário (ele roda em container).
2. Abra no firewall apenas 80, 443 e SSH (`ufw allow 80,443/tcp && ufw allow OpenSSH && ufw enable`).
3. Preencha `.env` com segredos próprios, `APP_ORIGIN=https://<domínio>` e `DOMAIN=<domínio>`.
4. O `Caddyfile` da raiz faz HTTPS automático e repassa para `app:3000`, sem cache em `sw.js`, `index.html` e `manifest.webmanifest`.
5. Suba tudo:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
   docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
   curl -fsS https://<domínio>/api/v1/health
   ```

6. O build de produção roda as migrações antes do servidor; `app` não publica portas diretamente — só o Caddy expõe 80/443. Volumes nomeados guardam `pgdata`, `redisdata`, `caddy_data` e `caddy_config`.

## Backup e restauração do PostgreSQL

```bash
# Backup (no VPS; na Railway troque o prefixo por: railway run --service Postgres ...)
docker compose exec postgres pg_dump -U emagreser -d emagreser -Fc > emagreser-$(date +%F).dump

# Restauração em banco existente
docker compose exec -T postgres pg_restore --clean --if-exists --no-owner \
  -U emagreser -d emagreser < emagreser-AAAA-MM-DD.dump
```

Guarde os dumps fora do servidor e teste a restauração periodicamente. O volume `pgdata` também pode ser copiado, mas o `pg_dump` é portátil entre versões e provedores.

## Atualização e verificação do app

O service worker usa `registerType: 'prompt'`. O app verifica novas versões ao abrir, ao voltar ao primeiro plano e a cada hora; com uma versão pronta, mostra “Nova versão disponível” e só recarrega quando a pessoa toca em Atualizar. Nunca recarrega sozinho.

Para validar: sirva o build, abra no celular em modo avião, confirme que o app abre e registra peso, reconecte e confirme a sincronização. Use Lighthouse (Chromium, modo mobile) para conferir PWA instalável, offline, contraste, alvos de toque e rótulos.

## Insumos do dono

Conta na Railway ou VPS, domínio e `SMTP_URL` de produção para publicar de fato, além da revisão humana dos catálogos en-US e es-419.
