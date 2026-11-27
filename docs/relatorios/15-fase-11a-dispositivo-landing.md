# Relatório: Fase 11A (Detecção de dispositivo, landing de desktop e instalação)
Data: 2026-11-27 · Commit: de9db17

## Resumo (3 linhas)
A classificação de dispositivo passa a decidir, no arranque, entre o app móvel e a landing de desktop.
A landing tem alerta com QR Code, prova social, funcionalidades e números públicos, sem SW nem IndexedDB.
O convite de instalação aparece depois do onboarding, respeita 14 dias e tem aviso manual no iOS.

## Entregue
- RN-11/RN-13: `classifyDevice` espelhada em `features/device/detection.ts`, decidida antes de qualquer await; `VITE_ALLOW_DESKTOP` só em build dev/teste.
- RN-12: captura de `beforeinstallprompt` em `main.ts`, banner com `prompt()` por gesto, `appinstalled`, dispenso de 14 dias em `meta` e aviso manual sem o evento; SW só no mobile.
- RF-65/RF-69/RF-72: landing com cabeçalho, alerta informativo, QR Code SVG gerado no cliente (`qrcode`), link em texto, copiar link, rodapé com privacidade e versão, sem botão de entrar.
- RF-66/RF-70: grade de 8 recursos; landing em chunk `landing-*` carregado sob demanda e fora do precache do SW, com `v-skeleton-loader` nos números.
- RF-67/RF-68/RN-14: totais anônimos de `/public/stats`, `Intl` no idioma ativo, “Atualizado em”, abaixo do mínimo mostra aviso; falha esconde a seção de números.
- RF-71: `GET /public/stats` sem login, 30 req/min por IP no Redis, cache de 15 min e `Cache-Control: public, max-age=300`.
- RF-81: título, descrição, Open Graph e números da landing nos três idiomas; `/privacidade` segue acessível no desktop.

## Testes
- `npm run lint`, `npm run i18n:check` (363 chaves), `npm test` (265 passando, 54 arquivos), `npm run build` e `npm run check:prod-env`: ok.
- `npx playwright test e2e/device-landing.spec.ts`: 3 passando — bloqueio de desktop sem SW/IndexedDB, app em iPhone com SW, banner pós-onboarding e intervalo de 14 dias.
- Verificação manual: guia de design conferido para cartões, contraste e tipografia; `sw.js` gerado sem entradas `landing-*`.

## Decisões tomadas
- D-83 a D-89 registradas em `docs/DECISOES.md`; dependências novas: `qrcode` e `@types/qrcode` no web.

## Pendências e adiado
- Lighthouse, deploy e ajustes finos de performance ficam na Fase 11B.
- Textos novos em en-US e es-419 são rascunho, aguardando revisão humana antes de liberar os flags.

## Riscos e avisos
- QR Code usa `VITE_APP_ORIGIN` no dev e a origem atual em produção: conferir `APP_ORIGIN` no deploy.
- `beforeinstallprompt` depende do navegador; em iOS o aviso manual é o caminho previsto.

## Insumos necessários do dono
- nenhum

## Próxima sessão
- prompts/16-fase-11b-deploy-polimento.md
