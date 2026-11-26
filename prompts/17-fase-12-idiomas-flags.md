# Fase 12: Revisão de idiomas, flags e checklist final

Sessão 17 de 17 · Tamanho: Média · Depende de: Todas as anteriores

## Antes de começar

1. Leia `AGENTS.md`, `docs/DECISOES.md` e `docs/PROGRESSO.md`.
2. Não leia a especificação inteira. Use só os trechos abaixo; se precisar de outro, busque pelo ID com `grep -n` em `docs/ESPECIFICACAO.md` e leia ao redor.
3. Se `docs/PROGRESSO.md` indicar um ponto de retomada para esta fase, comece dele.

## Objetivo

Fechar a internacionalização, preparar a liberação por flags e executar o checklist final de pronto.

## Escopo desta sessão

- Auditar todas as telas, mensagens, e-mails, pushes, landing e exportação: nenhuma string fixa; todos os pontos de formatação do RF-75 conferidos.
- Testes de plural (0, 1, 2 e maiores) e de layout em 360 px nos três idiomas.
- Completar `docs/REVISAO_TRADUCOES.md` com todos os textos sensíveis (acolhimento, aviso de peso-alvo, nota do IMC, consentimento, privacidade).
- Documentar no `README.md` o uso do `flags:set` e o roteiro de liberação (`off`, `testers`, `percent`, `on`).
- Executar o checklist da seção 14 item por item, com evidência (comando, teste ou captura) para cada um.
- Produzir o resumo final da seção 15.

## Fora desta sessão

- Novas funcionalidades.

## Trechos da especificação

Copiados de `docs/ESPECIFICACAO.md`. Em caso de divergência, vale o documento original.

**4.7 Internacionalização (i18n) e feature flags**

**Idiomas.** Três locales, usados com o mesmo código no app, no banco e no servidor: `pt-BR` (padrão e idioma-fonte), `en-US` e `es-419` (espanhol da América Latina). As variantes são decisão de produto: registre-as em `docs/DECISOES.md`; trocar, por exemplo, `es-419` por `es-ES` altera só configuração e catálogo.

**Abordagem.**

- Biblioteca: `vue-i18n` 11 (Composition API, `useI18n`) com `@intlify/unplugin-vue-i18n` 11, que precompila os catálogos no build. Assim o build de produção usa a versão do `vue-i18n` sem compilador em tempo de execução, o que evita problemas com a CSP restritiva da seção 4.4. Pluralização e formatação de datas e números vêm do próprio `vue-i18n`, sobre o `Intl` do navegador.
- Catálogos em JSON: `apps/web/src/i18n/locales/pt-BR.json`, `en-US.json` e `es-419.json`, com chaves por funcionalidade (por exemplo `weight.save`). O `pt-BR` entra no bundle inicial; o catálogo do idioma ativo carrega sob demanda (`import()` dinâmico). Os três entram no precache do service worker, para trocar de idioma sem internet.
- Nenhum texto fixo em componentes (regra de lint `@intlify/vue-i18n/no-raw-text`) e nenhuma frase montada por concatenação: usar parâmetros, plural (`$t('streak.days', n)`) e mensagens completas por contexto, porque a ordem das palavras e o gênero mudam entre idiomas.
- Verificação no CI: `npm run i18n:check` falha se faltar chave em algum catálogo, se os parâmetros de uma mensagem forem diferentes entre idiomas ou se houver chave sem uso.
- Vuetify: usar o adaptador `createVueI18nAdapter`, para que os textos internos dos componentes (seletor de data, rótulos de acessibilidade) acompanhem o idioma ativo, e configurar o adaptador de datas do Vuetify com o mesmo locale.
- Rascunhos: o agente entrega `en-US` e `es-419` completos, mas como rascunho de tradução; a revisão humana é exigida antes da liberação (RF-80).

**Dados neutros em relação ao idioma.** O banco e a sincronização guardam só valores sem idioma: datas `YYYY-MM-DD`, horas `HH:mm`, pesos em kg e chaves (`mood`, `angle`, `key` dos hábitos padrão). Os identificadores `feliz`, `frente` e semelhantes são internos e nunca aparecem na tela. Nenhum texto traduzido é gravado; o texto digitado pela pessoa (nome, nota, hábito personalizado) não é traduzido.

**Formatação por tipo de dado.** Toda formatação acontece só na camada de apresentação, com `Intl`:

