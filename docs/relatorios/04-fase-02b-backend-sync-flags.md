# Relatório: Fase 2B (Backend: sincronização, flags, exportação e exclusão)
Data: 2026-11-26 · Commit: ver `git log -1 --oneline`

## Resumo (3 linhas)
Sincronização com push/pull, idempotência, última escrita vence, tombstones e paginação por `change_seq`.
Feature flags com quatro estados, cache no Redis e script `flags:set`, reaproveitadas no idioma efetivo.
Exportação JSON/CSV com cabeçalhos traduzidos e `DELETE /me` com senha e limpeza total no servidor.

## Entregue
- RF-52/4.5: `POST /sync/push` (≤200 alterações) e `GET /sync/pull?cursor&limit`, seis entidades validadas por Zod, conflitos por `clientUpdatedAt` limitado a +5 min, peso duplicado na mesma data e `last_seen_at` no push.
- RF-83/4.7: tabela `feature_flags` avaliada em `off`/`testers`/`percent`/`on`, `GET /flags` com login opcional e cache de 60 s; `npm run flags:set` atualiza e invalida o cache; mesmo avaliador em e-mails e exportação.
- RF-44/RF-82: `GET /me/export?format=json|csv`, só dados do usuário, datas ISO, números com ponto e cabeçalhos de CSV nos três idiomas.
- RF-45: `DELETE /me` exige senha e `confirm: true`, apaga usuário, registros, sessões e inscrições de push em transação.
- 4.4: nenhum usuário lê ou altera dados de outro; erros continuam com códigos estáveis.

## Testes
- Comando: `npm test` → 90 passando, 0 falhas (13 arquivos; 11 testes novos de integração).
- `npm run lint` → 0 erros; `npm run build` → ok; `npm run i18n:check` → ok; `npm run check:prod-env` → ok.
- Verificação manual: `flags:set` executado nos quatro estados, com conferência das linhas no PostgreSQL e volta das duas flags para `off`.

## Decisões tomadas
- D-31 a D-35 registradas em `docs/DECISOES.md`.

## Pendências e adiado
- Cliente Dexie/motor de sync, push, `/push/public-key` e `/public/stats` ficam para as próximas fases.
- Confirmação dupla, limpeza de IndexedDB/fotos e compartilhamento do arquivo são responsabilidade da interface.

## Riscos e avisos
- O CSV guarda `settings` em uma célula JSON; quem abrir em planilha deve expandir essa célula se precisar das preferências.
- `fileParallelism: false` deixa a suíte sequencial; necessário porque todos os testes de API truncam o mesmo banco.

## Insumos necessários do dono
- nenhum

## Próxima sessão
- prompts/05-fase-03a-cliente-dados-locais.md
