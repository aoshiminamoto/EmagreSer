/** RF-79: hábitos padrão vêm do catálogo; `label` só vale para personalizados. */
import type { Habit } from '../../data/entities'
import type { ComposerTranslation } from 'vue-i18n'

export function habitLabel(t: ComposerTranslation, habit: Habit): string {
  switch (habit.key) {
    case 'vegetais':
      return t('habit.vegetais')
    case 'sono':
      return t('habit.sono')
    case 'exercicio':
      return t('habit.exercicio')
    default:
      return habit.label ?? habit.key
  }
}