| Dado | Como é guardado | Como é exibido |
|---|---|---|
| Data de calendário | `YYYY-MM-DD` | `Intl.DateTimeFormat` do locale, em estilos curto, longo e mês/ano. Exemplo da data 2026-12-31: 31/12/2026 em pt-BR, 12/31/2026 em en-US e 31/12/2026 em es-419 |
| Data relativa (hoje, ontem) | Calculada | `Intl.RelativeTimeFormat` com `numeric: 'auto'` |
| Hora do lembrete | `HH:mm` | 24 h ou 12 h (AM/PM) conforme o locale; o seletor de hora do Vuetify segue o mesmo formato |
| Peso, altura, IMC, percentuais, copos, contadores | Número | `Intl.NumberFormat`; peso com 1 casa e unidade kg |
| Dias da semana do lembrete | Números de 1 a 7 (ISO, 1 = segunda) | Nomes pelo `Intl`, na ordem do primeiro dia da semana do idioma, definido em `locale-config.ts` |
| Plurais (1 dia, 2 dias) | Número | Regras de plural do catálogo |

**Onde mais o idioma aparece.** Além das telas do app, o idioma afeta: a landing page de desktop (textos, números e “Atualizado em”); os lembretes por push (texto gerado no servidor e campo `lang` do payload); os e-mails de recuperação de senha; os erros da API, que passam a devolver códigos estáveis (por exemplo `AUTH_INVALID_CREDENTIALS`) e nunca texto traduzido; o CSV da exportação (cabeçalhos traduzidos; datas em ISO 8601 e números com ponto decimal, para leitura por máquina); o atributo `html lang`, que muda junto com o idioma; e os metadados `title`, `description` e Open Graph da landing. O manifest permanece com `lang: pt-BR` (é um arquivo estático), o nome EmagreSer é o mesmo em todos os idiomas e o slogan é traduzido.

**Feature flags (liberação gradual).** Os três idiomas ficam prontos no código desde a primeira versão, mas en-US e es-419 só aparecem para quem tiver o flag ligado. O `pt-BR` está sempre disponível.

- Flags: `i18n_en` (en-US) e `i18n_es` (es-419), guardados na tabela `feature_flags` (seção 7), sem serviço de terceiros.
- Estados de cada flag: `off` (ninguém), `testers` (apenas e-mails da lista de testadores), `percent` (testadores mais uma porcentagem dos usuários) e `on` (todos).
- Avaliação no servidor: `off` é falso; `on` é verdadeiro; `testers` é verdadeiro se o e-mail do usuário estiver na lista; `percent` é verdadeiro para testadores ou quando um hash estável do id do usuário, módulo 100, for menor que a porcentagem. Sem usuário autenticado, só o estado `on` vale.
- Rota `GET /flags` (login opcional): devolve os flags avaliados e a lista de idiomas disponíveis para aquele usuário. Nunca expõe a lista de testadores nem a porcentagem. Resultado em cache no Redis por 60 segundos.
- Cliente: consulta ao abrir o app, depois do login, ao voltar ao primeiro plano e a cada 15 minutos; guarda o último resultado na store `meta` do IndexedDB. Sem rede, usa o último resultado; sem nenhum resultado, considera tudo desligado (só pt-BR). Um flag nunca bloqueia funções locais.
- Gestão sem painel: script `npm run flags:set -- i18n_en testers --emails a@exemplo.com,b@exemplo.com`, e variações `percent 20`, `on` e `off`. O script invalida o cache do Redis e atualiza `updated_at`. `off` serve de chave de emergência: o idioma some na próxima consulta do cliente.
- Roteiro de liberação: (1) produção com os dois flags em `off` e catálogos no código; (2) `testers` com a equipe, revisando textos em aparelhos reais; (3) `percent` em 10% e depois 50%; (4) `on`; (5) remover os flags do código depois de 30 dias estáveis em `on`.
- Em builds de desenvolvimento e de teste, `VITE_FORCE_LOCALES=pt-BR,en-US,es-419` ignora os flags. Em produção essa variável deve estar desligada (verificado no CI, como `VITE_ALLOW_DESKTOP`).

**8.17 Idiomas (pt-BR, en-US e es-419) liberados por feature flag (M)**

Histórias de usuário:

