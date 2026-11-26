# Fase 2A: Backend: banco e autenticação

Sessão 3 de 17 · Tamanho: Grande · Depende de: Fases 0 e 1

## Antes de começar

1. Leia `AGENTS.md`, `docs/DECISOES.md` e `docs/PROGRESSO.md`.
2. Não leia a especificação inteira. Use só os trechos abaixo; se precisar de outro, busque pelo ID com `grep -n` em `docs/ESPECIFICACAO.md` e leia ao redor.
3. Se `docs/PROGRESSO.md` indicar um ponto de retomada para esta fase, comece dele.

## Objetivo

Criar o esquema do PostgreSQL e toda a autenticação da API.

## Escopo desta sessão

- Ferramenta de migrações (por exemplo `node-pg-migrate`) e migração 1 com todas as tabelas da seção 7, inclusive `feature_flags` com os dois registros iniciais em `off`.
- Rotas `/auth/register` (consentimento obrigatório), `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `GET /me` e `PATCH /me`.
- Senhas com argon2id; token de acesso JWT de 15 min; refresh token opaco com rotação, hash no banco e detecção de reuso (encerra a família de sessões).
- Redis: limite de tentativas de login, limite geral por IP e cache curto da validação de sessão (falha do Redis não derruba a API).
- E-mails de recuperação de senha com nodemailer e `SMTP_URL`, com textos em `apps/api/src/i18n` nos três idiomas (en-US e es-419 como rascunho).
- `last_seen_at` atualizado em `/auth/refresh`, no máximo uma vez por dia.
- Testes de integração com PostgreSQL e Redis reais (docker compose) e um servidor SMTP de teste.

## Fora desta sessão

- Sincronização, flags, exportação, exclusão de conta, push, rota de estatísticas públicas.

## Trechos da especificação

Copiados de `docs/ESPECIFICACAO.md`. Em caso de divergência, vale o documento original.

**4.4 API e autenticação**

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

**7. Modelo de dados (PostgreSQL e IndexedDB)**

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

**Conta e autenticação**

- **RF-46** Cadastro com e-mail, senha (mínimo de 8 caracteres) e uma caixa de consentimento obrigatória, desmarcada por padrão, que explica o tratamento de dados de saúde (peso, hábitos, humor e, se o usuário optar, altura para o IMC) para o funcionamento do app, com link para a tela de privacidade. Guardar a data em `consent_at`.
- **RF-47** Login com e-mail e senha. Erros genéricos (“E-mail ou senha incorretos”), sem revelar se o e-mail existe, e com limite de tentativas (seção 4.4).
- **RF-48** Sessão persistente: o usuário continua conectado por até 30 dias de inatividade (validade do refresh token, renovada a cada uso).
- **RF-49** Recuperação de senha por e-mail, com link de uso único válido por 30 minutos e resposta idêntica exista ou não o e-mail. Trocar a senha encerra todas as sessões.

**Textos do servidor**

- **RF-78 Servidor.** Textos de push e e-mails ficam em `apps/api/src/i18n`, escolhidos pelo `locale` do usuário e pelo mesmo flag (RN-15), com fallback para pt-BR. O campo `lang` do payload de push e o cabeçalho `Content-Language` do e-mail refletem o idioma usado. A API devolve apenas códigos de erro.

## Pronto quando

- A migração roda do zero em banco vazio e é reaplicável sem erro.
- Testes passam para: cadastro com e sem consentimento, e-mail repetido, login correto e incorreto (mensagem genérica), bloqueio por excesso de tentativas, refresh com rotação, reuso de refresh revogado, logout, recuperação e troca de senha (que encerra as sessões), `GET` e `PATCH /me`.
- Nenhum dado de saúde nem e-mail aparece nos logs; erros seguem o formato padronizado com códigos.
- Com o Redis parado, a API continua autenticando pelo PostgreSQL.

## Insumos que dependem do dono do projeto

- Nenhum obrigatório (use um SMTP de teste). `SMTP_URL` real só será necessário no deploy.

## Ao terminar (obrigatório)

1. Rode `npm run lint`, `npm test` e `npm run build`; todos devem passar. Corrija o que falhar antes de seguir.
2. Revise o diff: nada fora do escopo, nenhuma dependência desnecessária, nenhum segredo, nenhum texto fixo em componente.
3. Atualize `docs/PROGRESSO.md` (marque a sessão) e `docs/DECISOES.md` (decisões novas).
4. Escreva `docs/relatorios/03-fase-02a-backend-auth.md` pelo modelo `docs/MODELO_RELATORIO.md` (máximo de 40 linhas).
5. Faça o commit: `fase 2A: <resumo curto>`.
6. Pare. Não comece a próxima sessão (prompts/04-fase-02b-backend-sync-flags.md). Responda no chat só com o resumo de 5 linhas do relatório.
