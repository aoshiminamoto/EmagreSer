# Fase 3A: Cliente: dados locais (Dexie e fila de saída)

Sessão 5 de 17 · Tamanho: Média · Depende de: Fases 0 e 1

## Antes de começar

1. Leia `AGENTS.md`, `docs/DECISOES.md` e `docs/PROGRESSO.md`.
2. Não leia a especificação inteira. Use só os trechos abaixo; se precisar de outro, busque pelo ID com `grep -n` em `docs/ESPECIFICACAO.md` e leia ao redor.
3. Se `docs/PROGRESSO.md` indicar um ponto de retomada para esta fase, comece dele.

## Objetivo

Criar a camada de dados local do app: Dexie, repositórios e fila de saída, sem nenhuma chamada de rede.

## Escopo desta sessão

- Schema do Dexie conforme a seção 7, com `db.version` e migração.
- Repositórios para `weight_entries`, `milestones`, `habits`, `habit_logs`, `water_logs`, `settings` e `progressPhotos`.
- Toda escrita de entidade sincronizável grava o dado e o item da fila de saída (`outbox`) na mesma transação, com `updatedAt`.
- Exclusão por tombstone; ids UUID v4 gerados no cliente.
- Unicidade lógica: um peso por data (upsert), um registro por (data, hábito) e um por data na água.
- Store `meta` com `deviceId`, `lastPullCursor`, `localePref` e `flags`.
- Testes com `fake-indexeddb`.

## Fora desta sessão

- Rede, sincronização, telas, flags.

## Trechos da especificação

Copiados de `docs/ESPECIFICACAO.md`. Em caso de divergência, vale o documento original.

**IndexedDB (Dexie).** Cada registro sincronizável guarda também `updatedAt` e `deleted` (tombstone). O campo `celebrated` dos marcos existe só no aparelho e não sincroniza.

```ts
db.version(1).stores({
  settings: 'id',
  weightEntries: 'id, date, updatedAt',
  milestones: 'id, milestoneKg',
  habits: 'id, key',
  habitLogs: 'id, date, habitId',
  waterLogs: 'id, date',
  outbox: '++seq, entity, id',   // fila de saída da sincronização
  meta: 'key',                   // lastPullCursor, deviceId
  progressPhotos: 'id, date, angle'  // blob da imagem; nunca sincroniza
});
```

**4.5 Sincronização offline**

1. Toda escrita vai ao IndexedDB e à fila de saída (`outbox`) na mesma transação, com `entity`, `id`, `op` (`upsert` ou `delete`), `data` e `clientUpdatedAt`.
2. Gatilhos: abertura do app, evento `online`, 2 segundos após cada escrita local e a cada 5 minutos com o app aberto. Onde existir, registre também Background Sync no service worker; o iOS não suporta, então o app não pode depender dele. Use a Web Locks API (navigator.locks) para impedir que duas abas sincronizem ao mesmo tempo.
3. Envio: `POST /sync/push` com `{deviceId, changes[]}`, em lotes de até 200. Cada alteração é idempotente por (`entity`, `id`). O servidor aplica o lote numa transação e responde com o que foi aplicado e os conflitos.
4. Recebimento: `GET /sync/pull?cursor=N&limit=500`, repetido enquanto `hasMore` for verdadeiro. O servidor numera cada alteração com um `change_seq` crescente; o cursor é o maior `change_seq` recebido e fica na store `meta` do IndexedDB.
5. Entidades sincronizadas: `settings`, `weight_entries`, `habits`, `habit_logs`, `water_logs`, `milestones`. Fotos não sincronizam.
6. Falha de rede: nova tentativa com espera crescente (2 s, 4 s, 8 s, até 5 minutos), mantendo a fila de saída.

**Regras de conflito**

- Por registro, vence a alteração com maior `clientUpdatedAt` (última escrita vence). O servidor limita esse valor a no máximo 5 minutos no futuro.
- Exclusões são tombstones (`deleted_at`) e também sincronizam. Um upsert mais novo que a exclusão a desfaz.
- Dois aparelhos criando peso para a mesma data com ids diferentes: o mais recente permanece e o outro vira tombstone, que volta pelo pull.
- Depois de cada pull, recalcule marcos e streak com os dados locais (RN-03 e RN-06).

**Aceite:** num teste Playwright, três pesos registrados em modo offline aparecem no servidor, sem duplicar, quando a rede volta; duas abas editando o mesmo registro terminam com o valor da escrita mais recente nas duas.

**Sincronização**

- **RF-52** Implementar o protocolo da seção 4.5: fila de saída, envio, recebimento por cursor e regras de conflito.

## Pronto quando

- Todas as stores existem e há teste de migração entre versões do schema.
- Teste com falha simulada no meio da transação mostra que nada é gravado pela metade (dado e outbox andam juntos).
- Teste de upsert por data, de tombstone e de unicidade lógica.
- Nenhum `fetch` neste código.

## Insumos que dependem do dono do projeto

- Nenhum.

## Ao terminar (obrigatório)

1. Rode `npm run lint`, `npm test` e `npm run build`; todos devem passar. Corrija o que falhar antes de seguir.
2. Revise o diff: nada fora do escopo, nenhuma dependência desnecessária, nenhum segredo, nenhum texto fixo em componente.
3. Atualize `docs/PROGRESSO.md` (marque a sessão) e `docs/DECISOES.md` (decisões novas).
4. Escreva `docs/relatorios/05-fase-03a-cliente-dados-locais.md` pelo modelo `docs/MODELO_RELATORIO.md` (máximo de 40 linhas).
5. Faça o commit: `fase 3A: <resumo curto>`.
6. Pare. Não comece a próxima sessão (prompts/06-fase-03b-cliente-sincronizacao.md). Responda no chat só com o resumo de 5 linhas do relatório.
