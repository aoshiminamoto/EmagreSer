# Relatório: Fase 2A (Backend: banco e autenticação)
Data: 2026-11-26 · Commit: ver `git log -1 --oneline`

## Resumo (3 linhas)
Migração 1 cria todo o esquema da seção 7 mais `password_reset_tokens`, com as duas flags em `off`.
Rotas de registro, login, refresh com rotação, logout, recuperação e `/me` prontas sob `/api/v1`.
Senha argon2id, JWT de 15 min, refresh opaco com hash, limites no Redis e e-mails nos três idiomas.

## Entregue
- RF-46: cadastro exige consentimento; `consent_at` e configurações padrão gravados.
- RF-47/RF-48: login com erro genérico, limite de 5 tentativas/15 min e sessão de até 30 dias com rotação.
- RF-49: link único de 30 min, resposta idêntica e troca de senha que encerra as sessões da conta.
- RF-78: e-mails em pt-BR/en-US/es-419 (últimos rascunho), `Content-Language` e flag RN-15.
- 4.4: `GET`/`PATCH /me`, `last_seen_at` no refresh (no máximo 1×/dia), CSP e erros com códigos estáveis.
- 7: migração versionada com índices parciais `WHERE deleted_at IS NULL` nas tabelas sincronizáveis.

## Testes
- Comando: `npm test` → 79 passando, 0 falhas (12 arquivos; 15 testes novos de integração).
- `npm run lint` → 0 erros; `npm run build` → ok; `npm run i18n:check` → ok.
- Verificação manual: migração aplicada duas vezes; testes com PostgreSQL, Redis e SMTP reais, inclusive Redis indisponível.

## Decisões tomadas
- D-23 a D-29 registradas em `docs/DECISOES.md`.

## Pendências e adiado
- `/sync`, `/flags`, exportação, exclusão, push e `/public/stats` ficam para a fase 2B.
- `last_seen_at` em `/sync/push` e a edição de preferências em `user_settings` dependem da 2B.

## Riscos e avisos
- Manter `COOKIE_SECURE=true` em produção; `SMTP_URL` real só é necessário no deploy.
- URLs de banco/Redis vêm de env; local usa `127.0.0.1:55432`, CI usa services em `127.0.0.1:5432`.

## Insumos necessários do dono
- nenhum

## Próxima sessão
- prompts/04-fase-02b-backend-sync-flags.md
