-- up migration
CREATE EXTENSION IF NOT EXISTS citext;
CREATE SEQUENCE IF NOT EXISTS change_seq;

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name  text,
  consent_at    timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz
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
CREATE INDEX refresh_tokens_user_family ON refresh_tokens (user_id, family_id);

CREATE TABLE password_reset_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
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

CREATE TABLE user_settings (
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
  height_cm          smallint CHECK (height_cm BETWEEN 100 AND 250),
  bmi_visible        boolean NOT NULL DEFAULT false,
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
  label             text,
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
  tester_emails   text[] NOT NULL DEFAULT '{}',
  updated_at      timestamptz NOT NULL DEFAULT now()
);
INSERT INTO feature_flags (key) VALUES ('i18n_en'), ('i18n_es');

-- down migration
DROP TABLE IF EXISTS feature_flags;
DROP TABLE IF EXISTS water_logs;
DROP TABLE IF EXISTS habit_logs;
DROP TABLE IF EXISTS habits;
DROP TABLE IF EXISTS milestones;
DROP TABLE IF EXISTS weight_entries;
DROP TABLE IF EXISTS user_settings;
DROP TABLE IF EXISTS push_subscriptions;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;
DROP SEQUENCE IF EXISTS change_seq;
