import type { PoolClient } from 'pg'
import { z } from 'zod'
import { isUniqueViolation, query } from '../db/pool.js'
import { httpError } from '../errors.js'

/** Limite do "no máximo 5 minutos no futuro" da seção 4.5. */
const clockSkewMs = 5 * 60 * 1000

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().startsWith(value),
  )

const settingsSchema = z
  .object({
    start_weight_kg: z.number().min(20).max(500).nullable().optional(),
    target_weight_kg: z.number().min(20).max(500).nullable().optional(),
    start_date: dateString.nullable().optional(),
    milestone_step_kg: z.number().min(0.1).max(20).optional(),
    reminder_enabled: z.boolean().optional(),
    reminder_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    reminder_days: z.array(z.number().int().min(1).max(7)).max(7).optional(),
    timezone: z.string().min(1).max(64).optional(),
    water_goal_glasses: z.number().int().min(0).max(100).optional(),
    water_glass_ml: z.number().int().min(1).max(2000).optional(),
    locale: z.enum(['pt-BR', 'en-US', 'es-419']).optional(),
    onboarding_done: z.boolean().optional(),
    height_cm: z.number().int().min(100).max(250).nullable().optional(),
    bmi_visible: z.boolean().optional(),
  })
  .strict()

const weightSchema = z
  .object({
    date: dateString,
    weight_kg: z.number().min(20).max(500),
    mood: z.enum(['feliz', 'ansioso', 'cansado', 'estressado']).nullable().optional(),
    note: z.string().max(2000).nullable().optional(),
  })
  .strict()

const habitSchema = z
  .object({
    key: z.string().min(1).max(80),
    label: z.string().max(120).nullable().optional(),
    active: z.boolean().optional(),
    sort_order: z.number().int().min(-1000).max(1000).optional(),
  })
  .strict()

const habitLogSchema = z
  .object({
    date: dateString,
    habit_id: z.uuid(),
    done: z.boolean().optional(),
  })
  .strict()

const waterLogSchema = z
  .object({
    date: dateString,
    glasses: z.number().int().min(0).max(1000).optional(),
  })
  .strict()

const milestoneSchema = z
  .object({
    milestone_kg: z.number().min(0.1).max(500),
    achieved_date: dateString.nullable().optional(),
  })
  .strict()

export const syncEntities = [
  'settings',
  'weight_entries',
  'habits',
  'habit_logs',
  'water_logs',
  'milestones',
] as const
export type SyncEntity = (typeof syncEntities)[number]

