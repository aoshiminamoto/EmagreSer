# Relatório: Fase 3A (Cliente: dados locais (Dexie e fila de saída))
Data: 2026-11-26 · Commit: ver `git log -1 --oneline`

## Resumo (3 linhas)
Camada local com Dexie cobrindo todas as stores da seção 7 e migração v1 → v2 testada.
Toda escrita sincronizável grava entidade e outbox na mesma transação, com `updatedAt`; exclusões são tombstones.
Unicidade lógica por data/chave, ids UUID v4 no cliente, fotos e `celebrated` sem sair do aparelho.

## Entregue
- Seção 7: `db.ts` com v1 e v2 (schema final) e `meta` com `deviceId`/`lastPullCursor`/`localePref`/`flags`.
- Repositórios: pesos, marcos, hábitos (com os três padrão), logs de hábito, água, configurações e fotos.
- 4.5 (1): `writeWithOutbox` grava dado + item da fila (`entity`, `id`, `op`, `data`, `clientUpdatedAt`) atomicamente.
- 4.5/conflitos: upsert por data/chave reaproveita o id; `delete` vira tombstone; marcos celebrados não sincronizam.
- Testes com `fake-indexeddb`: migração, rollback da transação, unicidade, tombstone, padrões e helpers locais.

## Testes
- Comando: `npm test` → 105 passando, 0 falhas (17 arquivos; 15 testes novos da camada de dados).
- `npm run lint` → 0 erros; `npm run build` → ok; `npm run i18n:check` → ok.
- Verificação manual: nenhuma (sem telas nesta fase).

## Decisões tomadas
- D-36 a D-39 registradas em `docs/DECISOES.md`.

## Pendências e adiado
- Rede, motor de sincronização, telas e flags ficam para as fases 3B em diante.
- Conversão camelCase → snake_case e aplicação de pull/tombstones remotos são da fase 3B.

## Riscos e avisos
- A migração v1 → v2 é exercitada num banco de teste separado; a v1 nunca foi distribuída em aparelhos reais.
- `outbox.data` não é o payload da API: o motor de sync deve converter antes do push.

## Insumos necessários do dono
- nenhum

## Próxima sessão
- prompts/06-fase-03b-cliente-sincronizacao.md
