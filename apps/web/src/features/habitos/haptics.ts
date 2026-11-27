/** RF-23/RF-24: resposta tátil leve e best-effort, sem dependência externa. */
export function lightHaptic(): void {
  try {
    globalThis.navigator?.vibrate?.(12)
  } catch {
    // Alguns navegadores bloqueiam vibração fora de um gesto do usuário.
  }
}