export const changeSchema = z
  .object({
    entity: z.enum(syncEntities),
    id: z.uuid(),
    op: z.enum(['upsert', 'delete']),
    data: z.record(z.string(), z.unknown()).default({}),
    clientUpdatedAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .refine((change) => !(change.entity === 'settings' && change.op === 'delete'), {
    message: 'Configurações não podem ser excluídas',
  })

export const pushBodySchema = z
  .object({
    deviceId: z.string().min(1).max(128),
    changes: z.array(changeSchema).max(200),
  })
  .strict()

export type PushChange = z.infer<typeof changeSchema>

interface EntitySpec {
  table: string
  idColumn: string
  columns: readonly string[]
  numericColumns: readonly string[]
  dateColumns: readonly string[]
  schema: z.ZodType<Record<string, unknown>>
}

const specs: Record<SyncEntity, EntitySpec> = {
  settings: {
    table: 'user_settings',
    idColumn: 'user_id',
    columns: [
      'start_weight_kg',
      'target_weight_kg',
      'start_date',
      'milestone_step_kg',
      'reminder_enabled',
      'reminder_time',
      'reminder_days',
      'timezone',
      'water_goal_glasses',
      'water_glass_ml',
      'locale',
      'onboarding_done',
      'height_cm',
      'bmi_visible',
    ],
    numericColumns: ['start_weight_kg', 'target_weight_kg', 'milestone_step_kg'],
    dateColumns: ['start_date'],
    schema: settingsSchema,
  },
  weight_entries: {
    table: 'weight_entries',
    idColumn: 'id',
    columns: ['date', 'weight_kg', 'mood', 'note'],
    numericColumns: ['weight_kg'],
    dateColumns: ['date'],
    schema: weightSchema,
  },
  habits: {
    table: 'habits',
    idColumn: 'id',
    columns: ['key', 'label', 'active', 'sort_order'],
    numericColumns: [],
    dateColumns: [],
    schema: habitSchema,
  },
  habit_logs: {
    table: 'habit_logs',
    idColumn: 'id',
    columns: ['date', 'habit_id', 'done'],
    numericColumns: [],
    dateColumns: ['date'],
    schema: habitLogSchema,
  },
  water_logs: {
    table: 'water_logs',
    idColumn: 'id',
    columns: ['date', 'glasses'],
    numericColumns: [],
    dateColumns: ['date'],
    schema: waterLogSchema,
  },
  milestones: {
    table: 'milestones',
    idColumn: 'id',
    columns: ['milestone_kg', 'achieved_date'],
    numericColumns: ['milestone_kg'],
    dateColumns: ['achieved_date'],
    schema: milestoneSchema,
  },
}

export type ConflictReason = 'NEWER_EXISTS' | 'DUPLICATE_DATE' | 'DUPLICATE_KEY' | 'FOREIGN_ENTITY'
export interface AppliedChange {
  entity: SyncEntity
  id: string
  changeSeq: number | null
}
export interface ConflictingChange {
  entity: SyncEntity
  id: string
  reason: ConflictReason
}
export interface PushResult {
  applied: AppliedChange[]
  conflicts: ConflictingChange[]
  cursor: number
}

function clampTimestamp(value: string, now: number): Date {
  return new Date(Math.min(Date.parse(value), now + clockSkewMs))
}

interface ExistingRow {
  user_id: string
  client_updated_at: Date
  deleted_at: Date | null
  date?: Date | null
}

function noConflict(change: PushChange, changeSeq: number | null): PushResult {
  return {
    applied: [{ entity: change.entity, id: change.id, changeSeq }],
    conflicts: [],
    cursor: changeSeq ?? 0,
  }
}

function conflict(change: PushChange, reason: ConflictReason): PushResult {
  return {
    applied: [],
    conflicts: [{ entity: change.entity, id: change.id, reason }],
    cursor: 0,
  }
}

/** Aplica uma alteração; idempotente por (entidade, id) e com última escrita vence. */
async function applyChange(
  client: PoolClient,
  userId: string,
  change: PushChange,
  now: number,
): Promise<PushResult> {
  const spec = specs[change.entity]
  const effectiveId = spec.idColumn === 'user_id' ? userId : change.id
  const timestamp = clampTimestamp(change.clientUpdatedAt, now)
  const parsed =
    change.op === 'upsert' ? spec.schema.parse(change.data) : ({} as Record<string, unknown>)
  const columns = Object.keys(parsed)

  const existing = await client.query<ExistingRow>(
    `SELECT user_id, client_updated_at
       ${change.entity === 'settings' ? '' : ', deleted_at'}
       ${change.entity === 'weight_entries' ? ', date' : ''}
       FROM ${spec.table} WHERE ${spec.idColumn} = $1`,
    [effectiveId],
  )
  const row = existing.rows[0]
  if (row !== undefined && row.user_id !== userId) return conflict(change, 'FOREIGN_ENTITY')

  if (change.entity === 'weight_entries' && change.op === 'upsert') {
    const others = await client.query<{ id: string; client_updated_at: Date }>(
      `SELECT id, client_updated_at FROM weight_entries
        WHERE user_id = $1 AND date = $2 AND deleted_at IS NULL AND id <> $3`,
      [userId, parsed.date, effectiveId],
    )
    if (
      others.rows.some(
        (other) => new Date(other.client_updated_at).getTime() >= timestamp.getTime(),
      )
    ) {
      return conflict(change, 'DUPLICATE_DATE')
    }
  }

  const existingTime = row === undefined ? -Infinity : new Date(row.client_updated_at).getTime()
  if (existingTime > timestamp.getTime()) return conflict(change, 'NEWER_EXISTS')
  if (existingTime === timestamp.getTime()) return noConflict(change, null)
  if (change.op === 'delete' && row === undefined) return noConflict(change, null)

  if (change.entity === 'habit_logs' && change.op === 'upsert' && parsed.habit_id !== undefined) {
    const habit = await client.query<{ user_id: string }>(
      `SELECT user_id FROM habits WHERE id = $1 AND deleted_at IS NULL`,
      [parsed.habit_id],
    )
    if (habit.rows[0]?.user_id !== userId) return conflict(change, 'FOREIGN_ENTITY')
  }

  // Uma nova data de peso desativa o registro anterior; o tombstone volta no pull.
  if (change.entity === 'weight_entries' && change.op === 'upsert') {
    await client.query(
      `UPDATE weight_entries SET deleted_at = $2, client_updated_at = $2,
         change_seq = nextval('change_seq')
       WHERE user_id = $1 AND date = $3 AND deleted_at IS NULL AND id <> $4`,
      [userId, timestamp.toISOString(), parsed.date, effectiveId],
    )
  }

  const deletedAt = change.op === 'delete' ? timestamp.toISOString() : null
  const hasTombstone = change.entity !== 'settings'
  let params: unknown[]
  let sql: string
  if (row === undefined) {
    // settings tem user_id como chave; as demais entidades têm id + user_id.
    const baseColumns = hasTombstone ? [spec.idColumn, 'user_id'] : ['user_id']
    const baseValues = hasTombstone ? [effectiveId, userId] : [effectiveId]
    params = [
      ...baseValues,
      ...columns.map((column) => normalized(parsed[column])),
      timestamp.toISOString(),
      ...(hasTombstone ? [deletedAt] : []),
    ]
    const columnNames = [
      ...baseColumns,
      ...columns,
      'client_updated_at',
      ...(hasTombstone ? ['deleted_at'] : []),
      'change_seq',
    ]
    const placeholders = [...params.map((_, index) => `$${index + 1}`), `nextval('change_seq')`]
    sql = `INSERT INTO ${spec.table} (${columnNames.join(', ')})
           VALUES (${placeholders.join(', ')}) RETURNING change_seq`
  } else {
    const offset = hasTombstone ? 2 : 1
    const where = hasTombstone ? 'id = $1 AND user_id = $2' : 'user_id = $1'
    params = hasTombstone ? [effectiveId, userId] : [effectiveId]
    const sets = columns.map((column, index) => `${column} = $${offset + index + 1}`)
    params.push(...columns.map((column) => normalized(parsed[column])))
    params.push(timestamp.toISOString())
    sets.push(`client_updated_at = $${params.length}`)
    if (hasTombstone) {
      params.push(deletedAt)
      sets.push(`deleted_at = $${params.length}`)
    }
    sets.push(`change_seq = nextval('change_seq')`)
    sql = `UPDATE ${spec.table} SET ${sets.join(', ')} WHERE ${where} RETURNING change_seq`
  }

  let result
  try {
    result = await client.query<{ change_seq: string }>(sql, params)
  } catch (error) {
    if (isUniqueViolation(error)) return conflict(change, 'DUPLICATE_KEY')
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === '23503'
    ) {
      throw httpError(400, 'INVALID_REFERENCE')
    }
    throw error
  }
  const changeSeq = Number(result.rows[0]?.change_seq ?? 0)
  return {
    applied: [{ entity: change.entity, id: effectiveId, changeSeq }],
    conflicts: [],
    cursor: changeSeq,
  }
}

function normalized(value: unknown): unknown {
  return value === undefined ? null : value
}

export async function applyBatch(
  client: PoolClient,
  userId: string,
  changes: PushChange[],
): Promise<PushResult> {
  const now = Date.now()
  const result: PushResult = { applied: [], conflicts: [], cursor: 0 }
  for (const change of changes) {
    const one = await applyChange(client, userId, change, now)
    result.applied.push(...one.applied)
    result.conflicts.push(...one.conflicts)
    result.cursor = Math.max(result.cursor, one.cursor)
  }
  return result
}

export interface PullChange {
  entity: SyncEntity
  id: string
  op: 'upsert' | 'delete'
  data: Record<string, unknown>
  clientUpdatedAt: string
  changeSeq: number
  deletedAt: string | null
}

export interface PullResult {
  changes: PullChange[]
  nextCursor: number
  hasMore: boolean
}

function formatValue(spec: EntitySpec, column: string, value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (spec.dateColumns.includes(column) && value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  if (spec.numericColumns.includes(column)) return Number(value)
  return value
}

/** Pull global ordenado por change_seq em todas as entidades sincronizáveis. */
export async function pullChanges(
  userId: string,
  cursor: number,
  limit: number,
): Promise<PullResult> {
  const collected: PullChange[] = []
  for (const [entity, spec] of Object.entries(specs) as [SyncEntity, EntitySpec][]) {
    const deletedExpression =
      entity === 'settings' ? 'NULL::timestamptz AS deleted_at' : 'deleted_at'
    const { rows } = await query<Record<string, unknown>>(
      `SELECT ${spec.idColumn} AS id, ${spec.columns.join(', ')}, client_updated_at,
              change_seq, ${deletedExpression}
         FROM ${spec.table}
        WHERE user_id = $1 AND change_seq > $2
        ORDER BY change_seq ASC LIMIT $3`,
      [userId, cursor, limit + 1],
    )
    for (const row of rows) {
      const data: Record<string, unknown> = {}
      for (const column of spec.columns) data[column] = formatValue(spec, column, row[column])
      const deletedAt = row.deleted_at instanceof Date ? row.deleted_at.toISOString() : null
      const clientUpdatedAt =
        row.client_updated_at instanceof Date ? row.client_updated_at.toISOString() : ''
      collected.push({
        entity,
        id: String(row.id),
        op: deletedAt === null ? 'upsert' : 'delete',
        data,
        clientUpdatedAt,
        changeSeq: Number(row.change_seq),
        deletedAt,
      })
    }
  }
  collected.sort((a, b) => a.changeSeq - b.changeSeq)
  const changes = collected.slice(0, limit)
  return {
    changes,
    nextCursor: changes.at(-1)?.changeSeq ?? cursor,
    hasMore: collected.length > limit,
  }
}
