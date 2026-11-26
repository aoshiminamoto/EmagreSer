# EmagreSer: regras fixas do projeto

Este arquivo é lido em toda sessão. Mantenha-o curto e não o edite sem pedido do dono do projeto.

## O que é

PWA de controle de peso, pensada para celular e offline primeiro. A interface lê e grava no IndexedDB; uma API Fastify com PostgreSQL e Redis sincroniza os dados. Em desktop, a pessoa vê apenas uma landing page de apresentação. Idiomas: pt-BR (padrão), en-US e es-419, os dois últimos liberados por feature flag.

A especificação completa está em `docs/ESPECIFICACAO.md`. Ela é a fonte da verdade, mas **não deve ser lida inteira** (veja o protocolo abaixo).

## Protocolo de cada sessão

1. Leia este arquivo, `docs/DECISOES.md`, `docs/PROGRESSO.md` e o prompt da sessão (`prompts/NN-...md`). Só isso.
2. Não leia `docs/ESPECIFICACAO.md` inteira. O prompt traz os trechos que importam. Se precisar de outro, busque pelo ID e leia só ao redor: `grep -n "RF-46" docs/ESPECIFICACAO.md`.
3. Faça somente o escopo da sessão. Se notar algo fora do escopo, anote em "Pendências" do relatório; não implemente.
4. O que a especificação não definir, resolva pela opção mais simples e registre em `docs/DECISOES.md`. Só pergunte ao dono se a dúvida bloquear o trabalho ou mudar o escopo.
5. Ao terminar, siga a seção "Ao terminar" do prompt: lint, testes e build passando; relatório; `PROGRESSO.md`; commit; parar.

## Economia de contexto

- Não cole logs longos. Rode testes com saída resumida e mostre só as falhas.
- Não releia arquivos que já leu na sessão e não reescreva arquivo inteiro para uma mudança pequena: use edições pontuais.
- Não crie documentação além da pedida (relatório, `DECISOES.md`, `PROGRESSO.md`, `README.md`, `REVISAO_TRADUCOES.md`).
- Não explore o repositório inteiro: use `grep` e abra só o necessário.
- No chat, responda no fim apenas com o resumo de 5 linhas do relatório.

## Stack (fixa)

| Camada | Escolha |
|---|---|
| Frontend | Vue 3 (Composition API, script setup), TypeScript estrito, Vite, Pinia, Vue Router |
| Interface | Vuetify 3, fixado em `^3` (não migrar para a v4); fonte Plus Jakarta Sans via `@fontsource` |
| PWA | `vite-plugin-pwa` 2.x com `injectManifest` e Workbox 7.4.x (o pacote `@vite-pwa/plugin` não existe) |
| Banco local | IndexedDB via Dexie |
| i18n | `vue-i18n` 11 com `@intlify/unplugin-vue-i18n` (catálogos precompilados) |
| Backend | Node.js LTS, Fastify 5, TypeScript, validação por TypeBox ou Zod |
| Dados | PostgreSQL (migrações versionadas), Redis, BullMQ |
| Push | Web Push com VAPID (`web-push`), formato Declarative Web Push |
| Testes | Vitest; integração da API com PostgreSQL e Redis reais; Playwright para o fluxo offline |
| Hospedagem | Railway (principal) ou VPS na Hostinger |

## Estrutura do repositório

```
emagreser/
  apps/
    web/                 # PWA Vue 3 + Vuetify
      src/
        pages/           # telas (Vue Router)
        features/        # peso, grafico, metas, habitos, agua, humor, fotos, lembretes, conta
        data/            # Dexie, repositórios locais, outbox, motor de sincronização
        plugins/         # vuetify.ts, pinia, router
        i18n/            # vue-i18n, formatadores e locales/ (pt-BR.json, en-US.json, es-419.json)
        flags/           # feature flags: cache local e verificação
        sw.ts            # service worker (injectManifest): precache, push, notificationclick
    api/                 # Fastify + TypeScript
      src/
        routes/          # auth, me, sync, push, health
        db/              # conexão e migrações SQL
        jobs/            # BullMQ: lembretes por Web Push
        i18n/            # textos do servidor (push e e-mails) por idioma
        flags/           # avaliação de feature flags e script flags:set
        plugins/         # helmet, limites de requisição, autenticação, redis
  packages/
    domain/              # regras puras: média móvel, marcos, streak, mensagens
  docs/DECISOES.md
  docker-compose.yml     # app, postgres e redis (desenvolvimento e base do VPS)
  Dockerfile
  .env.example
  README.md
```

