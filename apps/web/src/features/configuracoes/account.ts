/**
 * RF-44/RF-45: exportação e exclusão da conta. A lógica recebe dependências
 * injetáveis para ser testada sem navegador, rede ou IndexedDB.
 */
import { apiFetch, apiJson, ApiError } from '../../net/auth-client'

export type ExportFormat = 'json' | 'csv'

export interface ExportFile {
  blob: Blob
  filename: string
}

export interface FileDelivery {
  readonly canShare: boolean
  share(blob: Blob, filename: string): Promise<void>
  download(blob: Blob, filename: string): void
}

export interface CacheStorageLike {
  keys(): Promise<readonly string[]>
  delete(key: string): Promise<boolean>
}

export interface DeleteAccountDeps {
  removeOnServer(): Promise<void>
  unsubscribeLocal(): Promise<void>
  forgetSession(): Promise<void>
  clearLocal(): Promise<void>
  clearCaches(): Promise<void>
}

/** `navigator.onLine` é o único sinal usado para avisar que a exclusão exige rede. */
export function isOffline(
  source: { onLine?: boolean } | undefined = globalThis.navigator,
): boolean {
  return source?.onLine === false
}

function filenameFrom(response: Response, format: ExportFormat): string {
  const disposition = response.headers.get('content-disposition')
  const match = disposition?.match(/filename="([^"]+)"/)
  if (match?.[1] !== undefined) return match[1]
  return `emagreser-${new Date().toISOString().slice(0, 10)}.${format}`
}

/** RF-44/RF-82: o servidor já entrega o CSV com cabeçalhos no idioma ativo. */
export async function fetchExport(
  format: ExportFormat,
  http: (path: string) => Promise<Response> = (path) => apiFetch(path),
): Promise<ExportFile> {
  const response = await http(`/api/v1/me/export?format=${format}`)
  if (!response.ok) throw new ApiError(response.status, 'EXPORT_FAILED')
  return { blob: await response.blob(), filename: filenameFrom(response, format) }
}

/** Prefere o compartilhamento do navegador; sem ele (ou em falha), faz download. */
export async function deliverExport(file: ExportFile, delivery: FileDelivery): Promise<void> {
  if (delivery.canShare) {
    try {
      await delivery.share(file.blob, file.filename)
      return
    } catch {
      // Compartilhamento cancelado ou sem suporte a arquivos: usa o download.
    }
  }
  delivery.download(file.blob, file.filename)
}

export function browserFileDelivery(): FileDelivery {
  const nav = globalThis.navigator
  return {
    canShare: typeof nav?.share === 'function' && typeof globalThis.File === 'function',
    share: async (blob, filename) => {
      const file = new File([blob], filename, { type: blob.type })
      await nav.share({ files: [file], title: filename } as ShareData)
    },
    download: (blob, filename) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    },
  }
}

/** Apaga somente os caches da origem do app; falha do navegador é best-effort. */
export async function clearAppCaches(
  storage: CacheStorageLike | undefined = globalThis.caches,
): Promise<void> {
  if (storage === undefined) return
  const keys = await storage.keys()
  await Promise.all(keys.map((key) => storage.delete(key)))
}

/**
 * RF-45: primeiro o servidor, depois toda a limpeza local (fotos, fila,
 * inscrição push, caches e sessão). Se o servidor falhar, nada é apagado aqui.
 */
export async function deleteAccount(deps: DeleteAccountDeps): Promise<void> {
  await deps.removeOnServer()
  await deps.unsubscribeLocal()
  await deps.forgetSession()
  await deps.clearLocal()
  await deps.clearCaches()
}

export function browserDeleteAccountDeps(password: string): DeleteAccountDeps {
  return {
    removeOnServer: async () => {
      await apiJson<{ ok: boolean }>('/api/v1/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirm: true }),
      })
    },
    unsubscribeLocal: async () => {
      const { unsubscribeLocal } = await import('../lembretes/subscription')
      await unsubscribeLocal()
    },
    forgetSession: async () => {
      const { forgetSessionLocally } = await import('../conta/session')
      await forgetSessionLocally()
    },
    clearLocal: async () => {
      const { clearLocalData } = await import('../../data/clear')
      await clearLocalData()
    },
    clearCaches: async () => {
      await clearAppCaches()
    },
  }
}
