# Relatório: Fase 3B (Cliente: motor de sincronização e flags)
Data: 2026-11-26 · Commit: ver `git log -1 --oneline`

## Resumo (3 linhas)
Motor de sincronização no cliente com push em lotes, pull por cursor, trava entre abas e espera crescente até 5 min.
Token de acesso em memória com renovação por cookie; falha 401 preserva fila, dados locais e sinaliza novo login.
Flags consultadas e cacheadas no IndexedDB, com indicador discreto de estado na barra superior.

## Entregue
- RF-52/4.5: `sync/engine.ts` com gatilhos de abertura, `online`, 2 s após escrita, 5 min e Background Sync best-effort; lotes de 200 e pull de 500 por página; `navigator.locks` com fallback por aba e retry 2 s → 5 min.
- 4.5/conflitos: conversão camelCase ↔ snake_case em `sync/mapping.ts`; local mais novo vence no pull; tombstones e duplicatas de data aplicadas localmente.
- RF-53: pull desde o cursor 0 com contagem de registros no indicador; `resetSyncForLogin` prepara o download completo.
- RF-54/RF-55: `SyncStatus.vue` na barra superior e em Mais; estados sincronizado/pendente/offline.
- RF-83: `flags/client.ts` consulta ao abrir, no login, ao voltar ao primeiro plano e a cada 15 min; cache em `meta`; sem cache, só pt-BR; `VITE_FORCE_LOCALES` ignorado em produção.
- RN-03/RN-06: `sync/recalc.ts` recalcula marcos e streak após pull com alterações.
- `net/auth-client.ts` mantém token em memória, renova via refresh e nunca apaga dados locais em 401.

## Testes
- `npm test` → 115 passando, 0 falhas (19 arquivos).
- `npm run lint` → 0 erros; `npm run build` → ok; `npm run i18n:check` → ok.
- `npm run test:e2e` → 2 passando (três pesos offline sem duplicar; duas abas convergem para a escrita mais recente).
- Verificação manual: nenhuma; o e2e usa Chromium contra API real, Postgres e Redis da compose.

## Decisões tomadas
- D-40 a D-45 registradas em `docs/DECISOES.md`.

## Pendências e adiado
- Tela de login e chamada de `onLogin()` ficam para a fase 4A; a fila permanece intacta até lá.
- Tela de Configurações definitiva é da fase 10; o indicador já aparece em Mais.
- Telas de peso, metas e hábitos continuam como placeholder (fases seguintes).

## Riscos e avisos
- `test:e2e` depende de Docker (Postgres/Redis), do build do web e de Chromium instalado.
- Sem Web Locks (iOS antigo), a trava vale apenas dentro da aba; o servidor garante a idempotência.

## Insumos necessários do dono
- nenhum

## Próxima sessão
- prompts/07-fase-04a-conta-onboarding.md
