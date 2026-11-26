import { query } from '../db/pool.js'
import { messagesFor } from '../i18n/index.js'
import type { CsvHeaders } from '../i18n/types.js'
import type { ServerLocale } from './locale.js'

type Row = Record<string, unknown>

interface TableSpec {
  key: 'weightEntries' | 'habits' | 'habitLogs' | 'waterLogs' | 'milestones'
  table: string
  numericColumns: readonly string[]
  dateColumns: readonly string[]
}

const tableSpecs: TableSpec[] = [
  {
    key: 'weightEntries',
    table: 'weight_entries',
    numericColumns: ['weight_kg'],
    dateColumns: ['date'],
  },
  { key: 'habits', table: 'habits', numericColumns: [], dateColumns: [] },
  { key: 'habitLogs', table: 'habit_logs', numericColumns: [], dateColumns: ['date'] },
  { key: 'waterLogs', table: 'water_logs', numericColumns: [], dateColumns: ['date'] },
  {
    key: 'milestones',
    table: 'milestones',
    numericColumns: ['milestone_kg'],
    dateColumns: ['achieved_date'],
  },
]

export interface UserExport {
  generatedAt: string
  locale: ServerLocale
  user: {
    id: string
    email: string
    displayName: string | null
    createdAt: string
    consentAt: string
    lastSeenAt: string | null
  }
  settings: Row
  weightEntries: Row[]
  habits: Row[]
  habitLogs: Row[]
  waterLogs: Row[]
  milestones: Row[]
}

function serializeRow(
  row: Row,
  numericColumns: readonly string[],
  dateColumns: readonly string[],
): Row {
  const result: Row = {}
  for (const [key, value] of Object.entries(row)) {
    if (key === 'user_id' || key === 'change_seq') continue
    if (value === null || value === undefined) {
      result[key] = null
    } else if (dateColumns.includes(key) && value instanceof Date) {
      result[key] = value.toISOString().slice(0, 10)
    } else if (value instanceof Date) {
      result[key] = value.toISOString()
    } else if (numericColumns.includes(key)) {
      result[key] = Number(value)
    } else {
      result[key] = value
    }
  }
  return result
}

/** Exporta somente as linhas do usuário, em valores neutros (ISO e número com ponto). */
export async function buildUserExport(userId: string, locale: ServerLocale): Promise<UserExport> {
  const profile = await query<Row>(
    `SELECT id, email, display_name, consent_at, created_at, last_seen_at FROM users WHERE id = $1`,
    [userId],
  )
  const userRow = profile.rows[0]
  if (userRow === undefined) throw new Error('USUARIO_INEXISTENTE')

  const settings = await query<Row>(`SELECT * FROM user_settings WHERE user_id = $1`, [userId])
  const result: UserExport = {
    generatedAt: new Date().toISOString(),
    locale,
    user: {
      id: String(userRow.id),
      email: String(userRow.email),
      displayName: (userRow.display_name as string | null) ?? null,
      createdAt: (userRow.created_at as Date).toISOString(),
      consentAt: (userRow.consent_at as Date).toISOString(),
      lastSeenAt: userRow.last_seen_at instanceof Date ? userRow.last_seen_at.toISOString() : null,
    },
    settings: serializeRow(settings.rows[0] ?? {}, [], ['start_date']),
    weightEntries: [],
    habits: [],
    habitLogs: [],
    waterLogs: [],
    milestones: [],
  }

  for (const spec of tableSpecs) {
    const { rows } = await query<Row>(
      `SELECT * FROM ${spec.table} WHERE user_id = $1 ORDER BY change_seq`,
      [userId],
    )
    result[spec.key] = rows.map((row) => serializeRow(row, spec.numericColumns, spec.dateColumns))
  }
  return result
}

type CsvKey = keyof CsvHeaders
type CsvRow = Partial<Record<CsvKey, unknown>>

const csvColumns: readonly CsvKey[] = [
  'entity',
  'id',
  'date',
  'weightKg',
  'milestoneKg',
  'glasses',
  'mood',
  'note',
  'habitKey',
  'habitLabel',
  'active',
  'done',
  'habitId',
  'achievedDate',
  'settings',
  'clientUpdatedAt',
  'deletedAt',
]

function plain(row: Row): Row {
  const result: Row = {}
  for (const [key, value] of Object.entries(row)) {
    if (key !== 'user_id' && key !== 'change_seq') result[key] = value
  }
  return result
}

function rowsForCsv(data: UserExport): CsvRow[] {
  const rows: CsvRow[] = [
    {
      entity: 'settings',
      id: data.user.id,
      date: data.settings.start_date,
      settings: JSON.stringify(plain(data.settings)),
      clientUpdatedAt: data.settings.client_updated_at,
    },
  ]
  for (const entry of data.weightEntries) {
    rows.push({
      entity: 'weight_entries',
      id: entry.id,
      date: entry.date,
      weightKg: entry.weight_kg,
      mood: entry.mood,
      note: entry.note,
      clientUpdatedAt: entry.client_updated_at,
      deletedAt: entry.deleted_at,
    })
  }
  for (const habit of data.habits) {
    rows.push({
      entity: 'habits',
      id: habit.id,
      habitKey: habit.key,
      habitLabel: habit.label,
      active: habit.active,
      clientUpdatedAt: habit.client_updated_at,
      deletedAt: habit.deleted_at,
    })
  }
  for (const log of data.habitLogs) {
    rows.push({
      entity: 'habit_logs',
      id: log.id,
      date: log.date,
      habitId: log.habit_id,
      done: log.done,
      clientUpdatedAt: log.client_updated_at,
      deletedAt: log.deleted_at,
    })
  }
  for (const log of data.waterLogs) {
    rows.push({
      entity: 'water_logs',
      id: log.id,
      date: log.date,
      glasses: log.glasses,
      clientUpdatedAt: log.client_updated_at,
      deletedAt: log.deleted_at,
    })
  }
  for (const milestone of data.milestones) {
    rows.push({
      entity: 'milestones',
      id: milestone.id,
      milestoneKg: milestone.milestone_kg,
      achievedDate: milestone.achieved_date,
      clientUpdatedAt: milestone.client_updated_at,
      deletedAt: milestone.deleted_at,
    })
  }
  return rows
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Cabeçalhos no idioma efetivo; datas ISO e números com ponto decimal. */
export function exportToCsv(data: UserExport): string {
  const headers = messagesFor(data.locale).csvHeaders
  const lines = [csvColumns.map((key) => csvCell(headers[key])).join(',')]
  for (const row of rowsForCsv(data)) {
    lines.push(csvColumns.map((key) => csvCell(row[key])).join(','))
  }
  return `${lines.join('\r\n')}\r\n`
}
