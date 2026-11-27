/**
 * RN PWA: depois do onboarding pede persistência do IndexedDB, onde ficam as
 * fotos. A falha é best-effort: o app continua funcionando sem a permissão.
 */
export interface StorageManagerLike {
  persisted(): Promise<boolean>
  persist(): Promise<boolean>
}

export async function ensurePersistentStorage(
  manager: StorageManagerLike | undefined = globalThis.navigator?.storage,
): Promise<boolean> {
  if (manager === undefined) return false
  try {
    if (await manager.persisted()) return true
    return await manager.persist()
  } catch {
    return false
  }
}
