import { describe, expect, it } from 'vitest'
import {
  bmiCategory,
  calculateBmi,
  isTargetBelowHealthyRange,
  minimumHealthyWeightKg,
} from './bmi.js'

describe('IMC e faixas (RN-09)', () => {
  const cases = [
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
  ] as const

  it('classifica todas as faixas e os limites entre elas', () => {
    for (const [bmi, category] of cases) {
      expect(bmiCategory(bmi)).toBe(category)
    }
  })

  it('calcula sem arredondar e sem idade ou sexo', () => {
    expect(calculateBmi(70, 175)).toBeCloseTo(22.857, 3)
    expect(bmiCategory(calculateBmi(70, 175) ?? 0)).toBe('adequate')
  })

  it('retorna null quando faltam peso ou altura válidos', () => {
    expect(calculateBmi(70, 0)).toBeNull()
    expect(calculateBmi(0, 175)).toBeNull()
    expect(bmiCategory(-1)).toBeNull()
  })
})

describe('aviso de peso-alvo (RN-10)', () => {
  it('usa o limite de 18,5 × altura(m)²', () => {
    expect(minimumHealthyWeightKg(100)).toBe(18.5)
    expect(minimumHealthyWeightKg(170)).toBeCloseTo(53.465, 3)
  })

  it('não avisa no limite exato e avisa abaixo dele', () => {
    expect(isTargetBelowHealthyRange(18.5, 100)).toBe(false)
    expect(isTargetBelowHealthyRange(18.4, 100)).toBe(true)
    expect(isTargetBelowHealthyRange(53.5, 170)).toBe(false)
    expect(isTargetBelowHealthyRange(53.4, 170)).toBe(true)
  })

  it('não avisa sem altura válida', () => {
    expect(isTargetBelowHealthyRange(50, 0)).toBe(false)
  })
})
