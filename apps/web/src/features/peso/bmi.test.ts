import { describe, expect, it } from 'vitest'
import { bmiCategory, calculateBmi, isTargetBelowHealthyRange, minimumHealthyWeightKg } from './bmi'

describe('calculateBmi (RN-09)', () => {
  it('usa peso e altura, sem idade nem sexo', () => {
    expect(calculateBmi(70, 175)).toBeCloseTo(22.857, 3)
    expect(calculateBmi(90, 180)).toBeCloseTo(27.7778, 4)
  })

  it('devolve null para valores inválidos', () => {
    expect(calculateBmi(0, 170)).toBeNull()
    expect(calculateBmi(70, 0)).toBeNull()
    expect(calculateBmi(Number.NaN, 170)).toBeNull()
    expect(calculateBmi(70, Number.POSITIVE_INFINITY)).toBeNull()
  })
})

describe('bmiCategory (RN-09)', () => {
  it('cobre todas as faixas e os limites entre elas', () => {
    const cases: Array<[number, ReturnType<typeof bmiCategory>]> = [
      [0, 'underweight'],
      [18.4, 'underweight'],
      [18.5, 'adequate'],
      [24.9, 'adequate'],
      [25, 'overweight'],
      [29.9, 'overweight'],
      [30, 'obesity1'],
      [34.9, 'obesity1'],
      [35, 'obesity2'],
      [39.9, 'obesity2'],
      [40, 'obesity3'],
      [55, 'obesity3'],
    ]
    for (const [value, expected] of cases) {
      expect(bmiCategory(value)).toBe(expected)
    }
  })

  it('devolve null para valores inválidos', () => {
    expect(bmiCategory(-1)).toBeNull()
    expect(bmiCategory(Number.NaN)).toBeNull()
    expect(bmiCategory(Number.POSITIVE_INFINITY)).toBeNull()
  })
})

describe('minimumHealthyWeightKg e aviso de peso-alvo (RN-10)', () => {
  it('calcula o limite inferior da faixa adequada', () => {
    expect(minimumHealthyWeightKg(180)).toBeCloseTo(59.94, 2)
    expect(minimumHealthyWeightKg(0)).toBeNull()
  })

  it('aviso não dispara no limite exato e dispara abaixo dele', () => {
    const minimum = minimumHealthyWeightKg(180)
    expect(minimum).not.toBeNull()
    expect(isTargetBelowHealthyRange(minimum as number, 180)).toBe(false)
    expect(isTargetBelowHealthyRange((minimum as number) - 0.1, 180)).toBe(true)
    expect(isTargetBelowHealthyRange(70, 180)).toBe(false)
    expect(isTargetBelowHealthyRange(70, 0)).toBe(false)
  })
})
