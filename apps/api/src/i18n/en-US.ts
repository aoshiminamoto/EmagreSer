import type { ServerMessages } from './types.js'

// Rascunho: revisão humana pendente (Fase 12).
export const enUS: ServerMessages = {
  csvHeaders: {
    entity: 'Entity',
    id: 'ID',
    date: 'Date',
    weightKg: 'Weight (kg)',
    milestoneKg: 'Milestone (kg)',
    glasses: 'Glasses',
    mood: 'Mood',
    note: 'Note',
    habitKey: 'Habit key',
    habitLabel: 'Habit name',
    active: 'Active',
    done: 'Done',
    habitId: 'Habit ID',
    achievedDate: 'Achieved date',
    settings: 'Settings',
    clientUpdatedAt: 'Updated at',
    deletedAt: 'Deleted at',
  },
  reminder: {
    titles: ['Good morning!', 'A gentle reminder', 'Your check-in for today'],
    bodies: [
      'How about a quick check-in to follow your journey?',
      'If you can, take a minute for today’s check-in.',
      'A quick check-in helps show your trend over time.',
    ],
  },
  subject: 'Reset your EmagreSer password',
  body: (url) =>
    `We received a request to reset the password of your EmagreSer account.\n\n` +
    `Open the link below to create a new password. It is valid for 30 minutes ` +
    `and can be used only once:\n${url}\n\n` +
    `If you did not request this, ignore this email.\n\nEmagreSer team`,
}
