import { describe, expect, it } from 'vitest'
import {
  calendarDateInZone,
  dayIndex,
  isoDayOfWeek,
  isValidTimeZone,
  reminderCron,
  schedulerId,
} from './schedule.js'

describe('agendamento do lembrete (RF-37)', () => {
  it('gera cron no horário e nos dias ISO escolhidos', () => {
    expect(reminderCron('07:30', [1, 2, 3, 4, 5])).toBe('30 7 * * 1,2,3,4,5')
    expect(reminderCron('09:05', [6, 7])).toBe('5 9 * * 0,6')
    expect(reminderCron('07:30', [])).toBe('30 7 * * *')
    expect(reminderCron('07:30', [1, 2, 3, 4, 5, 6, 7])).toBe('30 7 * * *')
    expect(reminderCron('07:30:00', [1])).toBe('30 7 * * 1')
  })

  it('recusa horário inválido e usa um id estável por usuário', () => {
    expect(() => reminderCron('25:00', [1])).toThrow(RangeError)
    expect(schedulerId('user-1')).toBe('reminder:user-1')
  })

  it('converte o instante para a data civil no fuso do usuário (RN-08)', () => {
    const now = new Date('2026-11-26T02:00:00.000Z')
    expect(calendarDateInZone(now, 'America/Sao_Paulo')).toBe('2026-11-25')
    expect(calendarDateInZone(now, 'UTC')).toBe('2026-11-26')
    expect(isoDayOfWeek('2026-11-25')).toBe(3)
    expect(isoDayOfWeek('2026-11-29')).toBe(7)
  })

  it('aceita só fusos válidos e mantém índice estável por dia', () => {
    expect(isValidTimeZone('America/Sao_Paulo')).toBe(true)
    expect(isValidTimeZone('Fuso/Que_Nao_Existe')).toBe(false)
    expect(dayIndex('2026-11-26')).toBe(dayIndex('2026-11-26'))
  })
})
