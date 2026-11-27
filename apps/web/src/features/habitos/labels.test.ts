import { describe, expect, it } from 'vitest'
import type { Habit } from '../../data/entities'
import { habitLabel } from './labels'

const catalog: Record<string, string> = {
  'habit.vegetais': 'Comer vegetais',
  'habit.sono': 'Dormir bem',
  'habit.exercicio': 'Movimentar o corpo',
}
const t = ((key: string) => catalog[key] ?? key) as Parameters<typeof habitLabel>[0]

function habit(key: string, label?: string): Habit {
  return {
    id: key,
    key,
    ...(label === undefined ? {} : { label }),
    active: true,
    sortOrder: 0,
    updatedAt: '2026-11-26T12:00:00.000Z',
  }
}

describe('rótulos de hábitos (RF-79)', () => {
  it('hábitos padrão vêm da chave traduzida, nunca do banco', () => {
    expect(habitLabel(t, habit('vegetais'))).toBe('Comer vegetais')
    expect(habitLabel(t, habit('sono'))).toBe('Dormir bem')
    expect(habitLabel(t, habit('exercicio'))).toBe('Movimentar o corpo')
  })

  it('hábito personalizado usa o label gravado', () => {
    expect(habitLabel(t, habit('custom-1', 'Ler 20 minutos'))).toBe('Ler 20 minutos')
  })
})
