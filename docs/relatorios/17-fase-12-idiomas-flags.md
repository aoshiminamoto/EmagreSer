# Relatório: Fase 12 (idiomas, flags e checklist final)
Data: 2026-11-27 · Commit: 1930563

## Resumo (3 linhas)
- Auditoria de i18n: 363 chaves nos três catálogos, nenhum texto fixo e nenhuma formatação de data fora dos formatadores centrais.
- Novo e2e cobre flags off/liberados, seletor e layout em 360 px nos três idiomas; README documenta `flags:set` e o roteiro.
- Checklist da seção 14 executado: itens automatizados com evidência; os que dependem de dono/aparelho ficam em pendência.

## Checklist (seção 14) — item → evidência
| Item | Evidência | Situação |
|---|---|---|
| M (8.17) e testes RN/API/Playwright | `npm test` 273; `npm run test:e2e` 18; aceite 8.17 no e2e de idiomas | ✓ |
| Avião→sync sem duplicar; fotos/exportação/exclusão | `sync-offline-online`, `gallery`, `settings-imc-privacidade` (e2e) | ✓ |
| Sem terceiros; segurança (argon2id, CSP, audit) | grep `https?://` só em testes; `npm audit --audit-level=high` 0 altas; `auth.test.ts` | ✓ |
| Sem culpa/vermelho na subida; IMC oculto | grep de cores em `EvolutionPage`; `settings-imc-privacidade` (e2e) | ✓ |
| Push app fechado; PWA instálavel/atualiza/offline | `payload.test.ts`/`reminders.test.ts`; `app-update` e `device-landing`; `sw.ts` com denylist `/api/` | ✓* |
| Contraste/toque/acessibilidade; deploy Railway/VPS | tokens no tema e README; Lighthouse e deploy reais pendentes | ✗ |
| README/DECISOES completos | README (flags, deploy, backup) e `DECISOES.md` D-01..D-99 | ✓ |
| Desktop/landing/QR/stats; `/public/stats` | `device-landing` (e2e); `public.test.ts` | ✓ |
| Catálogos/`i18n:check`/texto fixo | `i18n:check` 363 chaves; mutação de parâmetro falhou; `no-raw-text.test.ts` e lint | ✓ |
| Flags off/testers/percent + FORCE_LOCALES off | `phase2b.test.ts`; e2e de idiomas; `check:prod-env`; `flags:set` nos quatro estados | ✓ |
| Datas/horas/números/decimais | `format.test.ts` (31/12/2026, 08:45, vírgula/ponto); `weight.test.ts`; RF-75 por grep | ✓ |
| Textos sensíveis revisados por nativo | `REVISAO_TRADUCOES.md` completo; revisão pendente (D-67/D-99) | ✗ |

## Testes
- `npm run lint` → ok; `npm test` → 56 arquivos/273 testes; `npm run build` → ok; `npm run i18n:check` → 363 chaves; `npm run test:e2e` → 18 passando; `npm audit --audit-level=high` → 0 altas; `npm run check:prod-env` → ok.
- Manual: `flags:set` executado em `off→testers→percent→on→off`, cache invalidado; ambos os flags voltaram a `off`. `i18n:check` falhou ao trocar `{date}` por `{when}` e o catálogo foi restaurado.

## Decisões tomadas
- D-98 (teste de idiomas com `/flags` interceptado) e D-99 (pendências sem insumo do dono).

## Pendências, riscos e insumos
- Pendente: revisão nativa dos textos sensíveis; Lighthouse/aparelhos (Chrome Android, iOS) e deploy com credenciais. `✓*` = validado por testes e código, não em aparelho físico.
- Risco: en-US/es-419 são rascunho (D-67); não liberar os flags antes da revisão.
- Insumo do dono: falante nativo, conta Railway/VPS e aparelhos para a validação final.

## Resumo final (seção 15) e próxima sessão
- Fases 0–11B entregues conforme `PROGRESSO.md`; fase 12 fecha i18n, flags e checklist.
- Desejáveis (D) não feitos: revisão humana, deploy efetivo e testes em aparelhos físicos; decisões D-01..D-99.
- Problemas: 6 vulnerabilidades moderadas de build (D-95), chunk >500 kB e avisos de depreciação do Vite. Próxima sessão: nenhuma (fim do plano).
