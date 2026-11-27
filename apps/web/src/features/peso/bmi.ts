/**
 * RN-09/RN-10 espelhados de `packages/domain` (D-36: o web não importa o
 * pacote, que não publica `.d.ts` e compila depois dele). As categorias são
 * códigos estáveis; os rótulos ficam nos catálogos de idioma.
 */
export type BmiCategory =
  'underweight' | 'adequate' | 'overweight' | 'obesity1' | 'obesity2' | 'obesity3'

/** IMC sem arredondamento; null quando peso ou altura são inválidos. */
export function calculateBmi(weightKg: number, heightCm: number): number | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm) || weightKg <= 0 || heightCm <= 0) {
    return null
  }
  const heightM = heightCm / 100
  return weightKg / (heightM * heightM)
}

/** Faixas de adulto da RN-09; limites inferiores inclusivos. */
export function bmiCategory(bmi: number): BmiCategory | null {
  if (!Number.isFinite(bmi) || bmi < 0) return null
  if (bmi < 18.5) return 'underweight'
  if (bmi < 25) return 'adequate'
  if (bmi < 30) return 'overweight'
  if (bmi < 35) return 'obesity1'
  if (bmi < 40) return 'obesity2'
  return 'obesity3'
}

/** Menor peso da faixa adequada: 18,5 × altura(m)². */
export function minimumHealthyWeightKg(heightCm: number): number | null {
  if (!Number.isFinite(heightCm) || heightCm <= 0) return null
  const heightM = heightCm / 100
  return 18.5 * heightM * heightM
}

/** RF-64: aviso gentil, sem bloquear e sem revelar o número do IMC. */
export function isTargetBelowHealthyRange(targetWeightKg: number, heightCm: number): boolean {
  const minimum = minimumHealthyWeightKg(heightCm)
  return minimum !== null && targetWeightKg < minimum - 1e-9
}
