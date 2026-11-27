/**
 * Mensagens de acolhimento (RF-29/RF-30): o sorteio nunca repete a anterior.
 * O gerador é injetável para o teste com semente fixa.
 */
import { getWelcomeLastIndex, setWelcomeLastIndex } from '../../data/meta'

type Translate = (key: string) => string

export const WELCOME_COUNT = 8

/** mulberry32: determinístico e pequeno, sem dependência nova. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

/** Escolhe um índice entre todos, exceto o anterior. */
export function pickWelcomeIndex(random: number, previousIndex?: number): number {
  const available = Array.from({ length: WELCOME_COUNT }, (_, index) => index).filter(
    (index) => index !== previousIndex,
  )
  const bounded = Number.isFinite(random) ? Math.min(Math.max(random, 0), 1 - Number.EPSILON) : 0
  return available[Math.floor(bounded * available.length)] ?? 0
}

/** Textos sensíveis: os três catálogos são atualizados juntos (RF-80). */
export function welcomeMessages(t: Translate): string[] {
  return [
    t('welcome.m1'),
    t('welcome.m2'),
    t('welcome.m3'),
    t('welcome.m4'),
    t('welcome.m5'),
    t('welcome.m6'),
    t('welcome.m7'),
    t('welcome.m8'),
  ]
}

/** Uma chamada por registro: sorteada, guardada e devolvida. */
export async function nextWelcomeMessage(
  t: Translate,
  random: () => number = Math.random,
): Promise<string> {
  const previous = await getWelcomeLastIndex()
  const index = pickWelcomeIndex(random(), previous)
  await setWelcomeLastIndex(index)
  return welcomeMessages(t)[index] ?? ''
}
