import { basename, sep } from 'node:path'

export interface CacheReply {
  header(name: string, value: string): unknown
}

/**
 * Seção 4.1: SW, index.html e manifest pedem revalidação; arquivos com hash
 * em /assets/ podem ser guardados para sempre. Sem isso a atualização não chega.
 */
export function applyCacheHeaders(reply: CacheReply, filePath: string): void {
  if (filePath.includes(`${sep}assets${sep}`)) {
    reply.header('Cache-Control', 'public, max-age=31536000, immutable')
  } else if (['index.html', 'sw.js', 'manifest.webmanifest'].includes(basename(filePath))) {
    reply.header('Cache-Control', 'no-cache')
  }
}