- Como pessoa que fala inglês ou espanhol, quero usar o app no meu idioma, com datas e números no formato que conheço.
- Como equipe do produto, quero deixar os três idiomas prontos no código e liberá-los aos poucos, para revisar os textos antes de abrir ao público.
- **RF-73 Catálogos e infraestrutura.** Todo texto visível passa pelo `vue-i18n`, com os três catálogos completos desde a primeira versão. O CI roda `i18n:check` e a regra de lint contra texto fixo (seção 4.7).
- **RF-74 Seletor de idioma.** Em Configurações, seção “Idioma”, e nas telas de login e cadastro (a escolha fica em meta.localePref). Só aparece quando há dois ou mais idiomas disponíveis. Os nomes aparecem no próprio idioma (Português, English, Español). A troca vale na hora.
- **RF-75 Datas e horas.** Todas as telas usam os formatadores centrais `formatDate`, `formatTime` e `formatRelative`, em `apps/web/src/i18n/format.ts`. É proibido espalhar `toLocaleDateString` ou `format` do date-fns com padrão fixo. Pontos a validar, um a um: histórico (RF-17), edição de registro (RF-18), seletor de data do registro de peso (RF-06), eixos e dicas do gráfico (RF-08), data de conquista dos marcos (RF-15), data da foto na galeria (RF-32), horário e dias do lembrete (RF-37 e RF-42), “Atualizado em” da landing (RF-67) e rótulos “hoje” e “ontem”. O seletor de data usa o `v-date-picker` do Vuetify com o mesmo locale e o primeiro dia da semana do idioma.
- **RF-76 Números.** Pesos, altura, IMC, percentuais, copos e contadores da landing usam `Intl.NumberFormat` do locale. Os campos de peso e altura têm `inputmode="decimal"` e aceitam vírgula ou ponto (RN-16).
- **RF-77 Plural e gênero.** Mensagens com contagem (dias de streak, copos, marcos, “faltam X kg”) usam plural do `vue-i18n`. Testes de snapshot por idioma para 0, 1, 2 e valores maiores.
- **RF-78 Servidor.** Textos de push e e-mails ficam em `apps/api/src/i18n`, escolhidos pelo `locale` do usuário e pelo mesmo flag (RN-15), com fallback para pt-BR. O campo `lang` do payload de push e o cabeçalho `Content-Language` do e-mail refletem o idioma usado. A API devolve apenas códigos de erro.
- **RF-79 Hábitos padrão e humor.** Traduzidos a partir da chave, sem gravar texto no banco. O campo `label` só existe em hábitos personalizados.
- **RF-80 Conteúdo sensível.** As mensagens de acolhimento (RF-30, pelo menos 8 por idioma), o aviso de peso-alvo (RN-10), a nota do IMC (RF-61), o texto de consentimento (RF-46) e a política de privacidade exigem revisão por falante nativo antes de o flag de cada idioma sair de `testers`. Registrar data e revisor em `docs/DECISOES.md`.
- **RF-81 Landing e metadados.** Textos, `title`, `description`, Open Graph e números da landing seguem o idioma resolvido (sem login valem os passos 2 a 4 da RN-15, apenas com flags no estado `on`).
- **RF-82 Exportação.** Cabeçalhos do CSV no idioma ativo; datas em ISO 8601 e números com ponto decimal.
- **RF-83 Feature flags.** Tabela `feature_flags`, avaliação no servidor, `GET /flags`, cache local no IndexedDB, script de gestão e `VITE_FORCE_LOCALES`, conforme a seção 4.7.
- **Aceite:** com os dois flags em `off`, nenhum seletor aparece e o app funciona só em pt-BR, mesmo com o navegador em inglês; com `testers`, só os e-mails da lista veem o seletor e os idiomas; ao desligar um flag, o usuário volta a pt-BR sem perder a preferência salva; a mesma data (guardada como 2026-12-31) aparece no formato de cada idioma em todas as telas do RF-75; `i18n:check` falha o CI quando falta chave ou o parâmetro de uma mensagem difere; teste de layout nos três idiomas em 360 px sem texto cortado; push e e-mail saem no idioma do usuário.

**14. Definição de pronto (checklist final)**

