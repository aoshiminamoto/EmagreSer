# Relatório: Fase 0 (Base do monorepo)
Data: 2026-11-26 · Commit: ver `git log -1 --oneline`

## Resumo (3 linhas)
Monorepo com npm workspaces, TypeScript estrito, ESLint/Prettier/Vitest e CI criado.
Web com tema da seção 6, 5 abas vazias, i18n nos três idiomas e PWA com precache.
API Fastify com health, CSP restritiva e docker-compose com Postgres e Redis.

## Entregue
- Estrutura: `apps/web`, `apps/api`, `packages/domain`, scripts na raiz e CI com checagem das flags de produção.
- Tema: tokens e `defaults` do Vuetify 3, Plus Jakarta Sans empacotada (latin/latin-ext), texto `#111827` sobre verde.
- Navegação: 5 abas (Hoje, Evolução, Histórico, Metas, Mais) com ícones outline e rótulos via i18n.
- RF-73/RF-75/RF-76: catálogos completos, `i18n:check`, regra de lint e formatadores `formatDate`, `formatTime`, `formatRelative`, `formatNumber`.
- PWA: `injectManifest`, `sw.ts` com precache, `NavigationRoute` com `denylist: [/^\/api\//]` e `SKIP_WAITING`; ícones 192/512/maskable.
- API: `GET /api/v1/health`, `@fastify/static` servindo `apps/web/dist`, helmet com CSP, logs pino e `.env.example`.

## Testes
- `npm run lint` → 0 erros; `npm test` → 13 passando; `npm run build` → ok; `npm run i18n:check` → 8 chaves em 3 idiomas.
- Texto fixo em `.vue` gera `@intlify/vue-i18n/no-raw-text` (prova automatizada em `tests/no-raw-text.test.ts`).
- `VITE_ALLOW_DESKTOP=true npm run check:prod-env` → exit 1, como esperado.
- Manual: `vite preview` com SW ativo, 25 entradas no precache, troca de aba e fonte/cor conferidas; `docker compose up` → health 200 em 3000 e web em 5173.

## Decisões tomadas
- D-11 a D-14 registradas em `docs/DECISOES.md`.

## Pendências e adiado
- Telas de funcionalidade, banco, autenticação, regras de negócio e Dockerfile de produção ficam para as próximas sessões.
- Teste real em modo avião em dispositivo não foi feito; precache e navegação offline foram validados no preview.
- `en-US` e `es-419` continuam rascunho até revisão humana (RF-80).

## Riscos e avisos
- O compose instala dependências no arranque (`Dockerfile.dev`); não é imagem de produção.
- CSP permite `style-src 'unsafe-inline'` por causa dos estilos dinâmicos do Vuetify; `script-src` continua `'self'` sem `eval`.
- Ícones PWA são provisórios, gerados por script local.

## Insumos necessários do dono
- nenhum

## Próxima sessão
- prompts/02-fase-01-dominio.md
