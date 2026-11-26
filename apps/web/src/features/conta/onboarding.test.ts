import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../data/db'
import { listHabits } from '../../data/habits'
import { listMilestones } from '../../data/milestones'
import { getSettings, saveSettings } from '../../data/settings'
import { listWeightEntries } from '../../data/weights'
import { completeOnboarding, isValidTarget, syncDeviceTimezone } from './onboarding'

const now = new Date('2026-11-26T12:00:00.000Z')

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('conclusão do onboarding', () => {
  it('valida meta menor que o peso atual', () => {
    expect(isValidTarget(70, 80)).toBe(true)
    expect(isValidTarget(80, 80)).toBe(false)
    expect(isValidTarget(90, 80)).toBe(false)
  })

  it('grava peso inicial, configurações, marcos e os três hábitos padrão', async () => {
    await completeOnboarding(
      {
        currentWeightKg: 80,
        targetWeightKg: 70,
        stepKg: 2,
        bmiVisible: false,
        reminderTime: '07:30',
      },
      now,
    )

    const settings = await getSettings()
    expect(settings).toMatchObject({
      onboardingDone: true,
      startWeightKg: 80,
      targetWeightKg: 70,
      milestoneStepKg: 2,
      startDate: '2026-11-26',
      reminderTime: '07:30',
      reminderDays: [1, 2, 3, 4, 5, 6, 7],
      bmiVisible: false,
    })
    expect(settings?.timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
    expect(settings?.heightCm).toBeUndefined()
    expect(await listWeightEntries()).toMatchObject([{ date: '2026-11-26', weightKg: 80 }])
    expect((await listMilestones()).map((milestone) => milestone.milestoneKg)).toEqual([
      70, 72, 74, 76, 78,
    ])
    expect((await listHabits()).map((habit) => habit.key)).toEqual([
      'vegetais',
      'sono',
      'exercicio',
    ])
    expect((await listHabits()).every((habit) => habit.label === undefined)).toBe(true)
  })

  it('salva altura e o interruptor quando o usuário escolhe', async () => {
    await completeOnboarding(
      {
        currentWeightKg: 80,
        targetWeightKg: 79,
        stepKg: 1,
        heightCm: 170,
        bmiVisible: true,
        reminderTime: '06:00',
      },
      now,
    )
    expect(await getSettings()).toMatchObject({ heightCm: 170, bmiVisible: true })
  })

  it('atualiza o fuso do aparelho quando ele muda', async () => {
    await completeOnboarding(
      {
        currentWeightKg: 80,
        targetWeightKg: 70,
        stepKg: 2,
        bmiVisible: false,
        reminderTime: '07:30',
      },
      now,
    )
    await saveSettings({ timezone: 'Fuso/Antigo' }, now)
    await syncDeviceTimezone(now)
    expect((await getSettings())?.timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
  })

  it('rejeita meta maior ou igual ao peso atual', async () => {
    await expect(
      completeOnboarding(
        {
          currentWeightKg: 80,
          targetWeightKg: 80,
          stepKg: 2,
          bmiVisible: false,
          reminderTime: '07:30',
        },
        now,
      ),
    ).rejects.toThrow('TARGET_NOT_LOWER')
    expect(await getSettings()).toBeUndefined()
  })
})
