/** RF-79/RF-80: emoji e rótulo vêm do catálogo, nunca do banco. */
import type { Mood } from '../../data/entities'

type Translate = (key: string) => string

export function moodEmoji(t: Translate, mood: Mood): string {
  switch (mood) {
    case 'feliz':
      return t('mood.feliz')
    case 'ansioso':
      return t('mood.ansioso')
    case 'cansado':
      return t('mood.cansado')
    case 'estressado':
      return t('mood.estressado')
  }
}

export function moodLabel(t: Translate, mood: Mood): string {
  switch (mood) {
    case 'feliz':
      return t('mood.labelFeliz')
    case 'ansioso':
      return t('mood.labelAnsioso')
    case 'cansado':
      return t('mood.labelCansado')
    case 'estressado':
      return t('mood.labelEstressado')
  }
}
