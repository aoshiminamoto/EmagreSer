import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../data/db'
import { getWelcomeLastIndex } from '../../data/meta'
import {
  nextWelcomeMessage,
  pickWelcomeIndex,
  seededRandom,
  WELCOME_COUNT,
  welcomeMessages,
} from './messages'

const catalog: Record<string, string> = Object.fromEntries(
  Array.from({ length: WELCOME_COUNT }, (_, index) => [
    `welcome.m${index + 1}`,
    `Mensagem ${index + 1}`,
  ]),
)
const translate = (key: string): string => catalog[key] ?? key

describe('mensagens de acolhimento (RF-30/RN-05)', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('oferece oito mensagens e nenhuma usa linguagem de culpa', () => {
    expect(welcomeMessages(translate)).toHaveLength(WELCOME_COUNT)
    expect(new Set(welcomeMessages(translate)).size).toBe(WELCOME_COUNT)
    for (const message of welcomeMessages(translate)) {
      expect(/falh|errou|erro|culpa|pun|perdeu/i.test(message)).toBe(false)
    }
  })

  it('semente fixa dá a mesma sequência e nunca repete a anterior', () => {
    const run = (): number[] => {
      const random = seededRandom(20261126)
      const sequence = [pickWelcomeIndex(random())]
      for (let index = 1; index < 12; index += 1) {
        sequence.push(pickWelcomeIndex(random(), sequence[index - 1]))
      }
      return sequence
    }
    const first = run()
    expect(run()).toEqual(first)
    for (let index = 1; index < first.length; index += 1) {
      expect(first[index]).not.toBe(first[index - 1])
    }
  })

  it('guarda o último índice no aparelho e não repete entre registros', async () => {
    const random = seededRandom(7)
    let previous = await nextWelcomeMessage(translate, random)
    for (let index = 0; index < 20; index += 1) {
      const current = await nextWelcomeMessage(translate, random)
      expect(current).not.toBe(previous)
      previous = current
    }
    expect(await getWelcomeLastIndex()).toBeTypeOf('number')
  })
})
