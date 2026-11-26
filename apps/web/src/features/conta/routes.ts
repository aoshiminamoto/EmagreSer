/** Regras de rota inicial (RN-12), isoladas para teste sem montar o app. */
import { isOnboardingDone } from './onboarding'

export type InitialRoute = 'login' | 'onboarding' | 'today'

export function resolveInitialRoute(authenticated: boolean, onboardingDone: boolean): InitialRoute {
  if (!authenticated) return 'login'
  return onboardingDone ? 'today' : 'onboarding'
}

export async function destinationAfterSignIn(): Promise<InitialRoute> {
  return resolveInitialRoute(true, await isOnboardingDone())
}
