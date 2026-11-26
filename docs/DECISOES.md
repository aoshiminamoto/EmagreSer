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