- [ ] Todos os requisitos marcados como M foram implementados e atendem aos critérios de aceite.
- [ ] Os testes unitários do domínio (RN-01 a RN-06 e RN-09 a RN-11), os testes de integração da API e o teste Playwright offline-para-online passam.
- [ ] Depois do primeiro login, o app abre e registra dados em modo avião; ao reconectar, sincroniza sem duplicar.
- [ ] Nenhuma requisição a domínios de terceiros em tempo de execução (verificado na aba de rede) e nenhuma dependência de analytics, anúncios ou serviços pagos.
- [ ] Segurança: senhas com argon2id, refresh token com rotação, limite de tentativas no login, helmet com CSP, SQL parametrizado e `npm audit` sem vulnerabilidades altas.
- [ ] Nenhum texto usa linguagem de culpa; aumentos de peso nunca aparecem em vermelho.
- [ ] Fotos ficam só no aparelho; exportar (RF-44) e excluir conta (RF-45) funcionam e apagam tudo.
- [ ] O lembrete por Web Push chega com o app fechado (Chrome para Android e iOS com o app instalado), com o JSON no formato Declarative Web Push.
- [ ] A PWA é instalável, mostra o aviso “Nova versão disponível” quando há atualização, abre em qualquer rota sem internet e nunca serve `/api/` pelo fallback de navegação.
- [ ] Contraste, alvos de toque e rótulos de acessibilidade verificados nas telas principais.
- [ ] Deploy na Railway com HTTPS, migrações automáticas, healthcheck e backup do PostgreSQL; roteiro do VPS da Hostinger no README.
- [ ] `README.md` (instalar, rodar, testar, fazer deploy) e `docs/DECISOES.md` completos.

- [ ] O IMC fica oculto por padrão em todo o app; sem altura nada é calculado; a tela do onboarding pode ser pulada sem gravar dados; o cartão sempre mostra a nota de que as faixas valem para adultos; o aviso de peso-alvo funciona mesmo com o IMC oculto.

- [ ] Em desktop o app não é acessível e a landing mostra alerta com QR Code, funcionalidades, dados de uso e usuários ativos; em celular e tablet a landing não é exibida; o bypass `VITE_ALLOW_DESKTOP` está desligado no build de produção.
- [ ] A rota `GET /public/stats` devolve apenas totais anônimos, com cache e limite de requisições, e nunca números inventados.

- [ ] Os três catálogos (pt-BR, en-US e es-419) estão completos, `i18n:check` passa no CI e não há texto fixo em componentes.
- [ ] Com os flags em `off` em produção, o app funciona só em pt-BR; `testers` e `percent` liberam en-US e es-419 por usuário; `VITE_FORCE_LOCALES` está desligado no build de produção.
- [ ] Datas, horas e números seguem o locale em todas as telas, na landing, nos pushes, nos e-mails e na exportação; os campos numéricos aceitam vírgula e ponto.
- [ ] Os textos sensíveis (acolhimento, aviso de peso-alvo, nota do IMC, consentimento e privacidade) foram revisados por falante nativo antes de liberar cada idioma.

**15. Entrega esperada do agente**

1. Repositório com o código completo, organizado conforme a seção 12, com `docker-compose.yml`, `Dockerfile` e `.env.example`.
2. Testes executáveis com um único comando (`npm test`) e instruções para rodar o teste offline com Playwright.
3. Resumo final com: o que foi implementado por fase, itens desejáveis (D) não feitos, decisões tomadas e problemas conhecidos.

## Pronto quando

- Aceite de 8.17 passa.
- Todos os itens da seção 14 estão marcados, cada um com evidência no relatório; o que não puder ser marcado vai para a lista de pendências.
- Os flags `i18n_en` e `i18n_es` estão em `off` e o app em produção funciona só em pt-BR.
- Resumo final entregue: o que foi feito por fase, itens desejáveis não feitos, decisões e problemas conhecidos.

## Insumos que dependem do dono do projeto

- Revisão humana das traduções (você) antes de colocar os flags em `testers`.

## Ao terminar (obrigatório)

1. Rode `npm run lint`, `npm test` e `npm run build`; todos devem passar. Corrija o que falhar antes de seguir.
2. Revise o diff: nada fora do escopo, nenhuma dependência desnecessária, nenhum segredo, nenhum texto fixo em componente.
3. Atualize `docs/PROGRESSO.md` (marque a sessão) e `docs/DECISOES.md` (decisões novas).
4. Escreva `docs/relatorios/17-fase-12-idiomas-flags.md` pelo modelo `docs/MODELO_RELATORIO.md` (máximo de 40 linhas).
5. Faça o commit: `fase 12: <resumo curto>`.
6. Pare. Não comece a próxima sessão (nenhuma (fim do plano)). Responda no chat só com o resumo de 5 linhas do relatório.
