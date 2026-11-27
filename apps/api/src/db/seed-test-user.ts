/**
 * Usuário fixo para validação manual. As credenciais são fixture pública de
 * desenvolvimento (ver `.env.example`), não segredo de produção.
 * Na primeira execução cria a conta já com onboarding concluído e um peso
 * inicial; nas seguintes só redefina a senha, preservando os dados do usuário.
 */
import { randomUUID } from 'node:crypto'
import { pool, withTransaction } from './pool.js'
import { runMigrations } from './migrate.js'
import { hashPassword } from '../services/passwords.js'

const email = (process.env.TEST_USER_EMAIL ?? 'teste@emagreser.local').trim().toLowerCase()
const password = process.env.TEST_USER_PASSWORD ?? 'senha-forte-123'
const displayName = process.env.TEST_USER_NAME ?? 'Usuário de Teste'

if (password.length < 8) throw new Error('TEST_USER_PASSWORD precisa ter ao menos 8 caracteres')

await runMigrations('up')
const passwordHash = await hashPassword(password)

const result = await withTransaction(async (client) => {
  const existing = await client.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [
    email,
  ])
  if (existing.rows.length > 0) {
    const id = existing.rows[0].id
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id])
    return { id, created: false }
  }

  const inserted = await client.query<{ id: string }>(
    `INSERT INTO users (email, password_hash, display_name, consent_at, last_seen_at)
     VALUES ($1, $2, $3, now(), now()) RETURNING id`,
    [email, passwordHash, displayName],
  )
  const id = inserted.rows[0].id
  await client.query(
    `INSERT INTO user_settings
       (user_id, client_updated_at, change_seq, onboarding_done, start_weight_kg,
        target_weight_kg, start_date, milestone_step_kg, reminder_time, timezone,
        reminder_days, reminder_enabled, water_goal_glasses, water_glass_ml, locale)
     VALUES ($1, now(), nextval('change_seq'), true, 80.0, 75.0, CURRENT_DATE, 2, '07:30',
        'America/Sao_Paulo', '{1,2,3,4,5,6,7}', true, 8, 250, 'pt-BR')`,
    [id],
  )
  await client.query(
    `INSERT INTO weight_entries (id, user_id, date, weight_kg, client_updated_at, change_seq)
     VALUES ($1, $2, CURRENT_DATE, 80.0, now(), nextval('change_seq'))`,
    [randomUUID(), id],
  )
  return { id, created: true }
})

console.log(`${result.created ? 'usuário criado' : 'senha atualizada'}: ${email}`)
await pool.end()
