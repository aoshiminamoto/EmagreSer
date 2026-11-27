# Relatório: Fase 11B (Deploy e polimento)
Data: 2026-11-27 · Commit: 482a9b7

## Resumo (3 linhas)
Preparação de produção com Dockerfile multiestágio, migrações antes do start, healthcheck e guias de Railway/VPS.
Aviso de nova versão passou a checar ao abrir, ao voltar ao primeiro plano e a cada hora, com reload controlado.
Polimento de splash, ícones, tipografia responsiva e auditoria; validado com Lighthouse PWA 100 e e2e de offline.

## Entregue
- Dockerfile com alvos `development`, `build` e `production`; entrypoint aplica migrações compiladas e escuta em `PORT`.
- `docker-compose.yml` com healthchecks e `docker-compose.prod.yml` + `Caddyfile` para o VPS; `.dockerignore` mantém `.env` fora da imagem.
- README com Railway (referências de variáveis, domínio, backups) e VPS (firewall, Caddy, backup/restauração).
- `useRegisterSW` com verificação ao abrir, `visibilitychange` e intervalo de 1h; snackbar “Nova versão disponível” e reload só no botão.
- Cabeçalhos de cache extraídos e testados; `npm audit --audit-level=high` no CI; splash e `apple-touch-icon` gerados sem dependência nova.
- Tipografia em `rem` para fontes grandes do sistema; e2e cobre duas versões do build e o fluxo offline→online.
- `.gitignore` revisado e ampliado (caches do Vite/PWA, dumps e chaves locais) sem remover padrões existentes.

## Testes
- Comando: `npm run lint` → 0 erros; `npm test` → 273 passando, 0 falhas.
- Comando: `npm run i18n:check` → 363 chaves em 3 idiomas; `npm run build` → ok; `npm audit --audit-level=high` → 0 altas/críticas.
- Verificação manual: imagem de produção subiu com `docker run`, migrações aplicadas e healthcheck `healthy` em `/api/v1/health`; cache `no-cache` em SW/manifest/index e `immutable` em `/assets/`; Lighthouse PWA 100 (instalável, splash, maskable); 3 e2e (atualização + offline) passando.

## Decisões tomadas
- D-92 a D-97 registradas em `docs/DECISOES.md` (build/compose, splash, verificação de versão, auditoria, tipografia e `.gitignore`).

## Pendências e adiado
- Lighthouse foi executado via `npx` (sem dependência nova) somente na categoria PWA; auditorias de performance/acessibilidade completas ficam para revisão no dispositivo.
- Chunk acima de 500 kB (Vuetify) permanece como aviso pré-existente de build.

## Riscos e avisos
- `docker-compose.prod.yml` exige Compose ≥ 2.24 (diretiva `!reset`); o Caddyfile usa `DOMAIN` do `.env`.
- Railway/VPS precisam de VAPID e SMTP reais; as chaves usadas no teste local são descartáveis e nunca foram comitadas.

## Insumos necessários do dono
- Conta na Railway ou VPS, domínio, `SMTP_URL` de produção e revisão humana dos catálogos en-US/es-419.

## Próxima sessão
- prompts/17-fase-12-idiomas-flags.md
