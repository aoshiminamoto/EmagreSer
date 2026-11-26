export interface CsvHeaders {
  entity: string
  id: string
  date: string
  weightKg: string
  milestoneKg: string
  glasses: string
  mood: string
  note: string
  habitKey: string
  habitLabel: string
  active: string
  done: string
  habitId: string
  achievedDate: string
  settings: string
  clientUpdatedAt: string
  deletedAt: string
}

export interface ServerMessages {
  subject: string
  body: (url: string) => string
  csvHeaders: CsvHeaders
}
