/**
 * RN-16: campos numéricos aceitam vírgula ou ponto em qualquer idioma.
 * Quando os dois símbolos aparecem, o último é o separador decimal.
 */

/** Retorna null para entrada vazia ou inválida; nunca lança. */
export function parseDecimal(input: string): number | null {
  const text = input.trim()
  if (text === '') return null

  let decimalIndex = -1
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === ',' || char === '.') decimalIndex = index
  }

  const integerPart = decimalIndex === -1 ? text : text.slice(0, decimalIndex)
  const fractionPart = decimalIndex === -1 ? '' : text.slice(decimalIndex + 1)
  const digits = integerPart.replace(/[,.\s]/g, '')

  if (!/^[+-]?\d+$/.test(digits)) return null
  if (fractionPart !== '' && !/^\d+$/.test(fractionPart)) return null

  const value = Number(`${digits}${fractionPart === '' ? '' : `.${fractionPart}`}`)
  return Number.isFinite(value) ? value : null
}

/** Formato canônico com ponto decimal, pronto para validação e gravação. */
export function normalizeDecimal(input: string): string | null {
  const value = parseDecimal(input)
  return value === null ? null : String(value)
}
