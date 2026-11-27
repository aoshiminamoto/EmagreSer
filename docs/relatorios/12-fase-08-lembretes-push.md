# Relatório: Fase 8 (Lembretes por Web Push)
Data: 2026-11-26 · Commit: c4436bc

## Resumo (3 linhas)
Servidor agenda por usuário no BullMQ, envia Declarative Web Push com TTL de 6 h e remove inscrições 404/410.
Cliente pede permissão só no gesto, usa `window.pushManager` quando existe e avisa no iOS não instalado.
Rotas, chaves VAPID, textos nos três idiomas e handlers do service worker entregues com testes.

## Entregue
- RF-37: job repetível por usuário, recriado no sync de configurações e na inscrição; cancelado ao desativar, remover a última inscrição ou excluir a conta.
- RF-38: `GET /push/public-key`, `POST`/`DELETE /push/subscribe`, script `vapid:keys`, inscrição via `window.pushManager` ou service worker.
- RF-39: checa peso na data civil do fuso antes de enviar; sem envio se já registrado.
- RF-40: payload `web_push: 8030` com `lang`, `dir`, `navigate` absoluto e `silent: false`; handler `push` sempre chama `showNotification` e o click abre `/registrar`.
- RF-41: cartão mínimo de ativação, mensagens de permissão negada/indisponível e aviso de instalação no iOS dispensável.
- RF-78: títulos e corpos por idioma em `apps/api/src/i18n`, escolhidos pelo locale efetivo com fallback pt-BR; sem dado de saúde.

## Testes
- `npm run lint`, `npm test` (219 testes, 43 arquivos), `npm run build` e `npm run i18n:check`: todos passaram.
- Verificação manual: nenhuma (sem aparelhos neste ambiente); build de produção conferido com `showNotification`, `notificationclick` e `clientsClaim()` no `sw.js`.

## Decisões tomadas
- D-68 a D-72 registradas em `docs/DECISOES.md`.

## Pendências e adiado
- Tela completa de horário/dias permanece na Fase 10; o cartão em “Mais” só ativa/desativa.
- `navigator.storage.persist()` (seção 4.6) não foi implementado: fora do escopo desta sessão.

## Riscos e avisos
- Sem VAPID no ambiente, o worker não inicia e a chave pública devolve vazia; em produção a falta das chaves impede o arranque.
- `APP_ORIGIN` precisa ser HTTPS em produção; en-US e es-419 seguem como rascunho.

## Insumos necessários do dono
- Gerar e configurar o par VAPID (`npm run vapid:keys`) e o `VAPID_SUBJECT` com `mailto:`.
- Android e iPhone com iOS 16.4+ e app instalado para validar a notificação com o app fechado.

## Próxima sessão
- prompts/13-fase-09-galeria.md
