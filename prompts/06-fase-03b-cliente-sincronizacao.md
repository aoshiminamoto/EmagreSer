# Fase 3B: Cliente: motor de sincronização e flags

Sessão 6 de 17 · Tamanho: Grande · Depende de: Fases 2B e 3A

## Antes de começar

1. Leia `AGENTS.md`, `docs/DECISOES.md` e `docs/PROGRESSO.md`.
2. Não leia a especificação inteira. Use só os trechos abaixo; se precisar de outro, busque pelo ID com `grep -n` em `docs/ESPECIFICACAO.md` e leia ao redor.
3. Se `docs/PROGRESSO.md` indicar um ponto de retomada para esta fase, comece dele.

## Objetivo

Implementar o motor de sincronização no cliente e o consumo das feature flags, com o teste offline-para-online.

## Escopo desta sessão

- Cliente HTTP com token de acesso em memória e renovação via refresh; em falha de autenticação, manter a fila de saída e os dados locais intactos.
- Envio e recebimento conforme a seção 4.5: gatilhos (abertura, evento `online`, 2 s após escrita, a cada 5 min), lotes de 200, cursor, espera crescente em falhas, `navigator.locks` contra abas simultâneas.
- Download completo em aparelho novo ou depois do login, com indicador de progresso.
- Indicador discreto do estado (sincronizado, pendente, offline) na barra superior; falha de rede vira “pendente”, sem erro técnico na tela.
- Cliente de flags: consulta ao abrir, após login, ao voltar ao primeiro plano e a cada 15 min; cache na store `meta`; sem nada em cache, tudo desligado.
- Teste Playwright offline-para-online da seção 4.5.

## Fora desta sessão

- Telas de funcionalidades, banco do servidor (já existe), seletor de idioma.

## Trechos da especificação

Copiados de `docs/ESPECIFICACAO.md`. Em caso de divergência, vale o documento original.

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

- Offline: token de acesso expirado não bloqueia o uso local. O cliente renova ao reconectar. Se o refresh falhar com 401, mostrar o login e manter a fila de saída intacta até o mesmo usuário entrar de novo; nunca apagar dados locais por falha de autenticação.

**Sincronização e flags**

- **RF-52** Implementar o protocolo da seção 4.5: fila de saída, envio, recebimento por cursor e regras de conflito.
- **RF-53** Em um aparelho novo ou depois do login, baixar todos os dados (pull a partir do cursor 0) com indicador de progresso. Se `onboarding_done` já for verdadeiro no servidor, pular o onboarding.
- **RF-54** Indicador discreto do estado (sincronizado, pendente, offline) na barra superior e em Configurações. A sincronização nunca bloqueia a interface.
- **RF-55** Nenhuma tela mostra erro técnico por falha de rede; a falha vira o estado “pendente”.
- **RF-83 Feature flags.** Tabela `feature_flags`, avaliação no servidor, `GET /flags`, cache local no IndexedDB, script de gestão e `VITE_FORCE_LOCALES`, conforme a seção 4.7.

**Feature flags (liberação gradual).** Os três idiomas ficam prontos no código desde a primeira versão, mas en-US e es-419 só aparecem para quem tiver o flag ligado. O `pt-BR` está sempre disponível.

- Flags: `i18n_en` (en-US) e `i18n_es` (es-419), guardados na tabela `feature_flags` (seção 7), sem serviço de terceiros.
- Estados de cada flag: `off` (ninguém), `testers` (apenas e-mails da lista de testadores), `percent` (testadores mais uma porcentagem dos usuários) e `on` (todos).
- Avaliação no servidor: `off` é falso; `on` é verdadeiro; `testers` é verdadeiro se o e-mail do usuário estiver na lista; `percent` é verdadeiro para testadores ou quando um hash estável do id do usuário, módulo 100, for menor que a porcentagem. Sem usuário autenticado, só o estado `on` vale.
- Rota `GET /flags` (login opcional): devolve os flags avaliados e a lista de idiomas disponíveis para aquele usuário. Nunca expõe a lista de testadores nem a porcentagem. Resultado em cache no Redis por 60 segundos.
- Cliente: consulta ao abrir o app, depois do login, ao voltar ao primeiro plano e a cada 15 minutos; guarda o último resultado na store `meta` do IndexedDB. Sem rede, usa o último resultado; sem nenhum resultado, considera tudo desligado (só pt-BR). Um flag nunca bloqueia funções locais.
- Gestão sem painel: script `npm run flags:set -- i18n_en testers --emails a@exemplo.com,b@exemplo.com`, e variações `percent 20`, `on` e `off`. O script invalida o cache do Redis e atualiza `updated_at`. `off` serve de chave de emergência: o idioma some na próxima consulta do cliente.
- Roteiro de liberação: (1) produção com os dois flags em `off` e catálogos no código; (2) `testers` com a equipe, revisando textos em aparelhos reais; (3) `percent` em 10% e depois 50%; (4) `on`; (5) remover os flags do código depois de 30 dias estáveis em `on`.
- Em builds de desenvolvimento e de teste, `VITE_FORCE_LOCALES=pt-BR,en-US,es-419` ignora os flags. Em produção essa variável deve estar desligada (verificado no CI, como `VITE_ALLOW_DESKTOP`).

## Pronto quando

- O teste Playwright passa: três pesos registrados offline chegam ao servidor sem duplicar quando a rede volta, e duas abas editando o mesmo registro terminam com a escrita mais recente.
- Duas abas abertas não sincronizam ao mesmo tempo (teste do lock).
- Uma falha 401 não apaga a fila de saída nem os dados locais.
- Com flags em cache e sem rede, o app usa o último resultado; sem cache, só pt-BR.

## Insumos que dependem do dono do projeto

- Nenhum.

## Ao terminar (obrigatório)

1. Rode `npm run lint`, `npm test` e `npm run build`; todos devem passar. Corrija o que falhar antes de seguir.
2. Revise o diff: nada fora do escopo, nenhuma dependência desnecessária, nenhum segredo, nenhum texto fixo em componente.
3. Atualize `docs/PROGRESSO.md` (marque a sessão) e `docs/DECISOES.md` (decisões novas).
4. Escreva `docs/relatorios/06-fase-03b-cliente-sincronizacao.md` pelo modelo `docs/MODELO_RELATORIO.md` (máximo de 40 linhas).
5. Faça o commit: `fase 3B: <resumo curto>`.
6. Pare. Não comece a próxima sessão (prompts/07-fase-04a-conta-onboarding.md). Responda no chat só com o resumo de 5 linhas do relatório.
