# Decisões

Registro de decisões do projeto. O agente acrescenta linhas ao final; nunca apaga as existentes.

| ID | Fase | Decisão | Motivo |
|---|---|---|---|
| D-01 | 0 | Locales do app: `pt-BR`, `en-US` e `es-419` | Decisão de produto; trocar a variante exige só configuração e catálogo |
| D-02 | 0 | Vuetify fixado em `^3`; PWA com `vite-plugin-pwa` 2.x | A v4 do Vuetify existe, mas a migração não foi decidida; `@vite-pwa/plugin` não existe no npm |
| D-03 | 0 | Código em inglês; comentários e documentação em português | Padrão de mercado e equipe brasileira |
| D-04 | 0 | Feature flags próprias, em PostgreSQL, sem serviço de terceiros | Restrição de custo e privacidade |
| D-05 | 0 | O app não coleta idade, data de nascimento nem sexo biológico | Decisão do dono; o IMC usa só a altura e mostra a faixa de adultos com nota |
| D-06 | 0 | O bloqueio de desktop é regra de experiência, não de segurança | A API aceita qualquer cliente |
| D-07 | 0 | Texto sobre verde e laranja usa `#111827`, não branco; texto e ícones verdes sobre fundo claro usam `primary-text` (`#15803D`) | O guia mostra texto branco sobre `#22C55E` (2,28:1), abaixo do mínimo AA de 4,5:1 |
| D-08 | 0 | Navegação com as 5 abas da seção 10; o botão central “+” do guia não entra | O guia mostra outra estrutura de navegação; a especificação funcional prevalece |
| D-09 | 0 | Tokens derivados fora do guia: `surface-card`, `primary-text` e `error` | Necessários para contraste AA e para ações destrutivas |
| D-10 | 0 | A marca é EmagreSer; nome e logotipo PesoPro do guia são provisórios | O guia vale só para cores, tipografia, formas e componentes |
| D-11 | 0 | CSP: `script-src 'self'` sem `eval`; `style-src` permite `unsafe-inline` | Vuetify aplica estilos inline dinâmicos; bloqueá-los quebraria a interface |
| D-12 | 0 | Ícones PWA gerados por script local com `zlib`, sem dependência nova | Evita serviços externos e mantém o build reproduzível/offline |
| D-13 | 0 | Catálogos en-US e es-419 compilados em chunks JS e precachados; idioma salvo em `localStorage` | `vue-i18n` precompila os JSON; o locale é lido no arranque e trocado por `setLocale` |
| D-14 | 0 | Hora e números seguem o `Intl` do locale, sem ajustes manuais | A ICU atual de `es-419` usa 12 h e ponto decimal; forçar outro padrão fugiria da regra RN-16 |
| D-15 | 1 | Domínio ignora registros com `deleted: true`; funções de data recebem o instante/hoje por parâmetro, sem ler relógio, rede ou DOM | Mantém as regras puras e o cálculo civil estável; `calendarDateFromInstant` usa o fuso local do aparelho (RN-08) |
| D-16 | 1 | RN-03: marcos arredondados a 1 casa; sem queda (A ≥ P) a lista é vazia; passo ≤ 0 lança `RangeError`. RN-04: P = A retorna 100% | Evita laço infinito e drift decimal; meta já cumprida é progresso completo |
| D-17 | 1 | RN-06: streak recalculado do zero pela união de datas, com deduplicação e descarte de datas futuras; `previousBest` preserva o recorde | Permite virada de dia, edições retroativas e o recorde mesmo após exclusão de registros |
| D-18 | 1 | RN-15: flags de idioma entram no domínio como mapa chaveado por locale; `pt-BR` não depende de flag | A camada de flags adapta `i18n_en`/`i18n_es`; a preferência salva não é alterada quando o flag está desligado |
| D-19 | 1 | RN-11: `classifyDevice` recebe os sinais do navegador; `userAgentDataMobile: false` não veta UA/toque; largura da janela nunca é usada | Chromium em iPadOS pode reportar `false` com UA de Mac e vários pontos de toque |
| D-20 | 1 | RN-16: `parseDecimal` retorna `null` em entrada inválida; o último separador é o decimal e `normalizeDecimal` devolve string com ponto | Simplifica validação e gravação sem acoplar regra a idioma |
| D-21 | 1 | RN-09/RN-10: categorias de IMC são códigos estáveis (rótulos ficam no catálogo); aviso de meta compara com tolerância de 1e-9 | Evita texto traduzido no domínio e falso aviso no limite exato de 18,5 |
| D-22 | 1 | Vitest inclui `packages/**/*.test.ts`; testes do domínio compilam junto com o pacote | Segue o padrão já usado em `apps/api`; sem configuração extra de build |
| D-23 | 2A | Migrações com `node-pg-migrate` 9 em SQL versionado; migração 1 ganha a tabela `password_reset_tokens` além das tabelas da seção 7 | RF-49 exige link de uso único com 30 min persistido no banco; Redis é só otimização |
| D-24 | 2A | Senha com argon2id via `@node-rs/argon2` (19 MiB, t=2, p=1); JWT HS256 via `jose`; refresh opaco de 256 bits com hash SHA-256; cookie assinado com `COOKIE_SECRET` e `Secure` em produção (`COOKIE_SECURE=false` só no dev HTTP) | Pacotes com suporte a Node LTS/ESM; o cookie `Secure` em http local impediria o desenvolvimento |
| D-25 | 2A | Reuso de refresh revogado encerra todas as sessões da conta; logout encerra apenas a família atual | A especificação original prevalece sobre o resumo do prompt, que falava só em família |
| D-26 | 2A | Login limitado a 5 tentativas/15 min por e-mail e por IP; limite geral de 300 req/min por IP; cache de perfil no Redis por 60 s; Redis fora = falha aberta | Redis é otimização, não fonte da verdade; a API continua autenticando pelo PostgreSQL |
| D-27 | 2A | PostgreSQL publicado na porta 55432 no host; dentro da compose continua em 5432 | Conflito com o PostgreSQL nativo do Windows neste ambiente |
| D-28 | 2A | `PATCH /me` altera somente `displayName`; as demais preferências ficam em `user_settings` e entram na sincronização da fase 2B | Evita duplicar a edição de configurações fora do fluxo de sincronização |
| D-29 | 2A | Dependências novas da API: `node-pg-migrate`, `pg`, `@node-rs/argon2`, `jose`, `@fastify/cookie`, `zod`, `ioredis`, `nodemailer` (testes: `smtp-server` e seus `@types`) | Necessárias para migração, auth, validação, cache, e-mail e testes de integração |
| D-30 | 2A | URLs vêm de `DATABASE_URL`/`REDIS_URL`; padrão local usa `127.0.0.1` (não `localhost`) para evitar `::1`. CI sobe Postgres/Redis como services e injeta as URLs; `DATABASE_URL` é obrigatório em produção; `tsx` virou dependência para `npm run migrate` funcionar no deploy | Um mesmo teste precisa rodar na compose local (55432), no CI (5432) e em prod sem segredo no repo |
| D-31 | 2B | `/sync/push` responde `applied`/`conflicts`/`cursor` com razões `NEWER_EXISTS`, `DUPLICATE_DATE`, `DUPLICATE_KEY` e `FOREIGN_ENTITY`; `deviceId` é validado, mas não persistido | A idempotência é por (`entity`, `id`); guardar aparelho exigiria tabela nova sem uso na especificação |
| D-32 | 2B | `settings` usa sempre o id do usuário autenticado e não aceita `op: delete`; exclusão de registro inexistente no servidor é no-op sem tombstone | Evita apagar ou forjar configuração de outra conta; um registro nunca sincronizado não precisa ser tombstoned |
| D-33 | 2B | Avaliação de flags unificada: `percent` inclui testadores, anônimo só vê `on`; `serverLocaleFor` reusa a mesma função; cache Redis por usuário por 60 s e `flags:set` invalida com `KEYS`/`DEL` (falha aberta) | Uma única regra para `GET /flags`, e-mails, push e exportação; Redis continua sendo otimização |
| D-34 | 2B | CSV de exportação é uma tabela plana com cabeçalhos traduzidos e `settings` em uma célula JSON; `DELETE /me` exige senha e `confirm: true`, com exclusões explícitas em transação | Mantém portabilidade legível por máquina sem inventar dezenas de colunas; dupla confirmação fica no cliente |
| D-35 | 2B | Vitest com `fileParallelism: false` | Os testes de integração truncam as mesmas tabelas de Postgres/Redis; execução paralela criaria corrida |