## Regras inegociáveis

- A interface lê e grava sempre no IndexedDB. A rede serve só a autenticação, sincronização, flags e push.
- Nenhuma chamada a domínios de terceiros em tempo de execução: sem CDNs, Google Fonts, analytics, anúncios ou crash reporting. Fontes e ícones são empacotados.
- Nenhum texto fixo em componentes: tudo passa pelo `vue-i18n`, com os três catálogos (pt-BR, en-US, es-419) atualizados juntos. en-US e es-419 são rascunho até a revisão humana.
- Datas de calendário guardadas como `YYYY-MM-DD`; horas como `HH:mm`; pesos em kg com 1 casa. Formatação só na apresentação, com `Intl` (use os formatadores de `apps/web/src/i18n/format.ts`).
- Regras de negócio ficam em `packages/domain`, como funções puras, sem Vue, rede ou disco.
- Fotos de progresso nunca saem do aparelho e nunca entram na fila de saída.
- Dados de saúde nunca aparecem em logs, URLs, mensagens de erro ou notificações.
- O IMC é oculto por padrão e só existe com altura informada. O app não coleta idade nem sexo.
- A API devolve códigos de erro estáveis, nunca texto traduzido.
- Segredos só por variáveis de ambiente; nunca no repositório.
- Em produção: `VITE_ALLOW_DESKTOP` e `VITE_FORCE_LOCALES` desligadas; flags de idioma em `off` até o dono liberar.
- Aumento de peso nunca usa vermelho; nenhuma mensagem culpabiliza o usuário.

## Identidade visual (resumo)

Detalhes na seção 6 de `docs/ESPECIFICACAO.md`. Referência visual: `docs/design/guia-de-design.png` (abra a imagem nas sessões que mexem em telas). A marca é EmagreSer; o nome PesoPro do guia é provisório.

- Minimalista com Soft Neumorphism: fundo `#F8FAFC`, cartões brancos com cantos de 20 a 24 px e sombras suaves. O verde é só para ações e progresso.
- Tokens do tema Vuetify: primary `#22C55E`, success `#10B981`, warning `#F59E0B`, text `#111827`, text-secondary `#6B7280`, surface `#F8FAFC`. Derivados: primary-text `#15803D` e error `#B91C1C`.
- Texto sobre verde ou laranja é `#111827`, nunca branco (contraste AA). Texto e ícones verdes sobre fundo claro usam `primary-text`.
- Fonte Plus Jakarta Sans (`@fontsource`, pesos 400 e 600): H1 32/40, H2 24/32, H3 20/28, Body 16/24, Caption 14/20.
- Aumento de peso, IMC e mensagens de acolhimento nunca usam vermelho nem laranja.
- Navegação com as 5 abas da seção 10 (sem o botão central “+” do guia), sem botão “Compartilhar” e sem foto de perfil.

## Convenções

- Código (nomes de variáveis, funções, arquivos) em inglês; comentários e documentação em português; textos de interface só nos catálogos.
- Testes ao lado do código, com nomes descritivos. Sem `any` sem justificativa.
- Commits: `fase <id>: <resumo curto>`. Um commit por sessão (mais, se a sessão for grande).
- Dependências novas só quando necessárias, e registradas em `docs/DECISOES.md`.

## Comandos

- `npm run lint`, `npm test`, `npm run build`, `npm run i18n:check`
- `docker compose up` sobe app, PostgreSQL e Redis para desenvolvimento.

## Quando perguntar ao dono

Somente quando faltar um insumo que só ele tem (chaves, contas, dispositivos, revisão de tradução) ou quando uma decisão mudar o escopo, o custo ou a segurança. Nesses casos, pare, descreva o bloqueio em 3 linhas e aguarde.
