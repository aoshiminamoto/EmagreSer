import { describe, expect, it, vi } from 'vitest'
import { ensurePersistentStorage, type StorageManagerLike } from './storage'

function manager(
  persisted: boolean,
  persistResult = true,
): StorageManagerLike & {
  persist: ReturnType<typeof vi.fn>
} {
  return {
    persisted: vi.fn(async () => persisted),
    persist: vi.fn(async () => persistResult),
  }
}

describe('persistência do IndexedDB após o onboarding', () => {
  it('não pede de novo quando o aparelho já persistentou', async () => {
    const storage = manager(true)
    expect(await ensurePersistentStorage(storage)).toBe(true)
    expect(storage.persist).not.toHaveBeenCalled()
  })

  it('pede persist() quando ainda não foi feito', async () => {
    const storage = manager(false)
    expect(await ensurePersistentStorage(storage)).toBe(true)
    expect(storage.persist).toHaveBeenCalledOnce()
  })

  it('devolve o resultado da recusa sem lançar erro', async () => {
    expect(await ensurePersistentStorage(manager(false, false))).toBe(false)
  })

  it('tolera navegador sem a API e falhas na chamada', async () => {
    expect(await ensurePersistentStorage(undefined)).toBe(false)
    expect(
      await ensurePersistentStorage({
        persisted: async () => {
          throw new Error('sem permissão')
        },
        persist: async () => true,
      }),
    ).toBe(false)
  })
})
