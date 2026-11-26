// Verifica os três catálogos: chaves iguais, mesmos parâmetros e nenhuma chave sem uso.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const localesDir = join(root, 'apps/web/src/i18n/locales')
const sourceDir = join(root, 'apps/web/src')
const locales = ['pt-BR', 'en-US', 'es-419']
const problems = []

function flatten(obj, prefix = '') {
  const entries = []
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      entries.push(...flatten(value, full))
    } else if (typeof value === 'string') {
      entries.push([full, value])
    }
  }
  return entries
}

function paramsOf(message) {
  return [...new Set([...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]))].sort()
}

function collectFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === 'locales' ? [] : collectFiles(path)
    return /\.(vue|ts)$/.test(name) ? [path] : []
  })
}

const catalogs = new Map()
for (const locale of locales) {
  const data = JSON.parse(readFileSync(join(localesDir, `${locale}.json`), 'utf8'))
  catalogs.set(locale, new Map(flatten(data)))
}

const reference = catalogs.get('pt-BR')
for (const locale of locales.slice(1)) {
  const catalog = catalogs.get(locale)
  for (const [key, message] of reference) {
    if (!catalog.has(key)) problems.push(`${locale}: falta a chave ${key}`)
    else if (paramsOf(message).join(',') !== paramsOf(catalog.get(key)).join(',')) {
      problems.push(`${locale}: parâmetros diferentes de pt-BR em ${key}`)
    }
  }
  for (const key of catalog.keys()) {
    if (!reference.has(key)) problems.push(`${locale}: chave extra ${key}`)
  }
}

const used = new Set()
for (const file of collectFiles(sourceDir)) {
  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(/\$?t\(\s*['"]([\w.-]+)['"]/g)) used.add(match[1])
}
for (const key of reference.keys()) {
  if (!used.has(key)) problems.push(`chave sem uso: ${key}`)
}

if (problems.length > 0) {
  console.error(`i18n:check falhou (${problems.length}):`)
  for (const problem of problems) console.error(`- ${problem}`)
  process.exit(1)
}
console.log(`i18n:check: ok (${reference.size} chaves em ${locales.length} idiomas)`)
