# Relatório: Fase 10 (Configurações, privacidade, IMC e idioma)
Data: 2026-11-27 · Commit: fa59529

## Resumo (3 linhas)
A rota `/configuracoes` reúne nome, metas, água, lembrete, idioma, IMC, exportação e exclusão da conta.
O IMC permanece oculto até altura e interruptor, com cartão neutro só na Evolução e aviso de peso-alvo em Metas.
A página pública de privacidade foi ampliada; os três catálogos seguem sincronizados e os testes cobrem o fluxo.

## Entregue
- RF-42: `/configuracoes` edita nome (PATCH `/me`), peso-alvo, passo, horário/dias do lembrete, meta de água e copo via `saveSettings`; reusa `ReminderActivation`.
- RF-43: `/privacidade` pública traz dados da conta, fotos locais, sem venda/analytics, totais anônimos, versão de `package.json` e aviso profissional.
- RF-44/RF-82: `GET /me/export` em JSON/CSV entregue por `navigator.share` com fallback de download; CSV já sai no idioma ativo.
- RF-45: exclusão com dupla confirmação, senha e limpeza de IndexedDB, fotos, caches e inscrição push só após sucesso do servidor; offline bloqueia.
- RF-56 a RF-63: seção IMC com altura 100–250 cm, interruptor desabilitado sem altura, apagar dados (null sincronizado), cartão na Evolução com faixa, início, nota e olho.
- RF-64/RN-10: aviso gentil sem número de IMC em Configurações e Metas; RF-74: `LocaleSelect` na tela, some com flags `off`.
- RN-09/RN-16: espelho local do domínio em `features/peso/bmi.ts`, formato `bmi` com 1 casa e horário `HH:mm:ss` → `HH:mm`.

## Testes
- `npm run lint`, `npm run i18n:check` (318 chaves), `npm test` (244 passando, 47 arquivos) e `npm run build`: ok.
- `npx playwright test e2e/settings-imc-privacidade.spec.ts`: 1 passando — IMC oculto→visível→oculto→apagado, seletor oculto, exportação, exclusão com limpeza e privacidade pública.
- Verificação manual: guia de design conferido para cartões, contraste e Botões; nenhuma alteração visual fora das telas da fase.

## Decisões tomadas
- D-78 a D-82 registradas em `docs/DECISOES.md`; nenhuma dependência nova.

## Pendências e adiado
- Aviso RN-10 no onboarding não existe porque a altura ainda não foi informada nessa etapa.
- Landing de desktop e deploy seguem na Fase 11.

## Riscos e avisos
- en-US e es-419 continuam rascunho; nota do IMC e privacidade precisam de revisão humana antes de liberar flags.
- `navigator.share` com arquivos pode ser recusado; o download substitui. Trocar idioma depende da sincronização para o CSV usar o novo locale.

## Insumos necessários do dono
- nenhum

## Próxima sessão
- prompts/15-fase-11a-dispositivo-landing.md
